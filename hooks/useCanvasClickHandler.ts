"use client";
import { useCallback } from "react";
import { State } from "../lib/util-classes/state";
import { Transition } from "../lib/util-classes/transition";
import type { UseCanvasClickHandlerParams } from "../types/hooks";

export function useCanvasClickHandler({
  selection,
  canvasRef,
  canvasInteraction,
  importPreview,
  setImportPreview,
  importCursor,
  setImportCursor,
  dfaManager,
  saveGeneratedAutomaton,
  setTransitionSlots,
  buildTransitionSlotsFromPairs,
  setEditMode,
  setEditingDFAName,
  editMode,
  selectedDFAName,
  setSelectedDFAName,
  road,
  setRoad,
  roadSelection,
  setRoadSelection,
  transitionSlots,
  setTransitionCountDialog,
  setFaTransitionDialog,
  tmTransitionMode,
  setTmTransitionDialog,
  startingState,
  setStartgingState,
  state,
  setState,
  acceptState,
  setAcceptState,
  tmStateMode,
  setTmStateMode,
  tmAcceptMode,
  setTmAcceptMode,
  tmRejectMode,
  setTmRejectMode,
  showToast
}: UseCanvasClickHandlerParams) {
  return useCallback((e: React.MouseEvent) => {
    if (selection.selectionMode || selection.isDrawingSelection) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;

    const canvasX = (e.clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const canvasY = (e.clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;

    if (importPreview && importCursor) {
      const placedStates = importPreview.states.map((st, idx) =>
        State.create({
          x: st.x + importCursor.x,
          y: st.y + importCursor.y,
          color: st.color,
          r: 20,
          id: Date.now() + Math.random() + idx
        })
      );

      if (importPreview.target === "saved") {
        const placedPairs = importPreview.arrowPairs.map(pair => Transition.from(pair));
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
      const placedPairs = importPreview.arrowPairs.map(pair =>
        pair.withEndpoints(pair.from + indexOffset, pair.to + indexOffset)
      );

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

    if (!road && !tmTransitionMode) {
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
        const arrowsBetween = dfaManager.arrowPairs.filter(p => p.from === from && p.to === to);

        setRoadSelection(null);
        dfaManager.setArrowSelection([]);

        if (dfaManager.alphabet.length > 0) {
          setFaTransitionDialog({ isOpen: true, from, to, symbol: "" });
          return;
        }

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
        dfaManager.setArrowPairs(pairs => [...pairs, Transition.create(from, to)]);
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
        const clickedState = dfaManager.states[clickedCircleIndex];
        if (!clickedState?.color.startsWith("tm-")) {
          showToast("TM transitions can only connect TM states.", "error");
          return;
        }

        if (roadSelection === null) {
          setRoadSelection(clickedCircleIndex);
          dfaManager.setArrowSelection([clickedCircleIndex]);
          return;
        }

        const fromState = dfaManager.states[roadSelection];
        if (!fromState?.color.startsWith("tm-")) {
          setRoadSelection(null);
          dfaManager.setArrowSelection([]);
          showToast("TM transitions can only connect TM states.", "error");
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
      dfaManager.setStates(prev => [...prev, State.create({ x: canvasX, y: canvasY, color: "red" })]);
      setStartgingState(false);
    }

    if (state) {
      dfaManager.setStates(prev => [...prev, State.create({ x: canvasX, y: canvasY, color: "green" })]);
      setState(false);
    }

    if (acceptState) {
      dfaManager.setStates(prev => [...prev, State.create({ x: canvasX, y: canvasY, color: "blue" })]);
      setAcceptState(false);
    }

    if (tmStateMode) {
      dfaManager.setStates(prev => [...prev, State.create({ x: canvasX, y: canvasY, color: "tm-green" })]);
      setTmStateMode(false);
    }

    if (tmAcceptMode) {
      dfaManager.setStates(prev => [...prev, State.create({ x: canvasX, y: canvasY, color: "tm-blue" })]);
      setTmAcceptMode(false);
    }

    if (tmRejectMode) {
      dfaManager.setStates(prev => [...prev, State.create({ x: canvasX, y: canvasY, color: "tm-purple" })]);
      setTmRejectMode(false);
    }
  }, [
    acceptState,
    buildTransitionSlotsFromPairs,
    canvasInteraction.offset.x,
    canvasInteraction.offset.y,
    canvasInteraction.scale,
    canvasRef,
    dfaManager,
    editMode,
    importCursor,
    importPreview,
    road,
    roadSelection,
    saveGeneratedAutomaton,
    selectedDFAName,
    selection.isDrawingSelection,
    selection.selectionMode,
    setAcceptState,
    setEditMode,
    setEditingDFAName,
    setFaTransitionDialog,
    setImportCursor,
    setImportPreview,
    setRoad,
    setRoadSelection,
    setSelectedDFAName,
    setStartgingState,
    setState,
    setTmAcceptMode,
    setTmRejectMode,
    setTmStateMode,
    setTmTransitionDialog,
    setTransitionCountDialog,
    setTransitionSlots,
    showToast,
    startingState,
    state,
    tmAcceptMode,
    tmRejectMode,
    tmStateMode,
    tmTransitionMode,
    transitionSlots
  ]);
}
