import type { TransitionInputDescriptor } from "../../types/view";
import type { State } from "./state";

export class Transition {
  from: number;
  to: number;
  label?: string;

  constructor({ from, to, label }: { from: number; to: number; label?: string }) {
    this.from = from;
    this.to = to;
    this.label = label;
  }

  static create(from: number, to: number, label?: string) {
    return new Transition({ from, to, label });
  }

  static from(value: { from: number; to: number; label?: string }) {
    return new Transition(value);
  }

  withLabel(label?: string) {
    return new Transition({ ...this, label });
  }

  withEndpoints(from: number, to: number) {
    return new Transition({ ...this, from, to });
  }

  private static calculateParallelOffset(
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

  static getInputDescriptors(args: {
    arrowPairs: Transition[];
    states: State[];
    alphabet: string[];
    transitionSlots: Record<string, number>;
    scale: number;
    offset: { x: number; y: number };
    canvasRect: { left: number; top: number } | null;
  }): TransitionInputDescriptor[] {
    const { arrowPairs, states, alphabet, transitionSlots, scale, offset, canvasRect } = args;
    if (!canvasRect) return [];

    const seen = new Set<string>();
    const uniqueArrowPairs = arrowPairs
      .map((pair, idx) => ({ ...pair, originalIndex: idx }))
      .filter((pair) => {
        const key = `${pair.from}-${pair.to}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const descriptors: TransitionInputDescriptor[] = [];

    uniqueArrowPairs.forEach((pair) => {
      const fromCircle = states[pair.from];
      const toCircle = states[pair.to];
      if (!fromCircle || !toCircle) return;

      const sameDirectionArrows = arrowPairs
        .map((p, idx) => ({ ...p, originalIndex: idx }))
        .filter(p => p.from === pair.from && p.to === pair.to);

      const hasReverseArrows = arrowPairs.some(
        p => p.from === pair.to && p.to === pair.from && pair.from !== pair.to
      );

      let midX = (fromCircle.x + toCircle.x) / 2;
      let midY = (fromCircle.y + toCircle.y) / 2;

      if (pair.from === pair.to) {
        midX = fromCircle.x;
        midY = fromCircle.y - fromCircle.r - 46;
      }

      if (hasReverseArrows && pair.from !== pair.to) {
        const minIndex = Math.min(pair.from, pair.to);
        const maxIndex = Math.max(pair.from, pair.to);
        const baseFrom = states[minIndex];
        const baseTo = states[maxIndex];
        if (baseFrom && baseTo) {
          const baseOffset = Transition.calculateParallelOffset(baseFrom, baseTo, true);
          const isForward = pair.from === minIndex;
          const appliedOffset = isForward
            ? baseOffset
            : { x: -baseOffset.x, y: -baseOffset.y };
          midX += appliedOffset.x * 1.6;
          midY += appliedOffset.y * 1.6;
        }
      }

      const screenX = midX * scale + offset.x + canvasRect.left;
      const screenY = midY * scale + offset.y + canvasRect.top;
      const slotCount = transitionSlots[`${pair.from}-${pair.to}`] ?? alphabet.length;

      Array.from({ length: slotCount }).forEach((_, slotIdx) => {
        const offsetX = (slotIdx - (slotCount - 1) / 2) * 28;
        const arrowEntry = sameDirectionArrows[slotIdx];
        const arrowIdx = arrowEntry?.originalIndex ?? -1;
        const value = arrowEntry?.label ?? "";
        const isTmTransition =
          fromCircle.color.startsWith("tm-") && toCircle.color.startsWith("tm-");
        const textLength = Math.max(value.length, 1);
        const boxWidth = isTmTransition
          ? Math.min(168, Math.max(54, textLength * 7 + 10))
          : 24;

        descriptors.push({
          key: `${pair.from}-${pair.to}-${slotIdx}`,
          from: pair.from,
          to: pair.to,
          slotIdx,
          arrowIdx,
          value,
          isTmTransition,
          isEpsilon: value === "ε",
          boxWidth,
          screenX: screenX + offsetX,
          screenY
        });
      });
    });

    return descriptors;
  }
}
