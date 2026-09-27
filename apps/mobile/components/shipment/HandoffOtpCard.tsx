import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme';

interface HandoffOtpCardProps {
  status: 'PENDING_PICKUP' | 'OUT_FOR_DELIVERY' | string;
  pickupOtp?: string;
  deliveryOtp?: string;
}

export const HandoffOtpCard: React.FC<HandoffOtpCardProps> = ({ status, pickupOtp, deliveryOtp }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const normalizedStatus = (status || '').toLowerCase();

  const isPickup =
    normalizedStatus === 'pending_pickup' ||
    normalizedStatus === 'courier_arrived_pickup' ||
    normalizedStatus === 'assigned' ||
    normalizedStatus === 'at_pickup' ||
    normalizedStatus === 'pending';

  const isDelivery =
    normalizedStatus === 'out_for_delivery' ||
    normalizedStatus === 'courier_arrived_delivery' ||
    normalizedStatus === 'in_transit' ||
    normalizedStatus === 'picked_up' ||
    normalizedStatus === 'at_delivery' ||
    normalizedStatus === 'arrived_dropoff';

  const activeOtp = isPickup ? pickupOtp : isDelivery ? deliveryOtp : null;

  if (!activeOtp) return null;

  const cardBg = theme.colors.surfaceAlt ?? theme.colors.surface;
  const cardBorder = theme.colors.primary;
  const textColor = theme.colors.ink;
  const subtextColor = theme.colors.inkMuted;
  const digitBg = theme.colors.surface ?? '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <Text style={[styles.title, { color: textColor }]}>
        {isPickup ? t('tracking.pickup_code_title') : t('tracking.delivery_code_title')}
      </Text>
      <Text style={[styles.instruction, { color: subtextColor }]}>
        {t('tracking.otp_share_warning')}
      </Text>
      <View style={styles.codeContainer}>
        {activeOtp.split('').map((digit, idx) => (
          <View key={idx} style={[styles.digitBox, { backgroundColor: digitBg, borderColor: theme.colors.line }]}>
            <Text style={[styles.digitText, { color: theme.colors.primary }]}>{digit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 16, borderWidth: 1, marginVertical: 10 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  instruction: { fontSize: 12, textAlign: 'center', marginBottom: 12 },
  codeContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  digitBox: { width: 44, height: 50, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  digitText: { fontSize: 24, fontWeight: '800' },
});
