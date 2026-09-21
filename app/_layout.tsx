import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { colors } from '@/components/theme';
import { bootstrapApp } from '@/services/bootstrap';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void bootstrapApp()
      .catch(() => undefined)
      .finally(async () => {
        if (!cancelled) {
          setReady(true);
          await SplashScreen.hideAsync().catch(() => undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="permissions" options={{ title: 'Get started' }} />
        <Stack.Screen name="history" options={{ title: 'History' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="record" options={{ title: 'Audio' }} />
        <Stack.Screen name="debug" options={{ title: 'Debug' }} />
      </Stack>
    </>
  );
}
