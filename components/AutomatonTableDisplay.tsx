"use client";
import React from "react";
import { AutomatonTableDisplayProps } from "../types/types";
import { FiniteAutomaton, automatonFromSavedFA } from "../lib/automata";


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

  const generateStrings = React.useCallback((alphabet: string[], maxLength: number) => {
    const results: string[] = [""];
    for (let length = 1; length <= maxLength; length += 1) {
      const prev = results.filter(str => str.length === length - 1);
      prev.forEach(str => {
        alphabet.forEach(symbol => results.push(str + symbol));
      });
    }
    return results;
  }, []);

  const testInput = React.useCallback(
    (automaton: FiniteAutomaton, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return { status: "", detail: "" };
      const alphabet = [...automaton.alphabet];

      const regexCharacters = /[.*+?^${}()|[\]\\]/;
      const regexInput = regexCharacters.test(trimmed) || (trimmed.startsWith("/") && trimmed.endsWith("/"));

      if (!regexInput) {
        if ([...trimmed].some(char => !alphabet.includes(char))) {
          return { status: "Invalid", detail: "Contains symbols outside the alphabet." };
        }
        const isValid = automaton.accepts(trimmed);
        return { status: isValid ? "Valid" : "Invalid", detail: "" };
      }

      const pattern = trimmed.startsWith("/") && trimmed.endsWith("/")
        ? trimmed.slice(1, -1)
        : trimmed;

      try {
        const regex = new RegExp(`^${pattern}$`);
        const candidates = generateStrings(alphabet, 5);
        const match = candidates.find(str => regex.test(str) && automaton.accepts(str));
        if (match !== undefined) {
          return { status: "Valid", detail: `Matched accepted string: "${match}"` };
        }
        return { status: "Invalid", detail: "No accepted match up to length 5." };
      } catch (error) {
        return { status: "Invalid", detail: "Regex syntax error." };
      }
    },
    [generateStrings]
  );

  return (
    <>
      {Object.entries(savedDFAs).map(([name, data]) => {
        const bounds = data.bounds;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;

        const automaton = automatonFromSavedFA(data, (data.table?.[0] ?? []).slice(1));
        const automatonType = automaton.getType();
        const automatonRegex = automaton.toRegex();
        const inputValue = testInputs[name] ?? "";
        const testResult = testInput(automaton, inputValue);
        const isSelected = selectedDFAName === name;

        // Position table below the rectangle (at bottom-left corner)
        const tableX = bounds.x1 * scale + offset.x + rect.left;
        const tableY = (bounds.y2 + 5) * scale + offset.y + rect.top;

        return (
          <div
            key={name}
            className={`fixed bg-[var(--surface)] text-[var(--text)] p-3 rounded-lg shadow-lg border text-xs ${
              isSelected ? "border-[var(--info)]" : "border-[var(--success)]"
            }`}
            style={{
              left: tableX,
              top: tableY,
              maxWidth: "300px",
              zIndex: 40
            }}
            onClick={() => onSelect(name)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <h4 className="font-semibold text-[var(--success)]">{name}</h4>
                {automatonType !== "DFA" && (
                  <span className="text-xs text-[var(--warning)] font-semibold">Type: {automatonType}</span>
                )}
                {automatonType === "DFA" && (
                  <span className="text-xs text-[var(--success)] font-semibold">Type: DFA</span>
                )}
              </div>
              <button
                className="ml-2 px-2 py-1 bg-[var(--surface-strong)] text-[var(--text)] rounded hover:bg-[var(--surface-muted)]"
                onClick={() => {
                  // Custom event: trigger edit for this DFA
                  const event = new CustomEvent("editDFA", { detail: { name } });
                  window.dispatchEvent(event);
                }}
              >Edit</button>
            </div>
            <table className="border-collapse border border-[var(--border-strong)] text-xs w-full">
              <tbody>
                {data.table.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => {
                      // Accept state: state label ends with *
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
              {testResult.status && (
                <div
                  className={`mt-2 text-xs font-semibold ${
                    testResult.status === "Valid" ? "text-[var(--success)]" : "text-[var(--danger)]"
                  }`}
                >
                  {testResult.status}
                  {testResult.detail ? ` • ${testResult.detail}` : ""}
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <label className="block text-xs font-semibold text-[var(--text-subtle)] mb-1">Automaton regex</label>
              <textarea
                className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface-muted)] px-2 py-1 text-[var(--text)] text-xs"
                value={automatonRegex}
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
