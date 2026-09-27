import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'طير السعد',
  slug: 'tayralsaad',
  scheme: 'tayralsaad',
  version: '1.0.4',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#F8F3EA',
  splash: {
    backgroundColor: '#F8F3EA',
    resizeMode: 'contain',
  },
  newArchEnabled: true,
  platforms: ['ios', 'android'],
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Tayr Al-Saad uses your location to set pickup and drop-off pins on the map.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Tayr Al-Saad needs photo access for delivery proof uploads.',
        cameraPermission: 'Tayr Al-Saad uses the camera for pickup and delivery photos.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '1fb8cc6b-624b-47bc-9e7c-2710d2452d1f',
    },
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL ??
      (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:4000/api/v1' : 'https://api.tayralsaad.iq/api/v1'),
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '1fb8cc6b-624b-47bc-9e7c-2710d2452d1f',
    webPublicUrl:
      process.env.EXPO_PUBLIC_WEB_URL ??
      (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : 'https://tayralsaad.iq'),
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'iq.utu.tayralsaad',
    buildNumber: '6',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'iq.utu.tayralsaad',
    versionCode: 7,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'smartgateapp.com',
            pathPrefix: '/open',
          },
          {
            scheme: 'https',
            host: 'www.smartgateapp.com',
            pathPrefix: '/open',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
};

export default config;
