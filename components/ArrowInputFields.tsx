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

  // Deduplicate arrowPairs so only one per direction (from, to) is rendered
  const uniqueArrowPairs = React.useMemo(() => {
    const seen = new Set<string>();
    return arrowPairs.filter((pair) => {
      const key = `${pair.from}-${pair.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [arrowPairs]);

  return (
    <>
      {uniqueArrowPairs.map((pair, index) => {
        const fromCircle = states[pair.from];
        const toCircle = states[pair.to];
        if (!fromCircle || !toCircle) return null;

        // Find all arrows in same direction between these states
        const sameDirectionArrows = arrowPairs
          .map((p, idx) => ({ ...p, originalIndex: idx }))
          .filter(p => p.from === pair.from && p.to === pair.to);
        
        const arrIdx = sameDirectionArrows.findIndex(p => p.originalIndex === index);
        const totalArrows = sameDirectionArrows.length;

        // Check if there are reverse arrows (bidirectional)
        const hasReverseArrows = arrowPairs.some(
          p => p.from === pair.to && p.to === pair.from && pair.from !== pair.to
        );

        let offsetMultiplier = 0;
        if (totalArrows === 1 && !hasReverseArrows) {
          offsetMultiplier = 0;
        } 
        else if (totalArrows === 1 && hasReverseArrows) {
          // Single arrow with bidirectional - place it above the line
          offsetMultiplier = 1;
        } 
        else if (totalArrows > 1) {
          // Multiple arrows in same direction - spread them out
          if (totalArrows % 2 === 1) {
            const middleIndex = Math.floor(totalArrows / 2);
            if (arrIdx === middleIndex) {
              offsetMultiplier = 0;
            } 
            else if (arrIdx < middleIndex) {
              offsetMultiplier = -(middleIndex - arrIdx);
            } 
            else {
              offsetMultiplier = arrIdx - middleIndex;
            }
          }
          else {
            const halfPoint = totalArrows / 2;
            if (arrIdx < halfPoint) {
              offsetMultiplier = -(halfPoint - arrIdx) + 0.5;
            } 
            else {
              offsetMultiplier = arrIdx - halfPoint + 0.5;
            }
          }
        }

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
        const stackOffset = index % 2 === 0 ? -18 : 18;
        const screenY = midY * scale + offset.y + rect.top + stackOffset;

        const slotCount = transitionSlots[`${pair.from}-${pair.to}`] ?? alphabet.length;
        return Array.from({ length: slotCount }).map((_, slotIdx) => {
          const offsetX = (slotIdx - (slotCount - 1) / 2) * 52;
          const arrowEntry = sameDirectionArrows[slotIdx];
          const arrowIdx = arrowEntry?.originalIndex ?? -1;
          const value = arrowEntry?.label ?? "";
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
                background: "rgba(255,255,255,0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: 16,
                fontWeight: 600,
                color: "#111827"
              }}
              className="focus:outline-none focus:ring-2 focus:ring-red-400"
              value={value}
              maxLength={1}
              onChange={e => {
                const val = e.target.value;
                if (arrowIdx === -1) return;
                if (val === "") {
                  onArrowLabelChange(arrowIdx, "");
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
