"use client";
import React, { useRef, useEffect, forwardRef, useState } from "react";
import type { State , DFACanvasProps} from "../types/types";

const DFACanvas = forwardRef<HTMLCanvasElement, DFACanvasProps>(({
  states,
  arrowPairs,
  arrowSelection,
  selectionRect,
  savedDFAs,
  selectedDFAName,
  previewStates,
  previewArrowPairs,
  previewPosition,
  offset,
  scale,
  isDragging,
  startingState,
  state,
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
    const selectionColor = getVar("--canvas-selection", "#ef4444");
    const savedColor = getVar("--canvas-saved", "#22c55e");
    const savedTextColor = getVar("--canvas-saved-text", "#16a34a");
    const arrowColor = getVar("--canvas-arrow", "#374151");
    const arrowSelectedColor = getVar("--canvas-arrow-selected", "#2563eb");
    const previewColor = getVar("--canvas-preview", "#94a3b8");
    const stateColors: Record<string, string> = {
      red: getVar("--state-start", "#ef4444"),
      green: getVar("--state-normal", "#22c55e"),
      blue: getVar("--state-accept", "#3b82f6")
    };
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    ctx.clearRect(-offset.x / scale, -offset.y / scale, canvas.width / scale, canvas.height / scale);
    ctx.fillStyle = canvasBg;
    ctx.fillRect(-offset.x / scale, -offset.y / scale, canvas.width / scale, canvas.height / scale);

    // Draw states
    states.forEach((state, index) => {
      const isSelected = arrowSelection.includes(index);
      const strokeColor = state.color ? (stateColors[state.color] ?? state.color) : canvasNodeStroke;
      const fillColor = isSelected ? canvasNodeSelected : canvasNode;

      ctx.save();
      ctx.beginPath();
      ctx.arc(state.x, state.y, state.r, 0, 2 * Math.PI);
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? stateColors.blue ?? strokeColor : strokeColor;
      ctx.stroke();
      ctx.restore();

      // Draw inner circle for accept states (blue)
      if (state.color === "blue" && !isSelected) {
        ctx.beginPath();
        ctx.arc(state.x, state.y, state.r - 5, 0, 2 * Math.PI);
        ctx.strokeStyle = stateColors.blue ?? "#3b82f6";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw label
      ctx.save();
      ctx.font = "600 12px Inter, system-ui, sans-serif";
      ctx.fillStyle = isSelected ? canvasTextSelected : canvasText;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`q${index}`, state.x, state.y);
      ctx.restore();
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

    Object.values(savedDFAs).forEach((data) => {
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

      snapshot.states.forEach((state, index) => {
        const strokeColor = state.color ? (stateColors[state.color] ?? canvasNodeStroke) : canvasNodeStroke;
        ctx.beginPath();
        ctx.arc(state.x, state.y, state.r, 0, 2 * Math.PI);
        ctx.fillStyle = canvasNode;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        if (state.color === "blue") {
          ctx.beginPath();
          ctx.arc(state.x, state.y, state.r - 5, 0, 2 * Math.PI);
          ctx.strokeStyle = stateColors.blue ?? "#3b82f6";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.save();
        ctx.font = "600 12px Inter, system-ui, sans-serif";
        ctx.fillStyle = canvasText;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
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

        if (state.color === "blue") {
          ctx.beginPath();
          ctx.arc(x, y, state.r - 5, 0, 2 * Math.PI);
          ctx.strokeStyle = stateColors.blue ?? "#3b82f6";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.save();
        ctx.font = "600 12px Inter, system-ui, sans-serif";
        ctx.fillStyle = canvasText;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
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

      ctx.restore();
    }
  }, [
    offset,
    scale,
    states,
    arrowPairs,
    arrowSelection,
    selectionRect,
    savedDFAs,
    renderTick,
    themeTick,
    previewStates,
    previewArrowPairs,
    previewPosition
  ]);

  function calculateOffsetMultiplier(idx: number, totalArrows: number): number {
    if (totalArrows === 1) return 0;
    
    if (totalArrows % 2 === 1) {
      const middleIndex = Math.floor(totalArrows / 2);
      if (idx === middleIndex) return 0;
      if (idx < middleIndex) return -(middleIndex - idx);
      return (idx - middleIndex);
    } 
    else {
      const halfPoint = totalArrows / 2;
      if (idx < halfPoint) return -(halfPoint - idx) + 0.5;
      return (idx - halfPoint) + 0.5;
    }
  }

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

DFACanvas.displayName = "DFACanvas";

export default DFACanvas;
