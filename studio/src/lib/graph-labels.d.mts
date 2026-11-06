export interface GraphBox { x: number; y: number; width: number; height: number }
export interface GraphPoint { x: number; y: number }
export interface GraphRelationLabel { id: number; text: string; source: GraphPoint; target: GraphPoint }
export interface PlacedGraphLabel extends GraphRelationLabel {
  x: number; y: number; width: number; height: number; lines: string[]; anchor: GraphPoint;
}
export function placeGraphLabels(labels: GraphRelationLabel[], obstacles: GraphBox[]): PlacedGraphLabel[];
