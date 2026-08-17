import type { MutableRefObject } from "react";
import type { BodyId } from "./bodies";

export const SPEED_MIN = 0.15;
export const SPEED_MAX = 40;

export type SolarCanvasProps = {
  paused: boolean;
  speed: number;
  selectedId: BodyId | null;
  showTrails: boolean;
  showLabels: boolean;
  focusGen: number;
  select: (id: BodyId | null) => void;
  setSimDays: (n: number) => void;
};

export type SolarUi = SolarCanvasProps & {
  simDays: number;
  setPaused: (v: boolean) => void;
  togglePaused: () => void;
  setSpeed: (n: number) => void;
  setShowTrails: (v: boolean) => void;
  setShowLabels: (v: boolean) => void;
};

export type SolarUiRef = MutableRefObject<SolarCanvasProps>;

export function writeBridge(next: SolarCanvasProps) {
  if (typeof window === "undefined") return;
  (window as unknown as { __orreryBridge?: SolarCanvasProps }).__orreryBridge = next;
}
