"use client";
import React, { useRef, useEffect, forwardRef, useState } from "react";
import type { AutomatonCanvasProps } from "../types/component-props";

const AutomatonCanvas = forwardRef<HTMLCanvasElement, AutomatonCanvasProps>(({ 
  states,
  arrowPairs,
  arrowSelection,
  showLiveTransitionLabels = true,
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
  isDragging,
  startingState,
  state,
  tmStateMode,
  tmAcceptMode,
  tmRejectMode,
  tmTransitionMode,
  selectionMode,
  renderTick,
  onMouseDown,
  onMouseUp,
  onMouseMove,
  onWheel,
  onClick,
  onDoubleClick
}, ref) => {
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || useRef<HTMLCanvasElement>(null);
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const handleThemeChange = () => setThemeTick(tick => tick + 1);
    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    window.visualViewport?.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      window.visualViewport?.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const getVar = (name: string, fallback: string) =>
      rootStyles.getPropertyValue(name).trim() || fallback;
    const canvasBg = getVar("--canvas-bg", "#0b1220");
    const canvasNode = getVar("--canvas-node", "#ffffff");
    const canvasNodeSelected = getVar("--canvas-node-selected", "#2563eb");
    const canvasNodeStroke = getVar("--canvas-node-stroke", "#0f172a");
    const canvasText = getVar("--canvas-text", "#0f172a");
    const canvasTextSelected = getVar("--canvas-text-selected", "#ffffff");
    const contrastLight = getVar("--accent-contrast", "#ffffff");
    const contrastDark = getVar("--warning-contrast", "#0f172a");
    const selectionColor = getVar("--canvas-selection", "#ef4444");
    const savedColor = getVar("--canvas-saved", "#22c55e");
    const savedTextColor = getVar("--canvas-saved-text", "#16a34a");
    const arrowColor = getVar("--canvas-arrow", "#374151");
    const arrowSelectedColor = getVar("--canvas-arrow-selected", "#2563eb");
    const previewColor = getVar("--canvas-preview", "#94a3b8");
    const shadowColor = getVar("--shadow-color", "rgba(15, 23, 42, 0.15)");

    const parseColorToRgb = (value: string): { r: number; g: number; b: number } | null => {
      const color = value.trim();
      if (!color) return null;

      if (color.startsWith("#")) {
        const hex = color.slice(1);
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16);
          const g = parseInt(hex[1] + hex[1], 16);
          const b = parseInt(hex[2] + hex[2], 16);
          return { r, g, b };
        }
        if (hex.length === 6) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          return { r, g, b };
        }
      }

      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (rgbMatch) {
        return {
          r: Number(rgbMatch[1]),
          g: Number(rgbMatch[2]),
          b: Number(rgbMatch[3])
        };
      }

      return null;
    };

    const isDarkColor = (value: string) => {
      const rgb = parseColorToRgb(value);
      if (!rgb) return false;
      const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
      return luminance < 0.55;
    };

    const getLabelPalette = (fillColor: string) => {
      if (isDarkColor(fillColor)) {
        return {
          text: contrastLight,
          outline: contrastDark
        };
      }
      return {
        text: contrastDark,
        outline: contrastLight
      };
    };

    const stateColors: Record<string, string> = {
      red: getVar("--state-start", "#ef4444"),
      green: getVar("--state-normal", "#22c55e"),
      blue: getVar("--state-accept", "#3b82f6"),
      purple: getVar("--state-reject", "#a855f7"),
      "tm-green": getVar("--state-tm", "#f59e0b"),
      "tm-blue": getVar("--state-tm-accept", "#06b6d4"),
      "tm-purple": getVar("--state-tm-reject", "#8b5cf6")
    };
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    ctx.clearRect(-offset.x / scale, -offset.y / scale, canvas.width / scale, canvas.height / scale);
    ctx.fillStyle = canvasBg;
    ctx.fillRect(-offset.x / scale, -offset.y / scale, canvas.width / scale, canvas.height / scale);

    // Draw states
    states.forEach((state, index) => {
      const isSelected = arrowSelection.includes(index);
      const isTmState = state.color?.startsWith("tm-") ?? false;
      const isTmAccept = state.color === "tm-blue";
      const isTmReject = state.color === "tm-purple";
      const strokeColor = state.color ? (stateColors[state.color] ?? state.color) : canvasNodeStroke;
      const fillColor = isSelected ? canvasNodeSelected : canvasNode;

      ctx.save();
      ctx.beginPath();
      ctx.arc(state.x, state.y, state.r, 0, 2 * Math.PI);
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = isTmState ? 8 : 10;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? stateColors.blue ?? strokeColor : strokeColor;
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

      // Draw inner circle for accept states
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
        ctx.fillStyle = canvasNode;
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

      // Draw label
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
        ctx.fillStyle = canvasNode;
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeWidth, badgeHeight, 4);
        ctx.fill();
        ctx.strokeStyle = stateColors[state.color] ?? strokeColor;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = stateColors[state.color] ?? strokeColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, state.x, by + badgeHeight / 2 + 0.5);
        ctx.restore();
      }
    });

    // Draw arrows
    const processed = new Set<string>();
    arrowPairs.forEach((pair, pairIndex) => {
      // Skip if already processed
      if (processed.has(`${pairIndex}`)) return;
      
      const fromCircle = states[pair.from];
      const toCircle = states[pair.to];
      if (!fromCircle || !toCircle) return;
      
      // Find all arrows between these two states (both directions)
      const allArrowsBetween = arrowPairs
        .map((p, idx) => ({ ...p, originalIndex: idx }))
        .filter(p => 
          (p.from === pair.from && p.to === pair.to) ||
          (p.from === pair.to && p.to === pair.from && pair.from !== pair.to)
        );
      
      // Mark all as processed
      allArrowsBetween.forEach(a => processed.add(`${a.originalIndex}`));
      
      // Separate forward and reverse arrows
      const forwardArrows = allArrowsBetween.filter(p => p.from === pair.from && p.to === pair.to);
      const reverseArrows = allArrowsBetween.filter(p => p.from === pair.to && p.to === pair.from);
      
      // Draw forward arrows
      const isForwardSelected =
        arrowSelection.length === 2 &&
        arrowSelection[0] === pair.from &&
        arrowSelection[1] === pair.to;
      const isReverseSelected =
        arrowSelection.length === 2 &&
        arrowSelection[0] === pair.to &&
        arrowSelection[1] === pair.from;
      const forwardColor = isForwardSelected ? arrowSelectedColor : arrowColor;
      const reverseColor = isReverseSelected ? arrowSelectedColor : arrowColor;

      if (pair.from === pair.to) {
        drawLoop(ctx, fromCircle, forwardColor);
      } 
      else if (forwardArrows.length === 1 && reverseArrows.length === 0) {
        // Single unidirectional arrow - draw in center
        drawArrow(ctx, fromCircle, toCircle, forwardColor);
      } 
      else if (forwardArrows.length >= 1 && reverseArrows.length > 0) {
        // Bidirectional arrows - use stable offset based on index order
        const minIndex = Math.min(pair.from, pair.to);
        const maxIndex = Math.max(pair.from, pair.to);
        const baseFrom = states[minIndex];
        const baseTo = states[maxIndex];
        if (!baseFrom || !baseTo) return;
        const baseOffset = calculateParallelOffset(baseFrom, baseTo, true);
        const forwardOffset = pair.from === minIndex ? baseOffset : { x: -baseOffset.x, y: -baseOffset.y };
        drawArrow(
          ctx,
          { x: fromCircle.x + forwardOffset.x, y: fromCircle.y + forwardOffset.y, r: fromCircle.r },
          { x: toCircle.x + forwardOffset.x, y: toCircle.y + forwardOffset.y, r: toCircle.r },
          forwardColor
        );
      } else if (forwardArrows.length > 1) {
        // Multiple arrows - draw ONE arrow in center for all transitions
        drawArrow(ctx, fromCircle, toCircle, forwardColor);
      }
      
      // Draw reverse arrows
      if (reverseArrows.length >= 1) {
        const minIndex = Math.min(pair.from, pair.to);
        const maxIndex = Math.max(pair.from, pair.to);
        const baseFrom = states[minIndex];
        const baseTo = states[maxIndex];
        if (!baseFrom || !baseTo) return;
        const baseOffset = calculateParallelOffset(baseFrom, baseTo, true);
        const reverseOffset = pair.from === minIndex ? { x: -baseOffset.x, y: -baseOffset.y } : baseOffset;
        drawArrow(
          ctx,
          { x: toCircle.x + reverseOffset.x, y: toCircle.y + reverseOffset.y, r: toCircle.r },
          { x: fromCircle.x + reverseOffset.x, y: fromCircle.y + reverseOffset.y, r: fromCircle.r },
          reverseColor
        );
      }
    });

    drawTransitionLabels(ctx, arrowPairs, states, {
      baseColor: showLiveTransitionLabels ? canvasText : "rgba(0, 0, 0, 0)",
      bgColor: canvasNode,
      borderColor: arrowColor
    });

    // Draw selection rectangle if exists
    if (selectionRect) {
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
    
    // Draw saved DFA rectangles in green
    Object.entries(savedDFAs).forEach(([name, data]) => {
      const bounds = data.bounds;
      if (!Number.isFinite(bounds.x1) || !Number.isFinite(bounds.x2) || !Number.isFinite(bounds.y1) || !Number.isFinite(bounds.y2)) {
        return;
      }
      if (bounds.x2 - bounds.x1 < 1 || bounds.y2 - bounds.y1 < 1) {
        return;
      }
      const isSelected = selectedDFAName === name;
      ctx.strokeStyle = isSelected ? selectionColor : savedColor;
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
      ctx.fillStyle = savedTextColor;
      ctx.textAlign = "left";
      ctx.fillText(name, bounds.x1 + 5, bounds.y1 - 5);
      ctx.restore();
    });

    Object.entries(savedDFAs).forEach(([name, data]) => {
      const snapshot = data.snapshot;
      if (!snapshot?.states?.length) return;

      ctx.save();
      ctx.globalAlpha = 0.9;

      snapshot.arrowPairs?.forEach(pair => {
        const fromCircle = snapshot.states[pair.from];
        const toCircle = snapshot.states[pair.to];
        if (!fromCircle || !toCircle) return;
        if (pair.from === pair.to) {
          drawLoop(ctx, fromCircle, arrowColor);
          return;
        }
        drawArrow(ctx, fromCircle, toCircle, arrowColor);
      });

      drawTransitionLabels(ctx, snapshot.arrowPairs ?? [], snapshot.states, {
        baseColor: canvasText,
        bgColor: canvasNode,
        borderColor: arrowColor
      });

      snapshot.states.forEach((state, index) => {
        const strokeColor = state.color ? (stateColors[state.color] ?? canvasNodeStroke) : canvasNodeStroke;
        ctx.beginPath();
        ctx.arc(state.x, state.y, state.r, 0, 2 * Math.PI);
        ctx.fillStyle = canvasNode;
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
        const snapshotLabelPalette = getLabelPalette(canvasNode);
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

    if (previewStates && previewArrowPairs && previewPosition) {
      ctx.save();
      ctx.globalAlpha = 0.55;

      previewStates.forEach((state, index) => {
        const x = state.x + previewPosition.x;
        const y = state.y + previewPosition.y;
        const strokeColor = state.color ? (stateColors[state.color] ?? previewColor) : previewColor;

        ctx.beginPath();
        ctx.arc(x, y, state.r, 0, 2 * Math.PI);
        ctx.fillStyle = canvasNode;
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
        const previewLabelPalette = getLabelPalette(canvasNode);
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

      previewArrowPairs.forEach(pair => {
        const fromCircle = previewStates[pair.from];
        const toCircle = previewStates[pair.to];
        if (!fromCircle || !toCircle) return;
        if (pair.from === pair.to) {
          drawLoop(ctx, { x: fromCircle.x + previewPosition.x, y: fromCircle.y + previewPosition.y, r: fromCircle.r }, previewColor);
          return;
        }
        drawArrow(
          ctx,
          { x: fromCircle.x + previewPosition.x, y: fromCircle.y + previewPosition.y, r: fromCircle.r },
          { x: toCircle.x + previewPosition.x, y: toCircle.y + previewPosition.y, r: toCircle.r },
          previewColor
        );
      });

      const shiftedPreviewStates = previewStates.map(state => ({
        ...state,
        x: state.x + previewPosition.x,
        y: state.y + previewPosition.y
      }));

      drawTransitionLabels(ctx, previewArrowPairs, shiftedPreviewStates, {
        baseColor: canvasText,
        bgColor: canvasNode,
        borderColor: previewColor
      });

      ctx.restore();
    }

    // Keep live state labels on top so arrows/overlays can't hide them
    states.forEach((state, index) => {
      const isSelected = arrowSelection.includes(index);
      const fillColor = isSelected ? canvasNodeSelected : canvasNode;
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
    showLiveTransitionLabels
  ]);

  function calculateParallelOffset(
    from: { x: number; y: number },
    to: { x: number; y: number },
    isForwardDirection: boolean
  ) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    
    if (length === 0) return { x: 0, y: 0 };
    
    const offsetDistance = 10;
    const perpX = -dy / length;
    const perpY = dx / length;
    const sign = isForwardDirection ? 1 : -1;
    
    return {
      x: perpX * offsetDistance * sign,
      y: perpY * offsetDistance * sign
    };
  }

  function drawArrow(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number; r?: number },
    to: { x: number; y: number; r?: number },
    color: string
  ) {
    const arrowHeadLength = 15;
    const fromR = from.r ?? 0;
    const toR = to.r ?? 0;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-2) return;
    const angle = Math.atan2(dy, dx);

    const startX = from.x + (fromR * dx) / length;
    const startY = from.y + (fromR * dy) / length;
    const endX = to.x - (toR * dx) / length;
    const endY = to.y - (toR * dy) / length;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    const arrowAngle = Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowHeadLength * Math.cos(angle - arrowAngle),
      endY - arrowHeadLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      endX - arrowHeadLength * Math.cos(angle + arrowAngle),
      endY - arrowHeadLength * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawLoop(
    ctx: CanvasRenderingContext2D,
    state: { x: number; y: number; r?: number },
    color: string
  ) {
    const radius = (state.r ?? 0) + 12;
    const loopRadius = 16;
    const centerX = state.x;
    const centerY = state.y - radius;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.arc(centerX, centerY, loopRadius, Math.PI * 0.2, Math.PI * 1.8);
    ctx.stroke();

    const angle = Math.PI * 0.2;
    const endX = centerX + loopRadius * Math.cos(angle);
    const endY = centerY + loopRadius * Math.sin(angle);
    const arrowAngle = Math.PI / 6;
    const arrowHeadLength = 12;

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowHeadLength * Math.cos(angle - arrowAngle),
      endY - arrowHeadLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      endX - arrowHeadLength * Math.cos(angle + arrowAngle),
      endY - arrowHeadLength * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawTransitionLabels(
    ctx: CanvasRenderingContext2D,
    pairs: Array<{ from: number; to: number; label?: string }>,
    nodeStates: Array<{ x: number; y: number; r: number }>,
    style: { baseColor: string; bgColor: string; borderColor: string }
  ) {
    const grouped = new Map<string, { from: number; to: number; labels: string[] }>();

    pairs.forEach(pair => {
      const text = (pair.label ?? "").trim();
      if (!text) return;
      const key = `${pair.from}-${pair.to}`;
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, { from: pair.from, to: pair.to, labels: [text] });
        return;
      }
      if (!current.labels.includes(text)) {
        current.labels.push(text);
      }
    });

    grouped.forEach(entry => {
      const fromState = nodeStates[entry.from];
      const toState = nodeStates[entry.to];
      if (!fromState || !toState) return;

      const labelText = entry.labels.join(",");
      let x = (fromState.x + toState.x) / 2;
      let y = (fromState.y + toState.y) / 2;

      if (entry.from === entry.to) {
        x = fromState.x;
        y = fromState.y - fromState.r - 46;
      } else {
        const hasReverse = pairs.some(
          pair => pair.from === entry.to && pair.to === entry.from && pair.from !== pair.to
        );

        if (hasReverse) {
          const minIndex = Math.min(entry.from, entry.to);
          const maxIndex = Math.max(entry.from, entry.to);
          const baseFrom = nodeStates[minIndex];
          const baseTo = nodeStates[maxIndex];
          if (baseFrom && baseTo) {
            const baseOffset = calculateParallelOffset(baseFrom, baseTo, true);
            const isForward = entry.from === minIndex;
            const appliedOffset = isForward
              ? baseOffset
              : { x: -baseOffset.x, y: -baseOffset.y };
            x += appliedOffset.x * 1.6;
            y += appliedOffset.y * 1.6;
          }
        }
      }

      ctx.save();
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const textWidth = ctx.measureText(labelText).width;
      const boxWidth = Math.max(20, textWidth + 10);
      const boxHeight = 18;

      ctx.beginPath();
      ctx.fillStyle = style.bgColor;
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = 1.4;
      ctx.roundRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = style.baseColor;
      ctx.fillText(labelText, x, y + 0.5);
      ctx.restore();
    });
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100vw",
        height: "100vh",
        display: "block",
        background: "var(--canvas-bg)",
        cursor: startingState
          ? "crosshair"
          : isDragging
          ? "grabbing"
          : state
          ? "crosshair"
          : tmStateMode
          ? "crosshair"
          : tmAcceptMode
          ? "crosshair"
          : tmRejectMode
          ? "crosshair"
          : tmTransitionMode
          ? "crosshair"
          : selectionMode
          ? "crosshair"
          : "grab"
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      onWheel={onWheel}
    />
  );
});

AutomatonCanvas.displayName = "AutomatonCanvas";

export default AutomatonCanvas;
