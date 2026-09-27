import { getIo } from './io.js';
import { notifyUserPush } from '../services/expoPushNotifications.js';

export function broadcastShipmentRoom(event: string, shipmentId: string, payload: unknown) {
  getIo()?.to(`shipment:${shipmentId}`).emit(event, payload);
}

export function emitShipmentStatus(shipmentId: string, status: string, senderId?: string, at = new Date()) {
  broadcastShipmentRoom('shipment:status', shipmentId, {
    shipmentId,
    status,
    at: at.toISOString(),
  });

  if (senderId) {
    const titles: Record<string, string> = {
      assigned: 'تم تعيين سائق لشحنتك 🚚',
      arrived_pickup: 'السائق عند موقع الاستلام 📍',
      picked_up: 'تم استلام الطرد من السائق 📦',
      in_transit: 'الطرد في الطريق إلى المستلم 🛵',
      arrived_dropoff: 'السائق قريب من نقطة التسليم 🏁',
      delivered: 'تم تسليم الطرد بنجاح 🎉',
      cancelled: 'تم إلغاء الشحنة ❌',
    };
    const title = titles[status] ?? 'تحديث على شحنتك';
    void notifyUserPush(senderId, {
      title: `طير السعد — ${title}`,
      body: `تحديث الشحنة #${shipmentId.slice(-6)}: ${title}`,
      data: { shipmentId, status },
    });
  }
}

export function emitDriverAssigned(shipmentId: string, driver: Record<string, unknown>) {
  broadcastShipmentRoom('shipment:driver_assigned', shipmentId, { shipmentId, driver });
}

export function emitShipmentEta(shipmentId: string, etaMinutes: number) {
  broadcastShipmentRoom('shipment:eta', shipmentId, { shipmentId, etaMinutes });
}
