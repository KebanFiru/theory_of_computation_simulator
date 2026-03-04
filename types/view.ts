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
  automatonType: "DFA" | "NFA";
  automatonRegex: string;
  testResult: { status: string; detail: string };
  left: number;
  top: number;
};
