import type { Socket } from 'socket.io-client';

import { useEffect, useRef } from 'react';

import Constants from 'expo-constants';
import { io } from 'socket.io-client';

import { queryClient } from '@/lib/queryClient';
import { socketOriginFromApiBase } from '@/lib/socketUrl';

import { shipmentKeys } from '@/queries/shipments';
import { useAuthStore } from '@/stores/authStore';

export type DriverAssignedPayload = {
  shipmentId: string;
  driver: {
    firstName?: string;
    phone?: string;
    photoUrl?: string | null;
    rating?: { average: number; count: number };
    vehicle?: { type?: string; plate?: string };
  };
};

type DriverLocPayload = { shipmentId: string; lat: number; lng: number; at: string };

type EtaPayload = { shipmentId?: string; etaMinutes?: number };

/** Live subscription for a shipment tracking room (`shipment:subscribe`). */
export function useShipmentLiveChannel(
  trackingCode: string | undefined | null,
  mongoShipmentId: string | undefined | null,
  onDriverAssigned: (payload: DriverAssignedPayload) => void,
  onDriverMove: (lat: number, lng: number) => void,
  onEta?: (etaMinutes: number) => void,
) {
  const assignedRef = useRef(onDriverAssigned);
  assignedRef.current = onDriverAssigned;
  const moveRef = useRef(onDriverMove);
  moveRef.current = onDriverMove;
  const etaRef = useRef(onEta);
  etaRef.current = onEta;

  useEffect(() => {
    const code = typeof trackingCode === 'string' ? trackingCode.trim().toUpperCase() : '';
    const sid = typeof mongoShipmentId === 'string' ? mongoShipmentId : '';
    if (!code || !sid) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const apiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
    if (!apiUrl) return;

    let socket: Socket | undefined;

    socket = io(socketOriginFromApiBase(apiUrl), {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      socket?.emit('shipment:subscribe', { trackingCode: code });
    });

    socket.on('shipment:status', () => {
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(sid) });
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.mineInfinite() });
    });

    socket.on('shipment:driver_assigned', (p: DriverAssignedPayload) => {
      assignedRef.current(p);
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(sid) });
    });

    socket.on('shipment:driver_location', (p: DriverLocPayload) => {
      if (!p?.shipmentId || p.shipmentId !== sid) return;
      moveRef.current(p.lat, p.lng);
    });

    socket.on('shipment:eta', (p: EtaPayload) => {
      if (!p?.shipmentId || p.shipmentId !== sid) return;
      if (typeof p.etaMinutes === 'number') etaRef.current?.(p.etaMinutes);
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(sid) });
    });

    return () => {
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [mongoShipmentId, trackingCode]);
}
