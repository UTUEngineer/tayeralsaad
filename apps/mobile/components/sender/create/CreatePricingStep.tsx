import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { ServiceTier } from '@tayralsaad/types';
import { useTranslation } from 'react-i18next';

import { formatIQD } from '@tayralsaad/utils';
import i18next from 'i18next';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ThemeInput } from '@/components/ui/ThemeInput';
import { useTheme } from '@/lib/theme';
import { useDraftShipmentStore } from '@/stores/draftShipmentStore';

const TIERS: ServiceTier[] = ['standard', 'express', 'scheduled'];

function iqLocale(): 'ar' | 'en' {
  return i18next.language.startsWith('en') ? 'en' : 'ar';
}

export function CreatePricingStep() {
  const theme = useTheme();
  const { t } = useTranslation();
  const locale = iqLocale();

  const service = useDraftShipmentStore((s) => s.service);
  const scheduledIso = useDraftShipmentStore((s) => s.scheduledForIso);
  const setService = useDraftShipmentStore((s) => s.setService);
  const lastQuote = useDraftShipmentStore((s) => s.lastQuote);
  const quoteErr = useDraftShipmentStore((s) => s.quoteErrorCode);

  const scheduledDate = useMemo(
    () => (scheduledIso ? new Date(scheduledIso) : new Date(Date.now() + 45 * 60_000)),
    [scheduledIso],
  );
  const [scheduledLocal, setScheduledLocal] = useState(scheduledDate);
  const [pickerShown, setPickerShown] = useState(Platform.OS === 'ios');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const tierLabels: Record<ServiceTier, string> = {
    standard: t('shipment.tierStandard'),
    express: t('shipment.tierExpress'),
    scheduled: t('shipment.tierScheduled'),
  };

  function selectTier(next: ServiceTier) {
    if (next !== 'scheduled') {
      setService(next, null);
      return;
    }
    setService(next, scheduledLocal.toISOString());
    if (Platform.OS === 'android') setPickerShown(true);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg, paddingBottom: 120 }}>
      <View style={{ gap: theme.spacing.sm }}>
        {TIERS.map((tier) => {
          const selected = service === tier;
          return (
            <Pressable key={tier} accessibilityRole="button" onPress={() => selectTier(tier)}>
              <Card
                style={{
                  borderWidth: 1.5,
                  borderColor: selected ? theme.colors.primary : theme.colors.line,
                }}
              >
                <AppText variant="bodyBold" color={selected ? 'primary' : 'ink'}>
                  {tierLabels[tier]}
                </AppText>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {service === 'scheduled' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="bodyBold">{t('shipmentNew.scheduledFor')}</AppText>
          {Platform.OS === 'android' && !pickerShown ? (
            <Pressable accessibilityRole="button" onPress={() => setPickerShown(true)}>
              <AppText variant="body" color="primary">
                {t('shipmentNew.scheduledFor')}
              </AppText>
            </Pressable>
          ) : null}
          {(Platform.OS === 'android' ? pickerShown : true) ? (
            <DateTimePicker
              value={scheduledLocal}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: DateTimePickerEvent, picked?: Date) => {
                if (Platform.OS === 'android') setPickerShown(false);
                if (event.type === 'dismissed' || !picked) return;
                setScheduledLocal(picked);
                setService('scheduled', picked.toISOString());
              }}
            />
          ) : null}
        </View>
      ) : null}

      {quoteErr ? (
        <AppText variant="body" color="danger">
          {t(`errors.${quoteErr}`, { defaultValue: t('errors.UNKNOWN') })}
        </AppText>
      ) : null}

      {!lastQuote && !quoteErr ? (
        <AppText variant="body" color="inkMuted">
          {t('shipmentNew.quoteStale')}
        </AppText>
      ) : null}

      {lastQuote ? (
        <Card style={{ gap: theme.spacing.md }}>
          <AppText variant="bodyBold">{t('shipmentNew.promoTitle', { defaultValue: 'كوبون الخصم' })}</AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
            <ThemeInput
              placeholder={t('shipmentNew.promoPlaceholder', { defaultValue: 'أدخل كود الخصم (مثال: WELCOME10)' })}
              value={promoCode}
              onChangeText={(val) => {
                setPromoCode(val);
                if (promoApplied) {
                  setPromoApplied(false);
                  setPromoDiscount(0);
                }
              }}
              style={{ flex: 1 }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const code = promoCode.trim().toUpperCase();
                if (code === 'WELCOME10' || code === 'TAYR10' || code === 'TAYR20') {
                  const pct = code.endsWith('20') ? 0.2 : 0.1;
                  const discount = Math.round(lastQuote.pricing.total * pct);
                  setPromoDiscount(discount);
                  setPromoApplied(true);
                } else if (code) {
                  Alert.alert(t('common.errorTitle'), t('shipmentNew.promoInvalid', { defaultValue: 'كود الخصم غير صالح' }));
                }
              }}
              style={{
                backgroundColor: theme.colors.primary,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: 14,
                borderRadius: theme.radius.button,
              }}
            >
              <AppText variant="bodyBold" color="white">
                {t('common.confirm')}
              </AppText>
            </Pressable>
          </View>

          {promoApplied ? (
            <AppText variant="caption" color="accent">
              ✓ {t('shipmentNew.promoApplied', { defaultValue: 'تم تطبيق الخصم بنجاح!' })}
            </AppText>
          ) : null}

          <View style={{ height: 1, backgroundColor: theme.colors.line, marginVertical: theme.spacing.xs }} />

          <AppText variant="title" color="primary" align="center">
            {formatIQD(Math.max(0, lastQuote.pricing.total - promoDiscount), locale)}
          </AppText>
          <View style={{ alignSelf: 'stretch', gap: theme.spacing.xs }}>
            <PriceRow label={t('shipmentNew.pricingBase')} value={formatIQD(lastQuote.pricing.base, locale)} />
            <PriceRow label={t('shipmentNew.pricingDistance')} value={formatIQD(lastQuote.pricing.distance, locale)} />
            {lastQuote.pricing.surcharge > 0 ? (
              <PriceRow label={t('shipmentNew.pricingSurcharge')} value={formatIQD(lastQuote.pricing.surcharge, locale)} />
            ) : null}
            {promoDiscount > 0 ? (
              <PriceRow label={t('shipmentNew.promoDiscount', { defaultValue: 'خصم الكوبون' })} value={`-${formatIQD(promoDiscount, locale)}`} />
            ) : null}
          </View>
          {typeof lastQuote.etaMinutes === 'number' ? (
            <AppText variant="caption" color="inkMuted" align="center">
              {t('shipmentNew.etaMinutes', { minutes: lastQuote.etaMinutes })}
            </AppText>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText variant="caption" color="inkMuted">
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}
