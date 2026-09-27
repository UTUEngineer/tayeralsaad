import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import { ShipmentRouteMap } from '@/components/shipment/ShipmentRouteMap';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ThemeInput } from '@/components/ui/ThemeInput';
import { useTheme } from '@/lib/theme';
import { useMe } from '@/queries/me';
import { useDraftShipmentStore } from '@/stores/draftShipmentStore';

type RouteStepProps = {
  errors: Record<string, string | undefined>;
};

function scrubCityStored(city: string): string {
  return city.trim().toLowerCase();
}

export function CreateRouteStep({ errors }: RouteStepProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: me } = useMe();
  const [focus, setFocus] = useState<'pickup' | 'dropoff'>('pickup');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5`, {
        headers: { 'User-Agent': 'TayrAlSaad/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // silent fallback
    } finally {
      setSearching(false);
    }
  }

  const pickup = useDraftShipmentStore((s) => s.pickup);
  const dropoff = useDraftShipmentStore((s) => s.dropoff);
  const receiver = useDraftShipmentStore((s) => s.receiver);
  const patchPickup = useDraftShipmentStore((s) => s.patchPickup);
  const patchDropoff = useDraftShipmentStore((s) => s.patchDropoff);
  const setReceiver = useDraftShipmentStore((s) => s.setReceiver);
  const applySavedAddressPickup = useDraftShipmentStore((s) => s.applySavedAddressPickup);
  const applySavedAddressDropoff = useDraftShipmentStore((s) => s.applySavedAddressDropoff);

  async function useCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.errorTitle'), t('shipmentNew.permissionLocation'));
      return;
    }
    const cur = await Location.getCurrentPositionAsync({});
    const patch = focus === 'pickup' ? patchPickup : patchDropoff;
    patch({
      location: { lat: cur.coords.latitude, lng: cur.coords.longitude },
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg, paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="caption" color="inkMuted">
        {t('shipmentNew.mapHint')}
      </AppText>

      <View style={{ gap: theme.spacing.xs }}>
        <ThemeInput
          placeholder={t('shipmentNew.searchPlacePlaceholder', { defaultValue: 'ابحث عن منطقة أو شارع (مثال: الكرادة، بغداد)...' })}
          value={searchQuery}
          onChangeText={(v) => void handleSearch(v)}
        />
        {searching ? (
          <AppText variant="caption" color="inkMuted">{t('common.loading')}</AppText>
        ) : null}
        {searchResults.length > 0 ? (
          <View style={{ gap: 4, backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, padding: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.line }}>
            {searchResults.map((item, idx) => (
              <Pressable
                key={idx}
                style={{ padding: 10, borderBottomWidth: idx === searchResults.length - 1 ? 0 : 1, borderBottomColor: theme.colors.line }}
                onPress={() => {
                  const lat = parseFloat(item.lat);
                  const lng = parseFloat(item.lon);
                  const patch = focus === 'pickup' ? patchPickup : patchDropoff;
                  const parts = item.display_name.split(',').map((s) => s.trim());
                  const areaName = parts[0] ?? '';
                  const cityName = parts[1] ?? 'Baghdad';

                  patch({
                    location: { lat, lng },
                    area: areaName,
                    city: scrubCityStored(cityName),
                  });
                  setSearchResults([]);
                  setSearchQuery(item.display_name.slice(0, 30));
                }}
              >
                <AppText variant="caption" color="ink">{item.display_name}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.addressTabs}>
        <AddressTab
          label={t('shipmentNew.pickupLabel')}
          active={focus === 'pickup'}
          summary={`${pickup.area || '—'} · ${pickup.city || '—'}`}
          onPress={() => setFocus('pickup')}
        />
        <AddressTab
          label={t('shipmentNew.dropoffLabel')}
          active={focus === 'dropoff'}
          summary={`${dropoff.area || '—'} · ${dropoff.city || '—'}`}
          onPress={() => setFocus('dropoff')}
        />
      </View>

      <ShipmentRouteMap
        pickup={pickup.location}
        dropoff={dropoff.location}
        height={280}
        showRoute
        draggable={focus}
        onMove={(which, coord) => {
          if (which === 'pickup') patchPickup({ location: coord });
          else patchDropoff({ location: coord });
        }}
        pickupPinColor={theme.colors.primary}
        dropoffPinColor={theme.colors.accent}
      />

      <Pressable accessibilityRole="button" onPress={() => void useCurrentLocation()}>
        <AppText variant="body" color="primary">
          {t('shipmentNew.useLocation')}
        </AppText>
      </Pressable>

      {me?.defaultAddresses?.length ? (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="bodyBold">{t('shipmentNew.savedAddresses')}</AppText>
          {me.defaultAddresses.map((addr, ix) => (
            <Pressable
              key={addr.serverId ?? `${addr.city}-${addr.area}-${ix}`}
              onPress={() => {
                const apply = focus === 'pickup' ? applySavedAddressPickup : applySavedAddressDropoff;
                apply({ ...addr, city: scrubCityStored(addr.city) });
              }}
            >
              <Card>
                <AppText variant="body">{[addr.city, addr.area].filter(Boolean).join(' · ')}</AppText>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}

      {focus === 'pickup' ? (
        <View style={{ gap: theme.spacing.md }}>
          <ThemeInput label={t('shipmentNew.city')} value={pickup.city} onChangeText={(v) => patchPickup({ city: v })} error={errors.pickupCity} />
          <ThemeInput label={t('shipmentNew.area')} value={pickup.area} onChangeText={(v) => patchPickup({ area: v })} error={errors.pickupArea} />
          <ThemeInput label={t('shipmentNew.street')} value={pickup.street ?? ''} onChangeText={(v) => patchPickup({ street: v })} />
          <ThemeInput label={t('shipmentNew.building')} value={pickup.building ?? ''} onChangeText={(v) => patchPickup({ building: v })} />
          <ThemeInput label={t('shipmentNew.notes')} value={pickup.notes ?? ''} onChangeText={(v) => patchPickup({ notes: v })} />
        </View>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <ThemeInput label={t('shipmentNew.city')} value={dropoff.city} onChangeText={(v) => patchDropoff({ city: v })} error={errors.dropoffCity} />
          <ThemeInput label={t('shipmentNew.area')} value={dropoff.area} onChangeText={(v) => patchDropoff({ area: v })} error={errors.dropoffArea} />
          <ThemeInput label={t('shipmentNew.street')} value={dropoff.street ?? ''} onChangeText={(v) => patchDropoff({ street: v })} />
          <ThemeInput label={t('shipmentNew.building')} value={dropoff.building ?? ''} onChangeText={(v) => patchDropoff({ building: v })} />
          <ThemeInput label={t('shipmentNew.notes')} value={dropoff.notes ?? ''} onChangeText={(v) => patchDropoff({ notes: v })} />
          <AppText variant="bodyBold" style={{ marginTop: theme.spacing.sm }}>
            {t('shipmentNew.receiverSection')}
          </AppText>
          <ThemeInput
            label={t('shipment.receiver')}
            value={receiver.name}
            onChangeText={(name) => setReceiver({ ...receiver, name })}
            error={errors.receiverName}
          />
          <ThemeInput
            label={t('auth.phoneTitle')}
            keyboardType="phone-pad"
            value={receiver.phone}
            onChangeText={(phone) => setReceiver({ ...receiver, phone })}
            error={errors.receiverPhone}
          />
        </View>
      )}
    </ScrollView>
  );
}

function AddressTab({
  label,
  summary,
  active,
  onPress,
}: {
  label: string;
  summary: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.tab,
        {
          borderColor: active ? theme.colors.primary : theme.colors.line,
          backgroundColor: active ? theme.colors.surface : theme.colors.surfaceAlt,
        },
      ]}
    >
      <AppText variant="caption" color={active ? 'primary' : 'inkMuted'}>
        {label}
      </AppText>
      <AppText variant="bodyBold" numberOfLines={1}>
        {summary}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addressTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    minHeight: 48,
  },
});
