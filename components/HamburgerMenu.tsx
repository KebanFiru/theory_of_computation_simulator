"use client";

import React from "react";
import { Menu, X, Upload, Download, Sigma, ArrowRightLeft, Workflow, Binary, GitBranchPlus } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import type { HamburgerMenuProps } from "../types/ui";

export default function HamburgerMenu({
  onExportSelected,
  onImportJson,
  onRegexToFA,
  onConvertSelectedNfaToDfa,
  onCreateGnfa,
  onCreateEnfa,
  onCreateCfg,
  onOpenChange
}: HamburgerMenuProps) {
  const [open, setOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed top-4 left-4 z-[80]">
      <button
        type="button"
        onClick={() => {
          setOpen(value => {
            const next = !value;
            onOpenChange?.(next);
            return next;
          });
        }}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-overlay)] text-[var(--text)] shadow-lg transition hover:bg-[var(--surface-muted)]"
        aria-label={open ? "Close menu" : "Open menu"}
        title={open ? "Close menu" : "Open menu"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="mt-3 w-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay-strong)] p-4 shadow-2xl backdrop-blur">

          <div className="mt-4 flex flex-col gap-2">
            <ThemeToggle mode="inline" />
            <button
              type="button"
              onClick={onExportSelected}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Export selected FA
              <Upload size={16} />
            </button>
            <button
              type="button"
              onClick={onRegexToFA}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Regex → NFA
              <Sigma size={16} />
            </button>
            <button
              type="button"
              onClick={onConvertSelectedNfaToDfa}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Selected NFA → DFA
              <ArrowRightLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onCreateGnfa}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Create GNFA
              <Workflow size={16} />
            </button>
            <button
              type="button"
              onClick={onCreateEnfa}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Create ε-NFA
              <Binary size={16} />
            </button>
            <button
              type="button"
              onClick={onCreateCfg}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Create CFG
              <GitBranchPlus size={16} />
            </button>
            <button
              type="button"
              onClick={triggerImport}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Import JSON
              <Download size={16} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              onImportJson(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
