'use client'

import React from 'react';
import AlphabetComboBox from './AlphabetComboBox';
import { CircleArrowRight, Circle, MoveRightIcon, Square, CircleDot } from 'lucide-react';

import type { SelectionMenuType } from '../types/types';  

type Props = SelectionMenuType & {
  alphabet: string[];
  setAlphabet: (a: string[]) => void;
  acceptState: boolean;
  setAcceptState: (a: boolean) => void;
  alphabetOwnerLabel?: string;
  alphabetLocked?: boolean;
};

export default function SelectionMenu({startingState, setStartgingState, state, setState, road, setRoad, alphabet, setAlphabet, finalize, setFinalize, acceptState, setAcceptState, alphabetOwnerLabel, alphabetLocked}: Props){
  const buttonClass = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-semibold transition-all shadow-sm border ${
      active
        ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent-strong)]"
        : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-muted)]"
    }`;

  return(
    <>
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[min(900px,95vw)] bg-[var(--surface-overlay)] backdrop-blur border border-[var(--border)] shadow-lg flex items-center justify-between px-5 py-4 z-50 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            className={buttonClass(startingState)}
            onClick={() => setStartgingState(!startingState)}
            title="Add start state"
          >
            <CircleArrowRight size={18} />
            <span className="hidden sm:inline">Start</span>
          </button>
          <button
            className={buttonClass(state)}
            onClick={() => setState(!state)}
            title="Add state"
          >
            <Circle size={18} />
            <span className="hidden sm:inline">State</span>
          </button>
          <button
            className={buttonClass(acceptState)}
            onClick={() => setAcceptState(!acceptState)}
            title="Add accept state"
          >
            <CircleDot size={18} />
            <span className="hidden sm:inline">Accept</span>
          </button>
          <button
            className={buttonClass(road)}
            onClick={() => setRoad(!road)}
            title="Add transition"
          >
            <MoveRightIcon size={18} />
            <span className="hidden sm:inline">Transition</span>
          </button>
          <button
            className={buttonClass(finalize)}
            onClick={() => setFinalize(!finalize)}
            title="Finalize DFA"
          >
            <Square size={18} />
            <span className="hidden sm:inline">Finalize</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <AlphabetComboBox
            alphabet={alphabet}
            setAlphabet={setAlphabet}
            ownerLabel={alphabetOwnerLabel}
            disabled={alphabetLocked}
          />
        </div>
      </div>
    </>
  );
}