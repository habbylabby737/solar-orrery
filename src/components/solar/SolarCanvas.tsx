import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BODIES, BODY_BY_ID, PLANETS, SECONDS_PER_YEAR, type BodyDef, type BodyId } from "@/lib/solar/bodies";
import { bodyAngle, live, spinAngle, stepSimulation } from "@/lib/solar/sim";
import type { SolarCanvasProps } from "@/lib/solar/store";
import { createTexturePack, disposeTexturePack, type TexturePack } from "@/lib/solar/textures";

const DEG = Math.PI / 180;
const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _world = new THREE.Vector3();

type CamProbe = {
  id: BodyId;
  dist: number;
  viewDist: number;
  selected: BodyId | null;
  bridgeNow?: BodyId | null;
  markedNow?: string;
  tick?: number;
};

function viewDistance(id: BodyId): number {
  if (id === "sun") return 78;
  const body = BODY_BY_ID[id];
  if (!body) return 78;
  return Math.max(body.radius * 6.6, 4.4);
}

function resolveFocus(ui: SolarCanvasProps): BodyId {
  const marked = typeof document !== "undefined" ? document.documentElement.dataset.orrery : "";
  const raw = ui.selectedId || marked || "sun";
  return raw in BODY_BY_ID ? (raw as BodyId) : "sun";
}

function publishCam(probe: CamProbe) {
  (window as unknown as { __orreryCam?: CamProbe }).__orreryCam = probe;
}

function readUi(uiRef?: MutableRefObject<SolarCanvasProps>): SolarCanvasProps {
  const bridge = (window as unknown as { __orreryBridge?: SolarCanvasProps }).__orreryBridge;
  if (bridge) return bridge;
  if (uiRef?.current) return uiRef.current;
  return {
    paused: false,
    speed: 1,
    selectedId: null,
    showTrails: true,
    showLabels: true,
    focusGen: 0,
    select: () => {},
    setSimDays: () => {},
  };
}

function makeLabelTexture(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "600 28px Figtree, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(7,7,10,0.9)";
  ctx.strokeText(text, 128, 32);
  ctx.fillStyle = "#ececef";
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function NameLabel({ text, y, scale = 2.6 }: { text: string; y: number; scale?: number }) {
  const texture = useMemo(() => makeLabelTexture(text), [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, y, 0]} scale={[scale, scale * 0.25, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} />
    </sprite>
  );
}

function createRingGeo(inner: number, outer: number, seg = 96) {
  const geo = new THREE.RingGeometry(inner, outer, seg);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, y);
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

function atmosMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; varying vec3 vNormal; varying vec3 vView;
      void main() {
        float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
        gl_FragColor = vec4(uColor, f * 0.62);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

function SimulationClock({ uiRef }: { uiRef: MutableRefObject<SolarCanvasProps> }) {
  const acc = useRef(0);
  useFrame((_, delta) => {
    const ui = readUi(uiRef);
    const d = Math.min(delta, 0.1);
    stepSimulation(d, ui.speed, ui.paused);
    acc.current += d;
    if (acc.current > 0.2) {
      acc.current = 0;
      ui.setSimDays((live.time / SECONDS_PER_YEAR) * 365.25);
    }
  });
  return null;
}

function CameraRig({
  controlsRef,
  uiRef,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  uiRef: MutableRefObject<SolarCanvasProps>;
}) {
  const follow = useRef(new THREE.Vector3(0, 0, 0));
  const lastKey = useRef("");
  const settle = useRef(1);

  useFrame((state, delta) => {
    try {
      const ui = readUi(uiRef);
      const id = resolveFocus(ui);
      const p = live.positions[id];
      if (!p) return;
      const desired = viewDistance(id);
      const dt = Math.min(delta, 0.1);
      const key = `${id}:${ui.focusGen}`;
      if (lastKey.current !== key) {
        lastKey.current = key;
        settle.current = 1;
      }

      follow.current.lerp(_target.set(p.x, p.y, p.z), 1 - Math.exp(-5.2 * dt));

      const camera = state.camera;
      _offset.copy(camera.position).sub(follow.current);
      if (_offset.lengthSq() < 1e-6) _offset.set(0.46, 0.34, 1);
      if (_offset.y < 0.05) _offset.y = 0.12;
      const currentDist = _offset.length();
      _offset.multiplyScalar(1 / currentDist);

      settle.current = Math.max(0, settle.current - dt);
      const pull = settle.current > 0 ? 1 - Math.exp(-3.6 * dt) : 1 - Math.exp(-1.1 * dt);
      const dist = THREE.MathUtils.lerp(currentDist, desired, pull);
      _desired.copy(follow.current).addScaledVector(_offset, dist);
      camera.position.copy(_desired);
      camera.lookAt(follow.current);

      const controls = controlsRef.current ?? (state.controls as OrbitControlsImpl | undefined);
      if (controls?.target) {
        controls.target.copy(follow.current);
        if (id === "sun") {
          controls.minDistance = 16;
          controls.maxDistance = 230;
        } else {
          const body = BODY_BY_ID[id];
          controls.minDistance = Math.max((body?.radius ?? 1) * 1.7, 1.3);
          controls.maxDistance = Math.max(desired * 4.5, 28);
        }
      }

      const tick = ((window as unknown as { __orreryTick?: number }).__orreryTick ?? 0) + 1;
      (window as unknown as { __orreryTick?: number }).__orreryTick = tick;
      camera.getWorldPosition(_world);
      publishCam({
        id,
        dist: _world.distanceTo(follow.current),
        viewDist: desired,
        selected: ui.selectedId,
        bridgeNow: (window as unknown as { __orreryBridge?: SolarCanvasProps }).__orreryBridge?.selectedId ?? null,
        markedNow: document.documentElement.dataset.orrery,
        tick,
      });
    } catch (err) {
      (window as unknown as { __orreryErr?: string }).__orreryErr = String(err);
    }
  });

  return null;
}

function OrbitPath({ body }: { body: BodyDef }) {
  const ringLine = useMemo(() => {
    const ringN = 160;
    const ring = new Float32Array(ringN * 3);
    const inc = body.orbitInclination * DEG;
    for (let i = 0; i < ringN; i++) {
      const a = (i / (ringN - 1)) * Math.PI * 2;
      const x = Math.cos(a) * body.distance;
      const z0 = Math.sin(a) * body.distance;
      ring[i * 3] = x;
      ring[i * 3 + 1] = Math.sin(inc) * z0;
      ring[i * 3 + 2] = Math.cos(inc) * z0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(ring, 3));
    return new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: body.color, transparent: true, opacity: 0.16, depthWrite: false }),
    );
  }, [body.color, body.distance, body.orbitInclination]);

  const trailLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(40 * 3), 3));
    return new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: body.color, transparent: true, opacity: 0.48, depthWrite: false }),
    );
  }, [body.color]);

  useEffect(() => {
    return () => {
      ringLine.geometry.dispose();
      (ringLine.material as THREE.Material).dispose();
      trailLine.geometry.dispose();
      (trailLine.material as THREE.Material).dispose();
    };
  }, [ringLine, trailLine]);

  useFrame(() => {
    const active = readUi().selectedId === body.id;
    (ringLine.material as THREE.LineBasicMaterial).opacity = active ? 0.4 : 0.16;
    (trailLine.material as THREE.LineBasicMaterial).opacity = active ? 0.88 : 0.48;
    const pos = trailLine.geometry.attributes.position as THREE.BufferAttribute;
    const angle = bodyAngle(body.id, live.time);
    const inc = body.orbitInclination * DEG;
    for (let i = 0; i < pos.count; i++) {
      const a = angle - 0.72 * (1 - i / (pos.count - 1));
      const x = Math.cos(a) * body.distance;
      const z0 = Math.sin(a) * body.distance;
      pos.setXYZ(i, x, Math.sin(inc) * z0, Math.cos(inc) * z0);
    }
    pos.needsUpdate = true;
  });

  return (
    <group>
      <primitive object={ringLine} />
      <primitive object={trailLine} />
    </group>
  );
}

function PlanetBody({
  body,
  pack,
  selected,
  showLabels,
  onSelect,
}: {
  body: BodyDef;
  pack: TexturePack;
  selected: boolean;
  showLabels: boolean;
  onSelect: (id: BodyId) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const map = pack.bodies[body.id];
  const atmos = useMemo(
    () => (body.atmosphere ? atmosMaterial(body.atmosphere) : null),
    [body.atmosphere],
  );
  const saturnRing = useMemo(
    () => (body.id === "saturn" ? createRingGeo(body.radius * 1.35, body.radius * 2.35) : null),
    [body.id, body.radius],
  );
  const uranusRing = useMemo(
    () => (body.id === "uranus" ? createRingGeo(body.radius * 1.45, body.radius * 1.95) : null),
    [body.id, body.radius],
  );

  useEffect(() => {
    return () => {
      atmos?.dispose();
      saturnRing?.dispose();
      uranusRing?.dispose();
    };
  }, [atmos, saturnRing, uranusRing]);

  useFrame(() => {
    const p = live.positions[body.id];
    if (group.current) group.current.position.set(p.x, p.y, p.z);
    if (spin.current) spin.current.rotation.y = spinAngle(body.dayHours, live.time);
    if (clouds.current) clouds.current.rotation.y = spinAngle(body.dayHours * 0.72, live.time);
  });

  return (
    <group ref={group} position={[live.positions[body.id].x, live.positions[body.id].y, live.positions[body.id].z]}>
      <group rotation={[0, 0, body.axialTilt * DEG]}>
        <group ref={spin}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onSelect(body.id);
            }}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          >
            <sphereGeometry args={[body.radius, 48, 32]} />
            <meshStandardMaterial
              map={map}
              roughness={body.kind === "gas" || body.kind === "ice" ? 0.55 : 0.78}
              metalness={0.04}
            />
          </mesh>
          {body.hasClouds && body.id === "earth" && (
            <mesh ref={clouds} scale={1.018}>
              <sphereGeometry args={[body.radius, 48, 32]} />
              <meshStandardMaterial map={pack.clouds} transparent depthWrite={false} opacity={0.85} roughness={1} />
            </mesh>
          )}
          {body.hasClouds && body.id === "venus" && (
            <mesh ref={clouds} scale={1.02}>
              <sphereGeometry args={[body.radius, 48, 32]} />
              <meshStandardMaterial map={pack.venusClouds} transparent depthWrite={false} roughness={0.6} />
            </mesh>
          )}
        </group>
        {saturnRing && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={saturnRing}>
            <meshBasicMaterial map={pack.rings} transparent side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
        {uranusRing && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={uranusRing}>
            <meshBasicMaterial map={pack.uranusRings} transparent side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      {atmos && (
        <mesh scale={1.08} material={atmos}>
          <sphereGeometry args={[body.radius, 32, 24]} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[body.radius * 1.18, body.radius * 1.28, 48]} />
          <meshBasicMaterial color="#d5dbe4" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showLabels && !selected && (
        <NameLabel text={body.name} y={body.radius + 0.55} scale={Math.max(2.2, body.radius * 1.6)} />
      )}
    </group>
  );
}

function Moon({ pack, onSelect }: { pack: TexturePack; onSelect: (id: BodyId) => void }) {
  const ref = useRef<THREE.Group>(null);
  const moon = BODIES.find((b) => b.id === "earth")!.moons![0];
  useFrame(() => {
    if (ref.current) ref.current.position.set(live.moon.x, live.moon.y, live.moon.z);
  });
  return (
    <group ref={ref}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect("earth");
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[moon.radius, 24, 16]} />
        <meshStandardMaterial map={pack.moon} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Sun({
  pack,
  selected,
  showLabels,
  onSelect,
}: {
  pack: TexturePack;
  selected: boolean;
  showLabels: boolean;
  onSelect: (id: BodyId) => void;
}) {
  const spin = useRef<THREE.Mesh>(null);
  const sun = BODIES[0];
  useFrame(() => {
    if (spin.current) spin.current.rotation.y = spinAngle(sun.dayHours, live.time);
  });
  return (
    <group>
      <pointLight color="#fff1d0" intensity={6.4} distance={260} decay={0.95} />
      <sprite scale={[22, 22, 1]}>
        <spriteMaterial map={pack.glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh scale={1.45}>
        <sphereGeometry args={[sun.radius, 32, 24]} />
        <meshBasicMaterial color="#ffb45a" transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh
        ref={spin}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("sun");
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[sun.radius, 48, 32]} />
        <meshBasicMaterial map={pack.bodies.sun} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[sun.radius * 1.12, sun.radius * 1.18, 64]} />
          <meshBasicMaterial color="#f3e6c0" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showLabels && !selected && <NameLabel text="Sun" y={sun.radius + 1.8} scale={6.4} />}
    </group>
  );
}

function AsteroidBelt() {
  const count = 420;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const n = (a: number, b: number) => {
          let h = Math.imul(i + 1, 374761393) + Math.imul(a, 668265263) + b;
          h = Math.imul(h ^ (h >>> 13), 1274126177);
          return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
        };
        return {
          r: 38.2 + n(1, 2) * 7.8,
          a: n(3, 4) * Math.PI * 2,
          y: (n(5, 6) - 0.5) * 1.15,
          s: 0.035 + n(7, 8) * 0.075,
          inc: (n(9, 10) - 0.5) * 0.1,
          period: 3.8 + n(11, 12) * 2.4,
        };
      }),
    [],
  );
  useFrame(() => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const a = s.a + (live.time / (s.period * SECONDS_PER_YEAR)) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * s.r, s.y + Math.sin(a) * s.inc, Math.sin(a) * s.r);
      dummy.scale.setScalar(s.s);
      dummy.rotation.set(a * 0.7, a, s.inc);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#7a736c" roughness={0.94} />
    </instancedMesh>
  );
}

function Scene({ uiRef }: { uiRef: MutableRefObject<SolarCanvasProps> }) {
  const pack = useMemo(() => createTexturePack(), []);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [view, setView] = useState(() => {
    const ui = readUi(uiRef);
    return { selectedId: ui.selectedId, showLabels: ui.showLabels, showTrails: ui.showTrails };
  });

  useFrame(() => {
    const ui = readUi(uiRef);
    if (
      view.selectedId !== ui.selectedId ||
      view.showLabels !== ui.showLabels ||
      view.showTrails !== ui.showTrails
    ) {
      setView({
        selectedId: ui.selectedId,
        showLabels: ui.showLabels,
        showTrails: ui.showTrails,
      });
    }
  });

  useEffect(() => () => disposeTexturePack(pack), [pack]);

  const select = (id: BodyId) => readUi(uiRef).select(id);

  return (
    <>
      <color attach="background" args={["#050508"]} />
      <fog attach="fog" args={["#050508", 140, 280]} />
      <ambientLight intensity={0.07} />
      <hemisphereLight args={["#2a3144", "#08080c", 0.38]} />
      <Stars radius={180} depth={70} count={6500} factor={2.5} saturation={0} fade speed={0.18} />
      <SimulationClock uiRef={uiRef} />
      <CameraRig controlsRef={controlsRef} uiRef={uiRef} />
      <Sun pack={pack} selected={view.selectedId === "sun"} showLabels={view.showLabels} onSelect={select} />
      <AsteroidBelt />
      {PLANETS.map((body) => (
        <group key={body.id}>
          {view.showTrails && <OrbitPath body={body} />}
          <PlanetBody
            body={body}
            pack={pack}
            selected={view.selectedId === body.id}
            showLabels={view.showLabels}
            onSelect={select}
          />
        </group>
      ))}
      <Moon pack={pack} onSelect={select} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={230}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI - 0.12}
      />
    </>
  );
}

export function SolarCanvas({ uiRef }: { uiRef: MutableRefObject<SolarCanvasProps> }) {
  return (
    <Canvas
      className="h-full w-full touch-none"
      frameloop="always"
      camera={{ position: [0, 34, 82], fov: 42, near: 0.12, far: 420 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
    >
      <Scene uiRef={uiRef} />
    </Canvas>
  );
}
