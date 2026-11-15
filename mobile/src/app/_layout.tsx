import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { errorText } from '../lib/errors';
import { boot, useApp } from '../lib/state';
import { Loading, Screen, T } from '../ui/kit';
import { C } from '../ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fonts] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  const app = useApp();

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (fonts) SplashScreen.hideAsync().catch(() => undefined);
  }, [fonts]);

  if (!fonts) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!app.ready ? (
        <Loading />
      ) : app.fatal ? (
        <Screen title="The app cannot start">
          <T>{errorText(app.fatal)}</T>
          {app.fatal.kind === 'rules' && app.fatal.rule_id ? <T v="mono">Rule: {app.fatal.rule_id}</T> : null}
        </Screen>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.bg },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      )}
    </SafeAreaProvider>
  );
}
