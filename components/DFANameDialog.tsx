"use client";
import React from "react";
import {DFANameDialogProps} from "../types/types";


export default function DFANameDialog({
  isOpen,
  dfaName,
  onNameChange,
  onSave,
  onCancel
}: DFANameDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-50">
      <div className="bg-[var(--surface)] p-6 rounded-lg shadow-xl max-w-md w-full border border-[var(--border)]">
        <h3 className="text-xl font-bold mb-4 text-[var(--text)]">Name Your DFA</h3>
        <input
          type="text"
          className="w-full px-4 py-2 border border-[var(--border-strong)] bg-[var(--surface-muted)] rounded mb-4 text-[var(--text)] placeholder-[var(--text-subtle)]"
          placeholder="Enter DFA name..."
          value={dfaName}
          onChange={e => onNameChange(e.target.value)}
          onKeyPress={e => e.key === "Enter" && onSave()}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-2 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:bg-[var(--accent-strong)]"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
