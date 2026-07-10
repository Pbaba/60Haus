import { UserProfile } from '../types';

export const ACTIVE_USER_ROLE: 'hunter' | 'owner' = 'hunter';

export const mockHunter: UserProfile = {
  id: 'hunter-123',
  username: 'alex_mercer',
  fullName: 'Alex Mercer',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  bio: 'Searching for a modern 2 BHK or 3 BHK penthouse in South Mumbai. Prefers fully furnished apartments.',
  phoneNumber: '+91 98765 43210',
  role: 'hunter',
  createdAt: new Date().toISOString(),
};

export const mockOwner: UserProfile = {
  id: 'owner-456',
  username: 'vikram_malhotra',
  fullName: 'Vikram Malhotra',
  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
  bio: 'Premium real estate developer specializing in luxury high-rises and sea-facing apartments in Bandra and Worli.',
  phoneNumber: '+91 99999 88888',
  role: 'owner',
  createdAt: new Date().toISOString(),
};
