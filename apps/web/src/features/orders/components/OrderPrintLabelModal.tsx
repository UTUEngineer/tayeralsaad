import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Printer, MapPin, Phone, User, Package, Calendar, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { QRCodeOrderData } from "./OrderQRCode";

interface OrderPrintLabelModalProps {
  order: QRCodeOrderData;
  qrPayload: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OrderPrintLabelModal: React.FC<OrderPrintLabelModalProps> = ({
  order,
  qrPayload,
  open,
  onOpenChange,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=900");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>ملصق شحنة #${order.trackingCode || order.id}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 12px;
              color: #000;
              background: #fff;
              width: 80mm;
              box-sizing: border-box;
              direction: rtl;
            }
            .label-card {
              border: 2px solid #000;
              padding: 10px;
              border-radius: 4px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .header h1 {
              font-size: 16px;
              margin: 0;
              font-weight: 800;
            }
            .header p {
              font-size: 10px;
              margin: 2px 0 0 0;
            }
            .qr-section {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 8px 0;
            }
            .tracking-code {
              font-family: monospace;
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              background: #000;
              color: #fff;
              padding: 4px 8px;
              margin-top: 4px;
              border-radius: 2px;
            }
            .info-group {
              border-bottom: 1px dashed #000;
              padding: 6px 0;
            }
            .info-group:last-child {
              border-bottom: none;
            }
            .label-title {
              font-size: 10px;
              color: #444;
              font-weight: bold;
            }
            .val-main {
              font-size: 13px;
              font-weight: bold;
              margin-top: 2px;
            }
            .val-sub {
              font-size: 11px;
            }
            .price-tag {
              font-size: 16px;
              font-weight: 900;
              text-align: center;
              border: 2px solid #000;
              padding: 6px;
              margin-top: 8px;
              background: #f8f8f8;
            }
            @media print {
              body { padding: 4px; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formattedDate = new Date().toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
        <DialogHeader dir="rtl">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Printer className="w-5 h-5 text-primary" />
            معاينة ملصق الشحنة (Thermal Print Label)
          </DialogTitle>
        </DialogHeader>

        {/* Printable Section Container */}
        <div className="py-2 flex justify-center" dir="rtl">
          <div
            ref={printRef}
            className="w-[280px] border-2 border-slate-900 dark:border-slate-100 p-4 rounded-lg bg-white text-slate-900 shadow-md font-sans text-right"
          >
            {/* Header */}
            <div className="text-center border-b-2 border-slate-900 pb-2 mb-3">
              <h2 className="text-lg font-black tracking-tight">طير السعد - Tayr Al-Saad</h2>
              <p className="text-[10px] text-slate-600">خدمة التوصيل السريع والآمن</p>
              <div className="bg-slate-900 text-white font-mono font-bold text-sm py-1 px-2 mt-2 rounded inline-block">
                #{order.trackingCode || order.id}
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center my-2 bg-slate-50 p-2 rounded border border-slate-200">
              <QRCodeCanvas
                value={qrPayload}
                size={140}
                level="H"
                marginSize={1}
              />
            </div>

            {/* Customer Details */}
            <div className="border-b border-dashed border-slate-300 py-2 space-y-1">
              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <User className="w-3 h-3 text-primary" /> بيانات المستلم:
              </div>
              <div className="text-sm font-bold text-slate-900">{order.receiverName}</div>
              <div className="text-xs font-semibold text-slate-700 dir-ltr text-right">{order.receiverPhone}</div>
            </div>

            {/* Address & City/Area */}
            <div className="border-b border-dashed border-slate-300 py-2 space-y-1">
              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" /> عنوان التوصيل والمنطقة:
              </div>
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                📍 {order.city?.name || "الكاظمية"}
              </div>
              <div className="text-xs text-slate-800 leading-snug">{order.dropAddress}</div>
            </div>

            {/* Sender / Package info */}
            <div className="border-b border-dashed border-slate-300 py-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">المرسل:</span>
                <span className="font-semibold">{order.sender?.name || "طير السعد"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">التاريخ:</span>
                <span className="font-semibold">{formattedDate}</span>
              </div>
            </div>

            {/* Total Price */}
            <div className="mt-3 text-center border-2 border-slate-900 bg-slate-50 p-2 rounded-lg">
              <div className="text-[10px] font-bold text-slate-600">المبلغ المطلوب عند التسليم:</div>
              <div className="text-lg font-black text-primary mt-0.5">
                {order.price.toLocaleString("ar-IQ")} د.ع
              </div>
              <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                [{order.paymentStatus === "PAID" ? "مدفوع مسبقاً" : "الدفع عند الاستلام"}]
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" dir="rtl">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handlePrint} className="gap-2 bg-primary hover:bg-primary/90">
            <Printer className="w-4 h-4" />
            طباعة الفاتورة والملصق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
