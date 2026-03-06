import type { SavedDFA } from "../../types/domain";
import type { SavedFACardView } from "../../types/view";
import { SavedFA } from "../automata/index";
import { TuringMachine } from "./TuringMachine";

export class SavedFACard {
  static build(
    data: SavedDFA,
    inputValue: string,
    scale: number,
    offset: { x: number; y: number },
    canvasRect: { left: number; top: number }
  ): SavedFACardView {
    const fallbackAlphabet = (data.table?.[0] ?? []).slice(1).map(symbol => String(symbol));
    const isTmSnapshot = data.snapshot?.states?.some(state => TuringMachine.isTmStateColor(state.color)) ?? false;

    let automatonType: SavedFACardView["automatonType"] = "DFA";
    let summaryTitle = "Automaton regex";
    let summaryValue = "";
    let table = data.table;
    let testLabel = "Test strings (regex supported)";
    let testPlaceholder = "Example: aaa or a*";
    let testResult: SavedFACardView["testResult"] = { status: "", detail: "" };

    if (isTmSnapshot && data.snapshot) {
      try {
        const tm = TuringMachine.fromCanvasSnapshot({
          states: data.snapshot.states,
          arrowPairs: data.snapshot.arrowPairs ?? [],
          fallbackInputAlphabet: fallbackAlphabet
        });
        automatonType = "TM";
        summaryTitle = "TM 7-tuple";
        summaryValue = JSON.stringify(tm.toJSON(), null, 2);
        table = tm.toTransitionTable();
        testLabel = "Test TM input";
        testPlaceholder = "Example: 0011";
        testResult = tm.testInput(inputValue);
      } catch (error) {
        automatonType = "TM";
        summaryTitle = "TM 7-tuple";
        summaryValue = "Invalid TM snapshot";
        table = [["State", "Read", "Write", "Move", "Next"], ["-", "-", "-", "-", "-"]];
        testLabel = "Test TM input";
        testPlaceholder = "Example: 0011";
        testResult = {
          status: "Invalid",
          detail: error instanceof Error ? error.message : "TM could not be parsed."
        };
      }
    } else {
      const automaton = SavedFA.toAutomaton(data, fallbackAlphabet);
      automatonType = automaton.getType();
      summaryTitle = "Automaton regex";
      summaryValue = automaton.toRegex();
      table = data.table;
      testLabel = "Test strings (regex supported)";
      testPlaceholder = "Example: aaa or a*";
      testResult = automaton.testInput(inputValue);
    }

    const left = data.bounds.x1 * scale + offset.x + canvasRect.left;
    const top = (data.bounds.y2 + 5) * scale + offset.y + canvasRect.top;

    return {
      automatonType,
      summaryTitle,
      summaryValue,
      table,
      testLabel,
      testPlaceholder,
      testResult,
      left,
      top
    };
  }
}
