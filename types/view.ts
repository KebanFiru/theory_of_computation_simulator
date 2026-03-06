export type TransitionInputDescriptor = {
  key: string;
  from: number;
  to: number;
  slotIdx: number;
  arrowIdx: number;
  value: string;
  isTmTransition: boolean;
  isEpsilon: boolean;
  boxWidth: number;
  screenX: number;
  screenY: number;
};

export type SavedFACardView = {
  automatonType: "DFA" | "NFA" | "TM";
  summaryTitle: string;
  summaryValue: string;
  table: string[][];
  testLabel: string;
  testPlaceholder: string;
  testResult: { status: string; detail: string };
  left: number;
  top: number;
};
