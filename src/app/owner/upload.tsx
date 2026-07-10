import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Theme } from '../../theme';
import { useProperties } from '../../hooks/useProperties';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Image as ImageIcon, Video, X, CheckCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { propertyUploadService, VideoAsset } from '../../services/propertyUploadService';

export default function OwnerUploadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { publishListing, updateListing, imageUploadProgress, videoUploadProgress, properties } = useProperties();
  const { profile } = useProfile();
  const { isGuest } = useAuth();
  
  useEffect(() => {
    if (isGuest || !profile) {
      Alert.alert(
        'Authentication Required',
        'Please register or sign in to upload property walkthroughs.',
        [{ text: 'OK', onPress: () => router.replace('/onboarding' as any) }]
      );
    }
  }, [isGuest, profile, router]);
  
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [bhk, setBhk] = useState('');
  const [size, setSize] = useState('');
  const [furnishing, setFurnishing] = useState('fully-furnished');
  const [propertyType, setPropertyType] = useState('apartment');
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoAssetInfo, setVideoAssetInfo] = useState<VideoAsset | undefined>(undefined);
  const [publishing, setPublishing] = useState(false);

  // Prefill when editing
  useEffect(() => {
    if (id) {
      const property = properties.find((p) => p.id === id);
      if (property) {
        setTitle(property.title);
        setPrice(String(property.price));
        setAddress(property.address);
        setCity(property.city);
        setBhk(String(property.bedrooms));
        setFurnishing(property.furnishing);
        setSelectedImages(property.imageUrls || []);
        setSelectedVideo(property.videoUrl || null);
      }
    }
  }, [id, properties]);

  const handlePickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'Permission to access photo library is required.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets) {
      const uris = pickerResult.assets.map((asset) => asset.uri);
      setSelectedImages((prev) => [...prev, ...uris]);
    }
  };

  const handlePickVideo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'Permission to access media library is required.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      const asset = pickerResult.assets[0];
      const info: VideoAsset = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        duration: asset.duration || undefined,
        fileSize: asset.fileSize || undefined,
      };

      try {
        propertyUploadService.validateVideo(info);
        setSelectedVideo(asset.uri);
        setVideoAssetInfo(info);
      } catch (err: any) {
        Alert.alert('Validation Error', err.message || 'Video validation failed.');
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setSelectedVideo(null);
    setVideoAssetInfo(undefined);
  };

  const handlePublish = async () => {
    // 1. Minimum parameters validation checking
    if (!title) {
      Alert.alert('Validation Error', 'Listing Title is required.');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price (greater than 0).');
      return;
    }
    if (!city) {
      Alert.alert('Validation Error', 'City location is required.');
      return;
    }
    if (!propertyType) {
      Alert.alert('Validation Error', 'Property Type selection is required.');
      return;
    }
    if (selectedImages.length === 0) {
      Alert.alert('Validation Error', 'At least one property image is required.');
      return;
    }

    setPublishing(true);
    try {
      const listingData = {
        ownerId: profile?.id || 'owner-456',
        title,
        description: `Premium listing located at ${address}, offering custom facilities.`,
        price: parseFloat(price),
        address,
        city,
        bedrooms: parseInt(bhk) || 1,
        bathrooms: Math.max(1, (parseInt(bhk) || 1) - 1),
        furnishing: furnishing as any,
        listingType: 'rent' as const,
        propertyType,
        videoUrl: selectedVideo || '',
        thumbnailUrl: selectedImages[0],
        status: (id ? properties.find((p) => p.id === id)?.status : 'published') as any,
      };

      if (id) {
        await updateListing(id, listingData, selectedImages, selectedVideo || undefined, videoAssetInfo);
        Alert.alert('Success', 'Listing updated successfully!');
      } else {
        await publishListing(listingData, selectedImages, selectedVideo || undefined, videoAssetInfo);
        Alert.alert('Success', 'Property listing published successfully!');
      }
      router.replace('/(tabs)' as any);
    } catch (e: any) {
      Alert.alert('Error', e.message || `Failed to ${id ? 'update' : 'publish'} listing.`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ScreenContainer style={styles.container} scrollable>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{id ? 'Edit Listing' : 'New Listing'}</Text>
        <Text style={styles.subtitle}>
          Upload walkthrough video and listing parameters
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.mediaButtons}>
          <TouchableOpacity
            activeOpacity={Theme.motion.presets.press.scale}
            onPress={handlePickImages}
            style={[styles.mediaDropzone, { flex: 1 }]}
          >
            <ImageIcon size={24} color={Theme.colors.primary} />
            <Text style={styles.dropzoneTitle}>Select Images</Text>
            <Text style={styles.dropzoneSub}>Pick up to 5 photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={Theme.motion.presets.press.scale}
            onPress={handlePickVideo}
            style={[styles.mediaDropzone, { flex: 1 }]}
          >
            <Video size={24} color={Theme.colors.primary} />
            <Text style={styles.dropzoneTitle}>Select Video</Text>
            <Text style={styles.dropzoneSub}>9:16 vertical walkthrough</Text>
          </TouchableOpacity>
        </View>

        {selectedImages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagePreviewContainer}
          >
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.previewWrapper}>
                <Image source={{ uri }} style={styles.previewImage} contentFit="cover" />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {selectedVideo && (
          <View style={styles.videoStatusCard}>
            <CheckCircle size={18} color={Theme.colors.success} />
            <Text style={styles.videoStatusText} numberOfLines={1}>
              Walkthrough Video Selected
            </Text>
            <TouchableOpacity style={styles.removeVideoBtn} onPress={removeVideo}>
              <X size={16} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Media Upload Progress Bars */}
        {publishing && imageUploadProgress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${imageUploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>Uploading images... {imageUploadProgress}%</Text>
          </View>
        )}

        {publishing && videoUploadProgress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${videoUploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>Uploading video... {videoUploadProgress}%</Text>
          </View>
        )}

        <Input
          label="Property Title"
          placeholder="e.g. Elegant 3 BHK Carter Road Apartment"
          value={title}
          onChangeText={setTitle}
          editable={!publishing}
        />
        <Input
          label="Monthly Rent (INR)"
          placeholder="e.g. 180000"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
          editable={!publishing}
        />
        <Input
          label="Property Address"
          placeholder="e.g. Carter Road, Bandra West"
          value={address}
          onChangeText={setAddress}
          editable={!publishing}
        />
        <Input
          label="City"
          placeholder="e.g. Mumbai"
          value={city}
          onChangeText={setCity}
          editable={!publishing}
        />
        <Input
          label="BHK Configuration"
          placeholder="e.g. 3"
          keyboardType="numeric"
          value={bhk}
          onChangeText={setBhk}
          editable={!publishing}
        />
        <Input
          label="Property Size (sq ft)"
          placeholder="e.g. 1450"
          keyboardType="numeric"
          value={size}
          onChangeText={setSize}
          editable={!publishing}
        />

        <Text style={styles.label}>Property Type</Text>
        <View style={styles.chipContainer}>
          {['apartment', 'villa', 'penthouse', 'row-house'].map((type) => {
            const isActive = propertyType === type;
            return (
              <TouchableOpacity
                key={type}
                disabled={publishing}
                style={[styles.chip, isActive && styles.activeChip]}
                onPress={() => setPropertyType(type)}
              >
                <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                  {type.replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Furnishing Status</Text>
        <View style={styles.chipContainer}>
          {['unfurnished', 'semi-furnished', 'fully-furnished'].map((status) => {
            const isActive = furnishing === status;
            return (
              <TouchableOpacity
                key={status}
                disabled={publishing}
                style={[styles.chip, isActive && styles.activeChip]}
                onPress={() => setFurnishing(status)}
              >
                <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                  {status.replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          variant="primary"
          style={styles.publishBtn}
          onPress={handlePublish}
          disabled={publishing}
        >
          {publishing ? 'Saving...' : (id ? 'Save Changes' : 'Publish Listing')}
        </Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    marginBottom: Theme.spacing.sm,
    marginLeft: -Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.typography.sizes.h1,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: 2,
  },
  form: {
    padding: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxxl,
    gap: Theme.spacing.md,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  mediaDropzone: {
    height: 100,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xs,
  },
  dropzoneTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: 4,
  },
  dropzoneSub: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    marginTop: 2,
  },
  imagePreviewContainer: {
    gap: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
  },
  previewWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
    borderRadius: 12,
  },
  videoStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  videoStatusText: {
    flex: 1,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
  },
  removeVideoBtn: {
    padding: 4,
  },
  progressContainer: {
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.xs,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
  },
  progressText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamily,
    fontWeight: Theme.typography.weights.medium,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: Theme.typography.weights.medium,
    color: Theme.colors.textSecondary,
    marginBottom: -Theme.spacing.xs,
    fontFamily: Theme.typography.fontFamily,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  activeChip: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  chipText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  activeChipText: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.weights.bold,
  },
  publishBtn: {
    marginTop: Theme.spacing.md,
    width: '100%',
  },
});
