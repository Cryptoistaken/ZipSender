/**
 * Type shim for expo-file-system/legacy subpath.
 *
 * expo-file-system@~18.0.11 (SDK 52) does not declare the /legacy subpath
 * in its package.json exports map, so TypeScript cannot resolve it.
 * The runtime module exists; this shim restores type coverage.
 *
 * Remove this file once expo-file-system is upgraded to SDK 53+.
 */
declare module 'expo-file-system/legacy' {
  export * from 'expo-file-system';
}
