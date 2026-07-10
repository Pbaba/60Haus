import React from 'react';
import { StyleSheet, View, ScrollView, ViewProps, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';

interface ScreenContainerProps extends ViewProps {
  scrollable?: boolean;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  safeAreaLeft?: boolean;
  safeAreaRight?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  safeAreaTop = true,
  safeAreaBottom = true,
  safeAreaLeft = true,
  safeAreaRight = true,
  style,
  ...props
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    {
      paddingTop: safeAreaTop ? insets.top : 0,
      paddingBottom: safeAreaBottom ? insets.bottom : 0,
      paddingLeft: safeAreaLeft ? insets.left : 0,
      paddingRight: safeAreaRight ? insets.right : 0,
    },
    style,
  ];

  return (
    <View style={styles.root} {...props}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={containerStyle}>{children}</View>
        </ScrollView>
      ) : (
        <View style={containerStyle}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
