import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { Theme } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullscreenGalleryProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export const FullscreenGallery: React.FC<FullscreenGalleryProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const onMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Gallery header controls */}
        <View style={styles.header}>
          <Text style={styles.indicator}>
            {activeIndex + 1} / {images.length}
          </Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <X size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Paging lists */}
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <ScrollView
              maximumZoomScale={3.5}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.zoomContainer}
            >
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="contain"
              />
            </ScrollView>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  indicator: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Theme.typography.fontFamily,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 8,
    borderRadius: 20,
  },
  zoomContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});
