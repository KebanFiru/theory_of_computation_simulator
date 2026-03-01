"use client";
import React, { useRef, useEffect, useState, useMemo, useReducer, useCallback } from "react";
import SelectionMenu from "../components/SelectionMenuComponent";
import AutomatonCanvas from "../components/AutomatonCanvas";
import ArrowInputFields from "../components/ArrowInputFields";
import AutomatonNameDialog from "../components/AutomatonNameDialog";
import AutomatonTableDisplay from "../components/AutomatonTableDisplay";
import SelectionModeIndicator from "../components/SelectionModeIndicator";
import HamburgerMenu from "../components/HamburgerMenu";
import { useAutomatonManager } from "../hooks/useAutomatonManager";
import { useCanvasInteraction } from "../hooks/useCanvasInteraction";
import { useSelectionMode } from "../hooks/useSelectionMode";
import type { ArrowPair, State } from "../types/types";
import { automatonFromSavedFA, buildNFAFromRegex } from "../lib/automata";
import { CFG, DNFA, GNFA } from "../lib/models";

export default function Canvas() {
  // Force update for AutomatonTableDisplay
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [editMode, setEditMode] = useState(false);
  const [editingDFAName, setEditingDFAName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mode states
  const [startingState, setStartgingState] = useState(false);
  const [state, setState] = useState(false);
  const [acceptState, setAcceptState] = useState(false);
  const [tmStateMode, setTmStateMode] = useState(false);
  const [tmAcceptMode, setTmAcceptMode] = useState(false);
  const [tmRejectMode, setTmRejectMode] = useState(false);
  const [tmTransitionMode, setTmTransitionMode] = useState(false);
  const [road, setRoad] = useState(false);
  const [finalize, setFinalize] = useState(false);
  const [tmFinalize, setTmFinalize] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameDialogMode, setNameDialogMode] = useState<"FA" | "TM">("FA");
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
    target?: "canvas" | "saved";
    table?: string[][];
    saveName?: string;
    editAfterPlace?: boolean;
  } | null>(null);
  const [importCursor, setImportCursor] = useState<{ x: number; y: number } | null>(null);
  const [lastCanvasPos, setLastCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [textArtifacts, setTextArtifacts] = useState<Array<{
    id: string;
    name: string;
    type: "CFG";
    content: string;
    position: { x: number; y: number };
  }>>([]);
  const [draggedSavedFA, setDraggedSavedFA] = useState<{
    name: string;
    anchor: { x: number; y: number };
    bounds: { x1: number; y1: number; x2: number; y2: number };
    snapshotStates: State[];
    liveStateSnapshot: Array<{ index: number; x: number; y: number }>;
  } | null>(null);
  const [overwriteDialog, setOverwriteDialog] = useState<{
    isOpen: boolean;
    name: string;
    mode: "FA" | "TM";
    selectionRect: { x1: number; y1: number; x2: number; y2: number } | null;
  }>({ isOpen: false, name: "", mode: "FA", selectionRect: null });
  const [regexDialog, setRegexDialog] = useState<{
    isOpen: boolean;
    regex: string;
    name: string;
  }>({
    isOpen: false,
    regex: "(a|b)*abb",
    name: "Regex-NFA"
  });
  const [transitionCountDialog, setTransitionCountDialog] = useState<{
    isOpen: boolean;
    from: number;
    to: number;
    max: number;
    value: string;
  }>({ isOpen: false, from: -1, to: -1, max: 0, value: "1" });
  const [tmTransitionDialog, setTmTransitionDialog] = useState<{
    isOpen: boolean;
    from: number;
    to: number;
    value: string;
  }>({ isOpen: false, from: -1, to: -1, value: "0/1,R" });

  // Custom hooks
  const dfaManager = useAutomatonManager();
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
        setNameDialogMode("FA");
        setShowNameDialog(true);
        selection.setSelectionMode(false);
        setFinalize(false);
        return;
      }

      // If selection mode but no rectangle yet
      showToast("Please draw a selection rectangle around the DFA first.", "info");
      setFinalize(false);
    }
  }, [finalize, selection, showToast, dfaManager.states]);

  useEffect(() => {
    if (tmFinalize) {
      if (!selection.selectionMode && !selection.selectionRect) {
        selection.setSelectionMode(true);
        setTmFinalize(false);
        return;
      }

      if (selection.selectionRect) {
        const rect = selection.selectionRect;
        const minX = Math.min(rect.x1, rect.x2);
        const maxX = Math.max(rect.x1, rect.x2);
        const minY = Math.min(rect.y1, rect.y2);
        const maxY = Math.max(rect.y1, rect.y2);
        const hasTmState = dfaManager.states.some(
          st => st.x >= minX && st.x <= maxX && st.y >= minY && st.y <= maxY && st.color.startsWith("tm-")
        );
        if (!hasTmState) {
          showToast("No TM states found in the selection area.", "error");
          selection.clearSelection();
          selection.setSelectionMode(false);
          setTmFinalize(false);
          return;
        }
        setNameDialogMode("TM");
        setShowNameDialog(true);
        selection.setSelectionMode(false);
        setTmFinalize(false);
        return;
      }

      showToast("Please draw a selection rectangle around the TM first.", "info");
      setTmFinalize(false);
    }
  }, [tmFinalize, selection, showToast, dfaManager.states]);

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

  const buildTransitionSlotsFromPairs = useCallback((pairs: ArrowPair[]) => {
    const next: Record<string, number> = {};
    pairs.forEach(pair => {
      const key = `${pair.from}-${pair.to}`;
      next[key] = (next[key] ?? 0) + 1;
    });
    return next;
  }, []);

  const buildBoundsForStates = useCallback((states: State[]) => {
    if (states.length === 0) {
      return { x1: 0, y1: 0, x2: 0, y2: 0 };
    }
    const minX = Math.min(...states.map(state => state.x));
    const maxX = Math.max(...states.map(state => state.x));
    const minY = Math.min(...states.map(state => state.y));
    const maxY = Math.max(...states.map(state => state.y));
    const padding = 24;
    return {
      x1: minX - padding,
      y1: minY - padding,
      x2: maxX + padding,
      y2: maxY + padding
    };
  }, []);

  const getRelatedAnchor = useCallback((baseName?: string | null) => {
    const relatedName = baseName ?? selectedDFAName;
    const related = relatedName ? dfaManager.savedDFAs[relatedName] : null;
    if (!related) {
      return lastCanvasPos ?? { x: 40, y: 40 };
    }
    const b = related.bounds;
    return {
      x: Math.max(b.x1, b.x2) + 30,
      y: Math.min(b.y1, b.y2)
    };
  }, [dfaManager.savedDFAs, lastCanvasPos, selectedDFAName]);

  const addTextArtifact = useCallback((type: "CFG", name: string, content: string, relatedName?: string | null) => {
    const anchor = getRelatedAnchor(relatedName);
    setTextArtifacts(prev => [
      ...prev,
      {
        id: `${type}-${Date.now()}-${Math.random()}`,
        name,
        type,
        content,
        position: anchor
      }
    ]);
  }, [getRelatedAnchor]);

  const nextUniqueName = useCallback((baseName: string) => {
    const normalizedBase = baseName.trim() || "FA";
    if (!dfaManager.savedDFAs[normalizedBase]) return normalizedBase;
    let suffix = 2;
    while (dfaManager.savedDFAs[`${normalizedBase}-${suffix}`]) {
      suffix += 1;
    }
    return `${normalizedBase}-${suffix}`;
  }, [dfaManager.savedDFAs]);

  const saveGeneratedAutomaton = useCallback((
    name: string,
    payload: { states: State[]; arrowPairs: ArrowPair[]; alphabet: string[] },
    table: string[][]
  ) => {
    const safeName = nextUniqueName(name);
    const bounds = buildBoundsForStates(payload.states);

    dfaManager.setSavedDFAs(prev => ({
      ...prev,
      [safeName]: {
        table,
        bounds,
        snapshot: {
          states: payload.states,
          arrowPairs: payload.arrowPairs
        }
      }
    }));
    dfaManager.setDfaAlphabets(prev => ({ ...prev, [safeName]: payload.alphabet }));
    setSelectedDFAName(safeName);
    return safeName;
  }, [buildBoundsForStates, dfaManager, nextUniqueName]);

  const downloadJson = useCallback((filename: string, payload: unknown) => {
    const content = JSON.stringify(payload, null, 2);

    const fallbackDownload = () => {
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };

    const saveWithPicker = async () => {
      const picker = (window as any).showSaveFilePicker;
      if (typeof picker !== "function") {
        fallbackDownload();
        return;
      }

      try {
        const handle = await picker({
          suggestedName: filename,
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch {
        // User may cancel picker; fallback keeps old behavior where possible.
        fallbackDownload();
      }
    };

    void saveWithPicker();
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
    downloadJson(`fa-${safeName || "export"}.json`, payload);
    showToast("Exported selected FA.", "success");
  }, [dfaManager.dfaAlphabets, dfaManager.savedDFAs, downloadJson, selectedDFAName, showToast]);

  const handleRegexToFA = useCallback(() => {
    setRegexDialog({
      isOpen: true,
      regex: "(a|b)*abb",
      name: "Regex-NFA"
    });
  }, []);

  const handleCreateRegexAutomaton = useCallback(() => {
    const regex = regexDialog.regex.trim();
    const rawName = regexDialog.name.trim() || "Regex-NFA";

    if (!regex) {
      showToast("Please enter a regex.", "error");
      return;
    }

    try {
      const nfa = buildNFAFromRegex(regex);
      const payload = nfa.toCanvasPayload({ x: 0, y: 0 });
      const table = nfa.toTable();

      setImportPreview({
        name: rawName || "Regex-NFA",
        alphabet: payload.alphabet,
        states: payload.states,
        arrowPairs: payload.arrowPairs,
        target: "saved",
        table,
        saveName: rawName,
        editAfterPlace: true
      });
      setImportCursor(lastCanvasPos ?? { x: 0, y: 0 });
      setRegexDialog(prev => ({ ...prev, isOpen: false }));
      showToast("Move cursor and click to place generated NFA.", "info");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse regex.";
      showToast(message, "error");
    }
  }, [lastCanvasPos, regexDialog.name, regexDialog.regex, showToast]);

  const handleConvertSelectedNfaToDfa = useCallback(() => {
    if (!selectedDFAName) {
      showToast("Select an NFA to convert.", "info");
      return;
    }

    const source = dfaManager.savedDFAs[selectedDFAName];
    if (!source) {
      showToast("Selected FA not found.", "error");
      return;
    }

    const sourceAlphabet = dfaManager.dfaAlphabets[selectedDFAName] ?? (source.table?.[0] ?? []).slice(1);
    const automaton = automatonFromSavedFA(source, sourceAlphabet);
    if (automaton.getType() !== "NFA") {
      showToast("Selected automaton is already deterministic.", "info");
      return;
    }

    const dfa = automaton.determinize();
    const sourceBounds = source.bounds;
    const payload = dfa.toCanvasPayload({ x: 0, y: 0 });
    const table = dfa.toTable();

    setImportPreview({
      name: `${selectedDFAName}-DFA`,
      alphabet: payload.alphabet,
      states: payload.states,
      arrowPairs: payload.arrowPairs,
      target: "saved",
      table,
      saveName: `${selectedDFAName}-DFA`
    });
    setImportCursor({
      x: (Math.max(sourceBounds.x1, sourceBounds.x2) + 220),
      y: (sourceBounds.y1 + sourceBounds.y2) / 2
    });
    showToast("Move cursor and click to place converted DFA.", "info");
  }, [dfaManager.dfaAlphabets, dfaManager.savedDFAs, selectedDFAName, showToast]);

  const handleCreateGnfa = useCallback(() => {
    if (!selectedDFAName) {
      showToast("Select an FA first to create a GNFA.", "info");
      return;
    }
    const source = dfaManager.savedDFAs[selectedDFAName];
    if (!source) {
      showToast("Selected FA not found.", "error");
      return;
    }

    const sourceAlphabet = dfaManager.dfaAlphabets[selectedDFAName] ?? (source.table?.[0] ?? []).slice(1);
    const automaton = automatonFromSavedFA(source, sourceAlphabet);
    const gnfa = GNFA.fromAutomaton(automaton);
    const gnfaJson = gnfa.toJSON();

    const stateLabels = gnfaJson.states;
    const labelToIndex = new Map<string, number>();
    const stateCount = stateLabels.length;
    const radius = stateCount > 1 ? 140 : 0;
    const step = stateCount > 0 ? (Math.PI * 2) / stateCount : 0;
    const states: State[] = stateLabels.map((label, index) => {
      labelToIndex.set(label, index);
      const angle = step * index - Math.PI / 2;
      const color = label === gnfaJson.startState ? "red" : label === gnfaJson.acceptState ? "blue" : "green";
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: 20,
        color,
        id: Date.now() + Math.random() + index
      };
    });

    const arrowPairs: ArrowPair[] = [];
    const uniqueLabels = new Set<string>();
    Object.entries(gnfaJson.transitions).forEach(([from, targets]) => {
      const fromIndex = labelToIndex.get(from);
      if (fromIndex === undefined) return;
      Object.entries(targets).forEach(([to, label]) => {
        const toIndex = labelToIndex.get(to);
        if (toIndex === undefined) return;
        uniqueLabels.add(label);
        arrowPairs.push({ from: fromIndex, to: toIndex, label });
      });
    });

    const tableHeader = ["State", ...Array.from(uniqueLabels)];
    const tableRows = stateLabels.map((label, index) => {
      const rowName = label === gnfaJson.acceptState ? `${label}*` : label;
      const row = [rowName];
      tableHeader.slice(1).forEach(symbol => {
        const targets = arrowPairs
          .filter(pair => pair.from === index && pair.label === symbol)
          .map(pair => stateLabels[pair.to])
          .filter(Boolean);
        row.push(targets.length ? targets.join(",") : "-");
      });
      return row;
    });

    const sourceBounds = source.bounds;
    setImportPreview({
      name: `${selectedDFAName}-GNFA`,
      alphabet: [],
      states,
      arrowPairs,
      target: "saved",
      table: [tableHeader, ...tableRows],
      saveName: `${selectedDFAName}-GNFA`
    });
    setImportCursor({
      x: Math.max(sourceBounds.x1, sourceBounds.x2) + 660,
      y: (sourceBounds.y1 + sourceBounds.y2) / 2
    });
    showToast("Move cursor and click to place created GNFA.", "info");
  }, [dfaManager.dfaAlphabets, dfaManager.savedDFAs, selectedDFAName, showToast]);

  const handleCreateDnfa = useCallback(() => {
    if (!selectedDFAName) {
      showToast("Select an NFA/FA first to create DNFA.", "info");
      return;
    }
    const source = dfaManager.savedDFAs[selectedDFAName];
    if (!source) {
      showToast("Selected FA not found.", "error");
      return;
    }

    const sourceAlphabet = dfaManager.dfaAlphabets[selectedDFAName] ?? (source.table?.[0] ?? []).slice(1);
    const automaton = automatonFromSavedFA(source, sourceAlphabet);
    const dnfa = DNFA.fromNFA(automaton);
    const sourceBounds = source.bounds;
    const origin = {
      x: 0,
      y: 0
    };
    const payload = dnfa.toCanvasPayload(origin);
    const table = dnfa.toTable();

    setImportPreview({
      name: `${selectedDFAName}-DNFA`,
      alphabet: payload.alphabet,
      states: payload.states,
      arrowPairs: payload.arrowPairs,
      target: "saved",
      table,
      saveName: `${selectedDFAName}-DNFA`
    });
    setImportCursor({
      x: Math.max(sourceBounds.x1, sourceBounds.x2) + 440,
      y: (sourceBounds.y1 + sourceBounds.y2) / 2
    });
    showToast("Move cursor and click to place created DNFA.", "info");
  }, [dfaManager.dfaAlphabets, dfaManager.savedDFAs, selectedDFAName, showToast]);

  const handleCreateCfg = useCallback(() => {
    const cfg = CFG.createDefault();
    addTextArtifact("CFG", "CFG", JSON.stringify(cfg.toJSON(), null, 2));
    showToast("Created CFG artifact near related item.", "success");
  }, [addTextArtifact, showToast]);

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
          arrowPairs: previewPairs,
          target: "canvas"
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

  const closeNameFlow = useCallback(() => {
    setShowNameDialog(false);
    setDfaName("");
    setNameDialogMode("FA");
    selection.clearSelection();
    selection.setSelectionMode(false);
    setFinalize(false);
    setTmFinalize(false);
  }, [selection]);

  const saveSelectionWithName = useCallback((
    name: string,
    mode: "FA" | "TM",
    selectionRect: { x1: number; y1: number; x2: number; y2: number },
    forceOverwrite: boolean
  ) => {
    const success = dfaManager.saveDFA(name, selectionRect, {
      forceOverwrite,
      onError: message => showToast(message, "error")
    });
    if (!success) return;
    showToast(mode === "TM" ? `Saved TM as ${name}.` : `Saved FA as ${name}.`, "success");
    closeNameFlow();
  }, [closeNameFlow, dfaManager, showToast]);

  // Function to save DFA/TM with name
  const handleSaveDFA = useCallback(() => {
    if (!selection.selectionRect) return;
    const cleanName = dfaName.trim();
    if (!cleanName) {
      showToast("Please enter a name.", "error");
      return;
    }

    if (dfaManager.savedDFAs[cleanName]) {
      setOverwriteDialog({
        isOpen: true,
        name: cleanName,
        mode: nameDialogMode,
        selectionRect: { ...selection.selectionRect }
      });
      return;
    }

    saveSelectionWithName(cleanName, nameDialogMode, selection.selectionRect, false);
  }, [selection.selectionRect, dfaName, dfaManager.savedDFAs, nameDialogMode, saveSelectionWithName, showToast]);

  // Listen for edit button events from AutomatonTableDisplay
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
        dfaManager.setArrowPairs(prev => {
          const nextPairs = prev
            .filter(pair => !toRemove.has(pair.from) && !toRemove.has(pair.to))
            .map(pair => ({
              ...pair,
              from: indexMap.get(pair.from) ?? pair.from,
              to: indexMap.get(pair.to) ?? pair.to
            }));
          setTransitionSlots(buildTransitionSlotsFromPairs(nextPairs));
          return nextPairs;
        });
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
  }, [buildTransitionSlotsFromPairs, dfaManager, editingDFAName]);

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
          dfaManager.setStates(prev => {
            const nextStates = prev.filter((_, i) => i !== idx);
            const indexMap = new Map<number, number>();
            prev.forEach((_, oldIndex) => {
              if (oldIndex === idx) return;
              const newIndex = oldIndex > idx ? oldIndex - 1 : oldIndex;
              indexMap.set(oldIndex, newIndex);
            });
            dfaManager.setArrowPairs(prevPairs => {
              const nextPairs = prevPairs
                .filter(pair => pair.from !== idx && pair.to !== idx)
                .map(pair => ({
                  ...pair,
                  from: indexMap.get(pair.from) ?? pair.from,
                  to: indexMap.get(pair.to) ?? pair.to
                }));
              setTransitionSlots(buildTransitionSlotsFromPairs(nextPairs));
              return nextPairs;
            });
            return nextStates;
          });
          dfaManager.setArrowSelection([]);
        } else if (dfaManager.arrowSelection.length === 2) {
          // Remove arrow between two selected states
          const [from, to] = dfaManager.arrowSelection;
          dfaManager.setArrowPairs(prev => {
            const nextPairs = prev.filter(p => !(p.from === from && p.to === to));
            setTransitionSlots(buildTransitionSlotsFromPairs(nextPairs));
            return nextPairs;
          });
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
  }, [buildTransitionSlotsFromPairs, dfaManager, selection, road, roadSelection, selectedDFAName, deleteDFAByNames]);

  const handleCancelDialog = () => {
    setShowNameDialog(false);
    setDfaName("");
    setNameDialogMode("FA");
  };

  const handleTransitionCountConfirm = useCallback(() => {
    const count = Number(transitionCountDialog.value);
    if (!Number.isFinite(count) || count < 1 || count > transitionCountDialog.max) {
      showToast("Please enter a valid number within the alphabet size.", "error");
      return;
    }
    const { from, to } = transitionCountDialog;
    const slotKey = `${from}-${to}`;
    setTransitionSlots(prev => ({ ...prev, [slotKey]: count }));
    dfaManager.setArrowPairs(pairs => [
      ...pairs,
      ...Array(count).fill(0).map(() => ({ from, to }))
    ]);
    setRoad(false);
    setTransitionCountDialog({ isOpen: false, from: -1, to: -1, max: 0, value: "1" });
  }, [transitionCountDialog, dfaManager, showToast]);

  const handleTmTransitionConfirm = useCallback(() => {
    const label = tmTransitionDialog.value.trim();
    const tmPattern = /^(.+)\/(.+),([LRS])$/;
    if (!tmPattern.test(label)) {
      showToast("Invalid TM transition. Use read/write,move format (e.g. 0/1,R).", "error");
      return;
    }

    const { from, to } = tmTransitionDialog;
    dfaManager.setArrowPairs(prev => [...prev, { from, to, label }]);
    const slotKey = `${from}-${to}`;
    setTransitionSlots(prev => ({ ...prev, [slotKey]: (prev[slotKey] ?? 0) + 1 }));
    setTmTransitionDialog({ isOpen: false, from: -1, to: -1, value: "0/1,R" });
  }, [tmTransitionDialog, dfaManager, showToast]);

  const closeRegexDialog = useCallback(() => {
    setRegexDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleOverwriteConfirm = useCallback(() => {
    if (!overwriteDialog.selectionRect) {
      setOverwriteDialog({ isOpen: false, name: "", mode: "FA", selectionRect: null });
      return;
    }
    saveSelectionWithName(overwriteDialog.name, overwriteDialog.mode, overwriteDialog.selectionRect, true);
    setOverwriteDialog({ isOpen: false, name: "", mode: "FA", selectionRect: null });
  }, [overwriteDialog, saveSelectionWithName]);

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

    if (!editMode) {
      const hitSavedDFA = Object.entries(dfaManager.savedDFAs).find(([, data]) => {
        const b = data.bounds;
        const minX = Math.min(b.x1, b.x2);
        const maxX = Math.max(b.x1, b.x2);
        const minY = Math.min(b.y1, b.y2);
        const maxY = Math.max(b.y1, b.y2);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      });

      if (hitSavedDFA) {
        const [name, data] = hitSavedDFA;
        const b = data.bounds;
        const minX = Math.min(b.x1, b.x2);
        const maxX = Math.max(b.x1, b.x2);
        const minY = Math.min(b.y1, b.y2);
        const maxY = Math.max(b.y1, b.y2);
        const liveStateSnapshot = dfaManager.states
          .map((state, index) => ({ index, x: state.x, y: state.y }))
          .filter(state => state.x >= minX && state.x <= maxX && state.y >= minY && state.y <= maxY);

        setSelectedDFAName(name);
        setDraggedSavedFA({
          name,
          anchor: { x, y },
          bounds: { ...data.bounds },
          snapshotStates: data.snapshot?.states?.map(state => ({ ...state })) ?? [],
          liveStateSnapshot
        });
        return;
      }
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
    setDraggedSavedFA(null);
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

    if (draggedSavedFA) {
      const dx = cursorX - draggedSavedFA.anchor.x;
      const dy = cursorY - draggedSavedFA.anchor.y;

      if (draggedSavedFA.liveStateSnapshot.length > 0) {
        const byIndex = new Map(draggedSavedFA.liveStateSnapshot.map(item => [item.index, item]));
        dfaManager.setStates(prev =>
          prev.map((state, index) => {
            const original = byIndex.get(index);
            if (!original) return state;
            return {
              ...state,
              x: original.x + dx,
              y: original.y + dy
            };
          })
        );
      }

      dfaManager.setSavedDFAs(prev => {
        const current = prev[draggedSavedFA.name];
        if (!current) return prev;

        const nextBounds = {
          x1: draggedSavedFA.bounds.x1 + dx,
          y1: draggedSavedFA.bounds.y1 + dy,
          x2: draggedSavedFA.bounds.x2 + dx,
          y2: draggedSavedFA.bounds.y2 + dy
        };

        const nextSnapshotStates = draggedSavedFA.snapshotStates.map(state => ({
          ...state,
          x: state.x + dx,
          y: state.y + dy
        }));

        return {
          ...prev,
          [draggedSavedFA.name]: {
            ...current,
            bounds: nextBounds,
            snapshot: current.snapshot
              ? {
                  ...current.snapshot,
                  states: nextSnapshotStates
                }
              : current.snapshot
          }
        };
      });
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
      const placedStates = importPreview.states.map((state, idx) => ({
        ...state,
        x: state.x + importCursor.x,
        y: state.y + importCursor.y,
        r: 20,
        id: Date.now() + Math.random() + idx
      }));

      if (importPreview.target === "saved") {
        const placedPairs = importPreview.arrowPairs.map(pair => ({ ...pair }));
        const savedName = saveGeneratedAutomaton(
          importPreview.saveName || importPreview.name,
          {
            states: placedStates,
            arrowPairs: placedPairs,
            alphabet: importPreview.alphabet
          },
          importPreview.table ?? []
        );

        if (importPreview.editAfterPlace) {
          dfaManager.setStates(placedStates);
          dfaManager.setArrowPairs(placedPairs);
          dfaManager.setArrowSelection([]);
          dfaManager.setAlphabet(importPreview.alphabet);
          setTransitionSlots(buildTransitionSlotsFromPairs(placedPairs));
          setEditMode(true);
          setEditingDFAName(savedName);
        }

        setImportPreview(null);
        setImportCursor(null);
        showToast(`Placed ${savedName}.`, "success");
        return;
      }

      const indexOffset = dfaManager.states.length;
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
          setTransitionCountDialog({
            isOpen: true,
            from,
            to,
            max: dfaManager.alphabet.length,
            value: "1"
          });
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

    if (tmTransitionMode) {
      const clickedCircleIndex = dfaManager.states.findIndex(
        circle => Math.hypot(circle.x - canvasX, circle.y - canvasY) <= circle.r
      );

      if (clickedCircleIndex !== -1) {
        if (roadSelection === null) {
          setRoadSelection(clickedCircleIndex);
          dfaManager.setArrowSelection([clickedCircleIndex]);
          return;
        }

        const from = roadSelection;
        const to = clickedCircleIndex;
        setRoadSelection(null);
        dfaManager.setArrowSelection([]);
        setTmTransitionDialog({
          isOpen: true,
          from,
          to,
          value: "0/1,R"
        });
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

    if (tmStateMode) {
      let newState: State = { x: canvasX, y: canvasY, r: 20, color: "tm-green", id: Date.now() + Math.random() };
      dfaManager.setStates(prev => [...prev, newState]);
      setTmStateMode(false);
    }

    if (tmAcceptMode) {
      let newState: State = { x: canvasX, y: canvasY, r: 20, color: "tm-blue", id: Date.now() + Math.random() };
      dfaManager.setStates(prev => [...prev, newState]);
      setTmAcceptMode(false);
    }

    if (tmRejectMode) {
      let newState: State = { x: canvasX, y: canvasY, r: 20, color: "tm-purple", id: Date.now() + Math.random() };
      dfaManager.setStates(prev => [...prev, newState]);
      setTmRejectMode(false);
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
        tmStateMode={tmStateMode}
        setTmStateMode={setTmStateMode}
        tmAcceptMode={tmAcceptMode}
        setTmAcceptMode={setTmAcceptMode}
        tmRejectMode={tmRejectMode}
        setTmRejectMode={setTmRejectMode}
        tmTransitionMode={tmTransitionMode}
        setTmTransitionMode={setTmTransitionMode}
        road={road}
        setRoad={setRoad}
        alphabet={dfaManager.alphabet}
        setAlphabet={dfaManager.setAlphabet}
        finalize={finalize}
        setFinalize={setFinalize}
        tmFinalize={tmFinalize}
        setTmFinalize={setTmFinalize}
        alphabetOwnerLabel={editMode && editingDFAName ? editingDFAName : "Unsaved FA"}
        alphabetLocked={editMode ? false : false}
      />

      <HamburgerMenu
        onExportSelected={handleExportSelected}
        onImportJson={handleImportJson}
        onRegexToFA={handleRegexToFA}
        onConvertSelectedNfaToDfa={handleConvertSelectedNfaToDfa}
        onCreateGnfa={handleCreateGnfa}
        onCreateDnfa={handleCreateDnfa}
        onCreateCfg={handleCreateCfg}
      />


      <AutomatonCanvas
        ref={canvasRef}
        states={dfaManager.states}
        arrowPairs={uniqueArrowPairs}
        arrowSelection={dfaManager.arrowSelection}
        selectionRect={selection.selectionRect}
        savedDFAs={dfaManager.savedDFAs}
        selectedDFAName={selectedDFAName}
        editMode={editMode}
        editingDFAName={editingDFAName}
        previewStates={importPreview?.states ?? null}
        previewArrowPairs={importPreview?.arrowPairs ?? null}
        previewPosition={importCursor}
        offset={canvasInteraction.offset}
        scale={canvasInteraction.scale}
        isDragging={canvasInteraction.isDragging}
        startingState={startingState}
        state={state}
        tmStateMode={tmStateMode}
        tmAcceptMode={tmAcceptMode}
        tmRejectMode={tmRejectMode}
        tmTransitionMode={tmTransitionMode}
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

      <AutomatonNameDialog
        isOpen={showNameDialog}
        dfaName={dfaName}
        title={nameDialogMode === "TM" ? "Name Your TM" : "Name Your FA"}
        placeholder={nameDialogMode === "TM" ? "Enter TM name..." : "Enter FA name..."}
        onNameChange={setDfaName}
        onSave={handleSaveDFA}
        onCancel={handleCancelDialog}
      />

      <AutomatonTableDisplay
        savedDFAs={dfaManager.savedDFAs}
        scale={canvasInteraction.scale}
        offset={canvasInteraction.offset}
        canvasRef={canvasRef}
        selectedDFAName={selectedDFAName}
        onSelect={(name) => setSelectedDFAName(name)}
      />

      {regexDialog.isOpen && (
        <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[70]">
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-lg w-full border border-[var(--border)]">
            <h3 className="text-xl font-bold mb-4 text-[var(--text)]">Create NFA from Regex</h3>
            <label className="block text-xs font-semibold text-[var(--text-subtle)] mb-1">Regex</label>
            <input
              className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-3 text-[var(--text)]"
              value={regexDialog.regex}
              onChange={e => setRegexDialog(prev => ({ ...prev, regex: e.target.value }))}
              placeholder="(a|b)*abb"
            />
            <label className="block text-xs font-semibold text-[var(--text-subtle)] mb-1">Name</label>
            <input
              className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-4 text-[var(--text)]"
              value={regexDialog.name}
              onChange={e => setRegexDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Regex-NFA"
              onKeyDown={e => e.key === "Enter" && handleCreateRegexAutomaton()}
            />
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]" onClick={closeRegexDialog}>Cancel</button>
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]" onClick={handleCreateRegexAutomaton}>Create</button>
            </div>
          </div>
        </div>
      )}

      {transitionCountDialog.isOpen && (
        <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[70]">
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-md w-full border border-[var(--border)]">
            <h3 className="text-lg font-bold mb-3 text-[var(--text)]">Transition Slot Count</h3>
            <p className="text-sm text-[var(--text-subtle)] mb-3">Enter a value between 1 and {transitionCountDialog.max}.</p>
            <input
              type="number"
              min={1}
              max={transitionCountDialog.max}
              className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-4 text-[var(--text)]"
              value={transitionCountDialog.value}
              onChange={e => setTransitionCountDialog(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleTransitionCountConfirm()}
            />
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
                onClick={() => setTransitionCountDialog({ isOpen: false, from: -1, to: -1, max: 0, value: "1" })}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]" onClick={handleTransitionCountConfirm}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {tmTransitionDialog.isOpen && (
        <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[70]">
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-md w-full border border-[var(--border)]">
            <h3 className="text-lg font-bold mb-3 text-[var(--text)]">TM Transition</h3>
            <p className="text-sm text-[var(--text-subtle)] mb-3">Format: read/write,move (example: 0/1,R)</p>
            <input
              className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-4 text-[var(--text)]"
              value={tmTransitionDialog.value}
              onChange={e => setTmTransitionDialog(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleTmTransitionConfirm()}
            />
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
                onClick={() => setTmTransitionDialog({ isOpen: false, from: -1, to: -1, value: "0/1,R" })}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]" onClick={handleTmTransitionConfirm}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {overwriteDialog.isOpen && (
        <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[70]">
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-md w-full border border-[var(--border)]">
            <h3 className="text-lg font-bold mb-3 text-[var(--text)]">Overwrite Existing {overwriteDialog.mode}</h3>
            <p className="text-sm text-[var(--text-subtle)] mb-4">
              A saved item named <span className="font-semibold text-[var(--text)]">{overwriteDialog.name}</span> already exists. Overwrite it?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
                onClick={() => setOverwriteDialog({ isOpen: false, name: "", mode: "FA", selectionRect: null })}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[var(--danger)] text-white rounded hover:bg-[var(--danger-strong)]" onClick={handleOverwriteConfirm}>Overwrite</button>
            </div>
          </div>
        </div>
      )}

      {textArtifacts.map(item => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const left = item.position.x * canvasInteraction.scale + canvasInteraction.offset.x + rect.left;
        const top = item.position.y * canvasInteraction.scale + canvasInteraction.offset.y + rect.top;
        return (
          <div
            key={item.id}
            className="fixed z-[45] w-[320px] rounded-xl border border-[var(--border)] bg-[var(--surface-overlay-strong)] shadow-lg p-3"
            style={{ left, top }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--info)]">{item.type}: {item.name}</span>
              <button
                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)]"
                onClick={() => setTextArtifacts(prev => prev.filter(card => card.id !== item.id))}
              >
                Remove
              </button>
            </div>
            <pre className="text-[10px] max-h-56 overflow-auto whitespace-pre-wrap text-[var(--text)]">{item.content}</pre>
          </div>
        );
      })}

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
