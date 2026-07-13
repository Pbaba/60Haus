import { Home, Heart, User, Building } from 'lucide-react-native';
import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  route: string;
}

export const APP_TABS: TabItem[] = [
  { key: 'index', label: 'Feed', icon: Home, route: '/' },
  { key: 'saved', label: 'Saved', icon: Heart, route: '/saved' },
  { key: 'profile', label: 'Profile', icon: User, route: '/profile' },
  { key: 'owner-dashboard', label: 'Dashboard', icon: Building, route: '/owner/dashboard' },
];
