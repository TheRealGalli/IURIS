export const GRAPH_LABEL_WIDTH: number;
export const GRAPH_LABEL_FONT: number;
export const GRAPH_LABEL_LINE: number;
export function graphNodeRadius(degree: number): number;
export function graphTextWidth(text: string, fontSize?: number): number;
export function graphLabelLines(text: string, maxWidth?: number, fontSize?: number): string[];
export function graphNodeBounds(node: { x: number; y: number; grado: number; nome: string }, padding?: number): { x0: number; y0: number; x1: number; y1: number };
