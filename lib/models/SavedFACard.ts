import type { SavedDFA } from "../../types/domain";
import type { SavedFACardView } from "../../types/view";
import { SavedFA } from "../automata/index";

export class SavedFACard {
  static build(
    data: SavedDFA,
    inputValue: string,
    scale: number,
    offset: { x: number; y: number },
    canvasRect: { left: number; top: number }
  ): SavedFACardView {
    const automaton = SavedFA.toAutomaton(data, (data.table?.[0] ?? []).slice(1));
    const automatonType = automaton.getType();
    const automatonRegex = automaton.toRegex();
    const testResult = automaton.testInput(inputValue);

    const left = data.bounds.x1 * scale + offset.x + canvasRect.left;
    const top = (data.bounds.y2 + 5) * scale + offset.y + canvasRect.top;

    return {
      automatonType,
      automatonRegex,
      testResult,
      left,
      top
    };
  }
}
