import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import {
  useFonts,
  Almarai_300Light,
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from '@expo-google-fonts/almarai';
import * as SplashScreen from 'expo-splash-screen';

// Hardcoded Convex URL — no env var needed at runtime
const CONVEX_URL = 'https://majestic-fennec-666.eu-west-1.convex.cloud';
const convex = new ConvexReactClient(CONVEX_URL);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Almarai_300Light,
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  useEffect(() => {
    // Hide splash as soon as fonts are done (or immediately if already loaded)
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Always render — never block on fonts. System fonts show until custom fonts load.
  return (
    <GestureHandlerRootView style={styles.root}>
      <ConvexProvider client={convex}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101010' },
});
