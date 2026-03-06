"use client";
import React from "react";
import type { ArrowInputFieldsProps } from "../types/component-props";
import { Transition } from "../lib/util-classes/transition";

export default function ArrowInputFields({
  arrowPairs,
  states,
  alphabet,
  transitionSlots,
  scale,
  offset,
  canvasRef,
  showNameDialog,
  visible = true,
  onArrowLabelChange
}: ArrowInputFieldsProps) {
  if (showNameDialog) return null;

  const rect = canvasRef.current?.getBoundingClientRect();
  const descriptors = React.useMemo(
    () => Transition.getInputDescriptors({
      arrowPairs,
      states,
      alphabet,
      transitionSlots,
      scale,
      offset,
      canvasRect: rect ? { left: rect.left, top: rect.top } : null
    }),
    [arrowPairs, states, alphabet, transitionSlots, scale, offset, rect]
  );

  if (!visible) {
    return (
      <>
        {descriptors
          .filter(descriptor => (descriptor.value ?? "").trim().length > 0)
          .map(descriptor => (
            <div
              key={`arrow-static-${descriptor.key}`}
              style={{
                position: "fixed",
                left: descriptor.screenX,
                top: descriptor.screenY,
                width: descriptor.boxWidth,
                height: 18,
                zIndex: 50,
                transform: "translate(-50%, -50%)",
                background: "var(--canvas-node)",
                border: "1.4px solid var(--canvas-arrow)",
                borderRadius: 6,
                textAlign: "center",
                boxShadow: "none",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--canvas-text)",
                lineHeight: "18px",
                pointerEvents: "none",
                userSelect: "none",
                padding: "0 4px",
                fontFamily: "Inter, system-ui, sans-serif"
              }}
              title={descriptor.value}
            >
              {descriptor.value}
            </div>
          ))}
      </>
    );

  }

  return (
    <>
      {descriptors.map(descriptor => {
          if (descriptor.isEpsilon) {
            return (
              <div
                key={`arrow-epsilon-${descriptor.key}`}
                style={{
                  position: "fixed",
                  left: descriptor.screenX,
                  top: descriptor.screenY,
                  width: descriptor.boxWidth,
                  height: 18,
                  zIndex: 50,
                  transform: "translate(-50%, -50%)",
                  background: "var(--canvas-node)",
                  border: "1.4px solid var(--canvas-arrow)",
                  borderRadius: 6,
                  textAlign: "center",
                  boxShadow: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--canvas-text)",
                  lineHeight: "18px",
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
              key={`arrow-${descriptor.key}`}
              style={{
                position: "fixed",
                left: descriptor.screenX,
                top: descriptor.screenY,
                width: descriptor.boxWidth,
                height: 18,
                zIndex: 55,
                transform: "translate(-50%, -50%)",
                background: "var(--canvas-node)",
                border: "1.4px solid var(--canvas-arrow)",
                borderRadius: 6,
                textAlign: "center",
                boxShadow: "none",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--canvas-text)",
                padding: "0 4px",
                lineHeight: "18px",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "textfield",
                fontFamily: "Inter, system-ui, sans-serif"
              }}
              className="focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={descriptor.value}
              maxLength={descriptor.isTmTransition ? 24 : 1}
              onMouseDown={e => e.stopPropagation()}
              onChange={e => {
                const val = e.target.value;
                if (descriptor.arrowIdx === -1) return;
                if (val === "") {
                  onArrowLabelChange(descriptor.arrowIdx, "");
                  return;
                }

                if (descriptor.isTmTransition) {
                  onArrowLabelChange(descriptor.arrowIdx, val);
                  return;
                }

                if (!alphabet.includes(val)) return;
                if (arrowPairs.some((p) => p.from === descriptor.from && p.to === descriptor.to && p.label === val)) return;
                onArrowLabelChange(descriptor.arrowIdx, val);
              }}
            />
          );
      })}
    </>
  );
}
