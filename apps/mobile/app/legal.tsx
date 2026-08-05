import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { Alert, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';

export default function LegalScreen() {
  const { t } = useTranslation();

  const handleOpen = async (urlKey: string, defaultUrl: string) => {
    const raw = String(t(urlKey, { defaultValue: defaultUrl }));
    const url = raw.startsWith('http') ? raw : defaultUrl;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.errorTitle'), t('errors.UNKNOWN'));
      }
    } catch {
      Alert.alert(t('common.errorTitle'), t('errors.UNKNOWN'));
    }
  };

  return (
    <Screen className="px-5 pt-8">
      <Text className="mb-10 text-xl font-semibold text-ink">{t('legal.title')}</Text>

      <View className="gap-6">
        <Pressable
          accessibilityRole="link"
          className="rounded-2xl bg-surface px-4 py-5"
          onPress={() => void handleOpen('legal.privacyUrl', 'https://smartgateapp.com/privacy')}
        >
          <Text className="text-lg font-medium text-primary">{t('legal.privacy')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          className="rounded-2xl bg-surface px-4 py-5"
          onPress={() => void handleOpen('legal.termsUrl', 'https://smartgateapp.com/terms')}
        >
          <Text className="text-lg font-medium text-primary">{t('legal.terms')}</Text>
        </Pressable>
      </View>

      <Text className="mt-10 text-center text-sm text-inkSoft">{t('misc.legalNote')}</Text>
    </Screen>
  );
}
