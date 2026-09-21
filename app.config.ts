import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Internal Location Tracker',
  slug: 'internal-location-tracker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'locationtracker',
  userInterfaceStyle: 'dark',
  platforms: ['android'],
  android: {
    package: 'com.internal.locationtracker',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#0F172A',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'POST_NOTIFICATIONS',
      'WAKE_LOCK',
      'RECEIVE_BOOT_COMPLETED',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'RECORD_AUDIO',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: false,
        data: [
          {
            scheme: 'locationtracker',
            host: 'oauthredirect',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-secure-store',
    'expo-sqlite',
    'expo-task-manager',
    [
      'expo-location',
      {
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        locationWhenInUsePermission:
          'This internal testing app collects precise location while you use it.',
        locationAlwaysAndWhenInUsePermission:
          'This internal testing app continues collecting location while running in the background.',
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission:
          'Allow Internal Location Tracker to record audio only when you tap Start Recording.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0F172A',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
