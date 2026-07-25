import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { FloatingDock } from '../../components/FloatingDock';
import { APP_TABS } from '../../navigation/tabs';
import { hapticsService } from '../../services/hapticsService';

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab key based on pathname
  let activeTab = 'index';
  if (pathname.includes('/discover')) {
    activeTab = 'discover';
  } else if (pathname.includes('/saved')) {
    activeTab = 'saved';
  } else if (pathname.includes('/profile')) {
    activeTab = 'profile';
  } else if (pathname.includes('/owner/dashboard')) {
    activeTab = 'owner-dashboard';
  } else if (pathname.includes('/inbox')) {
    activeTab = 'inbox';
  }

  const handleTabPress = (key: string) => {
    const tab = APP_TABS.find((t) => t.key === key);
    if (tab && tab.key !== activeTab) {
      hapticsService.selection();
      router.replace(tab.route as any);
    }
  };

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="discover" />
        <Tabs.Screen name="saved" />
        <Tabs.Screen name="inbox" />
        <Tabs.Screen name="profile" />
      </Tabs>

      <FloatingDock
        tabs={APP_TABS}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
  },
});
