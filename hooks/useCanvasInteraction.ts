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
    setScale(prev => Math.max(0.1, prev + e.deltaY * -0.001));
  }, []);

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
