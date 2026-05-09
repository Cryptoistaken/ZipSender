import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.card },
        headerTintColor: Colors.cream,
        headerTitleStyle: {
          fontFamily: Fonts.bold,
          fontSize: 16,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.surface },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Panel' }} />
    </Stack>
  );
}
