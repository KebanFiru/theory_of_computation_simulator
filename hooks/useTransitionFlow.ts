"use client";
import { useCallback, useEffect } from "react";
import { Transition } from "../lib/util-classes/transition";
import type { UseTransitionFlowParams } from "../types/hooks";

export function useTransitionFlow({
  dfaManager,
  transitionSlots,
  setTransitionSlots,
  transitionCountDialog,
  setTransitionCountDialog,
  tmTransitionDialog,
  setTmTransitionDialog,
  setRoad,
  showToast
}: UseTransitionFlowParams) {
  const { arrowPairs, setArrowPairs } = dfaManager;

  const handleTransitionCountConfirm = useCallback(() => {
    const count = Number(transitionCountDialog.value);
    if (!Number.isFinite(count) || count < 1 || count > transitionCountDialog.max) {
      showToast("Please enter a valid number within the alphabet size.", "error");
      return;
    }
    const { from, to } = transitionCountDialog;
    const slotKey = `${from}-${to}`;
    setTransitionSlots(prev => ({ ...prev, [slotKey]: count }));
    setArrowPairs(pairs => [
      ...pairs,
      ...Array(count).fill(0).map(() => Transition.create(from, to))
    ]);
    setRoad(false);
    setTransitionCountDialog({ isOpen: false, from: -1, to: -1, max: 0, value: "1" });
  }, [transitionCountDialog, setArrowPairs, setRoad, setTransitionCountDialog, setTransitionSlots, showToast]);

  const handleTmTransitionConfirm = useCallback(() => {
    const label = tmTransitionDialog.value.trim();
    // Pattern: read/write,direction  —  direction is L, R, or N (None/Stay) per Wikipedia
    const tmPattern = /^(.+)\/(.+),([LRN])$/;
    if (!tmPattern.test(label)) {
      showToast("Invalid TM transition. Use read/write,direction format (e.g. 0/1,R or _/_,N).", "error");
      return;
    }

    const { from, to } = tmTransitionDialog;
    setArrowPairs(prev => [...prev, Transition.create(from, to, label)]);
    const slotKey = `${from}-${to}`;
    setTransitionSlots(prev => ({ ...prev, [slotKey]: (prev[slotKey] ?? 0) + 1 }));
    setTmTransitionDialog({ isOpen: false, from: -1, to: -1, value: "0/1,R" });
  }, [tmTransitionDialog, setArrowPairs, setTmTransitionDialog, setTransitionSlots, showToast]);

  useEffect(() => {
    const pairs = new Set<string>();
    arrowPairs.forEach(pair => {
      pairs.add(`${pair.from}-${pair.to}`);
    });
    pairs.forEach(key => {
      const [from, to] = key.split("-").map(Number);
      const arrowsBetween = arrowPairs.filter(p => p.from === from && p.to === to);
      // Only fill slots for pairs that have been explicitly registered in transitionSlots.
      // Using `?? alphabet.length` as a fallback would add spurious arrows when transitionSlots
      // is stale (e.g. re-render from setAlphabet inside saveDFA), causing duplicates on
      // bidirectional transitions.
      const limit = transitionSlots[key];
      if (limit === undefined) return;
      const missing = limit - arrowsBetween.length;
      if (missing > 0) {
        setArrowPairs(prev => [
          ...prev,
          ...Array(missing).fill(0).map(() => Transition.create(from, to))
        ]);
      }
    });
  }, [arrowPairs, setArrowPairs, transitionSlots]);

  return {
    handleTransitionCountConfirm,
    handleTmTransitionConfirm
  };
}
