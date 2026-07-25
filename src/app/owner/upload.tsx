import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Theme } from '../../theme';
import { useProperties } from '../../hooks/useProperties';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Image as ImageIcon, Video, X, CheckCircle, Camera } from 'lucide-react-native';
import { Image } from 'expo-image';
import { VideoAsset } from '../../services/propertyUploadService';
import { useFeedback } from '../../context/FeedbackContext';
import { profileService } from '../../services/profileService';
import { AMENITIES, AMENITY_CATEGORIES } from '../../constants/property';
import { DraftManager } from '../../media/DraftManager';
import { MediaValidator } from '../../media/MediaValidator';
import { SegmentedSelector, TagCarousel } from '../../components/SelectionComponents';
import { usePermissions } from '../../features/permissions/hooks/usePermissions';
import { PermissionModal } from '../../features/permissions/components/PermissionModal';
import { PermissionType } from '../../features/permissions/types';

export default function OwnerUploadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { 
    publishListing, 
    updateListing, 
    publishing, 
    publishingProgress,
    properties 
  } = useProperties();
  const { profile, upgradeToOwner, updateProfile } = useProfile();
  const { isGuest } = useAuth();
  const { showToast } = useFeedback();
  const { permissions, requestPermission, openSettings } = usePermissions();
  
  // Permission Modal State
  const [permissionModal, setPermissionModal] = useState<{
    visible: boolean;
    type: PermissionType;
    title: string;
    description: string;
    onContinue: () => void;
  }>({
    visible: false,
    type: 'media',
    title: '',
    description: '',
    onContinue: () => {},
  });
  
  // Route Protection Check
  useEffect(() => {
    if (isGuest) {
      Alert.alert(
        'Authentication Required',
        'Please register or sign in to upload property walkthroughs.',
        [
          { text: 'Cancel', onPress: () => router.replace('/(tabs)' as any), style: 'cancel' },
          { text: 'Sign In', onPress: () => router.replace('/login' as any) }
        ]
      );
      return;
    }

    if (profile && profile.role !== 'owner') {
      Alert.alert(
        'Become a Property Owner',
        'Only registered owners can publish property walkthroughs. Would you like to upgrade your account to owner status now?',
        [
          { text: 'Maybe Later', onPress: () => router.replace('/(tabs)/profile' as any), style: 'cancel' },
          { 
            text: 'Upgrade Now', 
            onPress: async () => {
              try {
                await upgradeToOwner();
                Alert.alert('Success', 'Your account has been upgraded! You can now publish listings.');
              } catch {
                router.replace('/(tabs)/profile' as any);
              }
            } 
          }
        ]
      );
    }
  }, [isGuest, profile, upgradeToOwner, router]);
  
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [bhk, setBhk] = useState('');
  const [furnishing, setFurnishing] = useState('fully-furnished');
  const [propertyType, setPropertyType] = useState('apartment');
  const [description, setDescription] = useState('');
  const [locality, setLocality] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [listingType, setListingType] = useState<'rent' | 'buy'>('rent');
  const [status, setStatus] = useState<string>('available');

  // Sale Fields
  const [carpetArea, setCarpetArea] = useState('');
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [superBuiltUpArea, setSuperBuiltUpArea] = useState('');
  const [plotArea, setPlotArea] = useState('');
  const [propertyAge, setPropertyAge] = useState('');
  const [possessionStatus, setPossessionStatus] = useState<'ready-to-move' | 'under-construction'>('ready-to-move');
  const [ownershipType, setOwnershipType] = useState<'freehold' | 'leasehold' | 'co-operative' | 'power-of-attorney'>('freehold');

  // Rent Fields
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [monthlyMaintenance, setMonthlyMaintenance] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [leaseDuration, setLeaseDuration] = useState('');
  const [availableFrom, setAvailableFrom] = useState('Immediate');
  const [preferredTenant, setPreferredTenant] = useState<'anyone' | 'family' | 'bachelors' | 'company'>('anyone');

  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [showPublishingStatus, setShowPublishingStatus] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoAssetInfo, setVideoAssetInfo] = useState<VideoAsset | undefined>(undefined);

  const shiftImageLeft = (index: number) => {
    if (index === 0) return;
    setSelectedImages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      
      if (coverImageIndex === index) {
        setCoverImageIndex(index - 1);
      } else if (coverImageIndex === index - 1) {
        setCoverImageIndex(index);
      }
      return next;
    });
  };

  const shiftImageRight = (index: number) => {
    if (index === selectedImages.length - 1) return;
    setSelectedImages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      
      if (coverImageIndex === index) {
        setCoverImageIndex(index + 1);
      } else if (coverImageIndex === index + 1) {
        setCoverImageIndex(index);
      }
      return next;
    });
  };

  useEffect(() => {
    if (coverImageIndex >= selectedImages.length) {
      setCoverImageIndex(0);
    }
  }, [selectedImages, coverImageIndex]);

  const getDraftData = useCallback(() => {
    return {
      title,
      price,
      address,
      city,
      bhk,
      furnishing,
      propertyType,
      description,
      locality,
      contactPhone,
      listingType,
      status,
      selectedAmenities,
      selectedImages,
      selectedVideo,
      carpetArea,
      builtUpArea,
      superBuiltUpArea,
      plotArea,
      propertyAge,
      possessionStatus,
      ownershipType,
      securityDeposit,
      monthlyMaintenance,
      brokerage,
      leaseDuration,
      availableFrom,
      preferredTenant,
    };
  }, [
    title, price, address, city, bhk, furnishing, propertyType, description, locality,
    contactPhone, listingType, status, selectedAmenities, selectedImages, selectedVideo,
    carpetArea, builtUpArea, superBuiltUpArea, plotArea, propertyAge, possessionStatus,
    ownershipType, securityDeposit, monthlyMaintenance, brokerage, leaseDuration,
    availableFrom, preferredTenant
  ]);

  useEffect(() => {
    if (id) return;

    const checkDraft = async () => {
      const draft = await DraftManager.loadDraft();
      if (draft) {
        Alert.alert(
          'Resume Listing?',
          'You have an unfinished property listing. Would you like to restore it?',
          [
            {
              text: 'Discard',
              style: 'destructive',
              onPress: async () => {
                await DraftManager.clearDraft();
              },
            },
            {
              text: 'Restore',
              onPress: () => {
                setTitle(draft.title);
                setPrice(draft.price);
                setAddress(draft.address);
                setCity(draft.city);
                setBhk(draft.bhk);
                setFurnishing(draft.furnishing);
                setPropertyType(draft.propertyType);
                setDescription(draft.description);
                setLocality(draft.locality);
                setContactPhone(draft.contactPhone);
                setListingType(draft.listingType);
                setStatus(draft.status);
                setSelectedAmenities(draft.selectedAmenities);
                setSelectedImages(draft.selectedImages);
                setSelectedVideo(draft.selectedVideo);
                
                setCarpetArea(draft.carpetArea || '');
                setBuiltUpArea(draft.builtUpArea || '');
                setSuperBuiltUpArea(draft.superBuiltUpArea || '');
                setPlotArea(draft.plotArea || '');
                setPropertyAge(draft.propertyAge || '');
                setPossessionStatus(draft.possessionStatus || 'ready-to-move');
                setOwnershipType(draft.ownershipType || 'freehold');

                setSecurityDeposit(draft.securityDeposit || '');
                setMonthlyMaintenance(draft.monthlyMaintenance || '');
                setBrokerage(draft.brokerage || '');
                setLeaseDuration(draft.leaseDuration || '');
                setAvailableFrom(draft.availableFrom || 'Immediate');
                setPreferredTenant(draft.preferredTenant || 'anyone');
              },
            },
          ]
        );
      }
    };
    checkDraft();
  }, [id]);

  useEffect(() => {
    if (id) return;

    const interval = setInterval(() => {
      const data = getDraftData();
      if (data.title || data.price || data.address || data.selectedImages.length > 0 || data.selectedVideo) {
        DraftManager.saveDraft(data);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [id, getDraftData]);

  useEffect(() => {
    return () => {
      if (!id) {
        const data = getDraftData();
        if (data.title || data.price || data.address || data.selectedImages.length > 0 || data.selectedVideo) {
          DraftManager.saveDraft(data);
        }
      }
    };
  }, [id, getDraftData]);



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
        setPropertyType(property.propertyType || 'apartment');
        setSelectedImages(property.imageUrls || []);
        setSelectedVideo(property.videoUrl || null);
        setDescription(property.description || '');
        setLocality(property.locality || '');
        setListingType(property.listingType);
        setStatus(property.status || 'available');
        
        // Sale fields
        setCarpetArea(property.carpetArea ? String(property.carpetArea) : '');
        setBuiltUpArea(property.builtUpArea ? String(property.builtUpArea) : '');
        setSuperBuiltUpArea(property.superBuiltUpArea ? String(property.superBuiltUpArea) : '');
        setPlotArea(property.plotArea ? String(property.plotArea) : '');
        setPropertyAge(property.propertyAge ? String(property.propertyAge) : '');
        setPossessionStatus(property.possessionStatus || 'ready-to-move');
        setOwnershipType(property.ownershipType || 'freehold');

        // Rent fields
        setSecurityDeposit(property.securityDeposit ? String(property.securityDeposit) : '');
        setMonthlyMaintenance(property.monthlyMaintenance ? String(property.monthlyMaintenance) : '');
        setBrokerage(property.brokerage ? String(property.brokerage) : '');
        setLeaseDuration(property.leaseDuration ? String(property.leaseDuration) : '');
        setAvailableFrom(property.availableFrom || 'Immediate');
        setPreferredTenant(property.preferredTenant || 'anyone');

        setSelectedAmenities(property.amenities || []);

        const loadOwnerPhone = async () => {
          try {
            const owner = await profileService.getProfile(property.ownerId);
            setContactPhone(owner?.phoneNumber || '');
          } catch {
            setContactPhone('');
          }
        };
        loadOwnerPhone();
      }
    } else {
      if (profile?.phoneNumber) {
        setContactPhone(profile.phoneNumber);
      }
    }
  }, [id, properties, profile]);

  const processImagePicker = async () => {
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

  const handlePickImages = async () => {
    if (publishing) return;
    
    if (permissions.media === 'granted' || permissions.media === 'limited') {
      await processImagePicker();
    } else if (permissions.media === 'denied') {
      Alert.alert('Permission Denied', 'Please enable photo library access in settings to upload photos.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openSettings }
      ]);
    } else {
      setPermissionModal({
        visible: true,
        type: 'media',
        title: 'Access Photo Library',
        description: 'Upload high-quality photos of your property directly from your device to make your listing stand out.',
        onContinue: async () => {
          setPermissionModal(prev => ({ ...prev, visible: false }));
          const status = await requestPermission('media');
          if (status === 'granted' || status === 'limited') {
            await processImagePicker();
          }
        }
      });
    }
  };

  const processCamera = async () => {
    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets) {
      const uris = pickerResult.assets.map((asset) => asset.uri);
      setSelectedImages((prev) => [...prev, ...uris]);
    }
  };

  const handleTakePhoto = async () => {
    if (publishing) return;

    if (permissions.camera === 'granted') {
      await processCamera();
    } else if (permissions.camera === 'denied') {
      Alert.alert('Permission Denied', 'Please enable camera access in settings to take photos.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openSettings }
      ]);
    } else if (permissions.camera === 'unavailable') {
      Alert.alert('Camera Unavailable', 'Your device does not support taking photos.');
    } else {
      setPermissionModal({
        visible: true,
        type: 'camera',
        title: 'Access Camera',
        description: 'Capture beautiful photos of your property right now to share with potential buyers or renters.',
        onContinue: async () => {
          setPermissionModal(prev => ({ ...prev, visible: false }));
          const status = await requestPermission('camera');
          if (status === 'granted') {
            await processCamera();
          }
        }
      });
    }
  };

  const processVideoPicker = async () => {
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
        MediaValidator.validateVideoAsset(asset.uri, asset.duration || undefined);
        setSelectedVideo(asset.uri);
        setVideoAssetInfo(info);
      } catch (err: any) {
        showToast(err.message || 'Video validation failed.', 'warning');
      }
    }
  };

  const handlePickVideo = async () => {
    if (publishing) return;
    
    if (permissions.media === 'granted' || permissions.media === 'limited') {
      await processVideoPicker();
    } else if (permissions.media === 'denied') {
      Alert.alert('Permission Denied', 'Please enable photo library access in settings to upload your walkthrough.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openSettings }
      ]);
    } else {
      setPermissionModal({
        visible: true,
        type: 'media',
        title: 'Upload Walkthrough',
        description: 'Upload an immersive 9:16 vertical walkthrough video to give buyers a true feel of the property.',
        onContinue: async () => {
          setPermissionModal(prev => ({ ...prev, visible: false }));
          const status = await requestPermission('media');
          if (status === 'granted' || status === 'limited') {
            await processVideoPicker();
          }
        }
      });
    }
  };

  const removeImage = (index: number) => {
    if (publishing) return;
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    if (publishing) return;
    setSelectedVideo(null);
    setVideoAssetInfo(undefined);
  };

  const handlePublish = async () => {
    if (publishing) return; // Prevent duplicate submissions

    if (!title) {
      showToast('Listing Title is required.', 'warning');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      showToast('Please enter a valid price (greater than 0).', 'warning');
      return;
    }
    if (!city) {
      showToast('City location is required.', 'warning');
      return;
    }
    if (!propertyType) {
      showToast('Property Type selection is required.', 'warning');
      return;
    }
    if (selectedImages.length === 0) {
      showToast('At least one property image is required.', 'warning');
      return;
    }

    try {
      setShowPublishingStatus(true);
      if (contactPhone && contactPhone !== profile?.phoneNumber) {
        try {
          await updateProfile({ phoneNumber: contactPhone });
        } catch (phoneErr) {
          console.warn('Failed to update contact phone on profile:', phoneErr);
        }
      }

      const listingData = {
        ownerId: profile!.id,
        title,
        description: description || `Premium configuration located at ${address}, offering customized facilities.`,
        price: parseFloat(price),
        address,
        city,
        bedrooms: parseInt(bhk) || 1,
        bathrooms: Math.max(1, (parseInt(bhk) || 1) - 1),
        furnishing: furnishing as any,
        listingType: listingType,
        propertyType,
        videoUrl: selectedVideo || '',
        thumbnailUrl: selectedImages[0],
        status: status as any,
        amenities: selectedAmenities,
        locality: locality || address.split(',')[0] || '',
        
        // Sale Columns
        carpetArea: carpetArea ? parseFloat(carpetArea) : undefined,
        builtUpArea: builtUpArea ? parseFloat(builtUpArea) : undefined,
        superBuiltUpArea: superBuiltUpArea ? parseFloat(superBuiltUpArea) : undefined,
        plotArea: plotArea ? parseFloat(plotArea) : undefined,
        propertyAge: propertyAge ? parseInt(propertyAge) : undefined,
        possessionStatus: listingType === 'buy' ? possessionStatus : undefined,
        ownershipType: listingType === 'buy' ? ownershipType : undefined,

        // Rent Columns
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : undefined,
        monthlyMaintenance: monthlyMaintenance ? parseFloat(monthlyMaintenance) : undefined,
        brokerage: brokerage ? parseFloat(brokerage) : undefined,
        leaseDuration: leaseDuration ? parseInt(leaseDuration) : undefined,
        availableFrom: listingType === 'rent' ? availableFrom : undefined,
        preferredTenant: listingType === 'rent' ? preferredTenant : undefined,
      };

      // Rearrange selectedImages to put the cover image at index 0
      const finalImagesList = [...selectedImages];
      if (coverImageIndex > 0 && coverImageIndex < finalImagesList.length) {
        const coverImg = finalImagesList[coverImageIndex];
        finalImagesList.splice(coverImageIndex, 1);
        finalImagesList.unshift(coverImg);
      }

      if (id) {
        await updateListing(id, listingData, finalImagesList, selectedVideo || undefined, videoAssetInfo);
      } else {
        const propertyId = await publishListing(listingData, finalImagesList, selectedVideo || undefined, videoAssetInfo);
        
        // Discard local draft if publishing is successful
        await DraftManager.clearDraft();

        router.replace({
          pathname: '/owner/success' as any,
          params: {
            id: propertyId as any,
            title,
            price,
            city,
            locality,
            propertyType,
            bedrooms: bhk,
            furnishing,
            listingType,
          },
        });
      }
    } catch {
      // Handled globally by publishing context pipeline overlays
    }
  };

  if (showPublishingStatus) {
    const progressVal = publishingProgress?.progress || 0;
    const activeStage = publishingProgress?.stage || 'idle';
    const completedStages = publishingProgress?.completedStages || [];

    const getStageState = (stageName: string) => {
      if (activeStage === 'failed') return 'failed';
      if (completedStages.includes(stageName as any)) return 'completed';
      if (activeStage === stageName) return 'active';
      return 'pending';
    };

    const renderStageIndicator = (st: string) => {
      if (st === 'completed') {
        return <Text style={{ color: '#D4A359', fontWeight: 'bold' }}>✓</Text>;
      }
      if (st === 'active') {
        return <ActivityIndicator size="small" color={Theme.colors.primary} />;
      }
      if (st === 'failed') {
        return <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>✗</Text>;
      }
      return <View style={styles.pendingDot} />;
    };

    return (
      <ScreenContainer style={styles.container} scrollable>
        <View style={styles.publishingContent}>
          <Text style={styles.publishingTitle}>{id ? 'Saving Changes...' : 'Publishing Listing...'}</Text>
          <Text style={styles.publishingSubtitle}>Please keep the application open during this process.</Text>

          {/* Real weighted progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressIndicatorFill, { width: `${progressVal}%` }]} />
          </View>
          <Text style={styles.progressPercentText}>{progressVal}% Complete</Text>

          {/* Checklist */}
          <View style={styles.checklist}>
            {[
              { key: 'validating', label: 'Validating Listing Details' },
              { key: 'creating_listing', label: 'Creating Pending Listing Record' },
              { key: 'processing_images', label: 'Optimizing Property Photos' },
              { key: 'compressing_video', label: 'Compressing Walkthrough Video' },
              { key: 'generating_thumbnail', label: 'Generating Video Thumbnail' },
              { key: 'uploading', label: 'Uploading Media Assets' },
              { key: 'completed', label: 'Publishing Live Listing' },
            ].map((step) => {
              const state = getStageState(step.key);
              return (
                <View key={step.key} style={[styles.checklistItem, state === 'pending' && styles.checklistPending]}>
                  <View style={styles.checkIconWrapper}>{renderStageIndicator(state)}</View>
                  <Text style={[styles.checklistLabel, state === 'completed' && styles.checklistCompletedLabel]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {activeStage === 'failed' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Upload Interrupted</Text>
              <Text style={styles.errorText}>{publishingProgress?.details || 'An error occurred during publication.'}</Text>
              <Button variant="primary" onPress={() => setShowPublishingStatus(false)} style={{ marginTop: 12 }}>
                Modify Listing & Retry
              </Button>
            </View>
          )}
        </View>
      </ScreenContainer>
    );
  }

  return (
    <>
      <ScreenContainer style={styles.container} scrollable>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={publishing}>
          <ArrowLeft size={24} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{id ? 'Edit Listing' : 'New Listing'}</Text>
        <Text style={styles.subtitle}>
          Upload walkthrough video and listing parameters
        </Text>
      </View>

      {/* Main Form */}
      <View style={styles.form}>
        <View style={styles.mediaButtons}>
          <TouchableOpacity
            activeOpacity={Theme.motion.presets.press.scale}
            onPress={handlePickImages}
            style={[styles.mediaDropzone, { flex: 1 }]}
            disabled={publishing}
          >
            <ImageIcon size={24} color={Theme.colors.primary} />
            <Text style={styles.dropzoneTitle}>Gallery</Text>
            <Text style={styles.dropzoneSub}>Pick photos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            activeOpacity={Theme.motion.presets.press.scale}
            onPress={handleTakePhoto}
            style={[styles.mediaDropzone, { flex: 1 }]}
            disabled={publishing}
          >
            <Camera size={24} color={Theme.colors.primary} />
            <Text style={styles.dropzoneTitle}>Camera</Text>
            <Text style={styles.dropzoneSub}>Take photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={Theme.motion.presets.press.scale}
            onPress={handlePickVideo}
            style={[styles.mediaDropzone, { flex: 1.2 }]}
            disabled={publishing}
          >
            <Video size={24} color={Theme.colors.primary} />
            <Text style={styles.dropzoneTitle}>Video</Text>
            <Text style={styles.dropzoneSub}>9:16 walkthrough</Text>
          </TouchableOpacity>
        </View>

        {selectedImages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagePreviewContainer}
          >
            {selectedImages.map((uri, index) => {
              const isCover = index === coverImageIndex;
              return (
                <View key={index} style={[styles.previewWrapper, isCover && styles.previewWrapperCover]}>
                  <Image source={{ uri }} style={styles.previewImage} contentFit="cover" />
                  
                  {/* Cover Selection Tag */}
                  <TouchableOpacity
                    style={[styles.coverTag, isCover && styles.coverTagActive]}
                    onPress={() => setCoverImageIndex(index)}
                    disabled={publishing}
                  >
                    <Text style={styles.coverTagText}>{isCover ? '★ Cover' : 'Make Cover'}</Text>
                  </TouchableOpacity>

                  {/* Left Shift Button */}
                  {index > 0 && (
                    <TouchableOpacity style={styles.shiftLeftBtn} onPress={() => shiftImageLeft(index)} disabled={publishing}>
                      <Text style={styles.arrowText}>←</Text>
                    </TouchableOpacity>
                  )}

                  {/* Right Shift Button */}
                  {index < selectedImages.length - 1 && (
                    <TouchableOpacity style={styles.shiftRightBtn} onPress={() => shiftImageRight(index)} disabled={publishing}>
                      <Text style={styles.arrowText}>→</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)} disabled={publishing}>
                    <X size={10} color="#FFF" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}

        {selectedVideo && (
          <View style={styles.videoStatusCard}>
            <CheckCircle size={18} color={Theme.colors.success} />
            <Text style={styles.videoStatusText} numberOfLines={1}>
              Walkthrough Video Selected
            </Text>
            <TouchableOpacity style={styles.removeVideoBtn} onPress={removeVideo} disabled={publishing}>
              <X size={16} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction Type */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Transaction Type</Text>
          <SegmentedSelector
            options={[
              { id: 'rent', label: 'For Rent' },
              { id: 'buy', label: 'For Sale' },
            ]}
            selectedValue={listingType}
            onSelect={(val) => setListingType(val as any)}
            disabled={publishing}
          />
        </View>

        {/* Lifecycle Status Selection */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Listing Lifecycle Status</Text>
          <SegmentedSelector
            options={[
              { id: 'available', label: 'available' },
              { id: 'reserved', label: 'reserved' },
              { id: 'sold', label: 'sold' },
              { id: 'rented', label: 'rented' },
              { id: 'coming-soon', label: 'coming soon' },
            ]}
            selectedValue={status}
            onSelect={setStatus}
            disabled={publishing}
          />
        </View>

        <Input
          label="Property Title"
          placeholder="e.g. Elegant 3 BHK Carter Road Apartment"
          value={title}
          onChangeText={setTitle}
          editable={!publishing}
        />
        
        <Input
          label={listingType === 'rent' ? 'Monthly Rent (INR)' : 'Total Sale Price (INR)'}
          placeholder="e.g. 180000"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
          editable={!publishing}
        />

        {/* Conditional Rental Fields */}
        {listingType === 'rent' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md }}>
              <Input
                label="Security Deposit (INR)"
                placeholder="e.g. 500000"
                keyboardType="numeric"
                value={securityDeposit}
                onChangeText={setSecurityDeposit}
                style={{ flex: 1 }}
                editable={!publishing}
              />
              <Input
                label="Maintenance / month"
                placeholder="e.g. 5000"
                keyboardType="numeric"
                value={monthlyMaintenance}
                onChangeText={setMonthlyMaintenance}
                style={{ flex: 1 }}
                editable={!publishing}
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md }}>
              <Input
                label="Brokerage Charge (INR)"
                placeholder="e.g. 0"
                keyboardType="numeric"
                value={brokerage}
                onChangeText={setBrokerage}
                style={{ flex: 1 }}
                editable={!publishing}
              />
              <Input
                label="Lease Duration (Months)"
                placeholder="e.g. 11"
                keyboardType="numeric"
                value={leaseDuration}
                onChangeText={setLeaseDuration}
                style={{ flex: 1 }}
                editable={!publishing}
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md }}>
              <Input
                label="Available From"
                placeholder="e.g. Immediate"
                value={availableFrom}
                onChangeText={setAvailableFrom}
                style={{ flex: 1 }}
                editable={!publishing}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.pickerLabel}>Preferred Tenant</Text>
                <SegmentedSelector
                  options={[
                    { id: 'anyone', label: 'anyone' },
                    { id: 'family', label: 'family' },
                    { id: 'bachelors', label: 'bachelors' },
                  ]}
                  selectedValue={preferredTenant}
                  onSelect={(val) => setPreferredTenant(val as any)}
                  disabled={publishing}
                />
              </View>
            </View>
          </>
        )}

        {/* Conditional Sale/Buy Fields */}
        {listingType === 'buy' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md }}>
              <Input
                label="Carpet Area (Sq.ft)"
                placeholder="e.g. 1100"
                keyboardType="numeric"
                value={carpetArea}
                onChangeText={setCarpetArea}
                style={{ flex: 1 }}
                editable={!publishing}
              />
              <Input
                label="Built-up Area (Sq.ft)"
                placeholder="e.g. 1300"
                keyboardType="numeric"
                value={builtUpArea}
                onChangeText={setBuiltUpArea}
                style={{ flex: 1 }}
                editable={!publishing}
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md }}>
              <Input
                label="Super Built-up (Sq.ft)"
                placeholder="e.g. 1500"
                keyboardType="numeric"
                value={superBuiltUpArea}
                onChangeText={setSuperBuiltUpArea}
                style={{ flex: 1 }}
                editable={!publishing}
              />
              <Input
                label="Plot Area (Sq.ft)"
                placeholder="e.g. 0"
                keyboardType="numeric"
                value={plotArea}
                onChangeText={setPlotArea}
                style={{ flex: 1 }}
                editable={!publishing}
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.md }}>
              <Input
                label="Property Age (Years)"
                placeholder="e.g. 2"
                keyboardType="numeric"
                value={propertyAge}
                onChangeText={setPropertyAge}
                style={{ flex: 1 }}
                editable={!publishing}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.pickerLabel}>Possession Status</Text>
                <SegmentedSelector
                  options={[
                    { id: 'ready-to-move', label: 'ready to move' },
                    { id: 'under-construction', label: 'under construction' },
                  ]}
                  selectedValue={possessionStatus}
                  onSelect={(val) => setPossessionStatus(val as any)}
                  disabled={publishing}
                />
              </View>
            </View>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Ownership Type</Text>
              <SegmentedSelector
                options={[
                  { id: 'freehold', label: 'freehold' },
                  { id: 'leasehold', label: 'leasehold' },
                  { id: 'co-operative', label: 'co-operative' },
                  { id: 'power-of-attorney', label: 'power of attorney' },
                ]}
                selectedValue={ownershipType}
                onSelect={(val) => setOwnershipType(val as any)}
                disabled={publishing}
              />
            </View>
          </>
        )}

        <Input
          label="Property Address"
          placeholder="e.g. Carter Road, Bandra West"
          value={address}
          onChangeText={setAddress}
          editable={!publishing}
        />
        <Input
          label="Locality"
          placeholder="e.g. Bandra West"
          value={locality}
          onChangeText={setLocality}
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
          label="Description"
          placeholder="e.g. Spacious airy flat with sea views..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
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
          label="Owner Contact Number"
          placeholder="e.g. +91 99999 88888"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          editable={!publishing}
        />
        
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Furnishing Status</Text>
          <SegmentedSelector
            options={[
              { id: 'unfurnished', label: 'unfurnished' },
              { id: 'semi-furnished', label: 'semi-furnished' },
              { id: 'fully-furnished', label: 'fully-furnished' },
            ]}
            selectedValue={furnishing}
            onSelect={setFurnishing}
            disabled={publishing}
          />
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Property Type</Text>
          <SegmentedSelector
            options={[
              { id: 'apartment', label: 'apartment' },
              { id: 'house', label: 'house' },
              { id: 'villa', label: 'villa' },
            ]}
            selectedValue={propertyType}
            onSelect={setPropertyType}
            disabled={publishing}
          />
        </View>

        {/* Structured Amenities Selection */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Amenities & Features</Text>
          {Object.entries(AMENITY_CATEGORIES).map(([catId, catLabel]) => {
            const categoryAmenities = AMENITIES.filter(a => a.category === catId);
            return (
              <View key={catId} style={{ marginTop: Theme.spacing.sm, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: Theme.colors.textSecondary, fontFamily: Theme.typography.fontFamilyMedium }}>
                  {catLabel}
                </Text>
                <TagCarousel
                  options={categoryAmenities.map(a => ({ id: a.id, label: a.label }))}
                  selectedValues={selectedAmenities}
                  onToggle={(id) => {
                    setSelectedAmenities(prev =>
                      prev.includes(id)
                        ? prev.filter(x => x !== id)
                        : [...prev, id]
                    );
                  }}
                  disabled={publishing}
                />
              </View>
            );
          })}
        </View>

        <Button variant="primary" style={styles.publishBtn} onPress={handlePublish} disabled={publishing}>
          {id ? 'Save Changes' : 'Publish Listing'}
        </Button>
      </View>

    </ScreenContainer>
      
      <PermissionModal
        visible={permissionModal.visible}
        type={permissionModal.type}
        title={permissionModal.title}
        description={permissionModal.description}
        onContinue={permissionModal.onContinue}
        onCancel={() => setPermissionModal(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
  },
  backBtn: {
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.sizes.h1,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    marginTop: Theme.spacing.xs,
  },
  form: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxxl,
    gap: Theme.spacing.md,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  mediaDropzone: {
    height: 120,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  dropzoneTitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  dropzoneSub: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  imagePreviewContainer: {
    gap: Theme.spacing.sm,
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
    borderRadius: 999,
    padding: 2,
  },
  videoStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  videoStatusText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamily,
    flex: 1,
  },
  removeVideoBtn: {
    padding: 2,
  },
  pickerContainer: {
    gap: Theme.spacing.xs,
  },
  pickerLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamilySemiBold,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
  },
  pillActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '15',
  },
  pillText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textTransform: 'capitalize',
  },
  pillTextActive: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  publishBtn: {
    marginTop: Theme.spacing.lg,
    width: '100%',
  },
  // Drag, drop, shift and cover styling
  previewWrapperCover: {
    borderColor: Theme.colors.primary,
    borderWidth: 2,
  },
  coverTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(10, 10, 11, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 5,
  },
  coverTagActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  coverTagText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  shiftLeftBtn: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 10, 11, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  shiftRightBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 10, 11, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  arrowText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: Theme.typography.fontFamilyBold,
  },
  
  // Publishing checklist screen stylesheet
  publishingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.xxxl,
  },
  publishingTitle: {
    fontSize: Theme.typography.sizes.h2,
    fontFamily: Theme.typography.fontFamilyEditorialBold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  publishingSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.xl,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Theme.spacing.xs,
  },
  progressIndicatorFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
  },
  progressPercentText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamilyBold,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xl,
  },
  checklist: {
    width: '100%',
    backgroundColor: '#151518',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.xl,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    paddingVertical: 4,
  },
  checklistPending: {
    opacity: 0.4,
  },
  checkIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.textSecondary,
  },
  checklistLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontFamily: Theme.typography.fontFamilySemiBold,
    color: Theme.colors.textPrimary,
  },
  checklistCompletedLabel: {
    color: Theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  errorContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamilyBold,
    color: '#FF3B30',
  },
  errorText: {
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
