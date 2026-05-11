import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

function NavIcon({
  name,
  color,
  focused,
}: {
  name: any;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={navStyles.wrap}>
      {focused && <View style={navStyles.indicator} />}
      <MaterialCommunityIcons name={name} size={21} color={color} />
    </View>
  );
}

const navStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 44, height: 32 },
  indicator: {
    position: 'absolute',
    width: 44,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
  },
});

export default function UserLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(12,12,12,0.96)',
            borderTopWidth: 0,
            position: 'absolute',
            bottom: 16,
            left: 12,
            right: 12,
            borderRadius: 20,
            height: 64,
            borderWidth: 1,
            borderColor: Colors.cream10,
            elevation: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 28,
          },
          tabBarItemStyle: {
            paddingVertical: 10,
            paddingBottom: 11,
          },
          tabBarActiveTintColor: Colors.cream,
          tabBarInactiveTintColor: Colors.cream50,
          tabBarLabelStyle: {
            fontFamily: Fonts.bold,
            fontSize: 8,
            letterSpacing: 0.08 * 8,
            textTransform: 'uppercase',
            marginTop: 0,
          },
          tabBarShowLabel: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <NavIcon name="home-outline" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: 'Downloads',
            tabBarIcon: ({ color, focused }) => (
              <NavIcon name="download-outline" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}