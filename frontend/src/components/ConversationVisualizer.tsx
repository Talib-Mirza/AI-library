import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

interface Props {
  audioLevel: number; // 0..1
  status: 'idle'|'listening'|'finalizing'|'transcribing'|'thinking'|'speaking';
}

export default function ConversationVisualizer({ audioLevel, status }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);
  const baseNormalsRef = useRef<Float32Array | null>(null);
  const rafRef = useRef<number | null>(null);

  // Animation params controlled by GSAP/state
  const paramsRef = useRef({
    baseAmp: 0.2,
    wobbleFreq: 2.0,
    color: new THREE.Color('#3b82f6'),
    beat: 0,
    rotSpeed: 0.15,
  });
  const beatTlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null as any;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(3, 4, 5);
    scene.add(dir);
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(amb);

    // Torus geometry (moderate resolution for perf)
    const geo = new THREE.TorusGeometry(1.3, 0.4, 64, 256);
    // Material with slight emissive glow
    const mat = new THREE.MeshStandardMaterial({
      color: paramsRef.current.color.clone(),
      metalness: 0.3,
      roughness: 0.35,
      emissive: new THREE.Color('#1f2937'),
      emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Cache base positions/normals for deformation
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    basePositionsRef.current = posAttr.array.slice(0) as Float32Array;
    const normAttr = geo.attributes.normal as THREE.BufferAttribute;
    baseNormalsRef.current = normAttr.array.slice(0) as Float32Array;

    // Subtle initial rotation
    mesh.rotation.x = -0.4;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    meshRef.current = mesh;

    let lastTime = performance.now();
    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Spin
      if (meshRef.current) {
        meshRef.current.rotation.y += paramsRef.current.rotSpeed * dt;
      }

      // Deform geometry based on audio/beat and wobble
      if (meshRef.current) {
        const geo = meshRef.current.geometry as THREE.BufferGeometry;
        const pos = geo.attributes.position as THREE.BufferAttribute;
        const base = basePositionsRef.current!;
        const norms = baseNormalsRef.current!;
        const time = now * 0.001;

        const amp = paramsRef.current.baseAmp + (status === 'listening' || status === 'finalizing' ? audioLevel * 0.6 : 0);
        const beat = paramsRef.current.beat; // 0..1 for speaking
        const totalAmp = amp + (status === 'speaking' ? beat * 0.5 : 0);
        const freq = paramsRef.current.wobbleFreq;

        for (let i = 0; i < pos.count; i++) {
          const i3 = i * 3;
          const bx = base[i3 + 0];
          const by = base[i3 + 1];
          const bz = base[i3 + 2];
          const nx = norms[i3 + 0];
          const ny = norms[i3 + 1];
          const nz = norms[i3 + 2];

          // Wave function on surface
          const ripple = Math.sin(bx * 1.5 + by * 1.2 + bz * 1.1 + time * freq * 2.0) * totalAmp
                       + Math.cos(time * (freq * 1.7) + i * 0.05) * (totalAmp * 0.5);

          pos.array[i3 + 0] = bx + nx * ripple;
          pos.array[i3 + 1] = by + ny * ripple;
          pos.array[i3 + 2] = bz + nz * ripple;
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
      }

      // Color tween is handled by GSAP; just render
      renderer.render(scene, camera);
    };
    render();

    const onResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      if (rendererRef.current) {
        mountRef.current?.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
      meshRef.current = null;
      basePositionsRef.current = null;
      baseNormalsRef.current = null;
      if (beatTlRef.current) { beatTlRef.current.kill(); beatTlRef.current = null; }
    };
  }, []);

  // Respond to status changes with GSAP tweens of params and material color
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;

    // Kill any existing beat timeline when state changes
    if (beatTlRef.current) { beatTlRef.current.kill(); beatTlRef.current = null; }

    if (status === 'listening' || status === 'finalizing') {
      gsap.to(paramsRef.current, { baseAmp: 0.18, wobbleFreq: 2.2, rotSpeed: 0.18, duration: 0.5, ease: 'power2.out' });
      gsap.to(mat.color, { r: 0.235, g: 0.51, b: 0.96, duration: 0.6 }); // blue
      gsap.to(mat.emissive, { r: 0.05, g: 0.09, b: 0.18, duration: 0.6 });
    } else if (status === 'transcribing') {
      gsap.to(paramsRef.current, { baseAmp: 0.24, wobbleFreq: 3.0, rotSpeed: 0.25, duration: 0.5 });
      gsap.to(mat.color, { r: 0.545, g: 0.36, b: 0.96, duration: 0.5 }); // purple
      gsap.to(mat.emissive, { r: 0.10, g: 0.05, b: 0.18, duration: 0.5 });
    } else if (status === 'thinking') {
      gsap.to(paramsRef.current, { baseAmp: 0.12, wobbleFreq: 1.6, rotSpeed: 0.12, duration: 0.6 });
      gsap.to(mat.color, { r: 0.96, g: 0.62, b: 0.18, duration: 0.6 }); // amber
      gsap.to(mat.emissive, { r: 0.15, g: 0.10, b: 0.03, duration: 0.6 });
    } else if (status === 'speaking') {
      gsap.to(paramsRef.current, { baseAmp: 0.22, wobbleFreq: 2.6, rotSpeed: 0.22, duration: 0.4 });
      gsap.to(mat.color, { r: 0.13, g: 0.8, b: 0.47, duration: 0.4 }); // green
      gsap.to(mat.emissive, { r: 0.03, g: 0.18, b: 0.11, duration: 0.4 });
      // Beat pulsing
      const tl = gsap.timeline({ repeat: -1, yoyo: true });
      tl.to(paramsRef.current, { beat: 1.0, duration: 0.25, ease: 'power1.out' });
      tl.to(paramsRef.current, { beat: 0.0, duration: 0.25, ease: 'power1.in' });
      beatTlRef.current = tl;
    } else {
      // idle
      gsap.to(paramsRef.current, { baseAmp: 0.1, wobbleFreq: 1.5, rotSpeed: 0.08, duration: 0.6 });
      gsap.to(mat.color, { r: 0.8, g: 0.8, b: 0.85, duration: 0.6 });
      gsap.to(mat.emissive, { r: 0.05, g: 0.05, b: 0.06, duration: 0.6 });
    }
  }, [status]);

  // Also react subtly to audio level color/emissive in listening mode
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (status === 'listening' || status === 'finalizing') {
      const e = 0.2 + Math.min(0.8, audioLevel) * 0.6;
      gsap.to(mat.emissiveIntensity, { duration: 0.1, value: e });
    }
  }, [audioLevel, status]);

  return (
    <div ref={mountRef} className="w-full h-full" />
  );
} 