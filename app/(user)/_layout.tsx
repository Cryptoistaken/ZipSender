import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

// Custom tab bar icon with active dot indicator — matches .nav-dot in prototype
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
      <MaterialCommunityIcons name={name} size={21} color={color} />
      {focused && <View style={navStyles.dot} />}
    </View>
  );
}

const navStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  // .nav-dot — 4×4 circle, cream bg, radius 50%
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cream,
  },
});

export default function UserLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            // Matches prototype: rgba(10,10,10,0.92) + blur + 22px radius
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
            elevation: 20,
            // iOS frosted glass shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
          },
          tabBarItemStyle: {
            paddingVertical: 9,
            paddingBottom: 10,
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
