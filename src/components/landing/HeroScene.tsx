"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { PastaPlate } from "./PastaPlate";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { paintBack, paintDots, paintFront, type StickerArt } from "./stickerArt";

/* ---------- geometry: a die-cut sticker = thick white border + printed faces ---------- */

const SW = 1.6; // sticker width (world units)
const SH = 2.0;
const BORDER = 0.075;
const DEPTH = 0.035;

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry with UVs remapped to 0..1 so a canvas texture fills the face. */
function faceGeometry(w: number, h: number, r: number): THREE.ShapeGeometry {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 12);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function useStickerGeometry() {
  return useMemo(() => {
    const border = new THREE.ExtrudeGeometry(roundedRect(SW, SH, 0.24), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 12,
    });
    border.translate(0, 0, -DEPTH / 2);
    const face = faceGeometry(SW - BORDER * 2, SH - BORDER * 2, 0.17);
    return { border, face };
  }, []);
}

function texture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const FACE_Z = DEPTH / 2 + 0.014;

function Sticker({ front, back, scale = 1 }: { front: THREE.Texture; back?: THREE.Texture; scale?: number }) {
  const { border, face } = useStickerGeometry();
  return (
    <group scale={scale}>
      <mesh geometry={border} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.45} />
      </mesh>
      <mesh geometry={face} position={[0, 0, FACE_Z]}>
        <meshStandardMaterial map={front} roughness={0.7} />
      </mesh>
      <mesh geometry={face} position={[0, 0, -FACE_Z]} rotation={[0, Math.PI, 0]}>
        {back ? <meshStandardMaterial map={back} roughness={0.7} /> : <meshStandardMaterial color="#F1EADB" roughness={0.8} />}
      </mesh>
    </group>
  );
}

/* ---------- the scene ---------- */

const CLOUD: { art: StickerArt; pos: [number, number, number]; rot: [number, number, number]; scale: number }[] = [
  { art: { kind: "dish", title: "Smash Burger", menu: "$18.00", home: "$3.25", bg: "#FFB199", food: "burger", foodColor: "#6D3B1E" }, pos: [-1.9, 1.9, -2], rot: [0.1, 0.3, -0.2], scale: 0.65 },
  { art: { kind: "mystery", title: "Mystery Box", line: "Your ingredients. Your recipe." }, pos: [1.8, 2.1, -2], rot: [-0.1, -0.3, 0.17], scale: 0.62 },
];

function HeroSticker({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const flipped = useRef(false);
  const { front, back } = useMemo(
    () => ({
      front: texture(
        paintFront({ kind: "dish", title: "Cacio e Pepe", menu: "$25.00", home: "$1.68", bg: "#FFD54A", food: "noodles", foodColor: "#E9A93A" }),
      ),
      back: texture(
        paintBack(
          "Cacio e Pepe",
          [
            ["770", "kcal per serving"],
            ["31 g", "protein"],
            ["$1.68", "home cost"],
            ["20 min", "start to finish"],
          ],
          "$23.32 kept per plate",
        ),
      ),
    }),
    [],
  );

  // Flip every few seconds: the product's core moment.
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => (flipped.current = !flipped.current), 3600);
    return () => clearInterval(t);
  }, [reduced]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g || reduced) return;
    const target = (flipped.current ? Math.PI : 0) + Math.sin(state.clock.elapsedTime * 0.6) * 0.12;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target, 4, dt);
    g.rotation.z = -0.06 + Math.sin(state.clock.elapsedTime * 0.8) * 0.02;
    g.position.y = -0.9 + Math.sin(state.clock.elapsedTime * 0.9) * 0.08;
  });

  return (
    <group ref={group} position={[1.15, -0.9, 1.1]} rotation={[0, -0.15, -0.06]}>
      <Sticker front={front} back={back} scale={1.05} />
    </group>
  );
}

function Cloud({ reduced }: { reduced: boolean }) {
  const textures = useMemo(() => CLOUD.map((s) => texture(paintFront(s.art))), []);
  return (
    <>
      {CLOUD.map((s, i) => (
        <Float key={i} speed={reduced ? 0 : 1 + (i % 3) * 0.35} rotationIntensity={reduced ? 0 : 0.5} floatIntensity={reduced ? 0 : 0.8}>
          <group position={s.pos} rotation={s.rot}>
            <Sticker front={textures[i]} scale={s.scale} />
          </group>
        </Float>
      ))}
    </>
  );
}

/** Coral, butter and white "sprinkles" drifting around the stickers. */
function Sprinkles({ count, reduced, minX }: { count: number; reduced: boolean; minX: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const colors = ["#FF5A36", "#FFD54A", "#FFFFFF", "#9FE3C4"];
    return Array.from({ length: count }, (_, i) => ({
      p: new THREE.Vector3(minX + Math.random() * (5.5 - minX), (Math.random() - 0.5) * 7, -Math.random() * 5 + 1),
      r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      s: 0.6 + Math.random() * 0.8,
      speed: 0.2 + Math.random() * 0.6,
      color: new THREE.Color(colors[i % colors.length]),
    }));
  }, [count, minX]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    data.forEach((d, i) => mesh.current?.setColorAt(i, d.color));
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [data]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = reduced ? 0 : state.clock.elapsedTime;
    data.forEach((d, i) => {
      dummy.position.set(d.p.x, d.p.y + Math.sin(t * d.speed + i) * 0.25, d.p.z);
      dummy.rotation.set(d.r.x + t * d.speed, d.r.y + t * d.speed * 0.7, d.r.z);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <capsuleGeometry args={[0.03, 0.14, 4, 8]} />
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
}

function Board() {
  const { map, alpha } = useMemo(() => {
    const t = texture(paintDots());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(40, 40);
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#000"); // far edge: transparent
    g.addColorStop(0.55, "#000");
    g.addColorStop(0.8, "#777");
    g.addColorStop(1, "#fff"); // near edge: opaque
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const a = new THREE.CanvasTexture(c);
    return { map: t, alpha: a };
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2.35, 0, 0]} position={[0, -3.4, -4]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial map={map} alphaMap={alpha} transparent depthWrite={false} roughness={1} />
    </mesh>
  );
}

/** Tilts the whole rig toward the pointer and drifts it as the page scrolls. */
function Rig({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const scroll = useRef(0);
  useEffect(() => {
    const onScroll = () => (scroll.current = Math.min(1.5, window.scrollY / window.innerHeight));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g || reduced) return;
    const px = reduced ? 0 : state.pointer.x;
    const py = reduced ? 0 : state.pointer.y;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, px * 0.25, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -py * 0.15 + scroll.current * 0.35, 3, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, scroll.current * 0.4, 4, dt);
  });
  return <group ref={group}>{children}</group>;
}

function Responsive({ onLayout }: { onLayout: (narrow: boolean) => void }) {
  // Pull the camera back on narrow screens so the sticker cloud still fits.
  const { camera, size } = useThree();
  useEffect(() => {
    const narrow = size.width < 768;
    camera.position.set(0, 0.2, size.width / size.height < 0.8 ? 12 : 9.5);
    camera.lookAt(0, 0.2, 0);
    onLayout(narrow);
  }, [camera, size.width, size.height, onLayout]);
  return null;
}

export default function HeroScene({ onReady, reduced, active }: { onReady?: () => void; reduced: boolean; active: boolean }) {
  const [small, setSmall] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    setSmall(window.innerWidth < 768);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 42, position: [0, 0.2, 9] }}
      gl={{ antialias: true, alpha: true }}
      frameloop={reduced || !active ? "demand" : "always"}
      onCreated={() => onReady?.()}
    >
      <fog attach="fog" args={["#12201B", 9, 18]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fff0d3", "#203b30", 1.5]} />
      <directionalLight position={[3, 5, 6]} intensity={2.4} />
      <pointLight position={[-4, -2, 3]} intensity={18} color="#FF5A36" distance={12} />
      <pointLight position={[4, 3, 2]} intensity={14} color="#FFD54A" distance={12} />
      <Responsive onLayout={setNarrow} />
      <Rig reduced={reduced}>
        <group position={[0, 0.1, 0]} scale={narrow ? 0.95 : 1}>
          <PastaPlate reduced={reduced} />
          <HeroSticker reduced={reduced} />
          <Cloud reduced={reduced} />
          <Sprinkles count={small ? 12 : 24} reduced={reduced} minX={-3} />
        </group>
        <Board />
      </Rig>
    </Canvas>
  );
}
