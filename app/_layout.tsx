import { useEffect } from "react";
import { Platform, Alert, Linking } from "react-native";
import { Stack } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import {
  useFonts,
  Almarai_300Light,
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif";
import * as SplashScreen from "expo-splash-screen";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as IntentLauncher from "expo-intent-launcher";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CONVEX_URL = "https://majestic-fennec-666.eu-west-1.convex.cloud";
const convex = new ConvexReactClient(CONVEX_URL);

const PERMS_ASKED_KEY = "zipsender-perms-asked-v1";

SplashScreen.preventAutoHideAsync().catch(() => {});

async function ensureAppDir() {
  try {
    const dir = FileSystem.documentDirectory + "ZipSender/";
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {}
}

async function requestManageStorageIfNeeded() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync(
      "android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION",
      { data: "package:com.zipsender.app" }
    );
  } catch {}
}

async function requestAllPermissions() {
  if (Platform.OS !== "android") return;

  try {
    const already = await AsyncStorage.getItem(PERMS_ASKED_KEY);
    if (already === "true") return;
  } catch {}

  let anyDenied = false;

  try {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(
      false,
      ["video", "audio", "photo"]
    );
    if (status !== "granted") {
      anyDenied = true;
      if (!canAskAgain) {
        Alert.alert(
          "Storage Permission Required",
          "ZipSender needs media access to save and play downloaded videos.\n\nPlease enable it in App Settings → Permissions → Files and Media.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Later", style: "cancel" },
          ]
        );
        await AsyncStorage.setItem(PERMS_ASKED_KEY, "true");
        return;
      }
    }
  } catch {}

  if (!anyDenied) {
    await new Promise<void>((resolve) => {
      Alert.alert(
        "Full Storage Access",
        "ZipSender also needs full storage access to open downloaded files in any player.\n\nTap Allow on the next screen.",
        [
          {
            text: "Continue",
            onPress: () => requestManageStorageIfNeeded().finally(resolve),
          },
          { text: "Skip", style: "cancel", onPress: () => resolve() },
        ]
      );
    });
  } else {
    Alert.alert(
      "Permissions Needed",
      "ZipSender needs storage permissions to save and play downloaded videos. Some features may not work without them.",
      [{ text: "OK" }]
    );
  }

  try {
    await AsyncStorage.setItem(PERMS_ASKED_KEY, "true");
  } catch {}
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Almarai_300Light,
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
    InstrumentSerif_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      ensureAppDir();
      requestAllPermissions();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
  root: { flex: 1, backgroundColor: "#101010" },
});