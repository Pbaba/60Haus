import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import FeedScreen from './index';
import { SearchOverlay, SearchFilters } from '../../components/SearchOverlay';
import { useProperties } from '../../hooks/useProperties';

export default function SearchTabScreen() {
  const router = useRouter();
  const { filters, setFilters } = useProperties();
  const [isOverlayOpen, setIsOverlayOpen] = useState(true);

  const handleClose = () => {
    setIsOverlayOpen(false);
    router.replace('/(tabs)' as any);
  };

  const handleApply = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    router.replace('/(tabs)' as any);
  };

  return (
    <>
      {/* Feed rendered underneath */}
      <FeedScreen />
      
      {/* Filter panel overlay */}
      <SearchOverlay
        isOpen={isOverlayOpen}
        onClose={handleClose}
        filters={filters}
        onApplyFilters={handleApply}
      />
    </>
  );
}
