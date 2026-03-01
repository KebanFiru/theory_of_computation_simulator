export type ThemeToggleProps = {
  mode?: "floating" | "inline";
};

export type HamburgerMenuProps = {
  onExportSelected: () => void;
  onImportJson: (file: File) => void;
  onRegexToFA: () => void;
  onConvertSelectedNfaToDfa: () => void;
  onCreateGnfa: () => void;
  onCreateDnfa: () => void;
  onCreateCfg: () => void;
};

export type AlphabetComboBoxProps = {
  alphabet: string[];
  setAlphabet: (a: string[]) => void;
  ownerLabel?: string;
  disabled?: boolean;
};

export type SelectionMenuProps = {
  startingState: boolean;
  setStartgingState: (state: boolean) => void;
  state: boolean;
  setState: (state: boolean) => void;
  road: boolean;
  setRoad: (road: boolean) => void;
  finalize: boolean;
  setFinalize: (finalize: boolean) => void;
  tmFinalize: boolean;
  setTmFinalize: (tmFinalize: boolean) => void;
  acceptState: boolean;
  setAcceptState: (acceptState: boolean) => void;
  tmStateMode: boolean;
  setTmStateMode: (value: boolean) => void;
  tmAcceptMode: boolean;
  setTmAcceptMode: (value: boolean) => void;
  tmRejectMode: boolean;
  setTmRejectMode: (value: boolean) => void;
  tmTransitionMode: boolean;
  setTmTransitionMode: (value: boolean) => void;
  alphabet: string[];
  setAlphabet: (a: string[]) => void;
  alphabetOwnerLabel?: string;
  alphabetLocked?: boolean;
  activeParentOverride?: "FA" | "TM" | null;
};