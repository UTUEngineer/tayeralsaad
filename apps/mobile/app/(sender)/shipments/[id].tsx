import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShipmentStatus } from '@tayralsaad/types';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import i18next from 'i18next';
import { router, useLocalSearchParams } from 'expo-router';

import { CreateFlowHeader } from '@/components/sender/create/CreateFlowHeader';
import { ShipmentDetailSkeleton } from '@/components/sender/ShipmentDetailSkeleton';
import { ShipmentPriceBreakdown } from '@/components/sender/ShipmentPriceBreakdown';
import { ShipmentRatingSection } from '@/components/sender/ShipmentRatingSection';
import { ShipmentRouteMap } from '@/components/shipment/ShipmentRouteMap';
import { StatusTimeline } from '@/components/shipment/StatusTimeline';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { ThemeBottomSheet } from '@/components/ui/ThemeBottomSheet';
import { ThemeButton } from '@/components/ui/ThemeButton';
import { ThemeInput } from '@/components/ui/ThemeInput';
import { ThemeScreen } from '@/components/ui/ThemeScreen';
import { useShipmentLiveChannel } from '@/hooks/useShipmentLiveChannel';
import type { DriverAssignedPayload } from '@/hooks/useShipmentLiveChannel';
import { HttpApiError } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { openWhatsAppForPhone } from '@/lib/whatsapp';
import { uploadShipmentPhoto } from '@/queries/driver';
import {
  mongoId,
  useCancelShipmentMutation,
  useDisputeShipmentMutation,
  useRateShipmentMutation,
  useShipmentDetail,
} from '@/queries/shipments';

type DriverCardPayload = DriverAssignedPayload['driver'];

function iqLocale(): 'ar' | 'en' {
  return i18next.language.startsWith('en') ? 'en' : 'ar';
}

function canCancel(senderStatus: ShipmentStatus): boolean {
  return senderStatus === 'pending' || senderStatus === 'assigned';
}

function shipmentAllowsDispute(st: ShipmentStatus): boolean {
  return !(st === 'delivered' || st === 'cancelled' || st === 'disputed');
}

export default function SenderShipmentDetailScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const locale = iqLocale();

  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] ?? '' : '';

  const { data: shipment, isPending, isError, refetch } = useShipmentDetail(rawId);
  const sid = shipment ? mongoId(shipment) : rawId;

  const [reasonOpen, setReasonOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [driverPin, setDriverPin] = useState<{ lat: number; lng: number } | null>(null);
  const [liveDriverCard, setLiveDriverCard] = useState<DriverCardPayload | null>(null);
  const [liveEta, setLiveEta] = useState<number | undefined>(undefined);

  const tracking = shipment?.trackingCode ?? '';

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputePhotoUrl, setDisputePhotoUrl] = useState<string | null>(null);
  const [disputePhotoBusy, setDisputePhotoBusy] = useState(false);

  useEffect(() => {
    setLiveEta(undefined);
    setDriverPin(null);
    setLiveDriverCard(null);
    setDisputeOpen(false);
    setDisputeReason('');
    setDisputePhotoUrl(null);
    setDisputePhotoBusy(false);
    setReasonOpen(false);
    setCancelReason('');
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

  const cancelMut = useCancelShipmentMutation(sid);
  const rateMut = useRateShipmentMutation(sid);
  const disputeMut = useDisputeShipmentMutation(sid);

  const etaLabel =
    typeof liveEta === 'number' ? liveEta : typeof shipment?.etaMinutes === 'number' ? shipment.etaMinutes : undefined;

  const cancelDisabled = shipment ? !canCancel(shipment.status) : true;

  const driverCardData = liveDriverCard || (typeof shipment?.driverId === 'object' && shipment?.driverId ? {
    firstName: ((shipment.driverId as Record<string, unknown>).userId as { name?: string })?.name?.split(' ')[0] ?? t('shipment.driver'),
    photoUrl: ((shipment.driverId as Record<string, unknown>).userId as { avatarUrl?: string })?.avatarUrl ?? null,
    vehicle: (shipment.driverId as Record<string, unknown>).vehicle as { type?: string; plate?: string } | undefined,
    rating: ((shipment.driverId as Record<string, unknown>).userId as { rating?: { average: number; count: number } })?.rating ?? { average: 0, count: 0 },
    phone: ((shipment.driverId as Record<string, unknown>).userId as { phone?: string })?.phone,
  } : null);

  const activeDriverPhone = liveDriverCard?.phone || (typeof shipment?.driverId === 'object' && shipment?.driverId ? ((shipment.driverId as Record<string, unknown>).userId as { phone?: string })?.phone : undefined);

  return (
    <ThemeScreen edges={['top']}>
      <CreateFlowHeader title={t('shipment.track')} onBack={() => router.back()} />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isPending || !shipment ? (
        <ShipmentDetailSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xxxl,
            gap: theme.spacing.xl,
          }}
        >
          <Card style={{ gap: theme.spacing.sm }}>
            <AppText variant="caption" color="inkMuted">{`\u2066${tracking}\u2069`}</AppText>
            <AppText variant="title" color="primary">
              {t(`status.${shipment.status}`)}
            </AppText>
            {typeof etaLabel === 'number' ? (
              <AppText variant="caption" color="inkMuted">
                {t('shipmentNew.etaMinutes', { minutes: etaLabel })}
              </AppText>
            ) : null}
          </Card>

          {/* Pickup OTP Card */}
          {shipment.pickupOtp && ['assigned', 'at_pickup', 'pending'].includes(shipment.status) ? (
            <Card style={{ gap: theme.spacing.xs, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.primary }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="bodyBold" color="primary">{t('shipmentNew.pickupOtpLabel')}</AppText>
                <Ionicons name="key-outline" size={20} color={theme.colors.primary} />
              </View>
              <AppText variant={locale === 'en' ? 'displayEn' : 'displayAr'} color="primary" align="center" style={{ letterSpacing: 8, fontSize: 32, marginVertical: theme.spacing.xs }}>
                {shipment.pickupOtp}
              </AppText>
              <AppText variant="caption" color="inkMuted" align="center">
                {t('shipmentNew.pickupOtpHint')}
              </AppText>
            </Card>
          ) : null}

          {/* Delivery OTP Card */}
          {shipment.deliveryOtp && ['in_transit', 'picked_up', 'at_delivery', 'arrived_dropoff'].includes(shipment.status) ? (
            <Card style={{ gap: theme.spacing.xs, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.primary }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="bodyBold" color="primary">{t('shipmentNew.deliveryOtpLabel')}</AppText>
                <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
              </View>
              <AppText variant={locale === 'en' ? 'displayEn' : 'displayAr'} color="primary" align="center" style={{ letterSpacing: 8, fontSize: 32, marginVertical: theme.spacing.xs }}>
                {shipment.deliveryOtp}
              </AppText>
              <AppText variant="caption" color="inkMuted" align="center">
                {t('shipmentNew.deliveryOtpHint')}
              </AppText>
            </Card>
          ) : null}

          {shipment.status === 'disputed' ? (
            <Card style={{ borderColor: theme.colors.danger, gap: theme.spacing.sm }}>
              <AppText variant="bodyBold" color="danger">
                {t('shipmentNew.disputedBanner')}
              </AppText>
              {shipment.dispute?.reason ? (
                <AppText variant="body" color="inkMuted">
                  {t('shipmentNew.disputeReasonLabel')}: {shipment.dispute.reason}
                </AppText>
              ) : null}
            </Card>
          ) : null}

          <ShipmentPriceBreakdown pricing={shipment.pricing} locale={locale} />

          <ShipmentRouteMap
            pickup={shipment.pickup.location}
            dropoff={shipment.dropoff.location}
            driver={driverPin}
            height={360}
            showRoute
            pickupPinColor={theme.colors.primary}
            dropoffPinColor={theme.colors.accent}
          />

          {driverCardData ? (
            <Card style={{ gap: theme.spacing.md }}>
              <View style={styles.driverRow}>
                {driverCardData.photoUrl ? (
                  <Image
                    source={{ uri: driverCardData.photoUrl }}
                    style={[styles.driverAvatar, { backgroundColor: theme.colors.line }]}
                  />
                ) : (
                  <View style={[styles.driverAvatar, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Ionicons name="person-outline" size={26} color={theme.colors.primary} />
                  </View>
                )}
                <View style={styles.driverInfo}>
                  <AppText variant="bodyBold">{driverCardData.firstName ?? t('shipment.driver')}</AppText>
                  {driverCardData.vehicle ? (
                    <AppText variant="caption" color="inkMuted">
                      {driverCardData.vehicle.type ?? ''}
                      {driverCardData.vehicle.plate ? ` · ${driverCardData.vehicle.plate}` : ''}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color="inkMuted">
                    {t('sender.home.courierRating', {
                      rating: driverCardData.rating?.average ?? 0,
                      count: driverCardData.rating?.count ?? 0,
                    })}
                  </AppText>
                </View>
                {driverPin ? (
                  <AppText variant="caption" color="primary">
                    {t('shipmentNew.driverLive')}
                  </AppText>
                ) : null}
              </View>

              {activeDriverPhone ? (
                <View style={{ flexDirection: 'row', gap: theme.spacing.md, paddingTop: theme.spacing.xs }}>
                  <ThemeButton
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => void Linking.openURL(`tel:${activeDriverPhone}`)}
                  >
                    <Ionicons name="call-outline" size={18} color={theme.colors.primary} /> {t('shipmentNew.callDriver')}
                  </ThemeButton>
                  <ThemeButton
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => void openWhatsAppForPhone(activeDriverPhone, t('shipmentNew.whatsappPresetDriver'))}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#16A34A" /> {t('shipmentNew.whatsappDriver')}
                  </ThemeButton>
                </View>
              ) : null}
            </Card>
          ) : null}

          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="title">{t('shipment.history')}</AppText>
            <StatusTimeline
              t={t}
              items={shipment.statusHistory.map((entry) => ({ status: entry.status, at: entry.at }))}
            />
          </View>

          {shipmentAllowsDispute(shipment.status) ? (
            <Card style={{ gap: theme.spacing.md }}>
              <AppText variant="bodyBold">{t('shipmentNew.disputeTitle')}</AppText>
              <AppText variant="body" color="inkMuted">
                {t('shipmentNew.disputeExplain')}
              </AppText>
              <ThemeButton variant="secondary" onPress={() => setDisputeOpen(true)}>
                {t('shipmentNew.disputeTitle')}
              </ThemeButton>
            </Card>
          ) : null}

          {shipment.status === 'delivered' ? (
            <ShipmentRatingSection shipment={shipment} locale={locale} rateMut={rateMut} />
          ) : null}

          {!cancelDisabled ? (
            <ThemeButton variant="danger" onPress={() => setReasonOpen(true)}>
              {t('shipmentNew.cancelShipment')}
            </ThemeButton>
          ) : (
            <AppText variant="body" color="inkMuted" align="center">
              {t('shipmentNew.cancelForbidden')}
            </AppText>
          )}
        </ScrollView>
      )}

      <ThemeBottomSheet visible={reasonOpen} onClose={() => setReasonOpen(false)} title={t('shipmentNew.cancelReason')}>
        <ThemeInput
          value={cancelReason}
          onChangeText={setCancelReason}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
          <ThemeButton
            variant="danger"
            loading={cancelMut.isPending}
            disabled={cancelReason.trim().length < 3 || cancelMut.isPending}
            onPress={async () => {
              try {
                await cancelMut.mutateAsync(cancelReason.trim());
                setReasonOpen(false);
                router.replace('/(sender)/(tabs)/shipments');
              } catch (e: unknown) {
                let msg = t('errors.UNKNOWN');
                if (e instanceof HttpApiError) msg = (locale === 'en' ? e.messageEn : e.message) ?? e.messageEn;
                Alert.alert(t('common.errorTitle'), msg);
              }
            }}
          >
            {t('shipmentNew.cancelShipment')}
          </ThemeButton>
          <ThemeButton variant="ghost" onPress={() => setReasonOpen(false)}>
            {t('common.cancel')}
          </ThemeButton>
        </View>
      </ThemeBottomSheet>

      <ThemeBottomSheet
        visible={disputeOpen}
        onClose={() => {
          setDisputeOpen(false);
          setDisputeReason('');
          setDisputePhotoUrl(null);
        }}
        title={t('shipmentNew.disputeTitle')}
        subtitle={t('shipmentNew.disputeExplain')}
      >
        <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: theme.spacing.md }}>
            <ThemeInput
              label={t('shipmentNew.disputeReasonLabel')}
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder={t('shipmentNew.disputeReasonPlaceholder')}
              multiline
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />

            <ThemeButton
              variant="secondary"
              loading={disputePhotoBusy}
              disabled={disputePhotoBusy || disputeMut.isPending}
              onPress={async () => {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) {
                  Alert.alert(t('common.errorTitle'), t('driver.cameraPermissionDenied'));
                  return;
                }
                const shot = await ImagePicker.launchCameraAsync({ quality: 0.7 });
                if (shot.canceled || !shot.assets?.[0]?.uri) return;
                const uri = shot.assets[0].uri;
                setDisputePhotoBusy(true);
                try {
                  const url = await uploadShipmentPhoto(uri);
                  setDisputePhotoUrl(url);
                } catch (e: unknown) {
                  let msg = t('errors.UNKNOWN');
                  if (e instanceof HttpApiError) msg = (locale === 'en' ? e.messageEn : e.message) ?? e.messageEn;
                  Alert.alert(t('common.errorTitle'), msg);
                } finally {
                  setDisputePhotoBusy(false);
                }
              }}
            >
              {disputePhotoUrl ? t('shipmentNew.disputeReplacePhoto') : t('shipmentNew.disputeAddPhoto')}
            </ThemeButton>

            {disputePhotoUrl ? (
              <Image
                source={{ uri: disputePhotoUrl }}
                style={[styles.disputePhoto, { backgroundColor: theme.colors.line, borderRadius: theme.radius.card }]}
                resizeMode="cover"
              />
            ) : null}

            <ThemeButton
              loading={disputeMut.isPending}
              disabled={disputeReason.trim().length < 3 || !disputePhotoUrl || disputeMut.isPending || disputePhotoBusy}
              onPress={async () => {
                if (!disputePhotoUrl || disputeReason.trim().length < 3) return;
                try {
                  await disputeMut.mutateAsync({ reason: disputeReason.trim(), photoUrls: [disputePhotoUrl] });
                  setDisputeOpen(false);
                  setDisputeReason('');
                  setDisputePhotoUrl(null);
                  Alert.alert('', t('shipmentNew.disputeSuccess'));
                } catch (e: unknown) {
                  let msg = t('errors.UNKNOWN');
                  if (e instanceof HttpApiError) msg = (locale === 'en' ? e.messageEn : e.message) ?? e.messageEn;
                  Alert.alert(t('common.errorTitle'), msg);
                }
              }}
            >
              {t('shipmentNew.disputeSubmit')}
            </ThemeButton>
            <ThemeButton
              variant="ghost"
              onPress={() => {
                setDisputeOpen(false);
                setDisputeReason('');
                setDisputePhotoUrl(null);
              }}
            >
              {t('common.cancel')}
            </ThemeButton>
          </View>
        </ScrollView>
      </ThemeBottomSheet>
    </ThemeScreen>
  );
}

const styles = StyleSheet.create({
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  driverInfo: {
    flex: 1,
    gap: 4,
  },
  disputePhoto: {
    width: '100%',
    height: 128,
  },
});
