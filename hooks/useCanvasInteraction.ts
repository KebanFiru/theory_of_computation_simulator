"use client";
import { useState, useCallback } from "react";

export function useCanvasInteraction() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [draggedCircle, setDraggedCircle] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const prevScale = scale;
    const nextScale = Math.max(0.1, prevScale + e.deltaY * -0.001);
    if (nextScale === prevScale) return;
    setScale(nextScale);
    const scaleRatio = nextScale / prevScale;
    setOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * scaleRatio,
      y: mouseY - (mouseY - prev.y) * scaleRatio
    }));
  }, [scale]);

  return {
    offset,
    setOffset,
    isDragging,
    setIsDragging,
    lastPos,
    setLastPos,
    scale,
    setScale,
    draggedCircle,
    setDraggedCircle,
    dragOffset,
    setDragOffset,
    onWheel
  };
}
