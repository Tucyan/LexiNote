import React, { useState, useRef } from 'react';
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

type InteractionMode = 'zoom' | 'draw';

export function RegionDrawer({ imageUri, region, onRegionChange }: RegionDrawerProps) {
  const { colors, fontScale } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Active interaction mode inside enlarged preview modal
  const [interactMode, setInteractMode] = useState<InteractionMode>('zoom');

  // Canvas zoom & pan state
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Temporary region during modal editing
  const [draftRegion, setDraftRegion] = useState<SelectedRegion | undefined>(region);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Touch tracking refs
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartInnerRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const pinchDistanceRef = useRef<number | null>(null);

  const handleOpenModal = () => {
    setDraftRegion(region);
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setInteractMode('zoom');
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

  const handleResetView = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(4.0, Number((prev + 0.4).toFixed(1))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(1.0, Number((prev - 0.4).toFixed(1)));
      if (next === 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  /**
   * Convert screen touch coordinate to image percentage coordinate (0-100%)
   * Inversion formula:
   * x_inner = (X_screen - W/2 - panOffset.x) / zoomScale + W/2
   */
  const screenToImagePct = (screenX: number, screenY: number) => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return { x: 0, y: 0 };
    const w = canvasSize.width;
    const h = canvasSize.height;

    const xInner = (screenX - w / 2 - panOffset.x) / zoomScale + w / 2;
    const yInner = (screenY - h / 2 - panOffset.y) / zoomScale + h / 2;

    const pctX = Math.max(0, Math.min(100, (xInner / w) * 100));
    const pctY = Math.max(0, Math.min(100, (yInner / h) * 100));

    return { x: pctX, y: pctY };
  };

  /**
   * PanResponder handling both Zoom/Pan Mode and Draw Mode
   */
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      const touches = evt.nativeEvent.touches;

      // Handle double tap to toggle zoom in zoom mode
      if (interactMode === 'zoom' && touches.length === 1) {
        const now = Date.now();
        if (now - lastTouchTimeRef.current < 280) {
          // Double tap detected
          setZoomScale((prev) => (prev > 1.2 ? 1.0 : 2.2));
          if (zoomScale > 1.2) setPanOffset({ x: 0, y: 0 });
          lastTouchTimeRef.current = 0;
          return;
        }
        lastTouchTimeRef.current = now;
      }

      if (interactMode === 'zoom') {
        if (touches.length === 1) {
          panStartRef.current = {
            x: touches[0].locationX - panOffset.x,
            y: touches[0].locationY - panOffset.y,
          };
        } else if (touches.length >= 2) {
          // Pinch start
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
        }
      } else {
        // Draw Mode: record start coordinate in image percentage space
        const { locationX, locationY } = evt.nativeEvent;
        const pt = screenToImagePct(locationX, locationY);
        dragStartInnerRef.current = pt;
      }
    },

    onPanResponderMove: (evt) => {
      const touches = evt.nativeEvent.touches;

      if (interactMode === 'zoom') {
        if (touches.length === 1) {
          // Single-finger panning
          if (zoomScale > 1.0) {
            const nextX = touches[0].locationX - panStartRef.current.x;
            const nextY = touches[0].locationY - panStartRef.current.y;
            // Bound pan offset based on zoom level
            const maxPanX = (canvasSize.width * (zoomScale - 1)) / 1.5;
            const maxPanY = (canvasSize.height * (zoomScale - 1)) / 1.5;
            setPanOffset({
              x: Math.max(-maxPanX, Math.min(maxPanX, nextX)),
              y: Math.max(-maxPanY, Math.min(maxPanY, nextY)),
            });
          }
        } else if (touches.length >= 2 && pinchDistanceRef.current !== null) {
          // Two-finger pinch zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ratio = dist / pinchDistanceRef.current;
          setZoomScale((prev) => Math.max(1.0, Math.min(4.0, Number((prev * ratio).toFixed(2)))));
          pinchDistanceRef.current = dist;
        }
      } else {
        // Draw Mode: compute bounding box in image percentage space
        if (!dragStartInnerRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const currentPt = screenToImagePct(locationX, locationY);

        const minX = Math.min(dragStartInnerRef.current.x, currentPt.x);
        const minY = Math.min(dragStartInnerRef.current.y, currentPt.y);
        const width = Math.abs(currentPt.x - dragStartInnerRef.current.x);
        const height = Math.abs(currentPt.y - dragStartInnerRef.current.y);

        const pctW = Math.max(2, Math.min(100 - minX, width));
        const pctH = Math.max(2, Math.min(100 - minY, height));

        setDraftRegion({
          x: minX,
          y: minY,
          width: pctW,
          height: pctH,
        });
      }
    },

    onPanResponderRelease: () => {
      dragStartInnerRef.current = null;
      pinchDistanceRef.current = null;
    },
  });

  return (
    <View style={styles.container}>
      {/* 1. Thumbnail Preview Card on Main Screen */}
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
          <TouchableOpacity style={styles.clearBtn} onPress={() => onRegionChange(undefined)}>
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

        {/* Hover Hint Overlay */}
        <View style={styles.clickToEnlargeBar}>
          <Ionicons name="expand-outline" size={15} color="#FFFFFF" />
          <Text style={styles.clickToEnlargeText}>
            {region ? '点击放大预览 / 重新勾画' : '点击放大预览并勾画重点区域'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 2. Fullscreen Enlarged Preview & Precise Drawing Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancelModal}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: '#0A0F1D' }]}>
          {/* Top Bar with Mode Switcher Segmented Control */}
          <View style={styles.modalTopBar}>
            <TouchableOpacity onPress={handleCancelModal} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>

            {/* Segmented Mode Switcher */}
            <View style={styles.modeSegmentContainer}>
              <TouchableOpacity
                style={[
                  styles.modeSegmentBtn,
                  interactMode === 'zoom' && [styles.modeSegmentActive, { backgroundColor: colors.primary }],
                ]}
                onPress={() => setInteractMode('zoom')}
              >
                <Ionicons
                  name="search-outline"
                  size={15}
                  color={interactMode === 'zoom' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.modeSegmentText,
                    { color: interactMode === 'zoom' ? '#FFFFFF' : '#94A3B8' },
                  ]}
                >
                  放大移动
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeSegmentBtn,
                  interactMode === 'draw' && [styles.modeSegmentActive, { backgroundColor: colors.primary }],
                ]}
                onPress={() => setInteractMode('draw')}
              >
                <Ionicons
                  name="crop-outline"
                  size={15}
                  color={interactMode === 'draw' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.modeSegmentText,
                    { color: interactMode === 'draw' ? '#FFFFFF' : '#94A3B8' },
                  ]}
                >
                  精准框选
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.doneTopBtn} onPress={handleConfirmModal}>
              <Text style={[styles.doneTopText, { color: colors.primary }]}>完成</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Instructions Banner */}
          <View style={styles.instructionBanner}>
            <Ionicons
              name={interactMode === 'zoom' ? 'information-circle-outline' : 'pencil-outline'}
              size={15}
              color={interactMode === 'zoom' ? '#38BDF8' : colors.primary}
            />
            <Text style={styles.instructionBannerText}>
              {interactMode === 'zoom'
                ? '【放大移动模式】：可单指拖动视野、双击或下方按钮缩放图片，方便查看小字'
                : '【精准框选模式】：视野已锁定，手指在目标单词/句子上滑动即可精准框选'}
            </Text>
          </View>

          {/* Large Interactive Canvas */}
          <View
            style={styles.modalCanvasContainer}
            onLayout={handleCanvasLayout}
            {...panResponder.panHandlers}
          >
            {canvasSize.width > 0 && canvasSize.height > 0 && (
              <View
                style={[
                  styles.transformWrapper,
                  {
                    width: canvasSize.width,
                    height: canvasSize.height,
                    transform: [
                      { translateX: panOffset.x },
                      { translateY: panOffset.y },
                      { scale: zoomScale },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />

                {/* Drawn Bounding Box (transformed with the image) */}
                {draftRegion && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.modalBoundingBox,
                      {
                        borderColor: colors.primary,
                        backgroundColor: `${colors.primary}33`,
                        borderWidth: Math.max(1.5, 2.5 / zoomScale),
                        left: `${draftRegion.x}%`,
                        top: `${draftRegion.y}%`,
                        width: `${draftRegion.width}%`,
                        height: `${draftRegion.height}%`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.modalBoxTag,
                        {
                          backgroundColor: colors.primary,
                          transform: [{ scale: 1 / Math.min(2.0, zoomScale) }],
                        },
                      ]}
                    >
                      <Text style={styles.modalBoxTagText}>目标重点词汇</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Floating Zoom Controls Pill */}
            <View style={styles.floatingZoomControls}>
              <TouchableOpacity
                style={styles.zoomCtrlBtn}
                onPress={handleZoomOut}
                disabled={zoomScale <= 1.0}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={zoomScale <= 1.0 ? '#475569' : '#F8FAFC'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.zoomLevelPill} onPress={handleResetView}>
                <Text style={styles.zoomLevelText}>{Math.round(zoomScale * 100)}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomCtrlBtn}
                onPress={handleZoomIn}
                disabled={zoomScale >= 4.0}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={zoomScale >= 4.0 ? '#475569' : '#F8FAFC'}
                />
              </TouchableOpacity>

              {zoomScale > 1.0 && (
                <TouchableOpacity style={styles.resetViewBtn} onPress={handleResetView}>
                  <Ionicons name="scan-outline" size={14} color="#94A3B8" />
                  <Text style={styles.resetViewText}>复位</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bottom Bar Controls */}
          <View style={styles.modalBottomBar}>
            <View style={styles.bottomLeftAction}>
              {draftRegion ? (
                <TouchableOpacity style={styles.clearDraftBtn} onPress={handleClearDraft}>
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={styles.clearDraftText}>清除勾画</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noRegionText}>未勾画（识别整张图片）</Text>
              )}
            </View>

            <View style={styles.bottomRightAction}>
              <Button
                title="取消"
                variant="ghost"
                size="small"
                onPress={handleCancelModal}
                textStyle={{ color: '#94A3B8' }}
                style={{ marginRight: 8 }}
              />
              <Button
                title="确认勾画并使用"
                variant="primary"
                size="small"
                onPress={handleConfirmModal}
                icon={<Ionicons name="checkmark-done" size={16} color="#FFFFFF" />}
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

  // Modal Fullscreen
  modalSafe: {
    flex: 1,
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 3,
  },
  modeSegmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  modeSegmentActive: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modeSegmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 4,
  },
  doneTopBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  doneTopText: {
    fontWeight: '700',
    fontSize: 14,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D31',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  instructionBannerText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    marginLeft: 6,
    flex: 1,
  },
  modalCanvasContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  transformWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalBoundingBox: {
    position: 'absolute',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  modalBoxTag: {
    position: 'absolute',
    top: -20,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  modalBoxTagText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },

  // Floating Zoom Controls
  floatingZoomControls: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  zoomCtrlBtn: {
    padding: 6,
  },
  zoomLevelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zoomLevelText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 12.5,
  },
  resetViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#475569',
    paddingLeft: 8,
    marginLeft: 4,
    paddingVertical: 2,
  },
  resetViewText: {
    color: '#94A3B8',
    fontSize: 11,
    marginLeft: 3,
    fontWeight: '600',
  },

  // Modal Bottom Bar
  modalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  bottomLeftAction: {
    flex: 1,
  },
  clearDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  clearDraftText: {
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 12.5,
  },
  noRegionText: {
    color: '#64748B',
    fontSize: 11.5,
  },
  bottomRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
