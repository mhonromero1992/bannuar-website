/**
 * The hero scene (DESIGN.md section 7): a low town at night seen from a rise.
 * Gold beacons at the gates are guards on duty, travelling lights are patrols, and scrolling the
 * first screen brings the sunrise over the ridge. Everything is drawn in code; nothing here
 * depicts a real place or real numbers.
 *
 * Colours in every shader are display colours (sRGB) written straight to the canvas.
 */
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';

const FOG = /* glsl */ `
  float fogAmount(vec3 world) {
    float d = length(world - cameraPosition);
    return clamp(1.0 - exp(-pow(d * 0.0098, 1.55)), 0.0, 1.0);
  }
`;

function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLOCK = 10; // one street every 10 units
const ROAD = 1.7;

export function startHeroScene(host, opts = {}) {
  const small = window.matchMedia('(max-width: 760px)').matches;
  const still = Boolean(opts.still);
  const rand = random(20261108);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: Boolean(opts.capture) });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  host.appendChild(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x050a14, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.5, 900);

  const uniforms = {
    uTime: { value: 0 },
    uDawn: { value: opts.dawn ?? 0 },
    uSunDir: { value: new Vector3(-0.22, -0.08, -1).normalize() },
    uFog: { value: new Color() },
    uPixel: { value: renderer.getPixelRatio() },
  };

  // ---------------------------------------------------------------- sky, stars, ridge
  const sky = new Mesh(
    new SphereGeometry(600, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vDir = w.xyz - cameraPosition;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uDawn; uniform vec3 uSunDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float sunAmt = max(dot(d, normalize(uSunDir)), 0.0);
          vec3 nightTop = vec3(0.016, 0.035, 0.075);
          vec3 nightHor = vec3(0.075, 0.135, 0.235);
          vec3 dawnTop = vec3(0.13, 0.21, 0.36);
          vec3 dawnHor = vec3(0.96, 0.62, 0.34);
          vec3 dawnAway = vec3(0.52, 0.6, 0.74);
          vec3 hor = mix(nightHor, mix(dawnAway, dawnHor, pow(sunAmt, 2.5)), uDawn);
          vec3 top = mix(nightTop, dawnTop, uDawn);
          vec3 col = mix(hor, top, smoothstep(-0.01, 0.42, d.y));
          col += vec3(1.0, 0.7, 0.36) * pow(sunAmt, 18.0) * 0.85 * uDawn;
          col += vec3(1.0, 0.9, 0.62) * smoothstep(0.99935, 0.99965, sunAmt) * smoothstep(0.05, 0.4, uDawn);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(sky);

  const starCount = small ? 420 : 900;
  const starPos = new Float32Array(starCount * 3);
  const starPhase = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const az = rand() * Math.PI * 2;
    const el = 0.012 + Math.pow(rand(), 1.7) * 0.75; // most stars in the band of sky the camera sees
    starPos[i * 3] = Math.cos(az) * Math.cos(el) * 560;
    starPos[i * 3 + 1] = Math.sin(el) * 560;
    starPos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * 560;
    starPhase[i] = rand();
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new BufferAttribute(starPos, 3));
  starGeo.setAttribute('aPhase', new BufferAttribute(starPhase, 1));
  scene.add(
    new Points(
      starGeo,
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms,
        vertexShader: /* glsl */ `
          attribute float aPhase; uniform float uTime; uniform float uPixel; varying float vA;
          void main() {
            vA = (0.6 + 0.4 * sin(uTime * (0.6 + aPhase) + aPhase * 40.0)) * (0.45 + aPhase * 0.55);
            gl_PointSize = uPixel * (2.0 + aPhase * 2.2);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uDawn; varying float vA;
          void main() {
            float r = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), (1.0 - smoothstep(0.1, 0.5, r)) * vA * clamp(1.0 - uDawn * 1.6, 0.0, 1.0));
          }`,
      }),
    ),
  );

  // the ridge the sun rises behind
  const ridgeSegments = 160;
  const ridgePos = new Float32Array((ridgeSegments + 1) * 2 * 3);
  const ridgeTop = new Float32Array((ridgeSegments + 1) * 2);
  const ridgeIdx = [];
  for (let i = 0; i <= ridgeSegments; i++) {
    const x = -520 + (1040 * i) / ridgeSegments;
    const n = Math.sin(i * 0.21) * 0.5 + Math.sin(i * 0.083 + 1.3) * 0.9 + Math.sin(i * 0.47 + 2.1) * 0.25;
    const h = 14 + n * 9 + rand() * 2.5;
    const z = -330 - Math.cos(i * 0.05) * 18;
    ridgePos.set([x, -2, z, x, h, z], i * 6);
    ridgeTop.set([0, 1], i * 2);
    if (i < ridgeSegments) {
      const a = i * 2;
      ridgeIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const ridgeGeo = new BufferGeometry();
  ridgeGeo.setAttribute('position', new BufferAttribute(ridgePos, 3));
  ridgeGeo.setAttribute('aTop', new BufferAttribute(ridgeTop, 1));
  ridgeGeo.setIndex(ridgeIdx);
  scene.add(
    new Mesh(
      ridgeGeo,
      new ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
          attribute float aTop; varying float vTop; varying vec3 vWorld;
          void main() {
            vTop = aTop;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uDawn; uniform vec3 uFog; varying float vTop; varying vec3 vWorld;
          void main() {
            vec3 col = mix(vec3(0.045, 0.08, 0.14), vec3(0.2, 0.2, 0.27), uDawn);
            col += vec3(1.0, 0.62, 0.3) * pow(vTop, 14.0) * uDawn * 0.55;
            col = mix(col, uFog, 0.35);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    ),
  );

  // ---------------------------------------------------------------- ground and streets
  const ground = new Mesh(
    new PlaneGeometry(1100, 1100),
    new ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uDawn; uniform vec3 uFog; varying vec3 vWorld;
        ${FOG}
        float road(float v) {
          float f = abs(fract(v / ${BLOCK.toFixed(1)} + 0.5) - 0.5) * ${BLOCK.toFixed(1)};
          return 1.0 - smoothstep(${(ROAD / 2).toFixed(2)}, ${(ROAD / 2 + 0.25).toFixed(2)}, f);
        }
        void main() {
          vec3 base = mix(vec3(0.03, 0.055, 0.095), vec3(0.15, 0.155, 0.19), uDawn);
          vec3 asphalt = mix(vec3(0.07, 0.105, 0.16), vec3(0.23, 0.225, 0.255), uDawn);
          float inTown = step(vWorld.z, 14.0) * step(-176.0, vWorld.z) * step(abs(vWorld.x), 96.0);
          float r = max(road(vWorld.x), road(vWorld.z)) * inTown;
          vec3 col = mix(base, asphalt, r);
          vec2 cell = abs(fract(vWorld.xz / ${BLOCK.toFixed(1)} + 0.5) - 0.5) * ${BLOCK.toFixed(1)};
          float lamp = exp(-dot(cell, cell) * 0.32) * (1.0 - uDawn * 0.92) * inTown;
          col += vec3(0.96, 0.66, 0.3) * lamp * 0.5;
          col = mix(col, uFog, fogAmount(vWorld));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ---------------------------------------------------------------- buildings
  const lots = [];
  const xBlocks = small ? 6 : 8;
  for (let bx = -xBlocks; bx < xBlocks; bx++) {
    for (let bz = -17; bz < 1; bz++) {
      const cx = bx * BLOCK + BLOCK / 2;
      const cz = bz * BLOCK + BLOCK / 2;
      const centre = Math.exp(-((cx - 8) ** 2) / 1800 - ((cz + 62) ** 2) / 2600);
      if (rand() < 0.08) continue; // an open lot or a yard
      const split = rand() < 0.55 ? 2 : 1;
      const inner = BLOCK - ROAD - 0.9;
      for (let ix = 0; ix < split; ix++) {
        for (let iz = 0; iz < 2; iz++) {
          if (rand() < 0.12) continue;
          const w = inner / split - 0.5 - rand() * 0.8;
          const d = inner / 2 - 0.5 - rand() * 0.9;
          const h = 1.2 + rand() * 2.2 + centre * (2.5 + rand() * 6.5) + (rand() < 0.04 ? 3.5 : 0);
          const x = cx - inner / 2 + (inner / split) * (ix + 0.5);
          const z = cz - inner / 2 + (inner / 2) * (iz + 0.5);
          // which side of the lot faces a street running towards the viewer (-1 left, 1 right)
          const edge = split === 1 ? (rand() < 0.5 ? -1 : 1) : ix === 0 ? -1 : 1;
          lots.push({ x, z, w: Math.max(1.4, w), d: Math.max(1.4, d), h, edge });
        }
      }
    }
  }
  const boxGeo = new BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const buildings = new InstancedMesh(
    boxGeo,
    new ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        attribute float aSeed; attribute float aLit;
        varying vec3 vWorld; varying vec3 vNormal; varying float vSeed; varying float vLit;
        void main() {
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
          vSeed = aSeed; vLit = aLit;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uDawn; uniform vec3 uFog; uniform vec3 uSunDir;
        varying vec3 vWorld; varying vec3 vNormal; varying float vSeed; varying float vLit;
        ${FOG}
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          vec3 n = normalize(vNormal);
          vec3 col = mix(vec3(0.05, 0.085, 0.14), vec3(0.17, 0.17, 0.22), uDawn);
          float top = step(0.9, n.y);
          col += top * mix(vec3(0.02, 0.03, 0.05), vec3(0.2, 0.14, 0.1), uDawn);
          vec3 sunFlat = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
          col += max(dot(n, sunFlat), 0.0) * uDawn * vec3(0.32, 0.18, 0.08);
          col *= mix(0.82, 1.0, step(0.5, abs(n.z)));
          if (top < 0.5) {
            float u = abs(n.x) > 0.5 ? vWorld.z : vWorld.x;
            vec2 g = vec2(u * 1.3, vWorld.y * 1.1);
            vec2 cell = floor(g); vec2 f = fract(g);
            float win = step(0.24, f.x) * step(f.x, 0.7) * step(0.28, f.y) * step(f.y, 0.74) * step(0.7, vWorld.y);
            float lit = step(hash(cell + vSeed * 91.7), vLit * (1.0 - uDawn * 0.88));
            vec3 warm = mix(vec3(1.0, 0.78, 0.46), vec3(0.72, 0.84, 1.0), step(0.88, hash(cell * 1.7 + vSeed)));
            float near = 1.0 - smoothstep(60.0, 150.0, length(vWorld - cameraPosition));
            col = mix(col, warm, win * lit * mix(0.35, 1.0, near));
            col = mix(col, col * 0.78, win * (1.0 - lit) * near);
          }
          col = mix(col, uFog, fogAmount(vWorld));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
    lots.length,
  );
  const m = new Matrix4();
  const seeds = new Float32Array(lots.length);
  const lit = new Float32Array(lots.length);
  lots.forEach((l, i) => {
    m.makeScale(l.w, l.h, l.d);
    m.setPosition(l.x, 0, l.z);
    buildings.setMatrixAt(i, m);
    seeds[i] = rand();
    lit[i] = 0.03 + rand() * 0.2;
  });
  buildings.geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
  buildings.geometry.setAttribute('aLit', new InstancedBufferAttribute(lit, 1));
  buildings.frustumCulled = false;
  scene.add(buildings);

  // ---------------------------------------------------------------- beacons: guards on duty
  const posts = [];
  // guards stand at the gates on the streets that run towards the viewer, where a raised eye can see them
  for (const l of lots) {
    if (rand() > (small ? 0.3 : 0.36)) continue;
    posts.push(l.x + l.edge * (l.w / 2 + 0.75), 1.5, l.z + (rand() - 0.5) * l.d * 0.7);
  }
  const beaconGeo = new BufferGeometry();
  beaconGeo.setAttribute('position', new BufferAttribute(new Float32Array(posts), 3));
  beaconGeo.setAttribute('aPhase', new BufferAttribute(Float32Array.from({ length: posts.length / 3 }, () => rand()), 1));
  scene.add(
    new Points(
      beaconGeo,
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms,
        vertexShader: /* glsl */ `
          attribute float aPhase; uniform float uTime; uniform float uPixel; varying float vPulse;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vPulse = 0.7 + 0.3 * sin(uTime * 1.6 + aPhase * 6.2831);
            gl_PointSize = uPixel * (1700.0 / -mv.z) * (0.85 + 0.25 * vPulse);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uDawn; varying float vPulse;
          void main() {
            float r = length(gl_PointCoord - 0.5);
            float core = 1.0 - smoothstep(0.06, 0.16, r);
            float halo = exp(-r * r * 22.0) * 0.85 * (1.0 - smoothstep(0.36, 0.5, r));
            float a = clamp(core + halo, 0.0, 1.0) * vPulse * (1.0 - uDawn * 0.35);
            gl_FragColor = vec4(mix(vec3(1.0, 0.76, 0.22), vec3(1.0, 0.95, 0.78), core), a);
          }`,
      }),
    ),
  );

  // ---------------------------------------------------------------- patrols: lights on rounds
  const loops = [];
  const loopCount = small ? 5 : 8;
  for (let i = 0; i < loopCount; i++) {
    const x0 = Math.round((rand() - 0.5) * 2 * (xBlocks - 2)) * BLOCK;
    const z0 = -Math.round(1 + rand() * 13) * BLOCK;
    const wq = (1 + Math.floor(rand() * 3)) * BLOCK;
    const dq = (1 + Math.floor(rand() * 3)) * BLOCK;
    loops.push([
      [x0, z0],
      [x0 + wq, z0],
      [x0 + wq, z0 - dq],
      [x0, z0 - dq],
    ]);
  }
  const pPos = [];
  const pT = [];
  const pOffset = [];
  const pSpeed = [];
  loops.forEach((corners, li) => {
    const perim = corners.reduce((sum, c, i) => {
      const n = corners[(i + 1) % 4];
      return sum + Math.hypot(n[0] - c[0], n[1] - c[1]);
    }, 0);
    const offset = rand();
    const speed = (0.035 + rand() * 0.03) * (rand() < 0.5 ? 1 : -1);
    let run = 0;
    corners.forEach((c, i) => {
      const n = corners[(i + 1) % 4];
      const len = Math.hypot(n[0] - c[0], n[1] - c[1]);
      const steps = Math.ceil(len * 2.6);
      for (let s = 0; s < steps; s++) {
        const k = s / steps;
        pPos.push(c[0] + (n[0] - c[0]) * k, 0.6, c[1] + (n[1] - c[1]) * k);
        pT.push((run + len * k) / perim);
        pOffset.push(offset);
        pSpeed.push(speed);
      }
      run += len;
    });
    void li;
  });
  const patrolGeo = new BufferGeometry();
  patrolGeo.setAttribute('position', new BufferAttribute(new Float32Array(pPos), 3));
  patrolGeo.setAttribute('aT', new BufferAttribute(new Float32Array(pT), 1));
  patrolGeo.setAttribute('aOffset', new BufferAttribute(new Float32Array(pOffset), 1));
  patrolGeo.setAttribute('aSpeed', new BufferAttribute(new Float32Array(pSpeed), 1));
  scene.add(
    new Points(
      patrolGeo,
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms,
        vertexShader: /* glsl */ `
          attribute float aT; attribute float aOffset; attribute float aSpeed;
          uniform float uTime; uniform float uPixel; varying float vA;
          void main() {
            float head = fract(uTime * aSpeed + aOffset);
            float behind = aSpeed > 0.0 ? fract(head - aT) : fract(aT - head);
            vA = 1.0 - smoothstep(0.0, 0.14, behind);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uPixel * (720.0 / -mv.z) * (0.35 + vA * 1.15);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uDawn; varying float vA;
          void main() {
            float r = length(gl_PointCoord - 0.5);
            float s = exp(-r * r * 26.0) * (1.0 - smoothstep(0.4, 0.5, r));
            gl_FragColor = vec4(vec3(1.0, 0.86, 0.5), s * vA * (1.0 - uDawn * 0.4));
          }`,
      }),
    ),
  );

  // ---------------------------------------------------------------- framing, input, loop
  const base = { x: 0, y: 21, z: 50 };
  const look = new Vector3(0, 1, -40);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 1;
  let height = 1;

  function frame() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    if (aspect < 0.9) {
      // phones: wider lens, horizon in the upper third, the town above the text
      camera.fov = 52;
      base.y = 30; base.z = 66;
      look.set(0, -6, -46);
      camera.setViewOffset(width, height, 0, height * 0.1, width, height);
    } else if (aspect < 1.3) {
      camera.fov = 40;
      base.y = 24; base.z = 58;
      look.set(4, 0, -42);
      camera.setViewOffset(width, height, -width * 0.06, 0, width, height);
    } else {
      camera.fov = 32;
      base.y = 21; base.z = 50;
      look.set(0, 1, -40);
      camera.setViewOffset(width, height, -width * 0.17, 0, width, height);
    }
    camera.updateProjectionMatrix();
  }

  const onPointer = (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!still && !small) window.addEventListener('pointermove', onPointer, { passive: true });

  const dawnFromScroll = () => {
    const h = (opts.observe ?? host).getBoundingClientRect().height || window.innerHeight;
    return Math.min(1, Math.max(0, window.scrollY / (h * 0.82)));
  };
  let dawn = opts.dawn ?? dawnFromScroll();
  const nightFog = new Color(0.075, 0.135, 0.235);
  const dawnFog = new Color(0.62, 0.55, 0.52);

  function update(t) {
    uniforms.uTime.value = t;
    if (!still) dawn += (dawnFromScroll() - dawn) * 0.07;
    uniforms.uDawn.value = dawn;
    const elevation = -0.09 + dawn * 0.2;
    uniforms.uSunDir.value.set(-0.24, Math.sin(elevation), -1).normalize();
    uniforms.uFog.value.copy(nightFog).lerp(dawnFog, dawn);
    renderer.setClearColor(uniforms.uFog.value, 1);
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    camera.position.set(
      base.x + Math.sin(t * 0.045) * 3.2 + pointer.x * 2.6,
      base.y - pointer.y * 1.4 + Math.sin(t * 0.07) * 0.4,
      base.z,
    );
    camera.lookAt(look);
    sky.position.copy(camera.position);
  }

  frame();
  const ro = new ResizeObserver(frame);
  ro.observe(host);

  let running = !still;
  let paused = false;
  let visible = true;
  let raf = 0;
  const startTime = performance.now();
  let pausedAt = 0;
  let pausedTotal = 0;

  const tick = (now) => {
    raf = 0;
    if (!running || paused || !visible || document.hidden) return;
    update((now - startTime - pausedTotal) / 1000 + (opts.timeOffset ?? 8));
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!raf && running && !paused && visible && !document.hidden) raf = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    kick();
  });
  io.observe(opts.observe ?? host);
  document.addEventListener('visibilitychange', kick);

  // first frame right away, so the poster can hand over
  update(opts.timeOffset ?? 8);
  renderer.render(scene, camera);

  if (running) kick();

  return {
    canvas,
    setPaused(value) {
      if (value === paused) return;
      paused = value;
      if (paused) pausedAt = performance.now();
      else {
        pausedTotal += performance.now() - pausedAt;
        kick();
      }
    },
    renderStill() {
      update(opts.timeOffset ?? 8);
      renderer.render(scene, camera);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', kick);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
