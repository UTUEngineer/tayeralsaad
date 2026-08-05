import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { openWhatsAppForPhone } from '@/lib/whatsapp';

const SUPPORT_PHONE = '+9647700000000';
const SUPPORT_WHATSAPP = '+9647700000000';

export default function HelpSupportScreen() {
  const { t } = useTranslation();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    { q: t('help.faq1Q'), a: t('help.faq1A') },
    { q: t('help.faq2Q'), a: t('help.faq2A') },
    { q: t('help.faq3Q'), a: t('help.faq3A') },
  ];

  const handleCall = async () => {
    try {
      await Linking.openURL(`tel:${SUPPORT_PHONE}`);
    } catch {
      Alert.alert(t('common.errorTitle'), t('errors.UNKNOWN'));
    }
  };

  return (
    <Screen className="flex-1 bg-bg px-5 pt-6">
      <View className="flex-row items-center gap-3 mb-6">
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text className="text-xl font-bold text-ink">{t('help.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Direct Contact Options */}
        <View className="mb-8 gap-4">
          <Text className="text-sm font-semibold text-inkSoft uppercase">{t('help.contactUs')}</Text>
          <Pressable
            onPress={() => void openWhatsAppForPhone(SUPPORT_WHATSAPP, 'السلام عليكم، أحتاج مساعدة في تطبيق طير السعد')}
            className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="logo-whatsapp" size={24} color="#16A34A" />
              <Text className="text-base font-semibold text-ink">{t('help.whatsappUs')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </Pressable>

          <Pressable
            onPress={() => void handleCall()}
            className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="call-outline" size={24} color="#0284C7" />
              <Text className="text-base font-semibold text-ink">{t('help.callUs')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* FAQs */}
        <View className="gap-4">
          <Text className="text-sm font-semibold text-inkSoft uppercase">{t('help.faqTitle')}</Text>
          {faqs.map((faq, index) => {
            const isOpen = expandedFaq === index;
            return (
              <View key={index} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <Pressable
                  onPress={() => setExpandedFaq(isOpen ? null : index)}
                  className="flex-row items-center justify-between px-5 py-4"
                >
                  <Text className="flex-1 text-base font-medium text-ink pr-3">{faq.q}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
                </Pressable>
                {isOpen ? (
                  <View className="border-t border-border bg-bg px-5 py-4">
                    <Text className="text-sm leading-6 text-inkSoft">{faq.a}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
