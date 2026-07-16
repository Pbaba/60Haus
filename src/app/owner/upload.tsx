import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Image as ImageIcon, Video, X, CheckCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { propertyUploadService, VideoAsset } from '../../services/propertyUploadService';
import { useFeedback } from '../../context/FeedbackContext';
import { profileService } from '../../services/profileService';
import { AMENITIES, AMENITY_CATEGORIES } from '../../constants/property';

export default function OwnerUploadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { 
    publishListing, 
    updateListing, 
    imageUploadProgress, 
    videoUploadProgress, 
    publishing, 
    publishingStage,
    properties 
  } = useProperties();
  const { profile, upgradeToOwner, updateProfile } = useProfile();
  const { isGuest } = useAuth();
  const { showToast } = useFeedback();
  
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
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoAssetInfo, setVideoAssetInfo] = useState<VideoAsset | undefined>(undefined);

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

  const handlePickImages = async () => {
    if (publishing) return;
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
    if (publishing) return;
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
        showToast(err.message || 'Video validation failed.', 'warning');
      }
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

      if (id) {
        await updateListing(id, listingData, selectedImages, selectedVideo || undefined, videoAssetInfo);
      } else {
        await publishListing(listingData, selectedImages, selectedVideo || undefined, videoAssetInfo);
      }
      router.replace('/(tabs)' as any);
    } catch {
      // Handled globally by publishing context pipeline overlays
    }
  };

  return (
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
            <Text style={styles.dropzoneTitle}>Select Images</Text>
            <Text style={styles.dropzoneSub}>Pick up to 5 photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={Theme.motion.presets.press.scale}
            onPress={handlePickVideo}
            style={[styles.mediaDropzone, { flex: 1 }]}
            disabled={publishing}
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
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)} disabled={publishing}>
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
            <TouchableOpacity style={styles.removeVideoBtn} onPress={removeVideo} disabled={publishing}>
              <X size={16} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction Type */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Transaction Type</Text>
          <View style={styles.pillRow}>
            {[
              { id: 'rent', label: 'Rent' },
              { id: 'buy', label: 'Sale' },
            ].map((type) => {
              const active = listingType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setListingType(type.id as any)}
                  disabled={publishing}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    For {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Lifecycle Status Selection */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Listing Lifecycle Status</Text>
          <View style={styles.pillRow}>
            {['available', 'reserved', 'sold', 'rented', 'coming-soon'].map((s) => {
              const active = status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setStatus(s)}
                  disabled={publishing}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {s.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
            <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
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
            <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
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
            <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {['anyone', 'family', 'bachelors'].map((tenant) => {
                    const active = preferredTenant === tenant;
                    return (
                      <TouchableOpacity
                        key={tenant}
                        style={[styles.pill, active && styles.pillActive, { paddingVertical: 6, paddingHorizontal: 10 }]}
                        onPress={() => setPreferredTenant(tenant as any)}
                        disabled={publishing}
                      >
                        <Text style={[styles.pillText, { fontSize: 11 }, active && styles.pillTextActive]}>
                          {tenant}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        )}

        {/* Conditional Sale/Buy Fields */}
        {listingType === 'buy' && (
          <>
            <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
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
            <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
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
            <View style={{ flexDirection: 'row', gap: Theme.spacing.md }}>
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
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {['ready-to-move', 'under-construction'].map((pos) => {
                    const active = possessionStatus === pos;
                    return (
                      <TouchableOpacity
                        key={pos}
                        style={[styles.pill, active && styles.pillActive, { paddingVertical: 6, paddingHorizontal: 8 }]}
                        onPress={() => setPossessionStatus(pos as any)}
                        disabled={publishing}
                      >
                        <Text style={[styles.pillText, { fontSize: 10 }, active && styles.pillTextActive]}>
                          {pos.replace('-', ' ')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Ownership Type</Text>
              <View style={styles.pillRow}>
                {['freehold', 'leasehold', 'co-operative', 'power-of-attorney'].map((o) => {
                  const active = ownershipType === o;
                  return (
                    <TouchableOpacity
                      key={o}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => setOwnershipType(o as any)}
                      disabled={publishing}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {o.replace('-', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
          <View style={styles.pillRow}>
            {['unfurnished', 'semi-furnished', 'fully-furnished'].map((f) => {
              const active = furnishing === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setFurnishing(f)}
                  disabled={publishing}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {f.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Property Type</Text>
          <View style={styles.pillRow}>
            {['apartment', 'house', 'villa'].map((t) => {
              const active = propertyType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setPropertyType(t)}
                  disabled={publishing}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Structured Amenities Selection */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Structured Amenities Selection</Text>
          {Object.entries(AMENITY_CATEGORIES).map(([catId, catLabel]) => {
            const categoryAmenities = AMENITIES.filter(a => a.category === catId);
            return (
              <View key={catId} style={{ marginTop: Theme.spacing.sm, gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: Theme.colors.textSecondary }}>
                  {catLabel}
                </Text>
                <View style={styles.pillRow}>
                  {categoryAmenities.map((amenity) => {
                    const active = selectedAmenities.includes(amenity.id);
                    return (
                      <TouchableOpacity
                        key={amenity.id}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => {
                          setSelectedAmenities(prev =>
                            prev.includes(amenity.id)
                              ? prev.filter(id => id !== amenity.id)
                              : [...prev, amenity.id]
                          );
                        }}
                        disabled={publishing}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {amenity.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <Button variant="primary" style={styles.publishBtn} onPress={handlePublish} disabled={publishing}>
          {id ? 'Save Changes' : 'Publish Listing'}
        </Button>
      </View>

      {/* Blocking Publishing Overlay */}
      {publishing && (
        <View style={styles.overlayContainer}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.overlayTitle}>{publishingStage}</Text>
            <Text style={styles.overlaySub}>Please keep the app open during uploads.</Text>
            
            {imageUploadProgress > 0 && (
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Images:</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${imageUploadProgress}%` }]} />
                </View>
                <Text style={styles.progressPct}>{imageUploadProgress}%</Text>
              </View>
            )}

            {videoUploadProgress > 0 && (
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Video:</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${videoUploadProgress}%` }]} />
                </View>
                <Text style={styles.progressPct}>{videoUploadProgress}%</Text>
              </View>
            )}
          </View>
        </View>
      )}
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
  // Blocking overlay stylesheet
  overlayContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xxl,
  },
  overlayCard: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  overlayTitle: {
    fontSize: Theme.typography.sizes.lg,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
  },
  overlaySub: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  progressRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  progressLabel: {
    width: 60,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.typography.fontFamily,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
  },
  progressPct: {
    width: 35,
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.typography.fontFamilyBold,
    textAlign: 'right',
  },
});
