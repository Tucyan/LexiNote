import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { SelectedRegion } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface RegionDrawerProps {
  imageUri: string;
  region?: SelectedRegion;
  onRegionChange: (region: SelectedRegion | undefined) => void;
}

export function RegionDrawer({ imageUri, region, onRegionChange }: RegionDrawerProps) {
  const { colors, fontScale } = useTheme();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setDragStart({ x: locationX, y: locationY });
    },
    onPanResponderMove: (evt) => {
      if (!dragStart || containerSize.width === 0 || containerSize.height === 0) return;
      const { locationX, locationY } = evt.nativeEvent;

      const minX = Math.min(dragStart.x, locationX);
      const minY = Math.min(dragStart.y, locationY);
      const width = Math.abs(locationX - dragStart.x);
      const height = Math.abs(locationY - dragStart.y);

      // Convert to percentages
      const pctX = Math.max(0, Math.min(100, (minX / containerSize.width) * 100));
      const pctY = Math.max(0, Math.min(100, (minY / containerSize.height) * 100));
      const pctW = Math.max(5, Math.min(100 - pctX, (width / containerSize.width) * 100));
      const pctH = Math.max(5, Math.min(100 - pctY, (height / containerSize.height) * 100));

      onRegionChange({
        x: pctX,
        y: pctY,
        width: pctW,
        height: pctH,
      });
    },
    onPanResponderRelease: () => {
      setDragStart(null);
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={[styles.instruction, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
          手指在图片上滑动可勾画框选区域
        </Text>
        {region ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onRegionChange(undefined)}
          >
            <Ionicons name="trash-outline" size={14} color={colors.error} />
            <Text style={[styles.clearText, { color: colors.error, fontSize: 12 * fontScale }]}>
              清除勾画
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={[styles.imageContainer, { borderColor: colors.border }]}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />

        {region && containerSize.width > 0 && containerSize.height > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.box,
              {
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}26`,
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              },
            ]}
          >
            <View style={[styles.boxLabel, { backgroundColor: colors.primary }]}>
              <Text style={styles.boxLabelText}>重点勾画区域</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  instruction: {
    fontWeight: '500',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  boxLabel: {
    position: 'absolute',
    top: -18,
    left: -2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  boxLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
