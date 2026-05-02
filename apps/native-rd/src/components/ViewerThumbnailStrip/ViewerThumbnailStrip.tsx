import React, { useCallback, useEffect, useRef } from "react";
import { FlatList, View } from "react-native";
import {
  ViewerStripThumb,
  VIEWER_STRIP_THUMB_WIDTH,
} from "../ViewerStripThumb";
import type { ViewerEvidence } from "../../hooks/useAllEvidenceForGoal";
import { styles } from "./ViewerThumbnailStrip.styles";

export interface ViewerThumbnailStripProps {
  evidence: ViewerEvidence[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const THUMB_GAP = 8;
// VIEWER_STRIP_THUMB_WIDTH + gap; matches styles.separator marginRight
const ITEM_FULL_WIDTH = VIEWER_STRIP_THUMB_WIDTH + THUMB_GAP;

export function ViewerThumbnailStrip({
  evidence,
  activeIndex,
  onSelect,
}: ViewerThumbnailStripProps) {
  const listRef = useRef<FlatList<ViewerEvidence>>(null);

  // Auto-scroll the active thumb into the centre when activeIndex changes.
  useEffect(() => {
    if (activeIndex < 0 || activeIndex >= evidence.length) return;
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 0);
    return () => clearTimeout(id);
  }, [activeIndex, evidence.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: ViewerEvidence; index: number }) => (
      <ViewerStripThumb
        evidence={item}
        isActive={index === activeIndex}
        onPress={() => onSelect(index)}
      />
    ),
    [activeIndex, onSelect],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<ViewerEvidence> | null | undefined, index: number) => ({
      length: VIEWER_STRIP_THUMB_WIDTH,
      offset: ITEM_FULL_WIDTH * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: ViewerEvidence) => item.id, []);

  if (evidence.length <= 1) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={evidence}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        getItemLayout={getItemLayout}
        // If scrollToIndex tries to land on a not-yet-rendered item,
        // fall back to scrollToOffset so we don't crash.
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: ITEM_FULL_WIDTH * info.index,
            animated: true,
          });
        }}
        accessibilityRole="tablist"
        accessibilityLabel="Evidence items"
      />
    </View>
  );
}
