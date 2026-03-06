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
  faTransitionDialog,
  setFaTransitionDialog,
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
    const parsed = Transition.parseTmLabel(label);
    if (!parsed) {
      showToast("Invalid TM transition. Use read/write,move segments (e.g. 0/1,R or 0/1,R;_/_,N).", "error");
      return;
    }

    const { from, to } = tmTransitionDialog;
    const normalizedLabel = Transition.formatTmLabel(parsed);
    setArrowPairs(prev => [...prev, Transition.create(from, to, normalizedLabel)]);
    const slotKey = `${from}-${to}`;
    setTransitionSlots(prev => ({ ...prev, [slotKey]: (prev[slotKey] ?? 0) + 1 }));
    setTmTransitionDialog({ isOpen: false, from: -1, to: -1, value: "0/1,R" });
  }, [tmTransitionDialog, setArrowPairs, setTmTransitionDialog, setTransitionSlots, showToast]);

  const handleFaTransitionConfirm = useCallback(() => {
    const { from, to, symbols, custom } = faTransitionDialog;
    const customTrimmed = custom.trim();
    const allSymbols = customTrimmed
      ? [...symbols, ...customTrimmed.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)]
      : [...symbols];
    const uniqueSymbols = [...new Set(allSymbols)];
    if (uniqueSymbols.length === 0) {
      showToast("Please select or enter at least one symbol.", "error");
      return;
    }
    const slotKey = `${from}-${to}`;
    uniqueSymbols.forEach(symbol => {
      setArrowPairs(prev => [...prev, Transition.create(from, to, symbol)]);
    });
    setTransitionSlots(prev => ({ ...prev, [slotKey]: (prev[slotKey] ?? 0) + uniqueSymbols.length }));
    setFaTransitionDialog({ isOpen: false, from: -1, to: -1, symbols: [], custom: "" });
  }, [faTransitionDialog, setArrowPairs, setFaTransitionDialog, setTransitionSlots, showToast]);

  useEffect(() => {
    const pairs = new Set<string>();
    arrowPairs.forEach(pair => {
      pairs.add(`${pair.from}-${pair.to}`);
    });
    pairs.forEach(key => {
      const [from, to] = key.split("-").map(Number);
      const arrowsBetween = arrowPairs.filter(p => p.from === from && p.to === to);
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
    handleTmTransitionConfirm,
    handleFaTransitionConfirm
  };
}
