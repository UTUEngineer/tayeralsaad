import '../global.css';

import { useEffect, useMemo, useState } from 'react';

import i18next, { initI18n } from '@/lib/i18n';
import { useAppFonts } from '@/lib/fonts/useAppFonts';

import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter } from 'expo-router';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryClientProvider } from '@tanstack/react-query';

import { clearUnauthorizedRegistration, registerUnauthorized } from '@/lib/authEvents';
import { initSentry } from '@/lib/sentry';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  usePushNotifications();
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const { fontsLoaded, fontError } = useAppFonts();
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const i18nextInstance = useMemo(() => i18next, []);

  useEffect(() => {
    initSentry();

    registerUnauthorized(() => {
      void useAuthStore.getState().logout();
      queryClient.clear();
      router.replace('/(auth)/login');
    });

    let cancelled = false;
    void (async () => {
      try {
        await initI18n();
        await hydrate();
      } finally {
        if (!cancelled) {
          setBootstrapReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearUnauthorizedRegistration();
    };
  }, [hydrate, router]);

  useEffect(() => {
    if (bootstrapReady && fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [bootstrapReady, fontsLoaded]);

  if (!bootstrapReady || !fontsLoaded) {
    return null;
  }

  if (fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18nextInstance}>
            <StatusBar style="dark" />
            <Slot />
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
