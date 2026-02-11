export type ThemeToggleProps = {
  mode?: "floating" | "inline";
};

export type HamburgerMenuProps = {
  onExportSelected: () => void;
  onImportJson: (file: File) => void;
};