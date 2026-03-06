import type { TransitionInputDescriptor } from "../../types/view";
import type { ParsedTmLabel } from "../../types/turing";
import type {
  ResolveTransitionLabelArgs,
  TransitionLabelResolution,
  TransitionLike
} from "../../types/transition";
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

  static calculateParallelOffset(
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

  static parseTmLabel(label: string): ParsedTmLabel | null {
    const compact = label.replace(/\s+/g, "");
    const [rwPart, movePart] = compact.split(",");
    if (!rwPart || !movePart) return null;

    const move = movePart.toUpperCase();
    if (move !== "L" && move !== "R" && move !== "N") return null;

    const [readPart, writePart] = rwPart.split("/");
    if (!readPart || !writePart) return null;

    const readLength = Array.from(readPart).length;
    const writeLength = Array.from(writePart).length;
    if (readLength !== 1 || writeLength !== 1) return null;

    return {
      read: readPart,
      write: writePart,
      move
    };
  }

  static isTmTransitionPair(states: State[], pair: TransitionLike) {
    const fromState = states[pair.from];
    const toState = states[pair.to];
    return !!fromState?.color?.startsWith("tm-") && !!toState?.color?.startsWith("tm-");
  }

  static hasDuplicateTmRead(args: {
    arrowPairs: TransitionLike[];
    from: number;
    read: string;
    excludeIndex?: number;
  }) {
    const { arrowPairs, from, read, excludeIndex } = args;
    return arrowPairs.some((pair, pairIndex) => {
      if (excludeIndex !== undefined && pairIndex === excludeIndex) return false;
      if (pair.from !== from) return false;
      const parsed = Transition.parseTmLabel(pair.label ?? "");
      if (!parsed) return false;
      return parsed.read === read;
    });
  }

  static resolveLabelUpdate({
    arrowPairs,
    states,
    index,
    label
  }: ResolveTransitionLabelArgs): TransitionLabelResolution {
    const pair = arrowPairs[index];
    if (!pair) {
      return { kind: "error", code: "invalid-index" };
    }

    if (Transition.isTmTransitionPair(states, pair)) {
      if (!label) {
        return { kind: "set", value: "" };
      }

      const parsed = Transition.parseTmLabel(label);
      if (!parsed) {
        return { kind: "error", code: "tm-format" };
      }

      if (Transition.hasDuplicateTmRead({
        arrowPairs,
        from: pair.from,
        read: parsed.read,
        excludeIndex: index
      })) {
        return {
          kind: "error",
          code: "tm-duplicate-read",
          from: pair.from,
          read: parsed.read
        };
      }

      return {
        kind: "set",
        value: `${parsed.read}/${parsed.write},${parsed.move}`
      };
    }

    if (label && arrowPairs.some((candidate, candidateIndex) =>
      candidateIndex !== index &&
      candidate.from === pair.from &&
      candidate.to === pair.to &&
      candidate.label === label
    )) {
      return { kind: "error", code: "fa-duplicate-symbol" };
    }

    return { kind: "set", value: label };
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
