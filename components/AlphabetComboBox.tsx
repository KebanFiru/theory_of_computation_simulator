import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type AlphabetComboBoxProps = {
  alphabet: string[];
  setAlphabet: (a: string[]) => void;
  ownerLabel?: string;
  disabled?: boolean;
};

export default function AlphabetComboBox({ alphabet, setAlphabet, ownerLabel, disabled }: AlphabetComboBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const [sizeInput, setSizeInput] = useState("0");

  useEffect(() => {
    setSizeInput(String(alphabet.length));
  }, [alphabet.length]);

  const setAlphabetSize = (size: number) => {
    const nextSize = Number.isFinite(size) ? Math.max(0, Math.min(10, size)) : 0;
    const nextAlphabet = [...alphabet];
    if (nextSize > nextAlphabet.length) {
      while (nextAlphabet.length < nextSize) nextAlphabet.push("");
    } else if (nextSize < nextAlphabet.length) {
      nextAlphabet.length = nextSize;
    }
    if (disabled) return;
    setAlphabet(nextAlphabet);
  };

  return (
    <div className="relative">
      <button
        className={`flex items-center gap-1 border rounded px-2 py-1 font-bold focus:outline-none ${
          disabled
            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-white border-gray-300 text-red-600 hover:bg-red-50"
        }`}
        onClick={() => setExpanded(e => !e)}
        type="button"
        title={expanded ? "Hide alphabet" : "Show alphabet"}
        disabled={disabled}
      >
        Alphabet
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-4 flex flex-col gap-3">
          <div className="text-xs font-semibold text-gray-500">
            Alphabet for: <span className="text-gray-800">{ownerLabel ?? "Unsaved FA"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-gray-600">Alphabet size</label>
            <input
              className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-black text-sm text-center"
              type="number"
              min={0}
              max={10}
              value={sizeInput}
              disabled={disabled}
              onChange={e => {
                setSizeInput(e.target.value);
                const numericValue = Number(e.target.value);
                if (!Number.isNaN(numericValue)) {
                  setAlphabetSize(numericValue);
                }
              }}
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {alphabet.length === 0 && <span className="text-gray-400 text-xs">No symbols</span>}
            {alphabet.map((letter, index) => (
              <input
                key={`alphabet-${index}`}
                className={`rounded-lg border px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400 ${
                  disabled ? "border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300 text-black"
                }`}
                value={letter}
                disabled={disabled}
                onChange={e => {
                  if (disabled) return;
                  const next = [...alphabet];
                  next[index] = e.target.value.slice(0, 1);
                  setAlphabet(next);
                }}
                placeholder={`${index + 1}`}
                maxLength={1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
