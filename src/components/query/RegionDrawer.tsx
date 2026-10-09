import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  PanResponder,
  LayoutChangeEvent,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { SelectedRegion } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface RegionDrawerProps {
  imageUri: string;
  region?: SelectedRegion;
  onRegionChange: (region: SelectedRegion | undefined) => void;
}

export function RegionDrawer({ imageUri, region, onRegionChange }: RegionDrawerProps) {
  const { colors, fontScale } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Temporary region during modal editing
  const [draftRegion, setDraftRegion] = useState<SelectedRegion | undefined>(region);
  const [modalCanvasSize, setModalCanvasSize] = useState({ width: 0, height: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const handleOpenModal = () => {
    setDraftRegion(region);
    setModalVisible(true);
  };

  const handleConfirmModal = () => {
    onRegionChange(draftRegion);
    setModalVisible(false);
  };

  const handleCancelModal = () => {
    setDraftRegion(region);
    setModalVisible(false);
  };

  const handleClearDraft = () => {
    setDraftRegion(undefined);
  };

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setModalCanvasSize({ width, height });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setDragStart({ x: locationX, y: locationY });
    },
    onPanResponderMove: (evt) => {
      if (!dragStart || modalCanvasSize.width === 0 || modalCanvasSize.height === 0) return;
      const { locationX, locationY } = evt.nativeEvent;

      const minX = Math.min(dragStart.x, locationX);
      const minY = Math.min(dragStart.y, locationY);
      const width = Math.abs(locationX - dragStart.x);
      const height = Math.abs(locationY - dragStart.y);

      // Convert to percentages (0 - 100%)
      const pctX = Math.max(0, Math.min(100, (minX / modalCanvasSize.width) * 100));
      const pctY = Math.max(0, Math.min(100, (minY / modalCanvasSize.height) * 100));
      const pctW = Math.max(4, Math.min(100 - pctX, (width / modalCanvasSize.width) * 100));
      const pctH = Math.max(3, Math.min(100 - pctY, (height / modalCanvasSize.height) * 100));

      setDraftRegion({
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
      {/* 1. Thumbnail Preview Card */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="image-outline" size={16} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: 13 * fontScale }]}>
            已选图片
          </Text>
          {region ? (
            <Badge label="已勾画重点区域" variant="primary" size="small" style={{ marginLeft: 8 }} />
          ) : (
            <Badge label="整图提取" variant="neutral" size="small" style={{ marginLeft: 8 }} />
          )}
        </View>

        {region ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onRegionChange(undefined)}
          >
            <Ionicons name="trash-outline" size={14} color={colors.error} />
            <Text style={[styles.clearBtnText, { color: colors.error, fontSize: 12 * fontScale }]}>
              清除勾画
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Clickable Image Thumbnail that opens Enlarged Drawer Modal */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpenModal}
        style={[styles.thumbnailContainer, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
      >
        <Image source={{ uri: imageUri }} style={styles.thumbnailImage} resizeMode="contain" />

        {/* Highlight box overlay on thumbnail if region exists */}
        {region ? (
          <View
            pointerEvents="none"
            style={[
              styles.boxOverlay,
              {
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}33`,
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              },
            ]}
          >
            <View style={[styles.boxMiniBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.boxMiniBadgeText}>目标区</Text>
            </View>
          </View>
        ) : null}

        {/* Hover Click Hint Overlay */}
        <View style={styles.clickToEnlargeBar}>
          <Ionicons name="expand-outline" size={15} color="#FFFFFF" />
          <Text style={styles.clickToEnlargeText}>
            {region ? '点击放大预览 / 重新勾画' : '点击放大预览并勾画重点区域'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 2. Fullscreen / Enlarged Preview & Precise Drawing Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancelModal}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: '#0F172A' }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { fontSize: 17 * fontScale }]}>
                放大预览与精准勾画
              </Text>
              <Text style={[styles.modalSub, { fontSize: 12 * fontScale }]}>
                手指在图片上滑动拖拽，框选需要识别的生词或短语
              </Text>
            </View>

            <TouchableOpacity onPress={handleCancelModal} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Large Interactive Drawing Canvas */}
          <View
            style={styles.modalCanvasContainer}
            onLayout={handleCanvasLayout}
            {...panResponder.panHandlers}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.modalImage}
              resizeMode="contain"
            />

            {/* Live Bounding Box while dragging / drawn */}
            {draftRegion && modalCanvasSize.width > 0 && modalCanvasSize.height > 0 ? (
              <View
                pointerEvents="none"
                style={[
                  styles.modalBoundingBox,
                  {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}33`,
                    left: `${draftRegion.x}%`,
                    top: `${draftRegion.y}%`,
                    width: `${draftRegion.width}%`,
                    height: `${draftRegion.height}%`,
                  },
                ]}
              >
                {/* Corner Handles */}
                <View style={[styles.cornerHandle, styles.cornerTL, { borderColor: colors.primary }]} />
                <View style={[styles.cornerHandle, styles.cornerTR, { borderColor: colors.primary }]} />
                <View style={[styles.cornerHandle, styles.cornerBL, { borderColor: colors.primary }]} />
                <View style={[styles.cornerHandle, styles.cornerBR, { borderColor: colors.primary }]} />

                <View style={[styles.modalBoxTag, { backgroundColor: colors.primary }]}>
                  <Text style={styles.modalBoxTagText}>重点框选词汇</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Modal Footer Controls */}
          <View style={styles.modalFooter}>
            <View style={styles.modalFooterLeft}>
              {draftRegion ? (
                <TouchableOpacity style={styles.resetBtn} onPress={handleClearDraft}>
                  <Ionicons name="refresh-outline" size={16} color="#94A3B8" />
                  <Text style={styles.resetBtnText}>重置框选</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.modalTipText}>未框选（将识别整图文本）</Text>
              )}
            </View>

            <View style={styles.modalFooterRight}>
              <Button
                title="取消"
                variant="ghost"
                size="medium"
                onPress={handleCancelModal}
                textStyle={{ color: '#94A3B8' }}
                style={{ marginRight: 10 }}
              />
              <Button
                title="完成勾画"
                variant="primary"
                size="medium"
                onPress={handleConfirmModal}
                icon={<Ionicons name="checkmark-done" size={18} color="#FFFFFF" />}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontWeight: '700',
    marginLeft: 6,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearBtnText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  thumbnailContainer: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  boxOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 6,
  },
  boxMiniBadge: {
    position: 'absolute',
    top: -16,
    left: -2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  boxMiniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  clickToEnlargeBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clickToEnlargeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12.5,
    marginLeft: 6,
  },

  // Fullscreen Modal Styles
  modalSafe: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  modalSub: {
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    marginLeft: 10,
  },
  modalCanvasContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalBoundingBox: {
    position: 'absolute',
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderRadius: 6,
  },
  cornerHandle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderWidth: 2,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  modalBoxTag: {
    position: 'absolute',
    top: -22,
    left: -2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalBoxTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  modalFooterLeft: {
    flex: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  resetBtnText: {
    color: '#94A3B8',
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 13,
  },
  modalTipText: {
    color: '#64748B',
    fontSize: 12,
  },
  modalFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
