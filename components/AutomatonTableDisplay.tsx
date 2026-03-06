"use client";
import React from "react";
import type { AutomatonTableDisplayProps } from "../types/component-props";
import { SavedFACard } from "../lib/models";

export default function AutomatonTableDisplay({
  savedDFAs,
  scale,
  offset,
  canvasRef,
  selectedDFAName,
  onSelect
}: AutomatonTableDisplayProps) {
  if (Object.keys(savedDFAs).length === 0) return null;

  const [testInputs, setTestInputs] = React.useState<Record<string, string>>({});

  return (
    <>
      {Object.entries(savedDFAs).map(([name, data]) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;

        const inputValue = testInputs[name] ?? "";
        const card = SavedFACard.build(data, inputValue, scale, offset, {
          left: rect.left,
          top: rect.top
        });
        const isSelected = selectedDFAName === name;

        return (
          <div
            key={name}
            className={`fixed bg-[var(--surface)] text-[var(--text)] p-3 rounded-lg shadow-lg border text-xs ${
              isSelected ? "border-[var(--info)]" : "border-[var(--success)]"
            }`}
            style={{
              left: card.left,
              top: card.top,
              maxWidth: "300px",
              zIndex: 40
            }}
            onClick={() => onSelect(name)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <h4 className="font-semibold text-[var(--success)]">{name}</h4>
                {card.automatonType !== "DFA" && (
                  <span className="text-xs text-[var(--warning)] font-semibold">Type: {card.automatonType}</span>
                )}
                {card.automatonType === "DFA" && (
                  <span className="text-xs text-[var(--success)] font-semibold">Type: DFA</span>
                )}
              </div>
              <button
                className="ml-2 px-2 py-1 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
                onClick={e => {
                  e.stopPropagation();
                  const event = new CustomEvent("editDFA", { detail: { name } });
                  window.dispatchEvent(event);
                }}
              >
                Edit
              </button>
            </div>
            <table className="border-collapse border border-[var(--border-strong)] text-xs w-full">
              <tbody>
                {data.table.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => {
                      const isAcceptState = cellIndex === 0 && rowIndex !== 0 && /\*$/.test(cell);
                      return (
                        <td
                          key={cellIndex}
                          className={`border border-[var(--border-strong)] px-2 py-1 ${
                            rowIndex === 0 ? "font-bold bg-[var(--surface-muted)]" : ""
                          } ${cellIndex === 0 ? "font-bold bg-[var(--surface-muted)]" : ""} ${isAcceptState ? "text-[var(--info)] font-bold bg-[var(--info-soft)]" : ""}`}
                        >
                          {isAcceptState ? <span title="Accept State">★ {cell.replace(/\*$/, "")}</span> : cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <label className="block text-xs font-semibold text-[var(--text-subtle)] mb-1">Test strings (regex supported)</label>
              <input
                className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-muted)] px-2 py-1 text-[var(--text)] text-xs"
                value={inputValue}
                onChange={e => setTestInputs(prev => ({ ...prev, [name]: e.target.value }))}
                placeholder="Example: aaa or a*"
              />
              {card.testResult.status && (
                <div
                  className={`mt-2 text-xs font-semibold ${
                    card.testResult.status === "Valid" ? "text-[var(--success)]" : "text-[var(--danger)]"
                  }`}
                >
                  {card.testResult.status}
                  {card.testResult.detail ? ` • ${card.testResult.detail}` : ""}
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <label className="block text-xs font-semibold text-[var(--text-subtle)] mb-1">Automaton regex</label>
              <textarea
                className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-muted)] px-2 py-1 text-[var(--text)] text-xs"
                value={card.automatonRegex}
                readOnly
                rows={2}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
