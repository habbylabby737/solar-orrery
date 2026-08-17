export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type BodyKind = "star" | "terrestrial" | "rocky" | "gas" | "ice";

export type MoonDef = {
  name: string;
  radius: number;
  distance: number;
  periodDays: number;
};

export type BodyDef = {
  id: BodyId;
  name: string;
  kind: BodyKind;
  radius: number;
  distance: number;
  orbitPeriodYears: number;
  dayHours: number;
  axialTilt: number;
  orbitInclination: number;
  orbitPhase: number;
  color: string;
  atmosphere?: string;
  hasRings?: boolean;
  hasClouds?: boolean;
  moons?: MoonDef[];
  typeLabel: string;
  diameterKm: number;
  massEarths: number;
  distanceAu: number;
  orbitalPeriodDays: number;
  dayLength: string;
  moonsCount: number;
  temperature: string;
  discovered: string;
  blurb: string;
};

/** Simulated seconds for one Earth year at 1×. */
export const SECONDS_PER_YEAR = 52;

export const BODIES: BodyDef[] = [
  {
    id: "sun",
    name: "Sun",
    kind: "star",
    radius: 5.6,
    distance: 0,
    orbitPeriodYears: 0,
    dayHours: 609.12,
    axialTilt: 7.25,
    orbitInclination: 0,
    orbitPhase: 0,
    color: "#f3c56b",
    typeLabel: "G-type main-sequence star",
    diameterKm: 1_392_700,
    massEarths: 333_000,
    distanceAu: 0,
    orbitalPeriodDays: 0,
    dayLength: "25.4 days (eq.)",
    moonsCount: 0,
    temperature: "5,772 K surface",
    discovered: "—",
    blurb:
      "A G2V dwarf holding the system together. Photosphere granules seethe; the corona stretches millions of kilometres into the dark.",
  },
  {
    id: "mercury",
    name: "Mercury",
    kind: "rocky",
    radius: 0.38,
    distance: 12.4,
    orbitPeriodYears: 0.2408,
    dayHours: 1407.6,
    axialTilt: 0.03,
    orbitInclination: 7.0,
    orbitPhase: 1.2,
    color: "#9a9590",
    typeLabel: "Terrestrial planet",
    diameterKm: 4_879,
    massEarths: 0.055,
    distanceAu: 0.387,
    orbitalPeriodDays: 88,
    dayLength: "176 Earth days",
    moonsCount: 0,
    temperature: "−180 to 430 °C",
    discovered: "Antiquity",
    blurb:
      "A cratered iron world racing the Sun. Days last longer than its year; the sky never holds a true atmosphere.",
  },
  {
    id: "venus",
    name: "Venus",
    kind: "terrestrial",
    radius: 0.95,
    distance: 17.8,
    orbitPeriodYears: 0.6152,
    dayHours: -5832.5,
    axialTilt: 177.4,
    orbitInclination: 3.4,
    orbitPhase: 4.1,
    color: "#d9c38a",
    hasClouds: true,
    atmosphere: "#e6d3a1",
    typeLabel: "Terrestrial planet",
    diameterKm: 12_104,
    massEarths: 0.815,
    distanceAu: 0.723,
    orbitalPeriodDays: 225,
    dayLength: "243 Earth days, retrograde",
    moonsCount: 0,
    temperature: "464 °C",
    discovered: "Antiquity",
    blurb:
      "Earth’s veiled twin, wrapped in sulfuric clouds and a runaway greenhouse. It spins backwards, and slowly.",
  },
  {
    id: "earth",
    name: "Earth",
    kind: "terrestrial",
    radius: 1,
    distance: 24.2,
    orbitPeriodYears: 1,
    dayHours: 23.93,
    axialTilt: 23.44,
    orbitInclination: 0,
    orbitPhase: 0.35,
    color: "#6f9fd4",
    hasClouds: true,
    atmosphere: "#7eb6ff",
    moons: [{ name: "Moon", radius: 0.27, distance: 2.55, periodDays: 27.3 }],
    typeLabel: "Terrestrial planet",
    diameterKm: 12_756,
    massEarths: 1,
    distanceAu: 1,
    orbitalPeriodDays: 365.25,
    dayLength: "23 h 56 m",
    moonsCount: 1,
    temperature: "15 °C mean",
    discovered: "—",
    blurb:
      "The only world known to harbor life. Liquid oceans, a shielding magnetic field, and one large moon that steadies its tilt.",
  },
  {
    id: "mars",
    name: "Mars",
    kind: "terrestrial",
    radius: 0.53,
    distance: 32.4,
    orbitPeriodYears: 1.8808,
    dayHours: 24.6,
    axialTilt: 25.19,
    orbitInclination: 1.85,
    orbitPhase: 2.6,
    color: "#c17a4a",
    atmosphere: "#e0a070",
    typeLabel: "Terrestrial planet",
    diameterKm: 6_792,
    massEarths: 0.107,
    distanceAu: 1.524,
    orbitalPeriodDays: 687,
    dayLength: "24 h 37 m",
    moonsCount: 2,
    temperature: "−63 °C mean",
    discovered: "Antiquity",
    blurb:
      "A rusted desert with polar ice, extinct volcanoes, and the solar system’s largest canyon. Two potato moons tag along.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    kind: "gas",
    radius: 2.85,
    distance: 48.5,
    orbitPeriodYears: 11.862,
    dayHours: 9.93,
    axialTilt: 3.13,
    orbitInclination: 1.3,
    orbitPhase: 5.4,
    color: "#c4a078",
    atmosphere: "#d4b48a",
    typeLabel: "Gas giant",
    diameterKm: 142_984,
    massEarths: 317.8,
    distanceAu: 5.204,
    orbitalPeriodDays: 4_333,
    dayLength: "9 h 56 m",
    moonsCount: 95,
    temperature: "−108 °C cloud tops",
    discovered: "Antiquity",
    blurb:
      "A failed star of hydrogen and helium. The Great Red Spot has raged for centuries; its gravity shepherds the asteroid belt.",
  },
  {
    id: "saturn",
    name: "Saturn",
    kind: "gas",
    radius: 2.4,
    distance: 64.5,
    orbitPeriodYears: 29.457,
    dayHours: 10.7,
    axialTilt: 26.73,
    orbitInclination: 2.49,
    orbitPhase: 1.8,
    color: "#e6d3a4",
    atmosphere: "#efe0b8",
    hasRings: true,
    typeLabel: "Gas giant",
    diameterKm: 120_536,
    massEarths: 95.2,
    distanceAu: 9.583,
    orbitalPeriodDays: 10_759,
    dayLength: "10 h 42 m",
    moonsCount: 146,
    temperature: "−139 °C cloud tops",
    discovered: "Antiquity",
    blurb:
      "Pale gold, less dense than water, wearing ice-and-rock rings only tens of metres thick. Titan hides a dense orange air.",
  },
  {
    id: "uranus",
    name: "Uranus",
    kind: "ice",
    radius: 1.55,
    distance: 80.5,
    orbitPeriodYears: 84.011,
    dayHours: -17.2,
    axialTilt: 97.77,
    orbitInclination: 0.77,
    orbitPhase: 3.7,
    color: "#9fd4d8",
    atmosphere: "#b7e4e6",
    hasRings: true,
    typeLabel: "Ice giant",
    diameterKm: 51_118,
    massEarths: 14.5,
    distanceAu: 19.191,
    orbitalPeriodDays: 30_687,
    dayLength: "17 h 14 m, retrograde",
    moonsCount: 28,
    temperature: "−195 °C",
    discovered: "1781 · William Herschel",
    blurb:
      "An ice giant knocked on its side. Methane stains the clouds cyan; a faint ring system circles the poles, not the equator.",
  },
  {
    id: "neptune",
    name: "Neptune",
    kind: "ice",
    radius: 1.5,
    distance: 96,
    orbitPeriodYears: 164.79,
    dayHours: 16.1,
    axialTilt: 28.32,
    orbitInclination: 1.77,
    orbitPhase: 0.9,
    color: "#4f74d4",
    atmosphere: "#6f92e8",
    typeLabel: "Ice giant",
    diameterKm: 49_528,
    massEarths: 17.1,
    distanceAu: 30.07,
    orbitalPeriodDays: 60_190,
    dayLength: "16 h 6 m",
    moonsCount: 16,
    temperature: "−201 °C",
    discovered: "1846 · Adams & Le Verrier",
    blurb:
      "The last giant, found by mathematics before a telescope. Supersonic winds and a dark storm drift across its cobalt face.",
  },
];

export const PLANETS = BODIES.filter((b) => b.id !== "sun");
export const BODY_BY_ID = Object.fromEntries(BODIES.map((b) => [b.id, b])) as Record<
  BodyId,
  BodyDef
>;

export const BODY_IDS = BODIES.map((b) => b.id);

export function formatMass(earths: number): string {
  if (earths >= 1000) return `${(earths / 1000).toFixed(0)}k Earths`;
  if (earths >= 10) return `${earths.toFixed(1)} Earths`;
  if (earths >= 1) return `${earths.toFixed(2)} Earths`;
  return `${earths.toFixed(3)} Earths`;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString("en-US")} km`;
}
