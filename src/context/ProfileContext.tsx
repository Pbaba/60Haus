import React, { createContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';
import { profileService } from '../services/profileService';

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  upgradeToOwner: () => Promise<void>;
  connectionError: boolean;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuest } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (isGuest || !user) {
      setProfile(null);
      setConnectionError(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setConnectionError(false);
      try {
        const liveProfile = await profileService.getProfile(user.id);
        setProfile(liveProfile);
      } catch (err) {
        console.error('Error fetching live profile:', err);
        setConnectionError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, isGuest]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (isGuest || !user) return;

    try {
      await profileService.updateProfile(user.id, updates);
      setProfile((prev) => {
        if (!prev) return null;
        return { ...prev, ...updates };
      });
    } catch (err) {
      console.error('Error updating live profile:', err);
      alert('Failed to update profile. Please verify your connection.');
      throw err;
    }
  };

  const upgradeToOwner = async () => {
    if (isGuest || !user) return;

    try {
      await profileService.upgradeToOwner(user.id);
      setProfile((prev) => {
        if (!prev) return null;
        return { ...prev, role: 'owner' };
      });
    } catch (err) {
      console.error('Error upgrading profile role:', err);
      alert('Upgrade failed. Please verify your network.');
      throw err;
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        updateProfile,
        upgradeToOwner,
        connectionError,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
