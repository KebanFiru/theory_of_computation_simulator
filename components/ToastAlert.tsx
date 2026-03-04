"use client";

import type { ToastAlertProps } from "../types/page";

export default function ToastAlert({ toast }: ToastAlertProps) {
  if (!toast) return null;

  return (
    <div className="fixed top-24 right-6 z-[60]">
      <div
        className={`px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border backdrop-blur bg-[var(--surface-overlay)] ${
          toast.type === "error"
            ? "border-[var(--danger)] text-[var(--danger)]"
            : toast.type === "success"
            ? "border-[var(--success)] text-[var(--success)]"
            : "border-[var(--info)] text-[var(--info)]"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
