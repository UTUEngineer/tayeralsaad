import React from 'react';
import { View, TouchableOpacity, Text, Linking, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme';
import { openWhatsAppForPhone } from '@/lib/whatsapp';

interface DriverContactActionsProps {
  driverPhone: string;
  driverName?: string;
}

export const DriverContactActions: React.FC<DriverContactActionsProps> = ({ driverPhone }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const handlePhoneCall = () => {
    if (driverPhone) {
      void Linking.openURL(`tel:${driverPhone}`);
    }
  };

  const handleWhatsAppChat = () => {
    if (driverPhone) {
      openWhatsAppForPhone(driverPhone);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={handlePhoneCall} 
        style={[styles.btn, { backgroundColor: theme.colors.primary }]}
        activeOpacity={0.8}
      >
        <Ionicons name="call" size={18} color="#FFF" />
        <Text style={styles.btnText}>{t('shipment.call_driver')}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handleWhatsAppChat} 
        style={[styles.btn, { backgroundColor: '#25D366' }]}
        activeOpacity={0.8}
      >
        <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
        <Text style={styles.btnText}>{t('shipment.whatsapp')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});
