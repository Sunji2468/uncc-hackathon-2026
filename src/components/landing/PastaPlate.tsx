"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** A small, fully procedural food sculpture: no models or remote textures to load. */
export function PastaPlate({ reduced }: { reduced: boolean }) {
  const dish = useRef<THREE.Group>(null);
  const garnish = useRef<THREE.Group>(null);
  const noodles = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const points = Array.from({ length: 65 }, (_, j) => {
      const t = j / 64 * Math.PI * (2.4 + (i % 3) * 0.4);
      const radius = 0.32 + (i % 7) * 0.085;
      return new THREE.Vector3(
        Math.cos(t + i * 2.4) * radius + Math.sin(i * 3) * 0.12,
        0.15 + i * 0.012 + Math.sin(t * 2 + i) * 0.06,
        Math.sin(t + i * 2.4) * radius * 0.82,
      );
    });
    return new THREE.CatmullRomCurve3(points);
  }), []);

  useFrame(({ clock }, dt) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    if (dish.current) {
      dish.current.rotation.y = Math.sin(t * 0.23) * 0.16;
      dish.current.position.y = Math.sin(t * 0.65) * 0.09;
    }
    if (garnish.current) garnish.current.rotation.y += Math.min(dt, 0.05) * 0.12;
  });

  return (
    <group position={[-0.65, 0.3, 0]} rotation={[0.85, 0, -0.18]} scale={1.45}>
      <group ref={dish}>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[1.36, 1.1, 0.17, 64]} />
          <meshPhysicalMaterial color="#fff8e7" roughness={0.22} clearcoat={0.8} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.15, 0.18, 16, 80]} />
          <meshPhysicalMaterial color="#fffdf5" roughness={0.18} clearcoat={1} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
          <torusGeometry args={[1.21, 0.015, 8, 80]} />
          <meshStandardMaterial color="#d6ae52" metalness={0.65} roughness={0.3} />
        </mesh>
        {noodles.map((curve, i) => (
          <mesh key={i}>
            <tubeGeometry args={[curve, 64, 0.035, 6, false]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#efc36f" : "#f7d894"} roughness={0.48} />
          </mesh>
        ))}
        {Array.from({ length: 36 }, (_, i) => (
          <mesh key={i} position={[Math.cos(i * 2.4) * (0.2 + i % 5 * 0.13), 0.44 + Math.sin(i) * 0.07, Math.sin(i * 2.4) * (0.2 + i % 5 * 0.11)]} rotation={[i, i * 2, 0]}>
            <icosahedronGeometry args={[i % 3 ? 0.018 : 0.028, 0]} />
            <meshStandardMaterial color={i % 3 ? "#342619" : "#fff4c6"} roughness={0.9} />
          </mesh>
        ))}
      </group>
      <group ref={garnish}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} position={[Math.cos(i * 2.4) * 1.6, 0.45 + (i % 3) * 0.35, Math.sin(i * 2.4) * 1.5]} rotation={[i * 0.8, i, i * 0.3]}>
            <mesh scale={[0.11, 0.025, 0.23]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color={i % 2 ? "#86b66a" : "#416e3c"} roughness={0.55} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.005, 0.005, 0.38, 5]} />
              <meshStandardMaterial color="#c2d48b" />
            </mesh>
          </group>
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[Math.cos(i * 2.3) * 1.55, 0.2 + (i % 4) * 0.27, Math.sin(i * 2.3) * 1.55]} rotation={[i, i * 2, i]}>
            <boxGeometry args={[0.12, 0.018, 0.18]} />
            <meshStandardMaterial color="#fff1be" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
