/**
 * This file is intentionally empty.
 *
 * Previously declared a module shim for 'expo-file-system/legacy', but
 * expo-file-system@~18.0.11 (SDK 52) has no /legacy subpath at all —
 * Metro cannot resolve it at bundle time regardless of type shims.
 *
 * All imports were changed to use 'expo-file-system' directly, which
 * exports StorageAccessFramework, DownloadResumable, and all other
 * APIs used by this project.
 *
 * The /legacy subpath only exists in SDK 53+. Remove this file if
 * upgrading Expo beyond SDK 52.
 */
