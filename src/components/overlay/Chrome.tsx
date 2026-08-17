import { Link } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Focus,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BODIES, BODY_BY_ID, formatKm, formatMass, type BodyId } from "@/lib/solar/bodies";
import { SPEED_MAX, SPEED_MIN, type SolarUi } from "@/lib/solar/store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-fg/10" />;
  }
  if (user) {
    return (
      <SignedIn>
        <div className="hidden sm:block">
          <UserButton />
        </div>
      </SignedIn>
    );
  }
  return (
    <SignedOut>
      <Button asChild variant="outline" size="sm">
        <Link to="/login">Sign in</Link>
      </Button>
    </SignedOut>
  );
}

function formatSpeed(n: number) {
  if (n < 1) return `${n.toFixed(2)}×`;
  if (n < 10) return `${n.toFixed(1)}×`;
  return `${Math.round(n)}×`;
}

function elapsedLabel(days: number) {
  const years = days / 365.25;
  if (years < 1) return `${Math.floor(days)} d`;
  return `${years.toFixed(2)} yr`;
}

export function Chrome({
  paused,
  speed,
  selectedId,
  showTrails,
  showLabels,
  simDays,
  togglePaused,
  setSpeed,
  select,
  setShowTrails,
  setShowLabels,
}: SolarUi) {
  const selected = selectedId ? BODY_BY_ID[selectedId] : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 text-fg">
      <header className="pointer-events-auto flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <div>
          <p className="font-display text-2xl leading-tight tracking-tight text-fg italic">
            Orrery
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Elapsed{" "}
            <span className="font-medium text-fg tabular-nums">{elapsedLabel(simDays)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AuthSlot />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={togglePaused}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play /> : <Pause />}
          </Button>
        </div>
      </header>

      {selected && (
        <aside className="pointer-events-auto absolute top-20 right-4 hidden w-[18.5rem] overflow-hidden rounded-xl border border-border bg-bg-elevated/92 p-4 md:block">
          <InfoBody
            selected={selected}
            onClose={() => select(null)}
            onRecenter={() => select(selected.id)}
          />
        </aside>
      )}

      {selected && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-32 rounded-xl border border-border bg-bg-elevated/94 p-3 md:hidden">
          <InfoBody
            selected={selected}
            compact
            onClose={() => select(null)}
            onRecenter={() => select(selected.id)}
          />
        </div>
      )}

      <footer className="pointer-events-auto absolute inset-x-0 bottom-0 space-y-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-border bg-bg-elevated/90 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={togglePaused}
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play /> : <Pause />}
            </Button>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                <span>Simulation speed</span>
                <span className="text-fg tabular-nums">{formatSpeed(speed)}</span>
              </div>
              <Slider
                min={Math.log(SPEED_MIN)}
                max={Math.log(SPEED_MAX)}
                step={0.01}
                value={[Math.log(speed)]}
                onValueChange={([v]) => {
                  if (typeof v === "number") setSpeed(Math.exp(v));
                }}
                aria-label="Simulation speed"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={showTrails ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setShowTrails(!showTrails)}
                aria-label={showTrails ? "Hide orbital trails" : "Show orbital trails"}
              >
                <Orbit />
              </Button>
              <Button
                type="button"
                variant={showLabels ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setShowLabels(!showLabels)}
                aria-label={showLabels ? "Hide labels" : "Show labels"}
              >
                {showLabels ? <Eye /> : <EyeOff />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => select(null)}
                aria-label="Reset camera"
              >
                <RotateCcw />
              </Button>
            </div>
          </div>
          <Separator />
          <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {BODIES.map((body) => {
              const active = selectedId === body.id || (selectedId === null && body.id === "sun");
              return (
                <button
                  key={body.id}
                  type="button"
                  onClick={() => select(body.id === "sun" && selectedId === "sun" ? null : body.id)}
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-2 rounded-sm border px-2.5 text-xs font-medium transition-colors duration-150",
                    active
                      ? "border-border-strong bg-secondary text-fg"
                      : "border-transparent text-muted hover:bg-fg/6 hover:text-fg",
                  )}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: body.color }}
                    aria-hidden
                  />
                  {body.name}
                </button>
              );
            })}
          </nav>
        </div>
        <p className="hidden text-center text-xs text-subtle sm:block">
          Drag to orbit · scroll to zoom · click a world to focus · space pauses
        </p>
      </footer>
    </div>
  );
}

function InfoBody({
  selected,
  compact,
  onClose,
  onRecenter,
}: {
  selected: (typeof BODIES)[number];
  compact?: boolean;
  onClose: () => void;
  onRecenter: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl leading-tight italic">{selected.name}</p>
          <p className="mt-0.5 text-xs text-muted">{selected.typeLabel}</p>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRecenter} aria-label="Refocus">
            <Focus />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
      </div>
      {!compact && <p className="mt-3 text-sm leading-relaxed text-muted">{selected.blurb}</p>}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Stat label="Diameter" value={formatKm(selected.diameterKm)} />
        <Stat label="Mass" value={formatMass(selected.massEarths)} />
        {selected.id !== "sun" && (
          <>
            <Stat label="Distance" value={`${selected.distanceAu} AU`} />
            <Stat label="Orbit" value={`${selected.orbitalPeriodDays.toLocaleString("en-US")} d`} />
          </>
        )}
        <Stat label="Day" value={selected.dayLength} />
        <Stat label="Temp." value={selected.temperature} />
        {selected.id !== "sun" && <Stat label="Moons" value={String(selected.moonsCount)} />}
        <Stat label="Known since" value={selected.discovered} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium text-fg tabular-nums">{value}</dd>
    </div>
  );
}

export function Splash() {
  return (
    <div className="grid h-full w-full place-items-center bg-bg">
      <div className="text-center">
        <p className="font-display text-3xl italic">Orrery</p>
        <p className="mt-2 text-sm text-muted">Charting the heavens</p>
      </div>
    </div>
  );
}

export const PLANET_HOTKEYS: Record<string, BodyId> = {
  Digit1: "mercury",
  Digit2: "venus",
  Digit3: "earth",
  Digit4: "mars",
  Digit5: "jupiter",
  Digit6: "saturn",
  Digit7: "uranus",
  Digit8: "neptune",
  Digit0: "sun",
};
