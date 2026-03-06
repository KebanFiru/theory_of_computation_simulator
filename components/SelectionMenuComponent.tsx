'use client'

import React from 'react';
import AlphabetComboBox from './AlphabetComboBox';
import { CircleArrowRight, Circle, MoveRightIcon, Square, CircleDot } from 'lucide-react';

import type { SelectionMenuProps } from '../types/ui';  

export default function SelectionMenu({startingState, setStartgingState, state, setState, road, setRoad, alphabet, setAlphabet, finalize, setFinalize, tmFinalize, setTmFinalize, acceptState, setAcceptState, tmStateMode, setTmStateMode, tmAcceptMode, setTmAcceptMode, tmTransitionMode, setTmTransitionMode, alphabetOwnerLabel, alphabetLocked, activeParentOverride}: SelectionMenuProps){
  const [activeParent, setActiveParent] = React.useState<"FA" | "TM">("FA");

  const clearAllModes = React.useCallback(() => {
    setStartgingState(false);
    setState(false);
    setAcceptState(false);
    setRoad(false);
    setFinalize(false);
    setTmStateMode(false);
    setTmAcceptMode(false);
    setTmTransitionMode(false);
    setTmFinalize(false);
  }, [
    setAcceptState,
    setFinalize,
    setRoad,
    setStartgingState,
    setState,
    setTmAcceptMode,
    setTmFinalize,
    setTmStateMode,
    setTmTransitionMode
  ]);

  const toggleExclusive = React.useCallback((active: boolean, setter: (value: boolean) => void) => {
    const next = !active;
    clearAllModes();
    setter(next);
  }, [clearAllModes]);

  const handleParentChange = React.useCallback((nextParent: "FA" | "TM") => {
    clearAllModes();
    setActiveParent(nextParent);
  }, [clearAllModes]);

  React.useEffect(() => {
    if (!activeParentOverride) return;
    setActiveParent(activeParentOverride);
  }, [activeParentOverride]);

  const buttonClass = (active: boolean) =>
    `inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border whitespace-nowrap ${
      active
        ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent-strong)] shadow-md"
        : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-muted)]"
    }`;

  const parentButtonClass = (active: boolean) =>
    `px-4 py-2 rounded-xl text-xs font-bold tracking-wide border transition-all ${
      active
        ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent-strong)] shadow"
        : "bg-[var(--surface)] text-[var(--text-subtle)] border-[var(--border)] hover:bg-[var(--surface-muted)]"
    }`;

  return(
    <>
      <div className="fixed top-3 left-1/2 transform -translate-x-1/2  bg-[var(--surface-overlay)] backdrop-blur border border-[var(--border)] shadow-xl z-50 rounded-2xl px-3 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap xl:flex-nowrap">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 pr-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1.5 w-fit">
                  <button
                    className={parentButtonClass(activeParent === "FA")}
                    onClick={() => handleParentChange("FA")}
                    title="Show FA tools"
                  >
                    FA
                  </button>
                  <button
                    className={parentButtonClass(activeParent === "TM")}
                    onClick={() => handleParentChange("TM")}
                    title="Show TM tools"
                  >
                    TM
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2">
                  {alphabetOwnerLabel && (
                    <span className="hidden md:inline text-xs font-semibold text-[var(--text-subtle)]">
                      {alphabetOwnerLabel}
                    </span>
                  )}
                  {alphabetOwnerLabel && <div className="h-5 w-px bg-[var(--border)] hidden md:block" />}
                  <AlphabetComboBox
                    alphabet={alphabet}
                    setAlphabet={setAlphabet}
                    ownerLabel={alphabetOwnerLabel}
                    disabled={alphabetLocked}
                  />
                </div>
              </div>

              {activeParent === "FA" && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1.5">
                  <button
                    className={buttonClass(startingState)}
                    onClick={() => toggleExclusive(startingState, setStartgingState)}
                    title="Add start state"
                  >
                    <CircleArrowRight size={16} />
                    <span>Start</span>
                  </button>
                  <button
                    className={buttonClass(state)}
                    onClick={() => toggleExclusive(state, setState)}
                    title="Add state"
                  >
                    <Circle size={16} />
                    <span>State</span>
                  </button>
                  <button
                    className={buttonClass(acceptState)}
                    onClick={() => toggleExclusive(acceptState, setAcceptState)}
                    title="Add accept state"
                  >
                    <CircleDot size={16} />
                    <span>Accept</span>
                  </button>
                  <button
                    className={buttonClass(road)}
                    onClick={() => toggleExclusive(road, setRoad)}
                    title="Add transition"
                  >
                    <MoveRightIcon size={16} />
                    <span>Transition</span>
                  </button>
                  <button
                    className={buttonClass(finalize)}
                    onClick={() => toggleExclusive(finalize, setFinalize)}
                    title="Finalize DFA"
                  >
                    <Square size={16} />
                    <span>Finalize</span>
                  </button>
                </div>
              )}

              {activeParent === "TM" && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1.5">
                  <button
                    className={buttonClass(tmStateMode)}
                    onClick={() => toggleExclusive(tmStateMode, setTmStateMode)}
                    title="Add TM state"
                  >
                    <Circle size={16} />
                    <span>State</span>
                  </button>
                  <button
                    className={buttonClass(tmAcceptMode)}
                    onClick={() => toggleExclusive(tmAcceptMode, setTmAcceptMode)}
                    title="Add TM final state (F \u2014 accepting)"
                  >
                    <CircleDot size={16} />
                    <span>Final</span>
                  </button>
                  <button
                    className={buttonClass(tmTransitionMode)}
                    onClick={() => toggleExclusive(tmTransitionMode, setTmTransitionMode)}
                    title="Add TM transition"
                  >
                    <MoveRightIcon size={16} />
                    <span>Transition</span>
                  </button>
                  <button
                    className={buttonClass(tmFinalize)}
                    onClick={() => toggleExclusive(tmFinalize, setTmFinalize)}
                    title="Finalize TM"
                  >
                    <Square size={16} />
                    <span>Finalize</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}