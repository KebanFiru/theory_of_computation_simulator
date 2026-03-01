"use client";
import { useState, useCallback, useEffect } from "react";
import type { State, SavedDFAs } from "../types/types";
import { FiniteAutomaton } from "../lib/automata";

const STORAGE_KEY = "cts-saved-dfas-v1";

export function useAutomatonManager() {
  const [states, setStates] = useState<State[]>([]);
  const [alphabet, setAlphabet] = useState<string[]>([]);
  const [arrowPairs, setArrowPairs] = useState<{ from: number; to: number; label?: string }[]>([]);
  const [arrowSelection, setArrowSelection] = useState<number[]>([]);
  const [savedDFAs, setSavedDFAs] = useState<SavedDFAs>({});
  const [dfaAlphabets, setDfaAlphabets] = useState<{ [name: string]: string[] }>({});
  const [transitionTable, setTransitionTable] = useState<string[][]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { savedDFAs?: SavedDFAs; dfaAlphabets?: { [name: string]: string[] } };
        if (parsed.savedDFAs) {
          setSavedDFAs(parsed.savedDFAs);
        }
        if (parsed.dfaAlphabets) {
          setDfaAlphabets(parsed.dfaAlphabets);
        }
      } catch {
        // Ignore invalid stored data
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHydrated) return;
    const payload = JSON.stringify({ savedDFAs, dfaAlphabets });
    window.localStorage.setItem(STORAGE_KEY, payload);
  }, [savedDFAs, dfaAlphabets, isHydrated]);

  // Restore alphabet for a DFA
  const restoreAlphabet = useCallback((dfaName: string) => {
    if (dfaAlphabets[dfaName]) {
      setAlphabet(dfaAlphabets[dfaName]);
    }
  }, [dfaAlphabets]);

  // Clear alphabet (for new DFA)
  const clearAlphabet = useCallback(() => {
    setAlphabet([]);
  }, []);

  const saveDFA = useCallback(
    (
      dfaName: string,
      selectionRect: { x1: number; y1: number; x2: number; y2: number },
      options?: {
        forceOverwrite?: boolean;
        onError?: (message: string) => void;
      }
    ) => {
      const notifyError = (message: string) => {
        if (options?.onError) {
          options.onError(message);
        }
      };

      if (!dfaName.trim()) {
        notifyError("Please enter a name for the DFA.");
        return false;
      }

      if (savedDFAs[dfaName] && !options?.forceOverwrite) {
        notifyError(`A DFA named "${dfaName}" already exists.`);
        return false;
      }

      if (!selectionRect) {
        notifyError("No selection rectangle found.");
        return false;
      }

      const trimmedAlphabet = alphabet.map(symbol => symbol.trim());
      const hasEmptySymbol = trimmedAlphabet.some(symbol => symbol === "");
      if (hasEmptySymbol) {
        notifyError("Alphabet symbols cannot be empty.");
        return false;
      }
      const uniqueAlphabet = new Set(trimmedAlphabet);
      if (uniqueAlphabet.size !== trimmedAlphabet.length) {
        notifyError("Alphabet symbols must be unique.");
        return false;
      }

      // Filter states within selection rectangle
      const minX = Math.min(selectionRect.x1, selectionRect.x2);
      const maxX = Math.max(selectionRect.x1, selectionRect.x2);
      const minY = Math.min(selectionRect.y1, selectionRect.y2);
      const maxY = Math.max(selectionRect.y1, selectionRect.y2);

      const selectedStateIndices: number[] = [];
      const stateIndexMap: { [oldIndex: number]: number } = {};

      states.forEach((st, index) => {
        if (st.x >= minX && st.x <= maxX && st.y >= minY && st.y <= maxY) {
          stateIndexMap[index] = selectedStateIndices.length;
          selectedStateIndices.push(index);
        }
      });

      if (selectedStateIndices.length === 0) {
        notifyError("No states found in the selection area.");
        return false;
      }

      // Save to collection with bounds
      const snapshotStates = selectedStateIndices.map(index => states[index]);
      const snapshotArrows = arrowPairs
        .filter(pair => selectedStateIndices.includes(pair.from) && selectedStateIndices.includes(pair.to))
        .map(pair => ({
          ...pair,
          from: stateIndexMap[pair.from],
          to: stateIndexMap[pair.to]
        }));

      const automaton = FiniteAutomaton.fromCanvasSnapshot(snapshotStates, snapshotArrows, trimmedAlphabet);
      const table = automaton.toTable();

      // Save alphabet for this DFA
      setDfaAlphabets(prev => ({ ...prev, [dfaName]: [...trimmedAlphabet] }));

      setSavedDFAs(prev => ({
        ...prev,
        [dfaName]: {
          table,
          bounds: {
            x1: minX,
            y1: minY,
            x2: maxX,
            y2: maxY
          },
          snapshot: {
            states: snapshotStates,
            arrowPairs: snapshotArrows
          }
        }
      }));
      setTransitionTable(table);

      // Keep states and arrows visible after saving
      // (Don't remove them from the canvas)

      return true;
    },
    [states, alphabet, arrowPairs, savedDFAs]
  );

  // Update arrow label by index
  const updateArrowLabel = useCallback((index: number, label: string) => {
    setArrowPairs(pairs =>
      pairs.map((p, i) => (i === index ? { ...p, label } : p))
    );
  }, []);

  const updateDfaAlphabet = useCallback((dfaName: string, nextAlphabet: string[]) => {
    setDfaAlphabets(prev => ({ ...prev, [dfaName]: [...nextAlphabet] }));
  }, []);

  const deleteDFAs = useCallback((names: string[]) => {
    if (!names.length) return;
    setSavedDFAs(prev => {
      const next = { ...prev };
      names.forEach(name => {
        delete next[name];
      });
      return next;
    });
    setDfaAlphabets(prev => {
      const next = { ...prev };
      names.forEach(name => {
        delete next[name];
      });
      return next;
    });
  }, []);

  return {
    states,
    setStates,
    alphabet,
    setAlphabet,
    arrowPairs,
    setArrowPairs,
    arrowSelection,
    setArrowSelection,
    savedDFAs,
    setSavedDFAs,
    transitionTable,
    setTransitionTable,
    saveDFA,
    updateArrowLabel,
    dfaAlphabets,
    setDfaAlphabets,
    updateDfaAlphabet,
    restoreAlphabet,
    clearAlphabet,
    deleteDFAs,
  };
}