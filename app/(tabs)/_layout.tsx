import { Tabs } from 'expo-router';
import { IconButton } from 'react-native-paper';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6200ee' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconButton icon="home" iconColor={color as string} />,
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color }) => <IconButton icon="map-marker-radius" iconColor={color as string} />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color }) => <IconButton icon="contacts" iconColor={color as string} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconButton icon="cog" iconColor={color as string} />,
        }}
      />
    </Tabs>
  );
}
