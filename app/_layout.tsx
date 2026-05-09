import { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
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
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Hardcoded Convex URL — no env var needed at runtime
const CONVEX_URL = 'https://majestic-fennec-666.eu-west-1.convex.cloud';
const convex = new ConvexReactClient(CONVEX_URL);

async function requestPermissions() {
  try {
    if (Platform.OS === 'android') {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Storage Permission',
          'ZipSender needs storage access to save downloaded files. Some features may not work without it.',
          [{ text: 'OK' }]
        );
      }
    }

    // Ensure ZipSender download folder exists
    const dir = FileSystem.documentDirectory + 'ZipSender/';
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch (err) {
    console.warn('Permission request failed:', err);
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Almarai_300Light,
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      requestPermissions();
    }
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ConvexProvider client={convex}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101010' },
});
