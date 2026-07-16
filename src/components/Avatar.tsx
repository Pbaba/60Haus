import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '../theme';

export interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name = '?',
  size = 'md',
  style,
}) => {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dimensions = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  }[size];

  const sizeStyle = {
    width: dimensions,
    height: dimensions,
    borderRadius: dimensions / 2,
  };

  const initialsTextSize = {
    sm: Theme.typography.sizes.xs,
    md: Theme.typography.sizes.md,
    lg: Theme.typography.sizes.xl,
    xl: Theme.typography.sizes.h1,
  }[size];

  return (
    <View
      style={[styles.container, sizeStyle, style]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Avatar of ${name}`}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[styles.image, sizeStyle]}
          contentFit="cover"
          transition={100}
        />
      ) : (
        <View style={[styles.placeholder, sizeStyle]}>
          <Text style={[styles.initials, { fontSize: initialsTextSize }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.surfaceElevated,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceElevated,
  },
  initials: {
    color: Theme.colors.primary,
    fontFamily: Theme.typography.fontFamilyBold,
  },
});
