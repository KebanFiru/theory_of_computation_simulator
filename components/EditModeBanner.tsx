"use client";

import type { EditModeBannerProps } from "../types/page";

export default function EditModeBanner({ editMode, editingDFAName, onDone }: EditModeBannerProps) {
  if (!editMode || !editingDFAName) return null;

  return (
    <div className="fixed top-4 right-20 bg-[var(--surface-overlay)] backdrop-blur border border-[var(--border)] rounded-xl px-4 py-2 z-50 shadow-lg">
      <span className="mr-2 text-sm font-semibold text-[var(--info)]">Editing DFA: <b>{editingDFAName}</b></span>
      <button
        className="ml-2 px-3 py-1.5 bg-[var(--success)] text-white rounded-lg hover:bg-[var(--success-strong)] text-sm font-semibold"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}
