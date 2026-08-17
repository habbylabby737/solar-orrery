import { useCallback, useEffect, useRef, useState, type ComponentType, type MutableRefObject } from "react";
import { Chrome, PLANET_HOTKEYS, Splash } from "@/components/overlay/Chrome";
import { SPEED_MAX, SPEED_MIN, writeBridge, type SolarCanvasProps } from "@/lib/solar/store";
import type { BodyId } from "@/lib/solar/bodies";

export function SolarApp() {
  const [CanvasRoot, setCanvasRoot] = useState<ComponentType<{ uiRef: MutableRefObject<SolarCanvasProps> }> | null>(
    null,
  );
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedId, setSelectedId] = useState<BodyId | null>(null);
  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [simDays, setSimDays] = useState(0);
  const [focusGen, setFocusGen] = useState(0);

  const select = useCallback((id: BodyId | null) => {
    setSelectedId(id);
    setFocusGen((n) => n + 1);
  }, []);
  const togglePaused = useCallback(() => setPaused((p) => !p), []);

  const snapshot: SolarCanvasProps = {
    paused,
    speed,
    selectedId,
    showTrails,
    showLabels,
    focusGen,
    select,
    setSimDays,
  };
  const uiRef = useRef(snapshot);
  uiRef.current = snapshot;
  writeBridge(snapshot);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.orrery = selectedId ?? "sun";
  }

  useEffect(() => {
    let alive = true;
    void import("./SolarCanvas").then((mod) => {
      if (alive) setCanvasRoot(() => mod.SolarCanvas);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePaused();
        return;
      }
      if (e.code === "Escape") {
        select(null);
        return;
      }
      if (e.code === "KeyL") {
        setShowLabels((v) => !v);
        return;
      }
      if (e.code === "KeyT") {
        setShowTrails((v) => !v);
        return;
      }
      if (e.code === "Equal" || e.code === "NumpadAdd") {
        setSpeed((s) => Math.min(SPEED_MAX, s * 1.25));
        return;
      }
      if (e.code === "Minus" || e.code === "NumpadSubtract") {
        setSpeed((s) => Math.max(SPEED_MIN, s / 1.25));
        return;
      }
      const body = PLANET_HOTKEYS[e.code];
      if (body) select(body);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select, togglePaused]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      {CanvasRoot ? <CanvasRoot uiRef={uiRef} /> : <Splash />}
      <Chrome
        paused={paused}
        speed={speed}
        selectedId={selectedId}
        showTrails={showTrails}
        showLabels={showLabels}
        focusGen={focusGen}
        select={select}
        setSimDays={setSimDays}
        simDays={simDays}
        setPaused={setPaused}
        togglePaused={togglePaused}
        setSpeed={setSpeed}
        setShowTrails={setShowTrails}
        setShowLabels={setShowLabels}
      />
    </main>
  );
}
