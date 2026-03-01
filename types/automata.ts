export type TransitionMap = Map<number, Map<string, Set<number>>>;

export type AutomatonInit = {
  states: Iterable<number>;
  alphabet?: Iterable<string>;
  startState: number;
  acceptStates?: Iterable<number>;
};

export type RegexToken = string;

export type RegexFragment = {
  start: number;
  end: number;
};

export type GnfaTransitionMap = Map<string, Map<string, string>>;
