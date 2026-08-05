import React, { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderPrintLabelModal } from "./OrderPrintLabelModal";

export type QRCodeOrderData = {
  id: string;
  trackingCode: string;
  status: string;
  price: number;
  receiverName: string;
  receiverPhone: string;
  dropAddress: string;
  pickupAddress?: string;
  packageType?: string;
  paymentStatus?: string;
  city?: { name: string };
  sender?: { name: string; phone: string };
};

interface OrderQRCodeProps {
  order: QRCodeOrderData;
  size?: number;
  showActions?: boolean;
  className?: string;
}

export const OrderQRCode: React.FC<OrderQRCodeProps> = ({
  order,
  size = 180,
  showActions = true,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Construct payload string: structured JSON containing essential order metadata + direct URL
  const trackingUrl = `${window.location.origin}/track/${order.trackingCode || order.id}`;

  const payloadObject = {
    app: "Tayr Al-Saad",
    orderId: order.id,
    trackingCode: order.trackingCode || order.id,
    status: order.status,
    customer: {
      name: order.receiverName,
      phone: order.receiverPhone,
      address: order.dropAddress,
      city: order.city?.name || "بغداد",
    },
    price: `${order.price.toLocaleString("ar-IQ")} د.ع`,
    url: trackingUrl,
  };

  const payloadString = JSON.stringify(payloadObject);

  const handleDownloadPNG = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;

    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `QR-${order.trackingCode || order.id}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    toast.success("تم تحميل صورة الـ QR Code بنجاح");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      toast.success("تم نسخ رابط التتبع والمحتوى");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل النسخ");
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm rounded-xl flex flex-col items-center">
        <div ref={qrRef} className="p-3 bg-white rounded-lg border border-slate-100 shadow-inner relative group">
          <QRCodeCanvas
            value={payloadString}
            size={size}
            level="H"
            marginSize={2}
            imageSettings={{
              src: "/favicon.ico",
              x: undefined,
              y: undefined,
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>

        <div className="mt-3 text-center">
          <span className="inline-block text-xs font-mono font-bold tracking-wider px-2.5 py-1 bg-primary/10 text-primary rounded-full">
            #{order.trackingCode || order.id}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            مُستلم: {order.receiverName}
          </p>
        </div>
      </Card>

      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPNG}
            className="flex items-center gap-1.5 text-xs rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            تحميل PNG
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 text-xs rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة الملصق (Label)
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs rounded-lg"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </Button>
        </div>
      )}

      {/* Print Label Modal */}
      <OrderPrintLabelModal
        order={order}
        qrPayload={payloadString}
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
      />
    </div>
  );
};
