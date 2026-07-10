import React from 'react';
import { Tabs } from 'expo-router';
import { FloatingDock, TabItem } from '../../components/FloatingDock';
import { Home, Search, Heart, User } from 'lucide-react-native';

export default function TabsLayout() {
  // Define standard tabs for regular users (House Hunters)
  const defaultTabs: TabItem[] = [
    { key: 'index', label: 'Feed', icon: Home },
    { key: 'search', label: 'Search', icon: Search },
    { key: 'saved', label: 'Saved', icon: Heart },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <Tabs
      tabBar={(props) => {
        const activeTabRoute = props.state.routes[props.state.index];
        const activeTabKey = activeTabRoute.name;

        const handleTabPress = (key: string) => {
          const event = props.navigation.emit({
            type: 'tabPress',
            target: props.state.routes.find((r) => r.name === key)?.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            props.navigation.navigate(key);
          }
        };

        return (
          <FloatingDock
            tabs={defaultTabs}
            activeTab={activeTabKey}
            onTabPress={handleTabPress}
          />
        );
      }}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
