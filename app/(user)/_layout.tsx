import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

export default function UserLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(10,10,10,0.95)',
            borderTopWidth: 0,
            position: 'absolute',
            bottom: 18,
            left: 14,
            right: 14,
            borderRadius: 22,
            height: 62,
            borderWidth: 1,
            borderColor: Colors.cream10,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            paddingVertical: 9,
          },
          tabBarActiveTintColor: Colors.cream,
          tabBarInactiveTintColor: Colors.cream30,
          tabBarLabelStyle: {
            fontFamily: Fonts.bold,
            fontSize: 8,
            letterSpacing: 0.08 * 8,
            textTransform: 'uppercase',
            marginTop: 3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="home-variant" color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: 'Downloads',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="download-circle" color={color} size={22} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
