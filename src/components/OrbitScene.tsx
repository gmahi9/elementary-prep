import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';
import type { GradeNumber } from '../types';
import { prefersReducedMotion, type OrbitGrade } from '../lib/orbit';

interface Props {
  grades: OrbitGrade[];
  selected: GradeNumber;
  onPick: (grade: GradeNumber) => void;
  onReady: () => void;
}

function drawFace() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#ffc56a';
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9a4a';
  ctx.beginPath();
  ctx.arc(86, 146, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(170, 146, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2430';
  ctx.beginPath();
  ctx.arc(104, 116, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(152, 116, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c2430';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(128, 132, 42, 0.28, Math.PI - 0.28);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function glyphTexture(text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#142033';
  ctx.font = '800 78px "Outfit Variable", "Avenir Next", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function Sky({ still }: { still: boolean }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vPos;
      uniform float uTime;
      void main() {
        vec3 n = normalize(vPos);
        float drift = uTime * 0.08;
        float sky = smoothstep(-0.35, 0.9, n.y + sin(n.x * 2.0 + drift) * 0.12);
        float warm = smoothstep(0.15, 1.0, sin(n.x * 1.3 - drift) * cos(n.z * 1.15));
        vec3 deep = vec3(0.03, 0.07, 0.13);
        vec3 blue = vec3(0.15, 0.40, 0.66);
        vec3 peach = vec3(0.98, 0.58, 0.28);
        vec3 col = mix(deep, blue, sky);
        col = mix(col, peach, warm * 0.22);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, delta) => {
    if (!still) material.uniforms.uTime.value += delta;
  });
  return (
    <mesh frustumCulled={false} material={material}>
      <sphereGeometry args={[28, 28, 20]} />
    </mesh>
  );
}

function Starfield() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(140 * 3);
    for (let index = 0; index < 140; index += 1) {
      const radius = 8 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(theta) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.45) * 6;
      positions[index * 3 + 2] = Math.sin(theta) * radius;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#fffaf6" size={0.045} sizeAttenuation transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

function Sunny({ still }: { still: boolean }) {
  const texture = useMemo(() => drawFace(), []);
  useEffect(() => () => texture?.dispose(), [texture]);
  const spin = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!still && spin.current) spin.current.rotation.y += delta * 0.15;
  });
  return (
    <group ref={spin}>
      <mesh>
        <sphereGeometry args={[0.58, 32, 32]} />
        <meshStandardMaterial color="#ffc56a" emissive="#ff9a3c" emissiveIntensity={0.55} roughness={0.42} metalness={0.04} />
      </mesh>
      <mesh rotation={[Math.PI / 2.35, 0.2, 0]}>
        <torusGeometry args={[0.86, 0.028, 12, 48]} />
        <meshBasicMaterial color="#9fd4f5" transparent opacity={0.85} />
      </mesh>
      {texture && (
        <sprite position={[0, 0.02, 0.35]} scale={[0.72, 0.72, 1]} renderOrder={2}>
          <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}

function Planet({
  planet,
  index,
  total,
  selected,
  still,
  hover,
  tick,
  onPick,
}: {
  planet: OrbitGrade;
  index: number;
  total: number;
  selected: boolean;
  still: boolean;
  hover: MutableRefObject<boolean>;
  tick: number;
  onPick: (grade: GradeNumber) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const moons = useRef<THREE.Group>(null);
  const angle = useRef((index / total) * Math.PI * 2);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const radius = 1.42 + index * 0.4;
  const speed = 0.22 - index * 0.025;
  const body = index === 0 ? 0.38 : 0.31;
  const mastery = planet.mastery / 100;
  const texture = useMemo(() => glyphTexture(planet.label), [planet.label, tick]);
  useEffect(() => () => texture?.dispose(), [texture]);
  useEffect(() => () => { gl.domElement.style.cursor = ''; }, [gl]);

  const place = (turn: number) => {
    const node = group.current;
    if (!node) return;
    node.position.x = Math.cos(turn) * radius;
    node.position.z = Math.sin(turn) * radius * 0.76;
    node.position.y = Math.sin(turn * 2) * 0.1;
    const target = selected ? 1.34 : 1;
    if (still) node.scale.setScalar(target);
    else {
      const next = node.scale.x + (target - node.scale.x) * 0.14;
      node.scale.setScalar(next);
    }
  };

  useLayoutEffect(() => {
    place(angle.current);
    invalidate();
  }, [selected, still, invalidate]);

  useFrame((_, delta) => {
    if (!still && !hover.current) angle.current += delta * speed;
    place(angle.current);
    if (moons.current && !still) moons.current.rotation.y += delta * 0.45;
  });

  return (
    <group
      ref={group}
      onClick={(event) => {
        event.stopPropagation();
        onPick(planet.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        hover.current = true;
        gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        hover.current = false;
        gl.domElement.style.cursor = '';
      }}
    >
      <mesh>
        <sphereGeometry args={[body, 28, 28]} />
        <meshStandardMaterial
          color={planet.color}
          emissive={planet.emissive}
          emissiveIntensity={selected ? 0.9 : 0.2}
          roughness={0.38}
          metalness={0.08}
        />
      </mesh>
      <mesh scale={1.65}>
        <sphereGeometry args={[body, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[body * 1.62, 0.012, 8, 40]} />
        <meshBasicMaterial color="#fffaf6" transparent opacity={0.28} />
      </mesh>
      {mastery > 0 && (
        <mesh rotation={[Math.PI / 2.2, 0.6, 0]}>
          <torusGeometry args={[body * 1.62, 0.028, 8, 36, Math.max(0.2, mastery * Math.PI * 2)]} />
          <meshBasicMaterial color={planet.color} />
        </mesh>
      )}
      <group ref={moons}>
        {Array.from({ length: planet.moons }, (_, moon) => {
          const turn = (moon / Math.max(planet.moons, 1)) * Math.PI * 2;
          const orbit = body + 0.34;
          return (
            <mesh key={moon} position={[Math.cos(turn) * orbit, 0.05, Math.sin(turn) * orbit]}>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color="#ffe7b8" emissive="#ffb15a" emissiveIntensity={1.1} roughness={0.35} />
            </mesh>
          );
        })}
      </group>
      {texture && (
        <sprite position={[0, 0.02, body * 0.35]} scale={[body * 0.95, body * 0.95, 1]} renderOrder={3}>
          <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}

function System({ grades, selected, onPick, still }: Omit<Props, 'onReady'> & { still: boolean }) {
  const hover = useRef(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancel = false;
    void document.fonts?.ready.then(() => {
      if (!cancel) setTick(1);
    });
    return () => { cancel = true; };
  }, []);
  return (
    <>
      <Sky still={still} />
      <Starfield />
      <hemisphereLight args={['#d5e8f8', '#e39455', 0.9]} />
      <ambientLight intensity={0.35} color="#f4efe6" />
      <pointLight position={[0, 0.2, 0]} intensity={28} distance={18} decay={2} color="#ffc56a" />
      <directionalLight position={[4.5, 6, 3]} intensity={1.35} color="#fffaf6" />
      <Sunny still={still} />
      {grades.map((planet, index) => (
        <Planet
          key={planet.id}
          planet={planet}
          index={index}
          total={grades.length}
          selected={planet.id === selected}
          still={still}
          hover={hover}
          tick={tick}
          onPick={onPick}
        />
      ))}
    </>
  );
}

export default function OrbitScene({ grades, selected, onPick, onReady }: Props) {
  const reduce = useReducedMotion();
  const still = reduce === true || (reduce == null && prefersReducedMotion());
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 800px)').matches;
  return (
    <Canvas
      className="orbit-canvas"
      camera={{ position: [0, 6.2, 7.2], fov: 36, near: 0.1, far: 80 }}
      dpr={narrow ? 1 : [1, 1.4]}
      frameloop={still ? 'demand' : 'always'}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 0.1, 0);
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        onReady();
      }}
    >
      <System grades={grades} selected={selected} onPick={onPick} still={still} />
    </Canvas>
  );
}
