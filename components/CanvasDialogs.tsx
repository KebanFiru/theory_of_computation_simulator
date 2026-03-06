"use client";

import type { CanvasDialogsProps } from "../types/page";

export default function CanvasDialogs({
  regexDialog,
  transitionCountDialog,
  tmTransitionDialog,
  overwriteDialog,
  setRegexDialog,
  setTransitionCountDialog,
  setTmTransitionDialog,
  setOverwriteDialog,
  onCreateRegexAutomaton,
  onCloseRegexDialog,
  onTransitionCountConfirm,
  onTmTransitionConfirm,
  onOverwriteConfirm
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
          <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-md w-full border border-[var(--border)]">
            <h3 className="text-lg font-bold mb-3 text-[var(--text)]">TM Transition</h3>
            <p className="text-sm text-[var(--text-subtle)] mb-3">Format: read/write,move with single symbols (example: 0/1,R)</p>
            <input
              className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-4 text-[var(--text)]"
              value={tmTransitionDialog.value}
              onChange={e => setTmTransitionDialog(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && onTmTransitionConfirm()}
            />
            <div className="flex gap-2 justify-end">
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
