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
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  // Active interaction mode inside enlarged preview modal
  const [interactMode, setInteractMode] = useState<InteractionMode>('zoom');

  // Canvas zoom & pan state
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Temporary region during modal editing
  const [draftRegion, setDraftRegion] = useState<SelectedRegion | undefined>(region);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Cropping undo history stack
  const [cropHistory, setCropHistory] = useState<(SelectedRegion | undefined)[]>([]);

  // Touch tracking refs
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartInnerRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1.0);
  const canvasLayoutRef = useRef<{ pageX: number; pageY: number }>({ pageX: 0, pageY: 0 });

  // Calculate safe status bar padding so top buttons never conflict with notch/status bar
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 24
  ) + 12;

  const handleOpenModal = () => {
    setDraftRegion(region);
    setCropHistory(region ? [region] : []);
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
    if (draftRegion) {
      setCropHistory((prev) => [...prev, draftRegion]);
    }
    setDraftRegion(undefined);
  };

  // Crop action: locks in the drawn region as cropped focus and pushes to undo stack
  const handleApplyCrop = () => {
    if (!draftRegion) return;
    setCropHistory((prev) => [...prev, draftRegion]);
    // Optionally zoom in to fit the cropped area
    const fitScale = Math.min(3.5, Math.max(1.5, 100 / Math.max(draftRegion.width, draftRegion.height, 20)));
    setZoomScale(Number(fitScale.toFixed(1)));
  };

  // Undo crop action: pops the previous state from history stack
  const handleUndoCrop = () => {
    if (cropHistory.length === 0) return;
    const previous = cropHistory[cropHistory.length - 1];
    setDraftRegion(previous);
    setCropHistory((prev) => prev.slice(0, prev.length - 1));
  };

  const handleResetView = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(5.0, Number((prev + 0.4).toFixed(1))));
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
   * PanResponder handling both Zoom/Pan Mode (single finger pan + two-finger pinch zoom)
   * and Draw Mode (precise bounding box selection)
   */
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      const touches = evt.nativeEvent.touches;

      // Handle double tap to quickly toggle zoom in zoom mode
      if (interactMode === 'zoom' && touches.length === 1) {
        const now = Date.now();
        if (now - lastTouchTimeRef.current < 280) {
          // Double tap detected
          setZoomScale((prev) => (prev > 1.2 ? 1.0 : 2.5));
          if (zoomScale > 1.2) setPanOffset({ x: 0, y: 0 });
          lastTouchTimeRef.current = 0;
          return;
        }
        lastTouchTimeRef.current = now;
      }

      if (interactMode === 'zoom') {
        if (touches.length === 1) {
          panStartRef.current = {
            x: touches[0].pageX - panOffset.x,
            y: touches[0].pageY - panOffset.y,
          };
          pinchStartDistRef.current = null;
        } else if (touches.length >= 2) {
          // Two finger pinch start
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchStartDistRef.current = Math.hypot(dx, dy);
          pinchStartScaleRef.current = zoomScale;
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
          // Single-finger dragging: smooth panning across entire screen
          if (pinchStartDistRef.current !== null) {
            // Finger transitioned from 2 to 1: re-anchor pan start without jumping
            panStartRef.current = {
              x: touches[0].pageX - panOffset.x,
              y: touches[0].pageY - panOffset.y,
            };
            pinchStartDistRef.current = null;
            return;
          }

          const nextX = touches[0].pageX - panStartRef.current.x;
          const nextY = touches[0].pageY - panStartRef.current.y;

          // Pan bounds based on current zoom level
          const maxPanX = (canvasSize.width * (zoomScale - 1)) / 1.4 + 40;
          const maxPanY = (canvasSize.height * (zoomScale - 1)) / 1.4 + 40;
          setPanOffset({
            x: Math.max(-maxPanX, Math.min(maxPanX, nextX)),
            y: Math.max(-maxPanY, Math.min(maxPanY, nextY)),
          });
        } else if (touches.length >= 2) {
          // Two-finger pinch to zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.hypot(dx, dy);

          if (pinchStartDistRef.current === null) {
            pinchStartDistRef.current = dist;
            pinchStartScaleRef.current = zoomScale;
          } else {
            const scaleMultiplier = dist / pinchStartDistRef.current;
            const targetScale = Math.max(
              1.0,
              Math.min(5.0, Number((pinchStartScaleRef.current * scaleMultiplier).toFixed(2)))
            );
            setZoomScale(targetScale);
          }
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
      pinchStartDistRef.current = null;
    },
    onPanResponderTerminate: () => {
      dragStartInnerRef.current = null;
      pinchStartDistRef.current = null;
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
            <Badge label="已裁剪/勾画重点" variant="primary" size="small" style={{ marginLeft: 8 }} />
          ) : (
            <Badge label="整图提取" variant="neutral" size="small" style={{ marginLeft: 8 }} />
          )}
        </View>

        {region ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => onRegionChange(undefined)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={[styles.clearBtnText, { color: colors.error, fontSize: 12 * fontScale }]}>
                清除裁剪
              </Text>
            </TouchableOpacity>
          </View>
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
            {region ? '点击放大预览 / 调整裁剪与勾画' : '点击放大预览、缩放查看并勾画重点区域'}
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
        <View style={[styles.modalSafe, { backgroundColor: '#0B1120', paddingTop: safeTopPadding }]}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

          {/* Top Bar with Mode Switcher & Safe Distance from Status Bar */}
          <View style={styles.modalTopBar}>
            {/* Close Button with generous touch area */}
            <TouchableOpacity
              onPress={handleCancelModal}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
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
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
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
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
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

            {/* Confirm & Done Button with generous touch area */}
            <TouchableOpacity
              style={styles.doneTopBtn}
              onPress={handleConfirmModal}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Text style={[styles.doneTopText, { color: colors.primary }]}>完成</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Instructions & Crop Undo Banner */}
          <View style={styles.instructionBanner}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={interactMode === 'zoom' ? 'hand-right-outline' : 'pencil-outline'}
                size={15}
                color={interactMode === 'zoom' ? '#38BDF8' : colors.primary}
              />
              <Text style={styles.instructionBannerText}>
                {interactMode === 'zoom'
                  ? '【放大移动】：单指拖动视野，双指捏合缩放（支持1.0x-5.0x），双击快速缩放'
                  : '【精准框选】：单指直接拖动拉取选框，精准框选目标词汇段落'}
              </Text>
            </View>

            {/* Quick Undo Crop in banner if available */}
            {cropHistory.length > 0 && (
              <TouchableOpacity
                style={styles.bannerUndoBtn}
                onPress={handleUndoCrop}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-undo-outline" size={13} color="#F59E0B" />
                <Text style={styles.bannerUndoText}>撤回裁剪</Text>
              </TouchableOpacity>
            )}
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
                      <Text style={styles.modalBoxTagText}>重点目标区域</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Floating Zoom & Scale Controls Pill */}
            <View style={styles.floatingZoomControls}>
              <TouchableOpacity
                style={styles.zoomCtrlBtn}
                onPress={handleZoomOut}
                disabled={zoomScale <= 1.0}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={zoomScale <= 1.0 ? '#475569' : '#F8FAFC'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomLevelPill}
                onPress={handleResetView}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.zoomLevelText}>{Math.round(zoomScale * 100)}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomCtrlBtn}
                onPress={handleZoomIn}
                disabled={zoomScale >= 5.0}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={zoomScale >= 5.0 ? '#475569' : '#F8FAFC'}
                />
              </TouchableOpacity>

              {zoomScale > 1.0 && (
                <TouchableOpacity
                  style={styles.resetViewBtn}
                  onPress={handleResetView}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="scan-outline" size={14} color="#94A3B8" />
                  <Text style={styles.resetViewText}>复位</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bottom Bar: Crop, Undo & Finalize Controls */}
          <View style={[styles.modalBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.bottomLeftAction}>
              {/* Undo Crop Button */}
              {cropHistory.length > 0 && (
                <TouchableOpacity
                  style={styles.undoActionBtn}
                  onPress={handleUndoCrop}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="arrow-undo-outline" size={16} color="#F59E0B" />
                  <Text style={styles.undoActionText}>撤回裁剪</Text>
                </TouchableOpacity>
              )}

              {/* Clear Box Button */}
              {draftRegion ? (
                <TouchableOpacity
                  style={styles.clearDraftBtn}
                  onPress={handleClearDraft}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={styles.clearDraftText}>清除选框</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noRegionText}>未选区域（识别整图）</Text>
              )}
            </View>

            <View style={styles.bottomRightAction}>
              {/* Optional Crop Confirmation Button */}
              {draftRegion && (
                <TouchableOpacity
                  style={[styles.cropConfirmBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.primary }]}
                  onPress={handleApplyCrop}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="crop" size={14} color={colors.primary} />
                  <Text style={[styles.cropConfirmText, { color: colors.primary }]}>裁剪聚焦</Text>
                </TouchableOpacity>
              )}

              <Button
                title="取消"
                variant="ghost"
                size="small"
                onPress={handleCancelModal}
                textStyle={{ color: '#94A3B8' }}
                style={{ marginRight: 6 }}
              />
              <Button
                title="确认并使用"
                variant="primary"
                size="small"
                onPress={handleConfirmModal}
                icon={<Ionicons name="checkmark-done" size={16} color="#FFFFFF" />}
              />
            </View>
          </View>
        </View>
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
    paddingVertical: 4,
    paddingHorizontal: 8,
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
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    minHeight: 52,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeSegmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
  },
  modeSegmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  modeSegmentText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  doneTopBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  doneTopText: {
    fontSize: 14,
    fontWeight: '700',
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  instructionBannerText: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginLeft: 6,
    flex: 1,
  },
  bannerUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    gap: 3,
    marginLeft: 6,
  },
  bannerUndoText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  modalCanvasContainer: {
    flex: 1,
    backgroundColor: '#020617',
    position: 'relative',
    overflow: 'hidden',
  },
  transformWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
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
    borderRadius: 8,
  },
  modalBoxTag: {
    position: 'absolute',
    top: -20,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalBoxTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  floatingZoomControls: {
    position: 'absolute',
    right: 14,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  zoomCtrlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  zoomLevelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  zoomLevelText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  resetViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: 2,
  },
  resetViewText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1120',
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  bottomLeftAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    gap: 4,
  },
  undoActionText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  clearDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    gap: 4,
  },
  clearDraftText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  noRegionText: {
    color: '#64748B',
    fontSize: 12,
  },
  bottomRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cropConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  cropConfirmText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
