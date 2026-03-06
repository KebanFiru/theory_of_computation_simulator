"use client";
import React, { useRef, useEffect, forwardRef, useState } from "react";
import type { AutomatonCanvasProps } from "../types/component-props";
import AutomatonCanvasRenderer from "./AutomatonCanvasRenderer";

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

  return (
    <>
      <AutomatonCanvasRenderer
        canvasRef={canvasRef}
        states={states}
        arrowPairs={arrowPairs}
        arrowSelection={arrowSelection}
        showLiveTransitionLabels={showLiveTransitionLabels}
        selectionRect={selectionRect}
        savedDFAs={savedDFAs}
        selectedDFAName={selectedDFAName}
        editMode={editMode}
        editingDFAName={editingDFAName}
        previewStates={previewStates}
        previewArrowPairs={previewArrowPairs}
        previewPosition={previewPosition}
        offset={offset}
        scale={scale}
        renderTick={renderTick}
        themeTick={themeTick}
      />

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
    </>
  );
});

AutomatonCanvas.displayName = "AutomatonCanvas";

export default AutomatonCanvas;
