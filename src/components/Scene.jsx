import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCallback, useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useStore, selectPrimary } from "../store";
import MaterialSample from "./MaterialSample";
import BoneParticles from "./BoneParticles";
import { useInstrument } from "../store/instrument";

// Layers are alternative materials, not distinct renderer states. Show the selected one.
function MaterialObject() {
  const layer = useStore(selectPrimary);
  const mouse = useStore((s) => s.mouse);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.6, 64), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <MaterialSample
        key={layer.id}
        layer={layer}
        geometry={geometry}
        position={[0, 0, 0]}
        scale={1}
        dim={1}
        mouse={mouse}
      />
      <BoneParticles />
    </>
  );
}

function FrameReadout() {
  const meter = useRef({ start: 0, frames: 0 });
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    meter.current.frames++;
    if (now - meter.current.start >= 1) {
      useInstrument
        .getState()
        .setFps(Math.round(meter.current.frames / (now - meter.current.start)));
      meter.current = { start: now, frames: 0 };
    }
  });
  return null;
}

export default function Scene() {
  const setMouse = useStore((s) => s.setMouse);

  const handleMouseMove = useCallback(
    (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      setMouse([
        ((e.clientX - r.left) / r.width) * 2 - 1,
        ((e.clientY - r.top) / r.height) * -2 + 1,
      ]);
    },
    [setMouse],
  );

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      onMouseMove={handleMouseMove}
    >
      <Canvas
        camera={{ position: [0, 0, 7.2], fov: 36 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.05} />
        <MaterialObject />
        <FrameReadout />
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          rotateSpeed={0.4}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
