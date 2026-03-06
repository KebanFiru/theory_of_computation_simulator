export type LabelPalette = {
  text: string;
  outline: string;
};

export type CanvasTheme = {
  canvasBg: string;
  canvasNode: string;
  canvasNodeSelected: string;
  canvasNodeStroke: string;
  canvasText: string;
  contrastLight: string;
  contrastDark: string;
  selectionColor: string;
  savedColor: string;
  savedTextColor: string;
  arrowColor: string;
  arrowSelectedColor: string;
  previewColor: string;
  shadowColor: string;
  stateColors: Record<string, string>;
};

export type TransitionLabelStyle = {
  baseColor: string;
  bgColor: string;
  borderColor: string;
};

export type LabelPaletteResolver = (fillColor: string) => LabelPalette;