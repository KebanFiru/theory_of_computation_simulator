"use client";

import type { FloatingArtifactsProps } from "../types/page";

export default function FloatingArtifacts({ textArtifacts, scale, offset, canvasRef, setTextArtifacts }: FloatingArtifactsProps) {
  return (
    <>
      {textArtifacts.map(item => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const left = item.position.x * scale + offset.x + rect.left;
        const top = item.position.y * scale + offset.y + rect.top;
        return (
          <div
            key={item.id}
            className="fixed z-[45] w-[320px] rounded-xl border border-[var(--border)] bg-[var(--surface-overlay-strong)] shadow-lg p-3"
            style={{ left, top }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--info)]">{item.type}: {item.name}</span>
              <button
                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)]"
                onClick={() => setTextArtifacts(prev => prev.filter(card => card.id !== item.id))}
              >
                Remove
              </button>
            </div>
            <pre className="text-[10px] max-h-56 overflow-auto whitespace-pre-wrap text-[var(--text)]">{item.content}</pre>
          </div>
        );
      })}
    </>
  );
}
