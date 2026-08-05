import type { ReactNode } from 'react';

import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';

import { Link, router } from 'expo-router';

import { queryClient } from '@/lib/queryClient';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore } from '@/stores/authStore';

export function SharedProfileScreen({ prepend }: { prepend?: ReactNode }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const clearDashboardShell = useAuthStore((s) => s.clearDashboardShell);

  return (
    <Screen className="px-5 pt-8">
      <Text className="text-lg font-semibold text-ink">{t('navigation.profile')}</Text>
      {user ? (
        <View className="mt-8 gap-1">
          <Text className="text-base text-ink">{user.name}</Text>
          <Text className="text-sm text-inkSoft">{user.phone}</Text>
        </View>
      ) : null}

      {prepend ? <View className="mt-10 gap-4">{prepend}</View> : null}

      <View className="mt-12 gap-4">
        <Pressable
          className="rounded-xl bg-surface px-4 py-4"
          accessibilityRole="button"
          onPress={() => {
            void clearDashboardShell().then(() => router.replace('/select-role'));
          }}
        >
          <Text className="text-base font-medium text-ink">{t('auth.switchDashboard')}</Text>
        </Pressable>
        <Link href="/language" asChild>
          <Pressable className="rounded-xl bg-surface px-4 py-4">
            <Text className="text-base font-medium text-ink">{t('language.title')}</Text>
          </Pressable>
        </Link>
        <Link href="/help" asChild>
          <Pressable className="rounded-xl bg-surface px-4 py-4">
            <Text className="text-base font-medium text-ink">{t('help.title')}</Text>
          </Pressable>
        </Link>
        <Link href="/legal" asChild>
          <Pressable className="rounded-xl bg-surface px-4 py-4">
            <Text className="text-base font-medium text-ink">{t('legal.title')}</Text>
          </Pressable>
        </Link>
        <Pressable
          className="rounded-xl border border-danger px-4 py-4"
          accessibilityRole="button"
          onPress={() =>
            Alert.alert(t('auth.logout'), undefined, [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('auth.logout'),
                style: 'destructive',
                onPress: async () => {
                  await logout();
                  queryClient.clear();
                  router.replace('/(auth)/login');
                },
              },
            ])
          }
        >
          <Text className="text-base font-semibold text-danger">{t('auth.logout')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
