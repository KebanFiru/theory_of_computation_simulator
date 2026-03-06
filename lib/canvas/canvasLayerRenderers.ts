import type { SavedDFAs, SelectionRect } from "../../types/domain";
import type { State } from "../util-classes/state";
import { Transition } from "../util-classes/transition";
import type { CanvasTheme, LabelPalette } from "./canvasTheme";
import { drawArrow, drawArrowsBidirectional, drawLoop, drawTransitionLabels } from "./canvasPrimitives";

type LabelPaletteResolver = (fillColor: string) => LabelPalette;

type Bounds = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function renderStateLayer(args: {
  ctx: CanvasRenderingContext2D;
  states: State[];
  arrowSelection: number[];
  theme: CanvasTheme;
  getLabelPalette: LabelPaletteResolver;
}) {
  const { ctx, states, arrowSelection, theme, getLabelPalette } = args;

  states.forEach((state, index) => {
    const isSelected = arrowSelection.includes(index);
    const isTmState = state.color?.startsWith("tm-") ?? false;
    const isTmAccept = state.color === "tm-blue";
    const isTmReject = state.color === "tm-purple";
    const strokeColor = state.color ? (theme.stateColors[state.color] ?? state.color) : theme.canvasNodeStroke;
    const fillColor = isSelected ? theme.canvasNodeSelected : theme.canvasNode;

    ctx.save();
    ctx.beginPath();
    ctx.arc(state.x, state.y, state.r, 0, 2 * Math.PI);
    ctx.shadowColor = theme.shadowColor;
    ctx.shadowBlur = isTmState ? 8 : 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeStyle = isSelected ? theme.stateColors.blue ?? strokeColor : strokeColor;
    ctx.stroke();
    ctx.restore();

    if (isTmState) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(state.x, state.y, state.r + 3, 0, 2 * Math.PI);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = strokeColor;
      if (isTmReject) {
        ctx.setLineDash([4, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if ((state.color === "blue" || isTmAccept) && !isSelected) {
      ctx.beginPath();
      ctx.arc(state.x, state.y, state.r - 5, 0, 2 * Math.PI);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (isTmReject) {
      const markerX = state.x + state.r - 6;
      const markerY = state.y + state.r - 6;
      ctx.save();
      ctx.beginPath();
      ctx.arc(markerX, markerY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = theme.canvasNode;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.font = "700 10px Inter, system-ui, sans-serif";
      ctx.fillStyle = strokeColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×", markerX, markerY + 0.5);
      ctx.restore();
    }

    const labelPalette = getLabelPalette(fillColor);
    ctx.save();
    ctx.font = "600 12px Inter, system-ui, sans-serif";
    ctx.fillStyle = labelPalette.text;
    ctx.strokeStyle = labelPalette.outline;
    ctx.lineWidth = 3.6;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(`q${index}`, state.x, state.y);
    ctx.fillText(`q${index}`, state.x, state.y);
    ctx.restore();

    if (isTmState) {
      ctx.save();
      ctx.font = "700 8px Inter, system-ui, sans-serif";
      const badgeText = state.color === "tm-blue" ? "ACC" : state.color === "tm-purple" ? "REJ" : "TM";
      const textWidth = ctx.measureText(badgeText).width;
      const badgeWidth = textWidth + 8;
      const badgeHeight = 14;
      const bx = state.x - badgeWidth / 2;
      const by = state.y - state.r - badgeHeight - 3;
      ctx.fillStyle = theme.canvasNode;
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeWidth, badgeHeight, 4);
      ctx.fill();
      ctx.strokeStyle = theme.stateColors[state.color] ?? strokeColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = theme.stateColors[state.color] ?? strokeColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, state.x, by + badgeHeight / 2 + 0.5);
      ctx.restore();
    }
  });
}

export function renderLiveArrowsLayer(args: {
  ctx: CanvasRenderingContext2D;
  arrowPairs: Transition[];
  states: State[];
  arrowSelection: number[];
  theme: CanvasTheme;
}) {
  const { ctx, arrowPairs, states, arrowSelection, theme } = args;

  const processed = new Set<string>();
  arrowPairs.forEach((pair, pairIndex) => {
    if (processed.has(`${pairIndex}`)) return;

    const fromCircle = states[pair.from];
    const toCircle = states[pair.to];
    if (!fromCircle || !toCircle) return;

    const allArrowsBetween = arrowPairs
      .map((p, idx) => ({ ...p, originalIndex: idx }))
      .filter(p =>
        (p.from === pair.from && p.to === pair.to) ||
        (p.from === pair.to && p.to === pair.from && pair.from !== pair.to)
      );

    allArrowsBetween.forEach(a => processed.add(`${a.originalIndex}`));

    const forwardArrows = allArrowsBetween.filter(p => p.from === pair.from && p.to === pair.to);
    const reverseArrows = allArrowsBetween.filter(p => p.from === pair.to && p.to === pair.from);

    const isForwardSelected =
      arrowSelection.length === 2 &&
      arrowSelection[0] === pair.from &&
      arrowSelection[1] === pair.to;
    const isReverseSelected =
      arrowSelection.length === 2 &&
      arrowSelection[0] === pair.to &&
      arrowSelection[1] === pair.from;
    const forwardColor = isForwardSelected ? theme.arrowSelectedColor : theme.arrowColor;
    const reverseColor = isReverseSelected ? theme.arrowSelectedColor : theme.arrowColor;

    if (pair.from === pair.to) {
      drawLoop(ctx, fromCircle, forwardColor);
    }
    else if (forwardArrows.length === 1 && reverseArrows.length === 0) {
      drawArrow(ctx, fromCircle, toCircle, forwardColor);
    }
    else if (forwardArrows.length >= 1 && reverseArrows.length > 0) {
      const minIndex = Math.min(pair.from, pair.to);
      const maxIndex = Math.max(pair.from, pair.to);
      const baseFrom = states[minIndex];
      const baseTo = states[maxIndex];
      if (!baseFrom || !baseTo) return;
      const baseOffset = Transition.calculateParallelOffset(baseFrom, baseTo, true);
      const forwardOffset = pair.from === minIndex ? baseOffset : { x: -baseOffset.x, y: -baseOffset.y };
      drawArrow(
        ctx,
        { x: fromCircle.x + forwardOffset.x, y: fromCircle.y + forwardOffset.y, r: fromCircle.r },
        { x: toCircle.x + forwardOffset.x, y: toCircle.y + forwardOffset.y, r: toCircle.r },
        forwardColor
      );
    } else if (forwardArrows.length > 1) {
      drawArrow(ctx, fromCircle, toCircle, forwardColor);
    }

    if (reverseArrows.length >= 1) {
      const minIndex = Math.min(pair.from, pair.to);
      const maxIndex = Math.max(pair.from, pair.to);
      const baseFrom = states[minIndex];
      const baseTo = states[maxIndex];
      if (!baseFrom || !baseTo) return;
      const baseOffset = Transition.calculateParallelOffset(baseFrom, baseTo, true);
      const reverseOffset = pair.from === minIndex ? { x: -baseOffset.x, y: -baseOffset.y } : baseOffset;
      drawArrow(
        ctx,
        { x: toCircle.x + reverseOffset.x, y: toCircle.y + reverseOffset.y, r: toCircle.r },
        { x: fromCircle.x + reverseOffset.x, y: fromCircle.y + reverseOffset.y, r: fromCircle.r },
        reverseColor
      );
    }
  });
}

export function renderSelectionRectLayer(
  ctx: CanvasRenderingContext2D,
  selectionRect: SelectionRect,
  selectionColor: string
) {
  if (!selectionRect) return;
  ctx.strokeStyle = selectionColor;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(
    selectionRect.x1,
    selectionRect.y1,
    selectionRect.x2 - selectionRect.x1,
    selectionRect.y2 - selectionRect.y1
  );
  ctx.setLineDash([]);
}

function computeLiveEditingBounds(editMode: boolean | undefined, editingDFAName: string | null | undefined, states: State[]): Bounds | null {
  if (!editMode || !editingDFAName || states.length === 0) return null;

  const padding = 24;
  const minX = Math.min(...states.map(item => item.x));
  const maxX = Math.max(...states.map(item => item.x));
  const minY = Math.min(...states.map(item => item.y));
  const maxY = Math.max(...states.map(item => item.y));
  return {
    x1: minX - padding,
    y1: minY - padding,
    x2: maxX + padding,
    y2: maxY + padding
  };
}

export function renderSavedBoundsLayer(args: {
  ctx: CanvasRenderingContext2D;
  savedDFAs: SavedDFAs;
  editMode?: boolean;
  editingDFAName?: string | null;
  states: State[];
  selectedDFAName?: string | null;
  theme: CanvasTheme;
}) {
  const { ctx, savedDFAs, editMode, editingDFAName, states, selectedDFAName, theme } = args;
  const liveEditingBounds = computeLiveEditingBounds(editMode, editingDFAName, states);

  Object.entries(savedDFAs).forEach(([name, data]) => {
    const bounds =
      editMode && editingDFAName === name && liveEditingBounds
        ? liveEditingBounds
        : data.bounds;
    if (!Number.isFinite(bounds.x1) || !Number.isFinite(bounds.x2) || !Number.isFinite(bounds.y1) || !Number.isFinite(bounds.y2)) {
      return;
    }
    if (bounds.x2 - bounds.x1 < 1 || bounds.y2 - bounds.y1 < 1) {
      return;
    }

    const isSelected = selectedDFAName === name;
    ctx.strokeStyle = isSelected ? theme.selectionColor : theme.savedColor;
    ctx.lineWidth = isSelected ? 3.5 : 2.5;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(
      bounds.x1,
      bounds.y1,
      bounds.x2 - bounds.x1,
      bounds.y2 - bounds.y1
    );
    ctx.setLineDash([]);

    ctx.save();
    ctx.font = "600 14px Inter, system-ui, sans-serif";
    ctx.fillStyle = theme.savedTextColor;
    ctx.textAlign = "left";
    ctx.fillText(name, bounds.x1 + 5, bounds.y1 - 5);
    ctx.restore();
  });
}

export function renderSavedSnapshotsLayer(args: {
  ctx: CanvasRenderingContext2D;
  savedDFAs: SavedDFAs;
  editMode?: boolean;
  editingDFAName?: string | null;
  theme: CanvasTheme;
  getLabelPalette: LabelPaletteResolver;
}) {
  const { ctx, savedDFAs, editMode, editingDFAName, theme, getLabelPalette } = args;

  Object.entries(savedDFAs).forEach(([name, data]) => {
    if (editMode && editingDFAName === name) {
      return;
    }
    const snapshot = data.snapshot;
    if (!snapshot?.states?.length) return;

    ctx.save();
    ctx.globalAlpha = 0.9;

    drawArrowsBidirectional(ctx, snapshot.arrowPairs ?? [], snapshot.states, theme.arrowColor);

    drawTransitionLabels(ctx, snapshot.arrowPairs ?? [], snapshot.states, {
      baseColor: theme.canvasText,
      bgColor: theme.canvasNode,
      borderColor: theme.arrowColor
    });

    snapshot.states.forEach((state, index) => {
      const strokeColor = state.color ? (theme.stateColors[state.color] ?? theme.canvasNodeStroke) : theme.canvasNodeStroke;
      ctx.beginPath();
      ctx.arc(state.x, state.y, state.r, 0, 2 * Math.PI);
      ctx.fillStyle = theme.canvasNode;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      if (state.color === "blue" || state.color === "tm-blue") {
        ctx.beginPath();
        ctx.arc(state.x, state.y, state.r - 5, 0, 2 * Math.PI);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (state.color?.startsWith("tm-")) {
        ctx.beginPath();
        ctx.arc(state.x, state.y, state.r + 3, 0, 2 * Math.PI);
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = strokeColor;
        if (state.color === "tm-purple") {
          ctx.setLineDash([4, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.save();
      const snapshotLabelPalette = getLabelPalette(theme.canvasNode);
      ctx.font = "600 12px Inter, system-ui, sans-serif";
      ctx.fillStyle = snapshotLabelPalette.text;
      ctx.strokeStyle = snapshotLabelPalette.outline;
      ctx.lineWidth = 3.6;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(`q${index}`, state.x, state.y);
      ctx.fillText(`q${index}`, state.x, state.y);
      ctx.restore();
    });

    ctx.restore();
  });
}

export function renderPreviewLayer(args: {
  ctx: CanvasRenderingContext2D;
  previewStates?: State[] | null;
  previewArrowPairs?: Transition[] | null;
  previewPosition?: { x: number; y: number } | null;
  theme: CanvasTheme;
  getLabelPalette: LabelPaletteResolver;
}) {
  const { ctx, previewStates, previewArrowPairs, previewPosition, theme, getLabelPalette } = args;
  if (!previewStates || !previewArrowPairs || !previewPosition) return;

  ctx.save();
  ctx.globalAlpha = 0.55;

  previewStates.forEach((state, index) => {
    const x = state.x + previewPosition.x;
    const y = state.y + previewPosition.y;
    const strokeColor = state.color ? (theme.stateColors[state.color] ?? theme.previewColor) : theme.previewColor;

    ctx.beginPath();
    ctx.arc(x, y, state.r, 0, 2 * Math.PI);
    ctx.fillStyle = theme.canvasNode;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    if (state.color === "blue" || state.color === "tm-blue") {
      ctx.beginPath();
      ctx.arc(x, y, state.r - 5, 0, 2 * Math.PI);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (state.color?.startsWith("tm-")) {
      ctx.beginPath();
      ctx.arc(x, y, state.r + 3, 0, 2 * Math.PI);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = strokeColor;
      if (state.color === "tm-purple") {
        ctx.setLineDash([4, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    const previewLabelPalette = getLabelPalette(theme.canvasNode);
    ctx.font = "600 12px Inter, system-ui, sans-serif";
    ctx.fillStyle = previewLabelPalette.text;
    ctx.strokeStyle = previewLabelPalette.outline;
    ctx.lineWidth = 3.6;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(`q${index}`, x, y);
    ctx.fillText(`q${index}`, x, y);
    ctx.restore();
  });

  const shiftedPreviewStates = previewStates.map(state => ({
    ...state,
    x: state.x + previewPosition.x,
    y: state.y + previewPosition.y
  }));

  drawArrowsBidirectional(ctx, previewArrowPairs, shiftedPreviewStates, theme.previewColor);

  drawTransitionLabels(ctx, previewArrowPairs, shiftedPreviewStates, {
    baseColor: theme.canvasText,
    bgColor: theme.canvasNode,
    borderColor: theme.previewColor
  });

  ctx.restore();
}

export function renderTopStateLabelsLayer(args: {
  ctx: CanvasRenderingContext2D;
  states: State[];
  arrowSelection: number[];
  theme: CanvasTheme;
  getLabelPalette: LabelPaletteResolver;
}) {
  const { ctx, states, arrowSelection, theme, getLabelPalette } = args;

  states.forEach((state, index) => {
    const isSelected = arrowSelection.includes(index);
    const fillColor = isSelected ? theme.canvasNodeSelected : theme.canvasNode;
    const labelPalette = getLabelPalette(fillColor);
    ctx.save();
    ctx.font = "700 13px Inter, system-ui, sans-serif";
    ctx.fillStyle = labelPalette.text;
    ctx.strokeStyle = labelPalette.outline;
    ctx.lineWidth = 4;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(`q${index}`, state.x, state.y);
    ctx.fillText(`q${index}`, state.x, state.y);
    ctx.restore();
  });
}
