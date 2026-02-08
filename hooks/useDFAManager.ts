"use client";
import { useState, useCallback } from "react";
import type { State, SavedDFAs } from "../types/types";

export function useDFAManager() {
  const [states, setStates] = useState<State[]>([]);
  const [alphabet, setAlphabet] = useState<string[]>([]);
  const [arrowPairs, setArrowPairs] = useState<{ from: number; to: number; label?: string }[]>([]);
  const [arrowSelection, setArrowSelection] = useState<number[]>([]);
  const [savedDFAs, setSavedDFAs] = useState<SavedDFAs>({});
  const [dfaAlphabets, setDfaAlphabets] = useState<{ [name: string]: string[] }>({});
  const [transitionTable, setTransitionTable] = useState<string[][]>([]);

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
        } else {
          alert(message);
        }
      };

      if (!dfaName.trim()) {
        notifyError("Please enter a name for the DFA.");
        return false;
      }

      if (savedDFAs[dfaName] && !options?.forceOverwrite) {
        if (!confirm(`A DFA named "${dfaName}" already exists. Overwrite?`)) {
          return false;
        }
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

      // Build transition table
      const table: string[][] = [];

      // First row: header with alphabet
      const headerRow = ["State", ...trimmedAlphabet];
      table.push(headerRow);

      // Save alphabet for this DFA
      setDfaAlphabets(prev => ({ ...prev, [dfaName]: [...trimmedAlphabet] }));

      // For each selected state, create a row
      selectedStateIndices.forEach(stateIndex => {
        const st = states[stateIndex];
        const newStateIndex = stateIndexMap[stateIndex];
          const stateLabel =
            st.color === "blue" ? `q${newStateIndex}*` : `q${newStateIndex}`;
        const row = [stateLabel];

        // For each alphabet symbol, find transitions
        trimmedAlphabet.forEach(symbol => {
          let targetStates: string[] = [];

          // Find all arrows from this state with this symbol (only to selected states)
          arrowPairs.forEach(pair => {
            if (
              pair.from === stateIndex &&
              selectedStateIndices.includes(pair.to) &&
              pair.label === symbol
            ) {
              const newTargetIndex = stateIndexMap[pair.to];
              targetStates.push(`q${newTargetIndex}`);
            }
          });

          row.push(targetStates.length > 0 ? targetStates.join(",") : "-");
        });

        table.push(row);
      });

      // Save to collection with bounds
      const snapshotStates = selectedStateIndices.map(index => states[index]);
      const snapshotArrows = arrowPairs
        .filter(pair => selectedStateIndices.includes(pair.from) && selectedStateIndices.includes(pair.to))
        .map(pair => ({
          ...pair,
          from: stateIndexMap[pair.from],
          to: stateIndexMap[pair.to]
        }));

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
    updateDfaAlphabet,
    restoreAlphabet,
    clearAlphabet,
    deleteDFAs,
  };
}