import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Theme } from '../../../theme';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface SearchBarProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  containerStyle?: object;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  containerStyle,
  debounceMs = 300,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChangeText = (text: string) => {
    setLocalValue(text);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChangeText(text);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue('');
    onChangeText('');
    if (onClear) onClear();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Search size={20} color={Theme.colors.textSecondary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChangeText}
        placeholderTextColor={Theme.colors.textSecondary}
        returnKeyType="search"
        {...props}
      />
      {localValue.length > 0 && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={16} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    fontFamily: Theme.typography.fontFamily,
    color: Theme.colors.textPrimary,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.full,
    marginLeft: Theme.spacing.sm,
  },
});
