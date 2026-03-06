"use client";

import React from "react";
import type { CanvasDialogsProps } from "../types/page";

type TapeSeg = { read: string; write: string; move: string };

function parseTapes(value: string): TapeSeg[] {
  const segs = value ? value.split(";") : ["0/1,R"];
  return segs.map(seg => {
    const slashIdx = seg.indexOf("/");
    const commaIdx = seg.lastIndexOf(",");
    if (slashIdx !== -1 && commaIdx !== -1 && commaIdx > slashIdx) {
      return {
        read: seg.slice(0, slashIdx),
        write: seg.slice(slashIdx + 1, commaIdx),
        move: seg.slice(commaIdx + 1)
      };
    }
    return { read: "", write: "", move: "R" };
  });
}

function assembleTapes(tapes: TapeSeg[]): string {
  return tapes.map(t => `${t.read}/${t.write},${t.move}`).join(";");
}

function TmTapeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [tapes, setTapes] = React.useState<TapeSeg[]>(() => parseTapes(value));

  React.useEffect(() => {
    setTapes(parseTapes(value));
  }, [value]);

  const update = (i: number, field: keyof TapeSeg, val: string) => {
    const next = tapes.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
    setTapes(next);
    onChange(assembleTapes(next));
  };

  const addTape = () => {
    const next = [...tapes, { read: "_", write: "_", move: "N" }];
    setTapes(next);
    onChange(assembleTapes(next));
  };

  const removeTape = (i: number) => {
    const next = tapes.filter((_, idx) => idx !== i);
    setTapes(next);
    onChange(assembleTapes(next));
  };

  const inputClass = "w-14 px-2 py-1 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded text-[var(--text)] text-xs text-center";
  const selectClass = "px-2 py-1 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded text-[var(--text)] text-xs";

  return (
    <div className="space-y-2">
      {tapes.map((tape, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-subtle)] w-12 shrink-0">Tape {i + 1}</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--text-subtle)]">Read</span>
            <input className={inputClass} value={tape.read} onChange={e => update(i, "read", e.target.value)} placeholder="0" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--text-subtle)]">Write</span>
            <input className={inputClass} value={tape.write} onChange={e => update(i, "write", e.target.value)} placeholder="1" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--text-subtle)]">Move</span>
            <select className={selectClass} value={tape.move} onChange={e => update(i, "move", e.target.value)}>
              <option value="R">R →</option>
              <option value="L">L ←</option>
              <option value="S">S (stay)</option>
              <option value="N">N (stay)</option>
            </select>
          </div>
          {tapes.length > 1 && (
            <button className="text-xs text-[var(--danger)] hover:text-[var(--danger-strong)] px-1" onClick={() => removeTape(i)}>✕</button>
          )}
        </div>
      ))}
      <button
        className="text-xs px-2 py-1 border border-[var(--border)] rounded hover:bg-[var(--surface-muted)] text-[var(--text-subtle)]"
        onClick={addTape}
      >
        + Add tape
      </button>
      <p className="text-xs text-[var(--text-subtle)] font-mono pt-1">Preview: {value}</p>
    </div>
  );
}

export default function CanvasDialogs({
  regexDialog,
  transitionCountDialog,
  tmTransitionDialog,
  faTransitionDialog,
  overwriteDialog,
  setRegexDialog,
  setTransitionCountDialog,
  setTmTransitionDialog,
  setFaTransitionDialog,
  setOverwriteDialog,
  onCreateRegexAutomaton,
  onCloseRegexDialog,
  onTransitionCountConfirm,
  onTmTransitionConfirm,
  onFaTransitionConfirm,
  onOverwriteConfirm,
  faTransitionAlphabet
}: CanvasDialogsProps) {
  return (
    <>
      {regexDialog.isOpen && (
        <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[70]">
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-lg w-full border border-[var(--border)]">
            <h3 className="text-xl font-bold mb-1 text-[var(--text)]">Create NFA from Regex</h3>
            <p className="text-xs text-[var(--text-subtle)] mb-4">Uses standard regex notation (Thompson&apos;s construction).</p>

            {/* Syntax reference */}
            <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
              <p className="text-xs font-bold text-[var(--text-subtle)] mb-2 uppercase tracking-wide">Supported operators</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--text)]">
                <span><code className="font-mono font-bold">a|b</code> <span className="text-[var(--text-subtle)]">— union (alternation)</span></span>
                <span><code className="font-mono font-bold">ab</code> <span className="text-[var(--text-subtle)]">— concatenation</span></span>
                <span><code className="font-mono font-bold">a*</code> <span className="text-[var(--text-subtle)]">— Kleene star (0 or more)</span></span>
                <span><code className="font-mono font-bold">a+</code> <span className="text-[var(--text-subtle)]">— plus (1 or more)</span></span>
                <span><code className="font-mono font-bold">a?</code> <span className="text-[var(--text-subtle)]">— optional (0 or 1)</span></span>
                <span><code className="font-mono font-bold">(ab)</code> <span className="text-[var(--text-subtle)]">— grouping</span></span>
                <span><code className="font-mono font-bold">\a</code> <span className="text-[var(--text-subtle)]">— escape literal</span></span>
                <span><code className="font-mono font-bold">ε</code> <span className="text-[var(--text-subtle)]">— epsilon (empty string)</span></span>
              </div>
              <p className="text-xs text-[var(--text-subtle)] mt-2">Examples: <code className="font-mono">(a|b)*abb</code> &nbsp; <code className="font-mono">0*10*</code> &nbsp; <code className="font-mono">(ab)+c?</code></p>
            </div>

            <label className="block text-xs font-semibold text-[var(--text-subtle)] mb-1">Regex</label>
            <input
              autoFocus
              className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-3 text-[var(--text)] font-mono"
              value={regexDialog.regex}
              onChange={e => setRegexDialog(prev => ({ ...prev, regex: e.target.value }))}
              placeholder="(a|b)*abb"
              onKeyDown={e => e.key === "Enter" && onCreateRegexAutomaton()}
            />
            <label className="block text-xs font-semibold text-[var(--text-subtle)] mb-1">Name</label>
            <input
              className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-4 text-[var(--text)]"
              value={regexDialog.name}
              onChange={e => setRegexDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Regex-NFA"
              onKeyDown={e => e.key === "Enter" && onCreateRegexAutomaton()}
            />
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]" onClick={onCloseRegexDialog}>Cancel</button>
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]" onClick={onCreateRegexAutomaton}>Create NFA</button>
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
              onKeyDown={e => e.key === "Enter" && onTransitionCountConfirm()}
            />
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
                onClick={() => setTransitionCountDialog({ isOpen: false, from: -1, to: -1, max: 0, value: "1" })}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]" onClick={onTransitionCountConfirm}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {tmTransitionDialog.isOpen && (
        <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[70]">
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-lg w-full border border-[var(--border)]">
            <h3 className="text-lg font-bold mb-1 text-[var(--text)]">TM Transition</h3>
            <p className="text-xs text-[var(--text-subtle)] mb-4">Configure read, write, and head movement per tape.</p>
            <TmTapeEditor
              value={tmTransitionDialog.value}
              onChange={v => setTmTransitionDialog(prev => ({ ...prev, value: v }))}
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
                onClick={() => setTmTransitionDialog({ isOpen: false, from: -1, to: -1, value: "0/1,R" })}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]" onClick={onTmTransitionConfirm}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {faTransitionDialog.isOpen && (
        <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[70]">
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-sm w-full border border-[var(--border)]">
            <h3 className="text-lg font-bold mb-1 text-[var(--text)]">Transition Symbols</h3>
            <p className="text-xs text-[var(--text-subtle)] mb-3">Select one or more symbols for this transition.</p>
            {faTransitionAlphabet.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {faTransitionAlphabet.map(sym => {
                  const isSelected = faTransitionDialog.symbols.includes(sym);
                  return (
                    <button
                      key={sym}
                      className={`px-3 py-1.5 rounded border text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent-strong)]"
                          : "bg-[var(--surface-muted)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-strong)]"
                      }`}
                      onClick={() => setFaTransitionDialog(prev => ({
                        ...prev,
                        symbols: isSelected
                          ? prev.symbols.filter(s => s !== sym)
                          : [...prev.symbols, sym]
                      }))}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            )}
            <input
              autoFocus
              className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-4 text-[var(--text)] font-mono"
              placeholder="or type custom symbol(s), comma separated…"
              value={faTransitionDialog.custom}
              onChange={e => setFaTransitionDialog(prev => ({ ...prev, custom: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && onFaTransitionConfirm()}
            />
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
                onClick={() => setFaTransitionDialog({ isOpen: false, from: -1, to: -1, symbols: [], custom: "" })}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]" onClick={onFaTransitionConfirm}>Add</button>
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
              <button className="px-4 py-2 bg-[var(--danger)] text-white rounded hover:bg-[var(--danger-strong)]" onClick={onOverwriteConfirm}>Overwrite</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
