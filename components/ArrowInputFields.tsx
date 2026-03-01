"use client";
import React from "react";
import type { State, ArrowInputFieldsProps } from "../types/types";

export default function ArrowInputFields({
  arrowPairs,
  states,
  alphabet,
  transitionSlots,
  scale,
  offset,
  canvasRef,
  showNameDialog,
  onArrowLabelChange
}: ArrowInputFieldsProps) {
  if (showNameDialog) return null;

  const calculateParallelOffset = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    isForwardDirection: boolean
  ) => {
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
  };

  // Deduplicate arrowPairs so only one per direction (from, to) is rendered
  const uniqueArrowPairs = React.useMemo(() => {
    const seen = new Set<string>();
    return arrowPairs
      .map((pair, idx) => ({ ...pair, originalIndex: idx }))
      .filter((pair) => {
        const key = `${pair.from}-${pair.to}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [arrowPairs]);

  return (
    <>
      {uniqueArrowPairs.map((pair) => {
        const fromCircle = states[pair.from];
        const toCircle = states[pair.to];
        if (!fromCircle || !toCircle) return null;

        // Find all arrows in same direction between these states
        const sameDirectionArrows = arrowPairs
          .map((p, idx) => ({ ...p, originalIndex: idx }))
          .filter(p => p.from === pair.from && p.to === pair.to);
        
        // Check if there are reverse arrows (bidirectional)
        const hasReverseArrows = arrowPairs.some(
          p => p.from === pair.to && p.to === pair.from && pair.from !== pair.to
        );

        const offsetMultiplier = 0;

        let midX = (fromCircle.x + toCircle.x) / 2;
        let midY = (fromCircle.y + toCircle.y) / 2;

        if (pair.from === pair.to) {
          midX = fromCircle.x;
          midY = fromCircle.y - fromCircle.r - 30;
        }

        // Apply perpendicular offset for positioning
        const dx = toCircle.x - fromCircle.x;
        const dy = toCircle.y - fromCircle.y;
        const length = Math.hypot(dx, dy);

        if (hasReverseArrows && pair.from !== pair.to) {
          const minIndex = Math.min(pair.from, pair.to);
          const maxIndex = Math.max(pair.from, pair.to);
          const baseFrom = states[minIndex];
          const baseTo = states[maxIndex];
          if (baseFrom && baseTo) {
            const baseOffset = calculateParallelOffset(baseFrom, baseTo, true);
            const isForward = pair.from === minIndex;
            const appliedOffset = isForward
              ? baseOffset
              : { x: -baseOffset.x, y: -baseOffset.y };
            midX += appliedOffset.x;
            midY += appliedOffset.y;
          }
        }

        if (length > 0 && offsetMultiplier !== 0) {
          const offsetDistance = 15;
          const perpX = -dy / length;
          const perpY = dx / length;

          midX = midX + perpX * offsetDistance * offsetMultiplier;
          midY = midY + perpY * offsetDistance * offsetMultiplier;
        }

        // Always render input fields equal to the alphabet length, regardless of label usage
        // Convert canvas to screen coordinates
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const screenX = midX * scale + offset.x + rect.left;
        const screenY = midY * scale + offset.y + rect.top;

        const slotCount = transitionSlots[`${pair.from}-${pair.to}`] ?? alphabet.length;
        return Array.from({ length: slotCount }).map((_, slotIdx) => {
          const offsetX = (slotIdx - (slotCount - 1) / 2) * 52;
          const arrowEntry = sameDirectionArrows[slotIdx];
          const arrowIdx = arrowEntry?.originalIndex ?? -1;
          const value = arrowEntry?.label ?? "";
          const isTmLabel = value.includes("/") && value.includes(",");

          if (value === "ε") {
            return (
              <div
                key={`arrow-epsilon-${pair.from}-${pair.to}-${slotIdx}`}
                style={{
                  position: "fixed",
                  left: screenX + offsetX,
                  top: screenY,
                  width: 56,
                  height: 38,
                  zIndex: 95,
                  transform: "translate(-50%, -50%)",
                  background: "var(--surface-overlay-strong)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 10,
                  textAlign: "center",
                  boxShadow: "0 6px 16px var(--shadow-color)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: "38px",
                  pointerEvents: "none",
                  userSelect: "none"
                }}
              >
                ε
              </div>
            );
          }

          return (
            <input
              key={`arrow-${pair.from}-${pair.to}-${slotIdx}`}
              style={{
                position: "fixed",
                left: screenX + offsetX,
                top: screenY,
                width: 56,
                height: 38,
                zIndex: 100,
                transform: "translate(-50%, -50%)",
                background: "var(--surface-overlay-strong)",
                border: "1px solid var(--border-strong)",
                borderRadius: 10,
                textAlign: "center",
                boxShadow: "0 6px 16px var(--shadow-color)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text)"
              }}
              className="focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={value}
              maxLength={isTmLabel ? 24 : 1}
              onMouseDown={e => e.stopPropagation()}
              onChange={e => {
                const val = e.target.value;
                if (arrowIdx === -1) return;
                if (val === "") {
                  onArrowLabelChange(arrowIdx, "");
                  return;
                }
                const tmPattern = /^(.+)\/(.+),([LRS])$/;
                if (isTmLabel) {
                  if (!tmPattern.test(val)) return;
                  onArrowLabelChange(arrowIdx, val);
                  return;
                }
                if (!alphabet.includes(val)) return;
                if (arrowPairs.some((p) => p.from === pair.from && p.to === pair.to && p.label === val)) return;
                onArrowLabelChange(arrowIdx, val);
              }}
            />
          );
        });
      })}
    </>
  );
}
