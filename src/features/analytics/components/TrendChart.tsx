import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, withTiming, Easing, interpolate, Extrapolate, useSharedValue } from 'react-native-reanimated';
import { Theme } from '../../../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface TrendChartProps {
  data: number[];
  height?: number;
  color?: string;
}

export function TrendChart({ data, height = 150, color = Theme.colors.primary }: TrendChartProps) {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const width = SCREEN_WIDTH - Theme.spacing.xl * 2 - Theme.spacing.md * 2; // Card padding

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) });
  }, [data, progress]);

  const maxVal = Math.max(...(data || [0]), 1);
  const minVal = Math.min(...(data || [0]), 0);

  // Normalize data points
  const points = (data || []).map((val, index) => {
    const x = (index / ((data || []).length - 1)) * width;
    const y = height - ((val - minVal) / (maxVal - minVal)) * height * 0.8 - height * 0.1; // 10% padding top/bottom
    return { x, y };
  });

  const pathString = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    
    // Smooth curve
    const prev = points[index - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;

    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, '');

  // Fill path for gradient
  const fillPathString = `${pathString} L ${width} ${height} L 0 ${height} Z`;

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: interpolate(
        progress.value,
        [0, 1],
        [width * 2, 0],
        Extrapolate.CLAMP
      ),
    };
  });

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height, width, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.noDataText}>Not enough data to display trend.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, width }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.4" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        <Path
          d={fillPathString}
          fill="url(#gradient)"
        />

        <AnimatedPath
          d={pathString}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={width * 2}
          animatedProps={animatedProps}
        />
        
        {/* Draw latest point dot */}
        {points.length > 0 && (
          <Circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill={Theme.colors.surface}
            stroke={color}
            strokeWidth="2"
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.sm,
  },
  noDataText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.sizes.xs,
    fontFamily: Theme.typography.fontFamily,
  }
});
