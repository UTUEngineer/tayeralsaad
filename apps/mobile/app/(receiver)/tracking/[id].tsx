import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { ShipmentStatus } from '@tayralsaad/types';
import { formatIQD } from '@tayralsaad/utils';
import { router, useLocalSearchParams } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { ShipmentRouteMap } from '@/components/shipment/ShipmentRouteMap';
import { StatusTimeline } from '@/components/shipment/StatusTimeline';
import { Button } from '@/components/ui/Button';
import { BidiLtr } from '@/components/ui/Bidi';
import { Screen } from '@/components/ui/Screen';
import type { DriverAssignedPayload } from '@/hooks/useShipmentLiveChannel';
import { useShipmentLiveChannel } from '@/hooks/useShipmentLiveChannel';
import { openWhatsAppForPhone } from '@/lib/whatsapp';
import { mongoId, useShipmentDetail } from '@/queries/shipments';

function routeCoords(shipment: Record<string, unknown>): {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
} | null {
  const pickup = shipment.pickup as { location?: { lat: number; lng: number } } | undefined;
  const dropoff = shipment.dropoff as { location?: { lat: number; lng: number } } | undefined;
  const pl = pickup?.location;
  const dl = dropoff?.location;
  if (
    !pl ||
    !dl ||
    typeof pl.lat !== 'number' ||
    typeof pl.lng !== 'number' ||
    typeof dl.lat !== 'number' ||
    typeof dl.lng !== 'number'
  ) {
    return null;
  }
  return { pickup: pl, dropoff: dl };
}

function senderPhone(raw: Record<string, unknown>): string | undefined {
  const v = typeof raw.senderPhone === 'string' ? raw.senderPhone.trim() : '';
  return v ? v : undefined;
}

function driverPhone(raw: Record<string, unknown>): string | undefined {
  const driverId = raw.driverId as Record<string, unknown> | string | undefined;
  if (!driverId || typeof driverId === 'string') return undefined;
  const userId = driverId.userId as { phone?: string } | undefined;
  const ph = typeof userId?.phone === 'string' ? userId.phone.trim() : '';
  return ph ? ph : undefined;
}

export default function ReceiverShipmentTrackingScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('en') ? 'en' : 'ar';

  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] ?? '' : '';

  const { data: shipment, isPending, isError } = useShipmentDetail(rawId);
  const sid = shipment ? mongoId(shipment) : rawId;

  const tracking = shipment?.trackingCode ?? '';

  const [driverPin, setDriverPin] = useState<{ lat: number; lng: number } | null>(null);
  const [liveDriverCard, setLiveDriverCard] = useState<DriverAssignedPayload['driver'] | null>(null);
  const [liveEta, setLiveEta] = useState<number | undefined>(undefined);

  useEffect(() => {
    setLiveEta(undefined);
    setDriverPin(null);
    setLiveDriverCard(null);
  }, [rawId]);

  const onAssigned = useCallback((p: DriverAssignedPayload) => {
    if (p.driver) setLiveDriverCard(p.driver);
  }, []);

  const onMove = useCallback((lat: number, lng: number) => {
    setDriverPin({ lat, lng });
  }, []);

  const onEta = useCallback((minutes: number) => {
    setLiveEta(minutes);
  }, []);

  useShipmentLiveChannel(tracking, sid, onAssigned, onMove, onEta);

  const raw = shipment as unknown as Record<string, unknown> | undefined;

  const coords = raw ? routeCoords(raw) : null;

  const historyRows =
    raw && Array.isArray(raw.statusHistory)
      ? (raw.statusHistory as Array<{ status: ShipmentStatus; at?: string }>).map((entry) => ({
          status: entry.status,
          at: entry.at,
        }))
      : [];

  const etaDisplay =
    typeof liveEta === 'number'
      ? liveEta
      : typeof raw?.etaMinutes === 'number'
        ? (raw.etaMinutes as number)
        : undefined;

  const total =
    typeof (raw?.pricing as { total?: number } | undefined)?.total === 'number'
      ? (raw!.pricing as { total?: number }).total!
      : 0;

  const st = String(shipment?.status ?? '');
  const showSign = ['arrived_dropoff', 'in_transit', 'picked_up'].includes(st);

  const driverWa = raw ? driverPhone(raw) : undefined;
  const senderWa = raw ? senderPhone(raw) : undefined;

  return (
    <Screen className="flex-1 bg-bg pb-28">
      <AppHeader title={t('receiver.trackingTitle')} />

      {!rawId ? (
        <Text className="px-5 pt-6 text-inkSoft">{t('common.errorTitle')}</Text>
      ) : isPending ? (
        <Text className="px-5 pt-6 text-inkSoft">{t('common.loading')}</Text>
      ) : isError || !shipment || !raw ? (
        <Text className="px-5 pt-6 text-danger">{t('common.errorTitle')}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="border-b border-border bg-surface px-5 py-6">
            <Text className="text-xs font-semibold uppercase text-inkSoft">{t('track.codeLabel')}</Text>
            <BidiLtr text={tracking} className="mt-2 text-xl font-bold text-ink" />
            <Text className="mt-4 text-lg font-semibold text-ink">{t(`status.${st}`, st)}</Text>
            {typeof etaDisplay === 'number' ? (
              <Text className="mt-2 text-sm text-inkSoft">{t('track.etaMinutes', { minutes: etaDisplay })}</Text>
            ) : null}
            <Text className="mt-4 text-sm text-inkSoft">{formatIQD(total, locale)}</Text>
          </View>

          {raw.deliveryOtp && ['in_transit', 'picked_up', 'at_delivery', 'arrived_dropoff'].includes(st) ? (
            <View className="mx-5 mt-6 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-primary uppercase">{t('receiver.deliveryOtpLabel')}</Text>
                <Ionicons name="shield-checkmark-outline" size={20} color="#0284C7" />
              </View>
              <Text className="mt-2 text-center text-3xl font-bold tracking-widest text-primary">
                {String(raw.deliveryOtp)}
              </Text>
              <Text className="mt-1 text-center text-xs text-inkSoft">{t('receiver.deliveryOtpHint')}</Text>
            </View>
          ) : null}

          {liveDriverCard?.firstName ? (
            <View className="mx-5 mt-6 rounded-2xl border border-border bg-surface px-4 py-4">
              <Text className="text-sm font-semibold text-ink">{t('track.mapDriver')}</Text>
              <Text className="mt-2 text-base text-ink">{liveDriverCard.firstName}</Text>
            </View>
          ) : null}

          {coords ? (
            <View className="mx-5 mt-6 overflow-hidden rounded-2xl border border-border">
              <ShipmentRouteMap pickup={coords.pickup} dropoff={coords.dropoff} driver={driverPin} height={240} />
            </View>
          ) : (
            <View className="mx-5 mt-6 rounded-2xl border border-border bg-bg px-4 py-10">
              <Text className="text-center text-sm text-inkSoft">{t('receiver.mapUnavailable')}</Text>
            </View>
          )}

          <View className="mt-8 px-5">
            <Text className="text-lg font-semibold text-ink">{t('track.updatesTitle')}</Text>
            <View className="mt-4">
              <StatusTimeline t={t} items={historyRows.length ? historyRows : [{ status: st as ShipmentStatus }]} />
            </View>
          </View>

          <View className="mt-8 gap-3 px-5">
            {senderWa ? (
              <Pressable
                accessibilityRole="button"
                className="rounded-xl border border-border bg-bg px-4 py-4 active:opacity-80"
                onPress={() => openWhatsAppForPhone(senderWa, t('receiver.whatsappPreset'))}
              >
                <Text className="text-center text-base font-semibold text-primary">{t('receiver.whatsappSender')}</Text>
              </Pressable>
            ) : null}
            {driverWa ? (
              <Pressable
                accessibilityRole="button"
                className="rounded-xl border border-border bg-bg px-4 py-4 active:opacity-80"
                onPress={() => openWhatsAppForPhone(driverWa, t('receiver.whatsappPresetDriver'))}
              >
                <Text className="text-center text-base font-semibold text-primary">{t('receiver.whatsappDriver')}</Text>
              </Pressable>
            ) : null}

            {showSign ? (
              <Button
                variant="secondary"
                onPress={() => Alert.alert(t('receiver.signInfoTitle'), t('receiver.signInfoBody'))}
              >
                {t('receiver.signAcknowledge')}
              </Button>
            ) : null}

            <Button variant="ghost" onPress={() => router.back()}>
              {t('common.back')}
            </Button>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
