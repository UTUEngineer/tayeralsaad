import os
import re
import random
import time
from typing import Dict, Optional
import httpx
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, field_validator

app = FastAPI(
    title="OTP WhatsApp Service",
    description="خدمة توليد وإرسال رموز التحقق عبر واتساب Cloud API باستخدام FastAPI",
    version="1.0.0"
)

# ----------------------------------------------------
# 1. Configuration & Env Variables
# ----------------------------------------------------
WHATSAPP_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "YOUR_WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "YOUR_PHONE_NUMBER_ID")
API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")

# إعدادات OTP
OTP_EXPIRATION_SECONDS = 300  # مدة صلاحية الرمز (5 دقائق)
MAX_ATTEMPTS = 3              # عدد المحاولات الخاطئة المسموح بها

# ----------------------------------------------------
# 2. In-Memory Store (ينصح بـ Redis للإنتاج)
# ----------------------------------------------------
class OTPRecord:
    def __init__(self, code: str, expires_at: float):
        self.code = code
        self.expires_at = expires_at
        self.attempts = 0

# store structure: { phone_number: OTPRecord }
otp_store: Dict[str, OTPRecord] = {}

# ----------------------------------------------------
# 3. Pydantic Models
# ----------------------------------------------------
class SendOTPRequest(BaseModel):
    phone_number: str  # مثال: "9647700000000" أو "+9647700000000"
    use_template: bool = False  # استخدام قالب Meta مسبق الاعتماد (موصى به لـ OTP)

    @field_validator("phone_number")
    @classmethod
    def sanitize_phone(cls, v: str) -> str:
        # استخراج الأرقام فقط
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("رقم الهاتف غير صالحة صيغته الدولية (يجب أن يتكون من 10 إلى 15 رقم)")
        return digits

class VerifyOTPRequest(BaseModel):
    phone_number: str
    code: str

    @field_validator("phone_number")
    @classmethod
    def sanitize_phone(cls, v: str) -> str:
        return re.sub(r"\D", "", v)

# ----------------------------------------------------
# 4. Helper to Send WhatsApp Message
# ----------------------------------------------------
async def send_whatsapp_otp(phone_number: str, otp_code: str, use_template: bool = False) -> bool:
    """
    إرسال رسالة الـ OTP عبر Meta WhatsApp Cloud API باستخدام httpx AsyncClient
    """
    if not WHATSAPP_TOKEN or WHATSAPP_TOKEN == "YOUR_WHATSAPP_TOKEN":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="لم يتم تهيئة رمز الوصول لـ Meta WhatsApp (WHATSAPP_ACCESS_TOKEN)"
        )
        
    url = f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    if use_template:
        # إرسال عبر Template مسبق الاعتماد في Meta (الأسلوب الموصى به رسمياً لـ OTP)
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "template",
            "template": {
                "name": "auth_otp_code",  # اسم القالب الموجود في لوحة Meta
                "language": {"code": "ar"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": otp_code}
                        ]
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [
                            {"type": "text", "text": otp_code}
                        ]
                    }
                ]
            }
        }
    else:
        # إرسال رسالة نصية مباشرة (تكتفي بالعمل إذا كان العميل قد تواصل معنا خلال 24 ساعة)
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone_number,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": f"رمز التحقق الخاص بك لموقع طير سعد هو: {otp_code}\nينتهي الرمز خلال 5 دقائق. لا تشارك هذا الرمز مع أي شخص."
            }
        }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            error_data = response.json().get("error", {})
            error_msg = error_data.get("message", "فشل إرسال الرسالة عبر واتساب")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"خطأ من Meta API: {error_msg}"
            )
            
        return True

# ----------------------------------------------------
# 5. API Routes
# ----------------------------------------------------
@app.post("/api/send-otp", status_code=status.HTTP_200_OK)
async def send_otp(data: SendOTPRequest):
    # 1. توليد رمز OTP عشوائي مكون من 6 أرقام
    otp_code = f"{random.randint(100000, 999999)}"
    
    # 2. حساب وقت انتهاء الصلاحية
    expires_at = time.time() + OTP_EXPIRATION_SECONDS
    
    # 3. حفظ الرمز في الذاكرة
    otp_store[data.phone_number] = OTPRecord(code=otp_code, expires_at=expires_at)

    # 4. إرسال الرمز عبر Meta API
    await send_whatsapp_otp(
        phone_number=data.phone_number,
        otp_code=otp_code,
        use_template=data.use_template
    )
    
    return {
        "success": True,
        "message": "تم إرسال رمز التحقق بنجاح عبر واتساب",
        "expires_in_seconds": OTP_EXPIRATION_SECONDS
    }

@app.post("/api/verify-otp", status_code=status.HTTP_200_OK)
async def verify_otp(data: VerifyOTPRequest):
    record = otp_store.get(data.phone_number)
    
    # 1. التأكد من وجود رمز لهذا الرقم
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="لم يتم طلب رمز تحقق لهذا الرقم أو انتهت صلاحيته"
        )
    
    # 2. فحص انتهاء وقت الصلاحية (TTL)
    if time.time() > record.expires_at:
        del otp_store[data.phone_number]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد"
        )
    
    # 3. زيادة عدد المحاولات وتدقيق الحد الأقصى
    record.attempts += 1
    if record.attempts > MAX_ATTEMPTS:
        del otp_store[data.phone_number]
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تجاوزت الحد الأقصى للمحاولات الخاطئة. يرجى طلب رمز جديد"
        )
    
    # 4. تدقيق مطابقة الرمز
    if record.code == data.code:
        # مسح الرمز فور نجاح التثبت لحماية الأمان
        del otp_store[data.phone_number]
        return {
            "success": True,
            "message": "تم التثبت بنجاح"
        }
    
    return {
        "success": False,
        "message": f"رمز التحقق غير صحيح. متبقي لديك {MAX_ATTEMPTS - record.attempts} محاولات."
    }
