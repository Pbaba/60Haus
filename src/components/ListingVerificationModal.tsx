import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { propertyService } from '../services/propertyService';
import { PropertyListing } from '../types';
import { Theme } from '../theme';
import { CheckCircle, PauseCircle, Home, Key, MapPin } from 'lucide-react-native';

export function ListingVerificationModal() {
  const { user } = useAuth();
  const [pendingListings, setPendingListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }

    const fetchPending = async () => {
      try {
        const listings = await propertyService.getPendingVerifications(user.id);
        setPendingListings(listings);
      } catch (e) {
        console.error('Failed to fetch pending verifications', e);
      } finally {
        setFetching(false);
      }
    };

    fetchPending();
  }, [user]);

  if (fetching || pendingListings.length === 0) {
    return null; // Don't render anything if no verifications needed
  }

  const currentListing = pendingListings[0];

  const handleAction = async (action: 'verified_available' | 'marked_sold' | 'marked_rented' | 'paused') => {
    setLoading(true);
    try {
      await propertyService.submitVerification(
        currentListing.id,
        user!.id,
        action,
        currentListing.nextVerificationAt || new Date().toISOString()
      );
      
      // Remove current listing from queue
      setPendingListings(prev => prev.slice(1));
    } catch (e) {
      console.error('Failed to submit verification', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Listing Verification Due</Text>
            <Text style={styles.subtitle}>
              Please confirm the availability of this property to keep it active on 60Haus.
            </Text>
          </View>

          <View style={styles.listingCard}>
            {currentListing.thumbnailUrl ? (
              <Image source={{ uri: currentListing.thumbnailUrl }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
            )}
            <View style={styles.listingDetails}>
              <Text style={styles.listingTitle} numberOfLines={1}>{currentListing.title}</Text>
              <Text style={styles.listingPrice}>₹{currentListing.price.toLocaleString()}</Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color={Theme.colors.textSecondary} />
                <Text style={styles.listingLocation} numberOfLines={1}>{currentListing.locality}, {currentListing.city}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => handleAction('verified_available')}
              disabled={loading}
            >
              <CheckCircle size={20} color="#FFF" style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Still Available</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              {currentListing.listingType === 'buy' ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.secondaryBtn]}
                  onPress={() => handleAction('marked_sold')}
                  disabled={loading}
                >
                  <Home size={18} color={Theme.colors.textPrimary} style={styles.btnIcon} />
                  <Text style={styles.secondaryBtnText}>Sold</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.secondaryBtn]}
                  onPress={() => handleAction('marked_rented')}
                  disabled={loading}
                >
                  <Key size={18} color={Theme.colors.textPrimary} style={styles.btnIcon} />
                  <Text style={styles.secondaryBtnText}>Rented</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() => handleAction('paused')}
                disabled={loading}
              >
                <PauseCircle size={18} color={Theme.colors.textPrimary} style={styles.btnIcon} />
                <Text style={styles.secondaryBtnText}>Pause</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
          )}

          <Text style={styles.footerNote}>
            Ignoring this will automatically deactivate the listing in 3 days.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    width: '100%',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    overflow: 'hidden',
  },
  header: {
    marginBottom: Theme.spacing.lg,
  },
  title: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: Theme.borderRadius.md,
  },
  thumbnailPlaceholder: {
    backgroundColor: Theme.colors.border,
  },
  listingDetails: {
    flex: 1,
    marginLeft: Theme.spacing.md,
    justifyContent: 'center',
  },
  listingTitle: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.md,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  listingPrice: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
    color: Theme.colors.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingLocation: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  actionsContainer: {
    gap: Theme.spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  primaryBtn: {
    backgroundColor: Theme.colors.primary,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  btnIcon: {
    marginRight: Theme.spacing.sm,
  },
  primaryBtnText: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryBtnText: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  footerNote: {
    fontFamily: Theme.typography.fontFamily,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill as object,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});
