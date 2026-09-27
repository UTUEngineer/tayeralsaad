import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme';
import { Screen } from '@/components/ui/Screen';
import { openWhatsAppForPhone } from '@/lib/whatsapp';

export default function LegalScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const openLink = (url: string) => {
    if (url.startsWith('https://wa.me/') || url.includes('wa.me')) {
      openWhatsAppForPhone('9647700000000');
    } else {
      void Linking.openURL(url);
    }
  };

  return (
    <Screen style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Text style={[styles.title, { color: theme.colors.ink }]}>{t('legal.title')}</Text>

      <View style={styles.list}>
        <TouchableOpacity 
          style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line }]} 
          onPress={() => openLink('https://smartgateapp.com/privacy')}
          activeOpacity={0.7}
        >
          <Text style={[styles.itemText, { color: theme.colors.primary }]}>{t('legal.privacy')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line }]} 
          onPress={() => openLink('https://smartgateapp.com/terms')}
          activeOpacity={0.7}
        >
          <Text style={[styles.itemText, { color: theme.colors.primary }]}>{t('legal.terms')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line }]} 
          onPress={() => openLink('https://wa.me/9647700000000')}
          activeOpacity={0.7}
        >
          <Text style={[styles.itemText, { color: theme.colors.primary }]}>{t('legal.support')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footnote, { color: theme.colors.inkMuted }]}>{t('misc.legalNote')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  list: { gap: 12 },
  item: { padding: 18, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemText: { fontSize: 16, fontWeight: '600' },
  footnote: { marginTop: 32, textAlign: 'center', fontSize: 13 },
});
