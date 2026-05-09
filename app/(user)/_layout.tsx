import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

export default function UserLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Pill-shaped floating nav bar like the prototype .bottom-nav
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,10,0.92)',
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
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Downloads',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="download-circle" color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
