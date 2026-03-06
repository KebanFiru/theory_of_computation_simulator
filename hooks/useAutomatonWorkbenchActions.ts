"use client";
import { useCallback } from "react";
import { State } from "../lib/util-classes/state";
import { Transition } from "../lib/util-classes/transition";
import { EPSILON, SavedFA, buildNFAFromRegex } from "../lib/automata/index";
import { CFG, DFA, GNFA } from "../lib/models";
import type { UseAutomatonWorkbenchActionsParams } from "../types/hooks";

export function useAutomatonWorkbenchActions({
  dfaManager,
  selectedDFAName,
  scale,
  setSelectedDFAName,
  setImportPreview,
  setImportCursor,
  lastCanvasPos,
  setTextArtifacts,
  regexDialog,
  setRegexDialog,
  showToast
}: UseAutomatonWorkbenchActionsParams) {
  const isSavedTm = useCallback((name: string) => {
    const snapshotStates = dfaManager.savedDFAs[name]?.snapshot?.states ?? [];
    return snapshotStates.some(state => state.color.startsWith("tm-"));
  }, [dfaManager.savedDFAs]);

  const buildImportLayout = useCallback((stateCount: number, colors: Array<string | null>) => {
    const radius = stateCount > 1 ? 140 : 0;
    const step = stateCount > 0 ? (Math.PI * 2) / stateCount : 0;
    return Array.from({ length: stateCount }).map((_, index) => {
      const angle = step * index - Math.PI / 2;
      return State.create({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        color: colors[index] ?? "green",
        r: 20,
        id: Date.now() + Math.random() + index
      });
    });
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
    const gapPx = 16;
    const safeScale = Math.max(scale, 0.1);

    return {
      x: Math.max(b.x1, b.x2) + gapPx / safeScale,
      y: Math.max(b.y1, b.y2) + 5
    };
  }, [dfaManager.savedDFAs, lastCanvasPos, scale, selectedDFAName]);

  const addTextArtifact = useCallback((type: "CFG", name: string, content: string, relatedName?: string | null) => {
    const anchor = getRelatedAnchor(relatedName);
    setTextArtifacts(prev => [
      ...prev,
      {
        id: `${type}-${Date.now()}-${Math.random()}`,
        name,
        type,
        content,
        position: anchor,
        relatedDFAName: relatedName ?? undefined
      }
    ]);
  }, [getRelatedAnchor, setTextArtifacts]);

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
    payload: { states: State[]; arrowPairs: Transition[]; alphabet: string[] },
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
  }, [buildBoundsForStates, dfaManager, nextUniqueName, setSelectedDFAName]);

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
  }, [setRegexDialog]);

  const handleCloseRegexDialog = useCallback(() => {
    setRegexDialog(prev => ({ ...prev, isOpen: false }));
  }, [setRegexDialog]);

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
  }, [lastCanvasPos, regexDialog.name, regexDialog.regex, setImportCursor, setImportPreview, setRegexDialog, showToast]);

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

    if (isSavedTm(selectedDFAName)) {
      showToast("Selected automaton is a TM. NFA→DFA conversion is FA-only.", "info");
      return;
    }

    const sourceAlphabet = dfaManager.dfaAlphabets[selectedDFAName] ?? (source.table?.[0] ?? []).slice(1);
    if (SavedFA.getType(source, sourceAlphabet) !== "NFA") {
      showToast("Selected automaton is already deterministic.", "info");
      return;
    }

    const dfa = DFA.fromSavedFA(source, sourceAlphabet);
    const sourceBounds = source.bounds;
    setImportPreview(dfa.toSavedPreview(selectedDFAName));
    setImportCursor({
      x: Math.max(sourceBounds.x1, sourceBounds.x2) + 220,
      y: (sourceBounds.y1 + sourceBounds.y2) / 2
    });
    showToast("Move cursor and click to place converted DFA.", "info");
  }, [dfaManager.dfaAlphabets, dfaManager.savedDFAs, isSavedTm, selectedDFAName, setImportCursor, setImportPreview, showToast]);

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

    if (isSavedTm(selectedDFAName)) {
      showToast("Selected automaton is a TM. GNFA creation is FA-only.", "info");
      return;
    }

    const sourceAlphabet = dfaManager.dfaAlphabets[selectedDFAName] ?? (source.table?.[0] ?? []).slice(1);
    const gnfa = GNFA.fromSavedFA(source, sourceAlphabet);
    const preview = { ...gnfa.toSavedPreview(selectedDFAName), alphabet: sourceAlphabet as string[] };
    const sourceBounds = source.bounds;
    setImportPreview(preview);
    setImportCursor({
      x: Math.max(sourceBounds.x1, sourceBounds.x2) + 660,
      y: (sourceBounds.y1 + sourceBounds.y2) / 2
    });
    showToast("Move cursor and click to place created GNFA.", "info");
  }, [dfaManager.dfaAlphabets, dfaManager.savedDFAs, isSavedTm, selectedDFAName, setImportCursor, setImportPreview, showToast]);

  const handleCreateCfg = useCallback(() => {
    if (!selectedDFAName) {
      showToast("Select an FA first to create a CFG.", "info");
      return;
    }

    const source = dfaManager.savedDFAs[selectedDFAName];
    if (!source) {
      showToast("Selected FA not found.", "error");
      return;
    }

    if (isSavedTm(selectedDFAName)) {
      showToast("Selected automaton is a TM. CFG creation is FA-only.", "info");
      return;
    }

    const sourceAlphabet = dfaManager.dfaAlphabets[selectedDFAName] ?? (source.table?.[0] ?? []).slice(1);
    const automaton = SavedFA.toAutomaton(source, sourceAlphabet);
    const stateIds = Array.from(automaton.states).sort((left, right) => left - right);

    if (stateIds.length === 0) {
      showToast("Selected FA has no states.", "error");
      return;
    }

    const orderedStateIds = [automaton.startState, ...stateIds.filter(state => state !== automaton.startState)];
    const variableByState = new Map<number, string>();
    const variables = orderedStateIds.map((stateId, index) => {
      const variable = index === 0 ? "S" : `A${index}`;
      variableByState.set(stateId, variable);
      return variable;
    });

    const terminals = Array.from(new Set(sourceAlphabet.map(symbol => String(symbol).trim()).filter(symbol => symbol && symbol !== EPSILON)));
    const productions: Record<string, string[]> = {};
    variables.forEach(variable => {
      productions[variable] = [];
    });

    const addProduction = (from: string, value: string) => {
      if (!value) return;
      if (!productions[from]) {
        productions[from] = [];
      }
      if (!productions[from].includes(value)) {
        productions[from].push(value);
      }
    };

    automaton.forEachTransition((from, to, symbol) => {
      const fromVar = variableByState.get(from);
      const toVar = variableByState.get(to);
      if (!fromVar || !toVar) return;

      if (symbol === EPSILON) {
        addProduction(fromVar, toVar);
        return;
      }

      addProduction(fromVar, `${symbol}${toVar}`);
      if (automaton.acceptStates.has(to)) {
        addProduction(fromVar, symbol);
      }
    });

    automaton.acceptStates.forEach(acceptState => {
      const acceptVar = variableByState.get(acceptState);
      if (!acceptVar) return;
      addProduction(acceptVar, "ε");
    });

    const startVariable = variables[0] ?? "S";
    const cfg = new CFG(variables, terminals, startVariable, productions);
    const productionLines = Object.entries(cfg.productions)
      .map(([v, rhs]) => `  ${v} → ${rhs.join(" | ")}`);
    const cfgText = [
      `Variables: ${cfg.variables.join(", ")}`,
      `Terminals: ${cfg.terminals.join(", ")}`,
      `Start: ${cfg.startVariable}`,
      `Productions:`,
      ...productionLines
    ].join("\n");
    addTextArtifact("CFG", `${selectedDFAName}-CFG`, cfgText, selectedDFAName);
    showToast(`Created CFG for ${selectedDFAName}.`, "success");
  }, [addTextArtifact, dfaManager.dfaAlphabets, dfaManager.savedDFAs, isSavedTm, selectedDFAName, showToast]);

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
          ? snapshotPairs.map((pair: { from: number; to: number; label?: string }) => Transition.from(pair))
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
  }, [buildImportLayout, lastCanvasPos, setImportCursor, setImportPreview, showToast]);

  return {
    saveGeneratedAutomaton,
    handleExportSelected,
    handleRegexToFA,
    handleCloseRegexDialog,
    handleCreateRegexAutomaton,
    handleConvertSelectedNfaToDfa,
    handleCreateGnfa,
    handleCreateCfg,
    handleImportJson
  };
}
