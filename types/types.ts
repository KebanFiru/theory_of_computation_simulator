export type State = {
    x: number;
    y: number;
    r: number;
    color: string;
    id: number;
}

export type Arrow = {
    from: State;
    to: State;
    label: string;
}

export type ArrowPair = {
    from: number;
    to: number;
    label?: string;
}

export type Offset = {
    x: number;
    y: number;
}

export type SelectionRect = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
} | null;

export type Bounds = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export type SavedDFA = {
    table: string[][];
    bounds: Bounds;
    snapshot?: {
        states: State[];
        arrowPairs: ArrowPair[];
    };
}

export type SavedDFAs = {
    [name: string]: SavedDFA;
}

export type SelectionMenuType = {
    startingState: boolean;
    setStartgingState: (state: boolean) => void;
    state: boolean;
    setState: (state: boolean) => void;
    road: boolean;
    setRoad: (road: boolean) => void;
    finalize: boolean;
    setFinalize: (finalize: boolean) => void;
    acceptState: boolean;
    setAcceptState: (acceptState: boolean) => void;
    alphabet: string[];
    setAlphabet: (alphabet: string[]) => void;
}

export interface DFACanvasProps {
    states: State[];
    arrowPairs: ArrowPair[];
    arrowSelection: number[];
    selectionRect: SelectionRect;
    savedDFAs: SavedDFAs;
    offset: Offset;
    scale: number;
    isDragging: boolean;
    startingState: boolean;
    state: boolean;
    selectionMode: boolean;
    renderTick: number;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
    onClick: (e: React.MouseEvent) => void;
}

export interface ArrowInputFieldsProps {
    arrowPairs: ArrowPair[];
    states: State[];
    alphabet: string[];
    transitionSlots: Record<string, number>;
    scale: number;
    offset: Offset;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    showNameDialog: boolean;
    onArrowLabelChange: (index: number, label: string) => void;
}

export interface DFANameDialogProps {
    isOpen: boolean;
    dfaName: string;
    onNameChange: (name: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

export interface DFATableDisplayProps {
    savedDFAs: SavedDFAs;
    scale: number;
    offset: Offset;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export interface SelectionModeIndicatorProps {
    isActive: boolean;
}