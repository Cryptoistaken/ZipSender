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
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as IntentLauncher from "expo-intent-launcher";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CONVEX_URL = "https://majestic-fennec-666.eu-west-1.convex.cloud";
const convex = new ConvexReactClient(CONVEX_URL);

const PERMS_ASKED_KEY = "zipsender-perms-asked-v1";

SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Ensure the app's private working directory exists ─────────────────────────
async function ensureAppDir() {
  try {
    const dir = FileSystem.documentDirectory + "ZipSender/";
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {}
}

// ── Request MANAGE_EXTERNAL_STORAGE via settings intent (Android 11+ / API 30+) ──
// This permission cannot be requested via requestPermissionsAsync — it requires
// the user to grant it from the system settings screen.
async function requestManageStorageIfNeeded() {
  if (Platform.OS !== "android") return;
  // Only required on API 30+ (Android 11+). minSdkVersion is 24 so we guard.
  // There's no JS API to check MANAGE_EXTERNAL_STORAGE status; we just open
  // the settings page and let the user decide. We do this only on first run.
  try {
    await IntentLauncher.startActivityAsync(
      "android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION",
      { data: "package:com.zipsender.app" }
    );
  } catch {
    // Device doesn't support this intent (API < 30) — that's fine, skip
  }
}

// ── Main permission request sequence ─────────────────────────────────────────
// Runs once on first launch (guarded by AsyncStorage flag).
// Request order:
//   1. MediaLibrary — covers READ_MEDIA_VIDEO / READ_MEDIA_IMAGES / READ_MEDIA_AUDIO
//      (Android 13+ granular) and READ/WRITE_EXTERNAL_STORAGE (Android < 10 implied)
//   2. MANAGE_EXTERNAL_STORAGE — opens system settings on Android 11+
async function requestAllPermissions() {
  if (Platform.OS !== "android") return;

  // Guard: only ask once per install
  try {
    const already = await AsyncStorage.getItem(PERMS_ASKED_KEY);
    if (already === "true") return;
  } catch {}

  let anyDenied = false;

  // Step 1: MediaLibrary — request granular media permissions (Android 13+)
  // On older Android versions the granular array is ignored and the standard
  // READ/WRITE_EXTERNAL_STORAGE grant is requested instead.
  try {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(
      false, // writeOnly = false (we need read too)
      ["video", "audio", "photo"] // granularPermissions — Android 13+ (API 33+)
    );
    if (status !== "granted") {
      anyDenied = true;
      if (!canAskAgain) {
        // User permanently denied — show settings link
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

  // Step 2: MANAGE_EXTERNAL_STORAGE — required to access arbitrary files
  // outside the app sandbox on Android 11+. Opens the system settings page.
  // We prompt the user first so they understand why the settings screen appears.
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

  // Mark as asked regardless of outcome
  try {
    await AsyncStorage.setItem(PERMS_ASKED_KEY, "true");
  } catch {}
}

// ── Root layout ───────────────────────────────────────────────────────────────
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
