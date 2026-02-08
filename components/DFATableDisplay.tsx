"use client";
import React from "react";
import { DFATableDisplayProps } from "../types/types";


export default function DFATableDisplay({
  savedDFAs,
  scale,
  offset,
  canvasRef,
  selectedDFAName,
  onSelect
}: DFATableDisplayProps) {
  if (Object.keys(savedDFAs).length === 0) return null;

  const [testInputs, setTestInputs] = React.useState<Record<string, string>>({});

  const buildAutomaton = React.useCallback((table: string[][]) => {
    const header = table[0] ?? [];
    const alphabet = header.slice(1);
    const rows = table.slice(1);
    const stateNames = rows.map(row => (row?.[0] ?? "").replace(/\*$/, ""));
    const acceptStates = new Set(
      rows
        .map(row => row?.[0] ?? "")
        .filter(label => /\*$/.test(label))
        .map(label => label.replace(/\*$/, ""))
    );

    const transitions: Record<string, Record<string, string[]>> = {};
    stateNames.forEach((stateName, rowIndex) => {
      transitions[stateName] = transitions[stateName] ?? {};
      alphabet.forEach((symbol, colIndex) => {
        const cell = rows[rowIndex]?.[colIndex + 1] ?? "-";
        if (!cell || cell.trim() === "-" || cell.trim() === "") {
          transitions[stateName][symbol] = [];
        } else {
          transitions[stateName][symbol] = cell
            .split(",")
            .map(value => value.trim())
            .filter(Boolean);
        }
      });
    });

    const startState = stateNames[0];
    return {
      alphabet,
      stateNames,
      acceptStates,
      startState,
      transitions
    };
  }, []);

  const getAutomatonType = React.useCallback((automaton: ReturnType<typeof buildAutomaton>) => {
    let hasMissing = false;
    let hasMultiple = false;

    automaton.stateNames.forEach(stateName => {
      automaton.alphabet.forEach(symbol => {
        const targets = automaton.transitions[stateName]?.[symbol] ?? [];
        if (targets.length === 0) {
          hasMissing = true;
        } else if (targets.length > 1) {
          hasMultiple = true;
        }
      });
    });

    if (hasMultiple) return "NFA";
    if (hasMissing) return "Incomplete DFA";
    return "DFA";
  }, [buildAutomaton]);

  const acceptsString = React.useCallback(
    (automaton: ReturnType<typeof buildAutomaton>, input: string) => {
      if (!automaton.startState) return false;
      let currentStates = new Set<string>([automaton.startState]);

      for (const symbol of input) {
        if (!automaton.alphabet.includes(symbol)) return false;
        const nextStates = new Set<string>();
        currentStates.forEach(stateName => {
          const targets = automaton.transitions[stateName]?.[symbol] ?? [];
          targets.forEach(target => nextStates.add(target));
        });
        currentStates = nextStates;
        if (currentStates.size === 0) return false;
      }

      return Array.from(currentStates).some(state => automaton.acceptStates.has(state));
    },
    [buildAutomaton]
  );

  const generateRegex = React.useCallback((automaton: ReturnType<typeof buildAutomaton>) => {
    const { stateNames, alphabet, transitions, startState, acceptStates } = automaton;
    if (!startState || stateNames.length === 0) return "∅";

    const start = "__start__";
    const end = "__end__";
    const allStates = [start, ...stateNames, end];

    const empty = "∅";
    const epsilon = "ε";

    const needsParens = (value: string) => value.includes("|") && !/^\(.*\)$/.test(value);

    const union = (a: string, b: string) => {
      if (a === empty) return b;
      if (b === empty) return a;
      if (a === b) return a;
      return `(${a}|${b})`;
    };

    const concat = (a: string, b: string) => {
      if (a === empty || b === empty) return empty;
      if (a === epsilon) return b;
      if (b === epsilon) return a;
      const left = needsParens(a) ? `(${a})` : a;
      const right = needsParens(b) ? `(${b})` : b;
      return `${left}${right}`;
    };

    const star = (a: string) => {
      if (a === empty || a === epsilon) return epsilon;
      if (a.length === 1) return `${a}*`;
      return `(${a})*`;
    };

    const R: Record<string, Record<string, string>> = {};
    allStates.forEach(i => {
      R[i] = {};
      allStates.forEach(j => {
        R[i][j] = empty;
      });
    });

    R[start][startState] = epsilon;
    acceptStates.forEach(state => {
      R[state][end] = union(R[state][end], epsilon);
    });

    stateNames.forEach(from => {
      alphabet.forEach(symbol => {
        const targets = transitions[from]?.[symbol] ?? [];
        targets.forEach(target => {
          const label = symbol === "" ? epsilon : symbol;
          R[from][target] = union(R[from][target], label);
        });
      });
    });

    const eliminatable = stateNames.slice();
    eliminatable.forEach(k => {
      allStates.forEach(i => {
        if (i === k) return;
        allStates.forEach(j => {
          if (j === k) return;
          const rik = R[i][k];
          const rkk = R[k][k];
          const rkj = R[k][j];
          if (rik === empty || rkj === empty) return;
          const candidate = concat(concat(rik, star(rkk)), rkj);
          R[i][j] = union(R[i][j], candidate);
        });
      });
    });

    return R[start][end] === empty ? "∅" : R[start][end];
  }, [buildAutomaton]);

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
    (automaton: ReturnType<typeof buildAutomaton>, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return { status: "", detail: "" };

      const regexCharacters = /[.*+?^${}()|[\]\\]/;
      const regexInput = regexCharacters.test(trimmed) || (trimmed.startsWith("/") && trimmed.endsWith("/"));

      if (!regexInput) {
        if ([...trimmed].some(char => !automaton.alphabet.includes(char))) {
          return { status: "Invalid", detail: "Contains symbols outside the alphabet." };
        }
        const isValid = acceptsString(automaton, trimmed);
        return { status: isValid ? "Valid" : "Invalid", detail: "" };
      }

      const pattern = trimmed.startsWith("/") && trimmed.endsWith("/")
        ? trimmed.slice(1, -1)
        : trimmed;

      try {
        const regex = new RegExp(`^${pattern}$`);
        const candidates = generateStrings(automaton.alphabet, 5);
        const match = candidates.find(str => regex.test(str) && acceptsString(automaton, str));
        if (match !== undefined) {
          return { status: "Valid", detail: `Matched accepted string: "${match}"` };
        }
        return { status: "Invalid", detail: "No accepted match up to length 5." };
      } catch (error) {
        return { status: "Invalid", detail: "Regex syntax error." };
      }
    },
    [acceptsString, generateStrings, buildAutomaton]
  );

  return (
    <>
      {Object.entries(savedDFAs).map(([name, data]) => {
        const bounds = data.bounds;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;

        const automaton = buildAutomaton(data.table);
        const automatonType = getAutomatonType(automaton);
        const automatonRegex = generateRegex(automaton);
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
