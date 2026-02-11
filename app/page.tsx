"use client";
import React, { useRef, useEffect, useState, useMemo, useReducer, useCallback } from "react";
import SelectionMenu from "../components/SelectionMenuComponent";
import DFACanvas from "../components/DFACanvas";
import ArrowInputFields from "../components/ArrowInputFields";
import DFANameDialog from "../components/DFANameDialog";
import DFATableDisplay from "../components/DFATableDisplay";
import SelectionModeIndicator from "../components/SelectionModeIndicator";
import HamburgerMenu from "../components/HamburgerMenu";
import { useDFAManager } from "../hooks/useDFAManager";
import { useCanvasInteraction } from "../hooks/useCanvasInteraction";
import { useSelectionMode } from "../hooks/useSelectionMode";
import type { ArrowPair, State } from "../types/types";

export default function Canvas() {
  // Force update for DFATableDisplay
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [editMode, setEditMode] = useState(false);
  const [editingDFAName, setEditingDFAName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mode states
  const [startingState, setStartgingState] = useState(false);
  const [state, setState] = useState(false);
  const [acceptState, setAcceptState] = useState(false);
  const [road, setRoad] = useState(false);
  const [finalize, setFinalize] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [dfaName, setDfaName] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [transitionSlots, setTransitionSlots] = useState<Record<string, number>>({});
  const [viewportTick, setViewportTick] = useState(0);
  const [roadSelection, setRoadSelection] = useState<number | null>(null);
  const [selectedDFAName, setSelectedDFAName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    name: string;
    alphabet: string[];
    states: State[];
    arrowPairs: ArrowPair[];
  } | null>(null);
  const [importCursor, setImportCursor] = useState<{ x: number; y: number } | null>(null);
  const [lastCanvasPos, setLastCanvasPos] = useState<{ x: number; y: number } | null>(null);

  // Custom hooks
  const dfaManager = useDFAManager();
  const canvasInteraction = useCanvasInteraction();
  const selection = useSelectionMode();

  // Create unique arrow pairs set to prevent duplicates
  const uniqueArrowPairs = useMemo(() => {
    const seen = new Set<string>();
    return dfaManager.arrowPairs.filter((pair, index) => {
      const key = `${pair.from}-${pair.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [dfaManager.arrowPairs]);

  const showToast = useCallback((message: string, type: "error" | "success" | "info" = "error") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // Handle finalize button clicks
  useEffect(() => {
    if (finalize) {
      // If no selection mode active, activate it
      if (!selection.selectionMode && !selection.selectionRect) {
        selection.setSelectionMode(true);
        setFinalize(false);
        return;
      }

      // If selection mode is active and rectangle exists, show dialog
      if (selection.selectionRect) {
        const rect = selection.selectionRect;
        const minX = Math.min(rect.x1, rect.x2);
        const maxX = Math.max(rect.x1, rect.x2);
        const minY = Math.min(rect.y1, rect.y2);
        const maxY = Math.max(rect.y1, rect.y2);
        const hasStateInSelection = dfaManager.states.some(
          st => st.x >= minX && st.x <= maxX && st.y >= minY && st.y <= maxY
        );
        if (!hasStateInSelection) {
          showToast("No states found in the selection area.", "error");
          selection.clearSelection();
          selection.setSelectionMode(false);
          setFinalize(false);
          return;
        }
        setShowNameDialog(true);
        selection.setSelectionMode(false);
        setFinalize(false);
        return;
      }

      // If selection mode but no rectangle yet
      showToast("Please draw a selection rectangle around the DFA first.", "info");
      setFinalize(false);
    }
  }, [finalize, selection, showToast]);

  const buildImportLayout = useCallback((stateCount: number, colors: Array<string | null>) => {
    const radius = stateCount > 1 ? 140 : 0;
    const step = stateCount > 0 ? (Math.PI * 2) / stateCount : 0;
    return Array.from({ length: stateCount }).map((_, index) => {
      const angle = step * index - Math.PI / 2;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: 20,
        color: colors[index] ?? "green",
        id: Date.now() + Math.random() + index
      } as State;
    });
  }, []);

  const handleExportSelected = useCallback(() => {
    if (!selectedDFAName) {
      showToast("Select an FA to export.", "info");
      return;
    }
    const dfa = dfaManager.savedDFAs[selectedDFAName];
    if (!dfa) {
      showToast("Selected FA not found.", "error");
      return;
    }
    const sanitizedSnapshotStates = dfa.snapshot?.states?.map(state => ({
      color: state.color,
      id: state.id
    })) ?? [];
    const sanitizedDfa = {
      table: dfa.table,
      snapshot: {
        states: sanitizedSnapshotStates,
        arrowPairs: dfa.snapshot?.arrowPairs ?? []
      }
    };
    const alphabet = dfaManager.dfaAlphabets[selectedDFAName] ?? [];
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items: [
        {
          name: selectedDFAName,
          alphabet,
          dfa: sanitizedDfa
        }
      ]
    };
    const safeName = selectedDFAName.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fa-${safeName || "export"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Exported selected FA.", "success");
  }, [dfaManager.dfaAlphabets, dfaManager.savedDFAs, selectedDFAName, showToast]);

  const handleImportJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed?.items)
          ? parsed.items
          : Array.isArray(parsed)
          ? parsed
          : parsed?.name && parsed?.dfa
          ? [parsed]
          : [];

        if (items.length === 0) {
          showToast("No FA data found in JSON.", "error");
          return;
        }

        const item = items[0];
        const name = String(item?.name ?? "Imported FA").trim() || "Imported FA";
        const dfa = item?.dfa;
        const alphabet = Array.isArray(item?.alphabet) ? item.alphabet.map(String) : [];

        if (!dfa?.table && !dfa?.snapshot) {
          showToast("No valid FA data found in JSON.", "error");
          return;
        }

        const snapshotStates = Array.isArray(dfa?.snapshot?.states) ? dfa.snapshot.states : [];
        const snapshotPairs = Array.isArray(dfa?.snapshot?.arrowPairs) ? dfa.snapshot.arrowPairs : [];
        const rowLabels = Array.isArray(dfa?.table)
          ? dfa.table.slice(1).map((row: string[]) => String(row?.[0] ?? ""))
          : [];
        const stateCount = snapshotStates.length || rowLabels.length;

        if (stateCount === 0) {
          showToast("No state data found in JSON.", "error");
          return;
        }

        const colors = Array.from({ length: stateCount }).map((_, index) => {
          const snapshotColor = snapshotStates[index]?.color;
          if (snapshotColor) return snapshotColor;
          const label = rowLabels[index] ?? "";
          if (/\*$/.test(label)) return "blue";
          if (index === 0) return "red";
          return "green";
        });

        const previewStates = buildImportLayout(stateCount, colors);
        const previewPairs = snapshotPairs.length
          ? snapshotPairs.map((pair: ArrowPair) => ({ ...pair }))
          : [];

        setImportPreview({
          name,
          alphabet,
          states: previewStates,
          arrowPairs: previewPairs
        });
        setImportCursor(lastCanvasPos ?? { x: 0, y: 0 });
        showToast("Move the mouse and click to place the FA.", "info");
      } catch {
        showToast("Invalid JSON file.", "error");
      }
    };
    reader.readAsText(file);
  }, [buildImportLayout, lastCanvasPos, showToast]);

  useEffect(() => {
    const handleViewportChange = () => {
      forceUpdate();
      setViewportTick(tick => tick + 1);
    };

    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    const resizeObserver = new ResizeObserver(() => {
      handleViewportChange();
    });
    resizeObserver.observe(document.documentElement);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      resizeObserver.disconnect();
    };
  }, [forceUpdate]);

  // Function to save DFA with name
  const handleSaveDFA = () => {
    if (selection.selectionRect) {
      const success = dfaManager.saveDFA(dfaName, selection.selectionRect, {
        onError: message => showToast(message, "error")
      });
      if (success) {
        setShowNameDialog(false);
        setDfaName("");
        selection.clearSelection();
        selection.setSelectionMode(false);
        setFinalize(false);
      } else {
        setShowNameDialog(false);
        setDfaName("");
        selection.clearSelection();
        selection.setSelectionMode(false);
        setFinalize(false);
      }
    }
  };

  // Listen for edit button events from DFATableDisplay
  React.useEffect(() => {
    const handler = (e: any) => {
      const dfaName = e.detail?.name;
      if (dfaName && dfaManager.dfaAlphabets[dfaName] && dfaManager.savedDFAs[dfaName]) {
        dfaManager.restoreAlphabet(dfaName);
        const snapshot = dfaManager.savedDFAs[dfaName].snapshot;
        if (snapshot) {
          dfaManager.setStates(snapshot.states.map((state: State) => ({ ...state })));
          dfaManager.setArrowPairs(snapshot.arrowPairs.map(pair => ({ ...pair })));
          const nextSlots: Record<string, number> = {};
          snapshot.arrowPairs.forEach(pair => {
            const key = `${pair.from}-${pair.to}`;
            nextSlots[key] = (nextSlots[key] ?? 0) + 1;
          });
          setTransitionSlots(nextSlots);
        } else {
          dfaManager.setStates([]);
          dfaManager.setArrowPairs([]);
          setTransitionSlots({});
        }
        dfaManager.setArrowSelection([]);
        setEditMode(true);
        setEditingDFAName(dfaName);
      }
    };
    window.addEventListener("editDFA", handler);
    return () => window.removeEventListener("editDFA", handler);
  }, [dfaManager]);

  // Keyboard shortcuts for delete and esc (always enabled)
  const deleteDFAByNames = useCallback((names: string[]) => {
    if (!names.length) return;
    const boundsToRemove = names
      .map(name => dfaManager.savedDFAs[name]?.bounds)
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number }[];

    if (boundsToRemove.length > 0) {
      const toRemove = new Set<number>();
      dfaManager.states.forEach((st, index) => {
        const hit = boundsToRemove.some(b => {
          const minX = Math.min(b.x1, b.x2);
          const maxX = Math.max(b.x1, b.x2);
          const minY = Math.min(b.y1, b.y2);
          const maxY = Math.max(b.y1, b.y2);
          return st.x >= minX && st.x <= maxX && st.y >= minY && st.y <= maxY;
        });
        if (hit) toRemove.add(index);
      });

      if (toRemove.size > 0) {
        const indexMap = new Map<number, number>();
        const nextStates: State[] = [];
        dfaManager.states.forEach((st, index) => {
          if (toRemove.has(index)) return;
          indexMap.set(index, nextStates.length);
          nextStates.push(st);
        });

        dfaManager.setStates(nextStates);
        dfaManager.setArrowPairs(prev =>
          prev
            .filter(pair => !toRemove.has(pair.from) && !toRemove.has(pair.to))
            .map(pair => ({
              ...pair,
              from: indexMap.get(pair.from) ?? pair.from,
              to: indexMap.get(pair.to) ?? pair.to
            }))
        );
        dfaManager.setArrowSelection([]);
      }
    }

    dfaManager.deleteDFAs(names);
    dfaManager.clearAlphabet();
    if (editingDFAName && names.includes(editingDFAName)) {
      setEditMode(false);
      setEditingDFAName(null);
      dfaManager.setStates([]);
      dfaManager.setArrowPairs([]);
      dfaManager.setArrowSelection([]);
      setTransitionSlots({});
      dfaManager.clearAlphabet();
    }
    setSelectedDFAName(prev => (prev && names.includes(prev) ? null : prev));
  }, [dfaManager, editingDFAName]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget = !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTypingTarget && e.key !== "Escape") {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedDFAName) {
          deleteDFAByNames([selectedDFAName]);
          return;
        }
        // Remove selected state or arrow
        if (dfaManager.arrowSelection.length === 1) {
          // Remove selected state
          const idx = dfaManager.arrowSelection[0];
          dfaManager.setStates(prev => prev.filter((_, i) => i !== idx));
          dfaManager.setArrowPairs(prev => prev.filter(p => p.from !== idx && p.to !== idx));
          dfaManager.setArrowSelection([]);
        } else if (dfaManager.arrowSelection.length === 2) {
          // Remove arrow between two selected states
          const [from, to] = dfaManager.arrowSelection;
          dfaManager.setArrowPairs(prev => prev.filter(p => !(p.from === from && p.to === to)));
          dfaManager.setArrowSelection([]);
        }
      } else if (e.key === "Escape") {
        if (importPreview) {
          setImportPreview(null);
          setImportCursor(null);
          return;
        }
        // Abort drawing selection rectangle and exit selection mode
        if (selection.isDrawingSelection) {
          selection.clearSelection();
        }
        if (selection.selectionMode) {
          selection.setSelectionMode(false);
        }
        if (road || roadSelection !== null) {
          setRoad(false);
          setRoadSelection(null);
          dfaManager.setArrowSelection([]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dfaManager, selection, road, roadSelection, selectedDFAName, deleteDFAByNames]);

  const handleCancelDialog = () => {
    setShowNameDialog(false);
    setDfaName("");
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;
    const x = (e.clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const y = (e.clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;

    // If selection mode is active, start drawing selection rectangle
    if (selection.selectionMode) {
      selection.startSelection(x, y);
      return;
    }

    const circleIdx = dfaManager.states.findIndex(
      c => Math.hypot(c.x - x, c.y - y) <= c.r
    );
    if (circleIdx !== -1) {
      canvasInteraction.setDraggedCircle(circleIdx);
      canvasInteraction.setDragOffset({
        x: x - dfaManager.states[circleIdx].x,
        y: y - dfaManager.states[circleIdx].y
      });
      return;
    }
    canvasInteraction.setIsDragging(true);
    canvasInteraction.setLastPos({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = () => {
    // If drawing selection, finalize it
    if (selection.isDrawingSelection && selection.selectionStart) {
      selection.finishSelection();
    }

    canvasInteraction.setIsDragging(false);
    canvasInteraction.setDraggedCircle(null);
    canvasInteraction.setDragOffset(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;
    const cursorX = (e.clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const cursorY = (e.clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;
    setLastCanvasPos({ x: cursorX, y: cursorY });

    if (importPreview) {
      setImportCursor({ x: cursorX, y: cursorY });
      return;
    }

    if (selection.isDrawingSelection && selection.selectionStart) {
      selection.updateSelection(cursorX, cursorY);
      return;
    }

    if (canvasInteraction.draggedCircle !== null && canvasInteraction.dragOffset) {
      dfaManager.setStates(prev =>
        prev.map((c, i) =>
          i === canvasInteraction.draggedCircle
            ? { ...c, x: cursorX - canvasInteraction.dragOffset!.x, y: cursorY - canvasInteraction.dragOffset!.y }
            : c
        )
      );
      return;
    }
    if (!canvasInteraction.isDragging) return;
    canvasInteraction.setOffset(prev => ({
      x: prev.x + (e.clientX - canvasInteraction.lastPos.x),
      y: prev.y + (e.clientY - canvasInteraction.lastPos.y)
    }));
    canvasInteraction.setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Prevent onClick when in selection mode or drawing selection
    if (selection.selectionMode || selection.isDrawingSelection) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;

    const canvasX = (e.clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const canvasY = (e.clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;

    if (importPreview && importCursor) {
      const indexOffset = dfaManager.states.length;
      const placedStates = importPreview.states.map((state, idx) => ({
        ...state,
        x: state.x + importCursor.x,
        y: state.y + importCursor.y,
        r: 20,
        id: Date.now() + Math.random() + idx
      }));
      const placedPairs = importPreview.arrowPairs.map(pair => ({
        ...pair,
        from: pair.from + indexOffset,
        to: pair.to + indexOffset
      }));

      dfaManager.setStates(prev => [...prev, ...placedStates]);
      dfaManager.setArrowPairs(prev => [...prev, ...placedPairs]);
      setTransitionSlots(prev => {
        const next = { ...prev };
        placedPairs.forEach(pair => {
          const key = `${pair.from}-${pair.to}`;
          next[key] = (next[key] ?? 0) + 1;
        });
        return next;
      });

      if (importPreview.alphabet.length > 0) {
        dfaManager.setAlphabet(prev => {
          if (prev.length === 0) return [...importPreview.alphabet];
          const merged = [...prev];
          importPreview.alphabet.forEach(symbol => {
            if (!merged.includes(symbol)) merged.push(symbol);
          });
          return merged;
        });
      }

      setImportPreview(null);
      setImportCursor(null);
      showToast(`Placed ${importPreview.name}.`, "success");
      return;
    }

    // Select saved DFA by clicking inside its bounds (disabled while editing)
    if (!editMode) {
      const hitSavedDFA = Object.entries(dfaManager.savedDFAs).find(([, data]) => {
        const b = data.bounds;
        const minX = Math.min(b.x1, b.x2);
        const maxX = Math.max(b.x1, b.x2);
        const minY = Math.min(b.y1, b.y2);
        const maxY = Math.max(b.y1, b.y2);
        return canvasX >= minX && canvasX <= maxX && canvasY >= minY && canvasY <= maxY;
      });
      if (hitSavedDFA) {
        setSelectedDFAName(hitSavedDFA[0]);
        return;
      }
    }
    if (selectedDFAName) {
      setSelectedDFAName(null);
    }

    if (!road) {
      const hitRadius = 10;
      let hitTransition: { from: number; to: number } | null = null;

      for (const pair of dfaManager.arrowPairs) {
        const fromCircle = dfaManager.states[pair.from];
        const toCircle = dfaManager.states[pair.to];
        if (!fromCircle || !toCircle) continue;

        if (pair.from === pair.to) {
          const loopX = fromCircle.x;
          const loopY = fromCircle.y - fromCircle.r - 30;
          const distance = Math.hypot(canvasX - loopX, canvasY - loopY);
          if (distance <= hitRadius) {
            hitTransition = { from: pair.from, to: pair.to };
            break;
          }
          continue;
        }

        const dx = toCircle.x - fromCircle.x;
        const dy = toCircle.y - fromCircle.y;
        const lengthSq = dx * dx + dy * dy;
        if (lengthSq === 0) continue;
        const t = ((canvasX - fromCircle.x) * dx + (canvasY - fromCircle.y) * dy) / lengthSq;
        if (t < 0 || t > 1) continue;
        const projX = fromCircle.x + t * dx;
        const projY = fromCircle.y + t * dy;
        const distance = Math.hypot(canvasX - projX, canvasY - projY);
        if (distance <= hitRadius) {
          hitTransition = { from: pair.from, to: pair.to };
          break;
        }
      }

      if (hitTransition) {
        dfaManager.setArrowSelection([hitTransition.from, hitTransition.to]);
        return;
      }
    }

    if (road) {
      const clickedCircleIndex = dfaManager.states.findIndex(
        circle => Math.hypot(circle.x - canvasX, circle.y - canvasY) <= circle.r
      );

      if (clickedCircleIndex !== -1) {
        if (dfaManager.alphabet.length === 0) {
          showToast("Please set the alphabet size first.", "error");
          return;
        }
        if (roadSelection === null) {
          setRoadSelection(clickedCircleIndex);
          dfaManager.setArrowSelection([clickedCircleIndex]);
          return;
        }

        const from = roadSelection;
        const to = clickedCircleIndex;
        const slotKey = `${from}-${to}`;
        const arrowsBetween = dfaManager.arrowPairs.filter(
          p => p.from === from && p.to === to
        );

        setRoadSelection(null);
        dfaManager.setArrowSelection([]);

        if (!transitionSlots[slotKey]) {
          const countInput = window.prompt(
            from === to
              ? `How many symbols will you allow for this loop? (1-${dfaManager.alphabet.length})`
              : `How many symbols will you allow for this transition? (1-${dfaManager.alphabet.length})`,
            "1"
          );
          if (!countInput) return;
          const count = Number(countInput);
          if (!Number.isFinite(count) || count < 1 || count > dfaManager.alphabet.length) {
            showToast("Please enter a valid number within the alphabet size.", "error");
            return;
          }
          setTransitionSlots(prev => ({ ...prev, [slotKey]: count }));
          dfaManager.setArrowPairs(pairs => [
            ...pairs,
            ...Array(count).fill(0).map(() => ({ from, to }))
          ]);
          setRoad(false);
          return;
        }

        const transitionLimit = transitionSlots[slotKey] ?? dfaManager.alphabet.length;
        if (arrowsBetween.length >= transitionLimit) {
          showToast("You can't add more arrows than the transition limit.", "error");
          return;
        }
        dfaManager.setArrowPairs(pairs => [...pairs, { from, to }]);
        setRoad(false);
        return;
      }

      if (roadSelection !== null) {
        setRoadSelection(null);
        dfaManager.setArrowSelection([]);
      }
    }

    if (startingState) {
      let newState: State = { x: canvasX, y: canvasY, r: 20, color: "red", id: Date.now() + Math.random() };
      dfaManager.setStates(prev => [...prev, newState]);
      setStartgingState(false);
    }

    if (state) {
      let newState: State = { x: canvasX, y: canvasY, r: 20, color: "green", id: Date.now() + Math.random() };
      dfaManager.setStates(prev => [...prev, newState]);
      setState(false);
    }

    if (acceptState) {
      let newState: State = { x: canvasX, y: canvasY, r: 20, color: "blue", id: Date.now() + Math.random() };
      dfaManager.setStates(prev => [...prev, newState]);
      setAcceptState(false);
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // Prevent double click actions when in selection mode or drawing selection
    if (selection.selectionMode || selection.isDrawingSelection) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;

    const canvasX = (e.clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const canvasY = (e.clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;

    const clickedCircleIndex = dfaManager.states.findIndex(
      circle => Math.hypot(circle.x - canvasX, circle.y - canvasY) <= circle.r
    );

    if (clickedCircleIndex !== -1) {
      dfaManager.setArrowSelection([clickedCircleIndex]);
      return;
    }

    dfaManager.setArrowSelection([]);
  };

  // Ensure arrowPairs always has enough empty arrows for each (from, to) pair to match the transition limit
  React.useEffect(() => {
    // Only ensure arrow objects for (from, to) pairs that already exist in arrowPairs
    const pairs = new Set<string>();
    dfaManager.arrowPairs.forEach(pair => {
      pairs.add(`${pair.from}-${pair.to}`);
    });
    pairs.forEach(key => {
      const [from, to] = key.split("-").map(Number);
      const arrowsBetween = dfaManager.arrowPairs.filter(p => p.from === from && p.to === to);
      const limit = transitionSlots[key] ?? dfaManager.alphabet.length;
      const missing = limit - arrowsBetween.length;
      if (missing > 0) {
        dfaManager.setArrowPairs(prev => [
          ...prev,
          ...Array(missing).fill(0).map(() => ({ from, to }))
        ]);
      }
    });
  }, [dfaManager.arrowPairs, dfaManager.alphabet.length, transitionSlots]);

  // In edit mode, allow adding states/arrows and changing arrow direction
  // When alphabet changes in edit mode, re-save DFA to update table and update dfaAlphabets
  useEffect(() => {
    if (editMode && editingDFAName) {
      dfaManager.updateDfaAlphabet(editingDFAName, dfaManager.alphabet);
      const bounds = dfaManager.savedDFAs[editingDFAName]?.bounds;
        if (bounds) {
        dfaManager.saveDFA(editingDFAName, bounds, {
          forceOverwrite: true,
          onError: message => showToast(message, "error")
        });
        } else if (dfaManager.states.length > 0) {
        const minX = Math.min(...dfaManager.states.map(s => s.x));
        const maxX = Math.max(...dfaManager.states.map(s => s.x));
        const minY = Math.min(...dfaManager.states.map(s => s.y));
        const maxY = Math.max(...dfaManager.states.map(s => s.y));
          const padding = 24;
        dfaManager.saveDFA(editingDFAName, { x1: minX - padding, y1: minY - padding, x2: maxX + padding, y2: maxY + padding }, {
          forceOverwrite: true,
          onError: message => showToast(message, "error")
        });
      }
      forceUpdate();
    }
  }, [dfaManager.alphabet, editMode, editingDFAName]);

  return (
    <>
      {editMode && editingDFAName && (
        <div className="fixed top-4 right-20 bg-[var(--surface-overlay)] backdrop-blur border border-[var(--border)] rounded-xl px-4 py-2 z-50 shadow-lg">
          <span className="mr-2 text-sm font-semibold text-[var(--info)]">Editing DFA: <b>{editingDFAName}</b></span>
          <button
            className="ml-2 px-3 py-1.5 bg-[var(--success)] text-white rounded-lg hover:bg-[var(--success-strong)] text-sm font-semibold"
            onClick={() => {
              if (editingDFAName) {
                if (dfaManager.states.length === 0) {
                  showToast("Cannot save an empty DFA.", "error");
                  return;
                }
                const existingBounds = dfaManager.savedDFAs[editingDFAName]?.bounds;
                let boundsToSave = existingBounds;
                if (!boundsToSave) {
                  const minX = Math.min(...dfaManager.states.map(s => s.x));
                  const maxX = Math.max(...dfaManager.states.map(s => s.x));
                  const minY = Math.min(...dfaManager.states.map(s => s.y));
                  const maxY = Math.max(...dfaManager.states.map(s => s.y));
                  const padding = 24;
                  boundsToSave = {
                    x1: minX - padding,
                    y1: minY - padding,
                    x2: maxX + padding,
                    y2: maxY + padding
                  };
                }
                dfaManager.saveDFA(editingDFAName, boundsToSave, {
                  forceOverwrite: true,
                  onError: message => showToast(message, "error")
                });
              }
              setEditMode(false);
              setEditingDFAName(null);
            }}
          >Done</button>
        </div>
      )}
      <SelectionMenu
        startingState={startingState}
        setStartgingState={setStartgingState}
        state={state}
        setState={setState}
        acceptState={acceptState}
        setAcceptState={setAcceptState}
        road={road}
        setRoad={setRoad}
        alphabet={dfaManager.alphabet}
        setAlphabet={dfaManager.setAlphabet}
        finalize={finalize}
        setFinalize={setFinalize}
        alphabetOwnerLabel={editMode && editingDFAName ? editingDFAName : "Unsaved FA"}
        alphabetLocked={editMode ? false : false}
      />

      <HamburgerMenu
        onExportSelected={handleExportSelected}
        onImportJson={handleImportJson}
      />

      <DFACanvas
        ref={canvasRef}
        states={dfaManager.states}
        arrowPairs={uniqueArrowPairs}
        arrowSelection={dfaManager.arrowSelection}
        selectionRect={selection.selectionRect}
        savedDFAs={dfaManager.savedDFAs}
        selectedDFAName={selectedDFAName}
        previewStates={importPreview?.states ?? null}
        previewArrowPairs={importPreview?.arrowPairs ?? null}
        previewPosition={importCursor}
        offset={canvasInteraction.offset}
        scale={canvasInteraction.scale}
        isDragging={canvasInteraction.isDragging}
        startingState={startingState}
        state={state}
        selectionMode={selection.selectionMode}
        renderTick={viewportTick}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onWheel={canvasInteraction.onWheel}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
      />

      <ArrowInputFields
        arrowPairs={dfaManager.arrowPairs}
        states={dfaManager.states}
        alphabet={dfaManager.alphabet}
        transitionSlots={transitionSlots}
        scale={canvasInteraction.scale}
        offset={canvasInteraction.offset}
        canvasRef={canvasRef}
        showNameDialog={showNameDialog}
        onArrowLabelChange={(index, label) => {
          // Prevent duplicate labels between same from-to
          const pair = dfaManager.arrowPairs[index];
          if (!pair) return;
          if (label && dfaManager.arrowPairs.some((p, i) => i !== index && p.from === pair.from && p.to === pair.to && p.label === label)) {
            showToast("This symbol is already used for this transition.", "error");
            return;
          }
          dfaManager.updateArrowLabel(index, label);
        }}
      />

      <SelectionModeIndicator isActive={selection.selectionMode} />

      <DFANameDialog
        isOpen={showNameDialog}
        dfaName={dfaName}
        onNameChange={setDfaName}
        onSave={handleSaveDFA}
        onCancel={handleCancelDialog}
      />

      <DFATableDisplay
        savedDFAs={dfaManager.savedDFAs}
        scale={canvasInteraction.scale}
        offset={canvasInteraction.offset}
        canvasRef={canvasRef}
        selectedDFAName={selectedDFAName}
        onSelect={(name) => setSelectedDFAName(name)}
      />

      {toast && (
        <div className="fixed top-24 right-6 z-[60]">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border backdrop-blur bg-[var(--surface-overlay)] ${
              toast.type === "error"
                ? "border-[var(--danger)] text-[var(--danger)]"
                : toast.type === "success"
                ? "border-[var(--success)] text-[var(--success)]"
                : "border-[var(--info)] text-[var(--info)]"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
