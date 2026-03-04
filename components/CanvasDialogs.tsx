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
              onKeyDown={e => e.key === "Enter" && onCreateRegexAutomaton()}
            />
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]" onClick={onCloseRegexDialog}>Cancel</button>
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]" onClick={onCreateRegexAutomaton}>Create</button>
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
            <p className="text-sm text-[var(--text-subtle)] mb-3">Format: read/write,move (example: 0/1,R)</p>
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
