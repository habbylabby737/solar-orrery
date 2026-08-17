# Orrery

An interactive 3D model of the solar system. Fly around the Sun, focus any planet, scrub time, and read real orbital stats.

Built with React, Three.js, React Three Fiber, TanStack Start, and Tailwind.

## Features

- All eight planets plus the Sun, with moons, rings, atmospheres, and axial tilt
- Drag to orbit, scroll to zoom, click a world to focus the camera
- Time slider from a crawl to 40×, plus pause / resume
- Orbital trails and name labels you can toggle
- Planet fact cards (diameter, mass, distance, day length, temperature, moons)
- Keyboard shortcuts: `Space` pauses, `0`–`8` jump to the Sun and planets
- Optional sign-in (email or Grok) so a deployed copy can keep identity

## Controls

| Input | Action |
| --- | --- |
| Drag | Orbit the camera |
| Scroll / pinch | Zoom |
| Click a planet | Focus that world |
| Space | Pause / resume |
| `0` | Sun |
| `1`–`8` | Mercury → Neptune |
| Trail / eye buttons | Toggle orbits and labels |

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:8080`).

```bash
npm run build      # production build
npm run typecheck  # TypeScript
npm test           # unit tests
```

## Stack

- **3D** — three.js, @react-three/fiber, @react-three/drei
- **App** — React 19, TanStack Start / Router, Vite
- **UI** — Tailwind v4, Radix, lucide
- **Auth / data** — better-auth, PGLite in dev, Postgres (`DATABASE_URL`) in production

## Deploy

The Vite config emits a Vercel build (`nitro` preset) when you run `npm run build`. Set `DATABASE_URL` on the host if you want persisted accounts; without it the app still runs as a local-only orrery.
