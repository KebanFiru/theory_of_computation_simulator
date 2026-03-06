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

export function resolveCanvasTheme(rootStyles: CSSStyleDeclaration): CanvasTheme {
  const getVar = (name: string, fallback: string) =>
    rootStyles.getPropertyValue(name).trim() || fallback;

  return {
    canvasBg: getVar("--canvas-bg", "#0b1220"),
    canvasNode: getVar("--canvas-node", "#ffffff"),
    canvasNodeSelected: getVar("--canvas-node-selected", "#2563eb"),
    canvasNodeStroke: getVar("--canvas-node-stroke", "#0f172a"),
    canvasText: getVar("--canvas-text", "#0f172a"),
    contrastLight: getVar("--accent-contrast", "#ffffff"),
    contrastDark: getVar("--warning-contrast", "#0f172a"),
    selectionColor: getVar("--canvas-selection", "#ef4444"),
    savedColor: getVar("--canvas-saved", "#22c55e"),
    savedTextColor: getVar("--canvas-saved-text", "#16a34a"),
    arrowColor: getVar("--canvas-arrow", "#374151"),
    arrowSelectedColor: getVar("--canvas-arrow-selected", "#2563eb"),
    previewColor: getVar("--canvas-preview", "#94a3b8"),
    shadowColor: getVar("--shadow-color", "rgba(15, 23, 42, 0.15)"),
    stateColors: {
      red: getVar("--state-start", "#ef4444"),
      green: getVar("--state-normal", "#22c55e"),
      blue: getVar("--state-accept", "#3b82f6"),
      purple: getVar("--state-reject", "#a855f7"),
      "tm-green": getVar("--state-tm", "#f59e0b"),
      "tm-blue": getVar("--state-tm-accept", "#06b6d4"),
      "tm-purple": getVar("--state-tm-reject", "#8b5cf6")
    }
  };
}

function parseColorToRgb(value: string): { r: number; g: number; b: number } | null {
  const color = value.trim();
  if (!color) return null;

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3])
    };
  }

  return null;
}

function isDarkColor(value: string): boolean {
  const rgb = parseColorToRgb(value);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.55;
}

export function createLabelPaletteResolver(theme: CanvasTheme) {
  return (fillColor: string): LabelPalette => {
    if (isDarkColor(fillColor)) {
      return {
        text: theme.contrastLight,
        outline: theme.contrastDark
      };
    }
    return {
      text: theme.contrastDark,
      outline: theme.contrastLight
    };
  };
}
