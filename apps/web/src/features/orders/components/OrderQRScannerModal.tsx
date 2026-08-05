import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { QrCode, Camera, Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderQRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScannedOrder?: (orderIdOrCode: string, rawPayload?: Record<string, unknown>) => void;
}

export const OrderQRScannerModal: React.FC<OrderQRScannerModalProps> = ({
  open,
  onOpenChange,
  onScannedOrder,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "qr-reader-region";

  // Process scanned text (JSON or URL or Code string)
  const handleScannedResult = (decodedText: string) => {
    setScannedResult(decodedText);
    toast.success("تم مسح رمز QR بنجاح!");

    let trackingCodeOrId = decodedText.trim();
    let rawObj: Record<string, unknown> | undefined;

    // Case 1: JSON payload
    if (decodedText.startsWith("{") && decodedText.endsWith("}")) {
      try {
        const parsed = JSON.parse(decodedText);
        rawObj = parsed;
        if (parsed.trackingCode) trackingCodeOrId = parsed.trackingCode;
        else if (parsed.orderId) trackingCodeOrId = parsed.orderId;
      } catch {
        /* fallback to raw text */
      }
    }
    // Case 2: URL format (e.g., https://.../track/TS-12345)
    else if (decodedText.includes("/track/")) {
      const parts = decodedText.split("/track/");
      if (parts[1]) {
        trackingCodeOrId = parts[1].split("?")[0].split("#")[0];
      }
    }

    if (onScannedOrder) {
      onScannedOrder(trackingCodeOrId, rawObj);
    } else {
      // Default action: navigate to public tracking or dashboard order detail
      navigate(`/track/${trackingCodeOrId}`);
    }

    stopCamera();
    onOpenChange(false);
  };

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScannedResult(decodedText);
        },
        () => {
          /* ignore scan error frames */
        }
      );
      setScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تشغيل الكاميرا";
      setErrorMessage(msg.includes("Permission") ? "يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح." : msg);
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    setScanning(false);
  };

  useEffect(() => {
    if (open && activeTab === "camera") {
      // Small timeout to allow DOM container rendering
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [open, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    try {
      const html5QrCode = new Html5Qrcode("qr-file-region");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScannedResult(decodedText);
    } catch {
      setErrorMessage("لم يتم العثور على QR Code صالح في الصورة المختارة.");
      toast.error("لم نتمكن من قراءة الـ QR من الصورة.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) stopCamera();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
        <DialogHeader dir="rtl">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <QrCode className="w-5 h-5 text-primary" />
            مسح رمز QR للطلب (Order QR Scanner)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            امسح الملصق الموجود على الفاتورة أو شحنة طير السعد للانتقال للطلب مباشرة.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="camera"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "camera" | "upload")}
          className="w-full mt-2"
          dir="rtl"
        >
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="camera" className="gap-2 text-xs">
              <Camera className="w-4 h-4" /> الكاميرا المباشرة
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2 text-xs">
              <Upload className="w-4 h-4" /> رفع صورة الفاتورة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-slate-950 aspect-square flex items-center justify-center border border-slate-800 shadow-inner">
              <div id={readerElementId} className="w-full h-full" />

              {!scanning && !errorMessage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white gap-2 p-4 text-center">
                  <Camera className="w-8 h-8 text-primary animate-pulse" />
                  <p className="text-xs font-medium">جاري تجهيز الكاميرا...</p>
                </div>
              )}

              {errorMessage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-rose-400 p-4 text-center gap-2">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-xs font-semibold">{errorMessage}</p>
                  <Button variant="outline" size="sm" onClick={startCamera} className="mt-2 text-xs text-white border-slate-700">
                    إعادة المحاولة
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-primary transition-colors bg-slate-50 dark:bg-slate-900/50">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                اختر صورة تحتوي على رمز QR
              </p>
              <p className="text-[11px] text-slate-400 mb-4">
                يدعم صيغ PNG, JPG, WEBP الفواتير والملصقات
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 bg-primary text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                تصفح الملفات
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <div id="qr-file-region" className="hidden" />
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
