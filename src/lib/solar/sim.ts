import { BODIES, SECONDS_PER_YEAR, type BodyId } from "./bodies";

export type Vec3 = { x: number; y: number; z: number };

const DEG = Math.PI / 180;

export const live = {
  time: 0,
  positions: Object.fromEntries(BODIES.map((b) => [b.id, { x: 0, y: 0, z: 0 }])) as Record<
    BodyId,
    Vec3
  >,
  moon: { x: 0, y: 0, z: 0 },
};

export function orbitPosition(
  distance: number,
  inclinationDeg: number,
  angle: number,
  out: Vec3,
) {
  const inc = inclinationDeg * DEG;
  const x = Math.cos(angle) * distance;
  const z0 = Math.sin(angle) * distance;
  out.x = x;
  out.y = Math.sin(inc) * z0;
  out.z = Math.cos(inc) * z0;
}

export function bodyAngle(id: BodyId, time: number): number {
  const body = BODIES.find((b) => b.id === id);
  if (!body || body.orbitPeriodYears <= 0) return 0;
  return body.orbitPhase + (time / (body.orbitPeriodYears * SECONDS_PER_YEAR)) * Math.PI * 2;
}

export function spinAngle(dayHours: number, time: number): number {
  if (dayHours === 0) return 0;
  const daysPerYear = 365.25;
  const spinsPerYear = (daysPerYear * 24) / Math.abs(dayHours);
  const sign = dayHours < 0 ? -1 : 1;
  return sign * (time / SECONDS_PER_YEAR) * spinsPerYear * Math.PI * 2;
}

export function stepSimulation(dt: number, speed: number, paused: boolean) {
  if (!paused) live.time += dt * speed;
  const t = live.time;

  for (const body of BODIES) {
    if (body.id === "sun") {
      live.positions.sun.x = 0;
      live.positions.sun.y = 0;
      live.positions.sun.z = 0;
      continue;
    }
    orbitPosition(body.distance, body.orbitInclination, bodyAngle(body.id, t), live.positions[body.id]);
  }

  const earth = live.positions.earth;
  const moon = BODIES.find((b) => b.id === "earth")?.moons?.[0];
  if (moon) {
    const ma = (t / ((moon.periodDays / 365.25) * SECONDS_PER_YEAR)) * Math.PI * 2;
    live.moon.x = earth.x + Math.cos(ma) * moon.distance;
    live.moon.y = earth.y + Math.sin(ma) * 0.22;
    live.moon.z = earth.z + Math.sin(ma) * moon.distance;
  }
}

stepSimulation(0, 1, true);
