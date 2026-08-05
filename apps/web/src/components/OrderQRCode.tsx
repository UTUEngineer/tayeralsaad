import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface OrderData {
  orderId: string;
  senderName: string;
  city: string;
  area: string;
  phone: string;
  totalAmount: number;
}

interface OrderQRCodeProps {
  order: OrderData;
}

export const OrderQRCode: React.FC<OrderQRCodeProps> = ({ order }) => {
  // تجميع بيانات الطلب في صيغة JSON ليتم قراءتها بسهولة عند المسح الضوئي
  const qrData = JSON.stringify({
    id: order.orderId,
    sender: order.senderName,
    city: order.city,
    area: order.area,
    phone: order.phone,
    total: order.totalAmount,
  });

  const handleDownload = () => {
    const svgNode = document.getElementById(`qr-code-${order.orderId}`);
    if (!svgNode) return;

    const svgData = new XMLSerializer().serializeToString(svgNode);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_Order_${order.orderId}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm w-fit">
      <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
        <QRCodeSVG
          id={`qr-code-${order.orderId}`}
          value={qrData}
          size={180}
          level="H"
          marginSize={2}
        />
      </div>
      <div className="text-center text-xs text-slate-600 dark:text-slate-400 font-mono">
        طلب رقم: #{order.orderId}
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors shadow-sm"
      >
        تحميل QR Code
      </button>
    </div>
  );
};

export default OrderQRCode;
