"use client";
import { useEffect } from "react";
import type { Offset, SavedDFAs, SelectionRect } from "../types/domain";
import type { State } from "../lib/util-classes/state";
import { Transition } from "../lib/util-classes/transition";
import { drawTransitionLabels } from "../lib/canvas/canvasPrimitives";
import {
  renderLiveArrowsLayer,
  renderPreviewLayer,
  renderSavedBoundsLayer,
  renderSavedSnapshotsLayer,
  renderSelectionRectLayer,
  renderStateLayer,
  renderTopStateLabelsLayer
} from "../lib/canvas/canvasLayerRenderers";
import { createLabelPaletteResolver, resolveCanvasTheme } from "../lib/canvas/canvasTheme";

type AutomatonCanvasRendererProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  states: State[];
  arrowPairs: Transition[];
  arrowSelection: number[];
  showLiveTransitionLabels: boolean;
  selectionRect: SelectionRect;
  savedDFAs: SavedDFAs;
  selectedDFAName?: string | null;
  editMode?: boolean;
  editingDFAName?: string | null;
  previewStates?: State[] | null;
  previewArrowPairs?: Transition[] | null;
  previewPosition?: { x: number; y: number } | null;
  offset: Offset;
  scale: number;
  renderTick: number;
  themeTick: number;
};

export default function AutomatonCanvasRenderer({
  canvasRef,
  states,
  arrowPairs,
  arrowSelection,
  showLiveTransitionLabels,
  selectionRect,
  savedDFAs,
  selectedDFAName,
  editMode,
  editingDFAName,
  previewStates,
  previewArrowPairs,
  previewPosition,
  offset,
  scale,
  renderTick,
  themeTick
}: AutomatonCanvasRendererProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const theme = resolveCanvasTheme(getComputedStyle(document.documentElement));
    const getLabelPalette = createLabelPaletteResolver(theme);

    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    ctx.clearRect(-offset.x / scale, -offset.y / scale, canvas.width / scale, canvas.height / scale);
    ctx.fillStyle = theme.canvasBg;
    ctx.fillRect(-offset.x / scale, -offset.y / scale, canvas.width / scale, canvas.height / scale);

    renderStateLayer({
      ctx,
      states,
      arrowSelection,
      theme,
      getLabelPalette
    });

    renderLiveArrowsLayer({
      ctx,
      arrowPairs,
      states,
      arrowSelection,
      theme
    });

    if (showLiveTransitionLabels) {
      drawTransitionLabels(ctx, arrowPairs, states, {
        baseColor: theme.canvasText,
        bgColor: theme.canvasNode,
        borderColor: theme.arrowColor
      });
    }

    renderSelectionRectLayer(ctx, selectionRect, theme.selectionColor);

    renderSavedBoundsLayer({
      ctx,
      savedDFAs,
      editMode,
      editingDFAName,
      states,
      selectedDFAName,
      theme
    });

    renderSavedSnapshotsLayer({
      ctx,
      savedDFAs,
      editMode,
      editingDFAName,
      theme,
      getLabelPalette
    });

    renderPreviewLayer({
      ctx,
      previewStates,
      previewArrowPairs,
      previewPosition,
      theme,
      getLabelPalette
    });

    renderTopStateLabelsLayer({
      ctx,
      states,
      arrowSelection,
      theme,
      getLabelPalette
    });
  }, [
    offset,
    scale,
    states,
    arrowPairs,
    arrowSelection,
    selectionRect,
    savedDFAs,
    editMode,
    editingDFAName,
    renderTick,
    themeTick,
    previewStates,
    previewArrowPairs,
    previewPosition,
    showLiveTransitionLabels,
    selectedDFAName,
    canvasRef
  ]);

  return null;
}
