import { CENTER, NOSE_Z, STRIDE, TUNNEL_END_Z, ZONES, buildCloud, type Cloud, type Vec3 } from './ship';

export interface Scene {
  refit(): void;
  pick(x: number, y: number): number;
  focus(zone: number): void;
  enter(): Promise<void>;
  skip(): void;
  destroy(): void;
}

export interface SceneOptions {
  reduced: boolean;
  frame?: (wide: boolean) => number[] | null;
  onanchor?: (x: number, y: number, alpha: number) => void;
  onzone?: (x: number, y: number) => void;
}

interface Shot {
  view: Float32Array;
  proj: Float32Array;
  eye: Vec3;
  focal: number;
  aspect: number;
  near: number;
  shiftX: number;
  shiftY: number;
  time: number;
  spin: number;
  open: number;
  inside: number;
  reveal: number;
  zone: number;
  glow: number;
}

interface Painter {
  resize(width: number, height: number, ratio: number): void;
  draw(shot: Shot): void;
  dispose(): void;
}

type Rgb = [number, number, number];

const TAU = Math.PI * 2;
const FOV = 0.62;
const FOV_INSIDE = 1.16;
const LIGHT: Vec3 = normalize([-0.52, 0.66, 0.54]);
const SWING = 1.35;
const DIVE = 1.45;
const COVER_LEAD = 0.34;
const DIVE_FROM = NOSE_Z + 4.2;
const DIVE_TO = TUNNEL_END_Z + 2.6;
const LOOK_AHEAD = 4.2;
const SPIN_SPEED = 0.2;
const WIDE = { az: 0.76, el: 0.3, roll: 0, rect: [0.4, 0.07, 1.04, 0.93] };
const TALL = { az: 0.66, el: 0.36, roll: -0.42, rect: [0.05, 0.1, 1.16, 0.6] };
const BIAS = 0.05;

const SOLID_VERTEX = `
attribute vec3 aPos;
uniform mat4 uView;
uniform mat4 uProj;
uniform vec2 uShift;

void main() {
  gl_Position = uProj * uView * vec4(aPos, 1.0);
  gl_Position.xy += uShift * gl_Position.w;
}
`;

const SOLID_FRAGMENT = `
void main() {
  gl_FragColor = vec4(0.0);
}
`;

const VERTEX = `
const float NOSE = ${NOSE_Z.toFixed(1)};
const float BIAS = ${BIAS};
attribute vec3 aPos;
attribute vec3 aNrm;
attribute vec4 aA;
attribute vec4 aB;
uniform mat4 uView;
uniform mat4 uProj;
uniform vec3 uEye;
uniform vec3 uLight;
uniform vec2 uShift;
uniform float uTime;
uniform float uSpin;
uniform float uOpen;
uniform float uInside;
uniform float uReveal;
uniform float uScale;
uniform float uMinPx;
uniform float uMaxPx;
uniform float uZone;
uniform float uGlow;
varying float vAlpha;
varying float vLit;
varying float vAccent;

void main() {
  vec3 p = aPos;
  vec3 n = aNrm;
  float group = aB.z;
  float accent = aB.y;
  float alpha = 1.0;
  float lit = 1.0;
  float px = 1.0;
  float hot = (1.0 - step(0.5, abs(aA.w - uZone))) * uGlow;
  vec4 mv;

  if (aB.x > 0.5) {
    float c = cos(uSpin);
    float s = sin(uSpin);
    p.xy = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    n.xy = vec2(c * n.x - s * n.y, s * n.x + c * n.y);
  }

  if (group > 1.5 && group < 2.5) {
    mv = vec4((uView * vec4(p, 0.0)).xyz, 1.0);
    alpha = aA.z * (0.6 + 0.4 * sin(uTime * (0.5 + aA.y * 1.6) + aA.y * 50.0)) * uReveal * (1.0 - uInside);
    lit = 0.6;
    px = aA.x * uMinPx;
  } else {
    if (group > 2.5) {
      p.xy += vec2(cos(aA.z), sin(aA.z)) * uOpen * 0.66;
      alpha *= 1.0 - smoothstep(0.5, 1.0, uOpen);
    }
    mv = uView * vec4(p, 1.0);
    float depth = max(-mv.z, 0.0001);
    float facing = dot(n, normalize(uEye - p));
    float lam = dot(n, uLight);
    bool inner = group > 0.5 && group < 1.5;
    if (inner || aB.w > 1.5) {
      facing = 1.0;
      lam = 0.1;
    } else if (aB.w > 0.5) {
      facing = abs(facing);
      lam = abs(lam);
    }
    float hl = lam * 0.5 + 0.5;
    lit = clamp(hl * hl + pow(1.0 - clamp(facing, 0.0, 1.0), 3.0) * 0.3, 0.0, 1.0);
    alpha *= smoothstep(-0.05, 0.3, facing);
    float grow = 1.0;
    if (inner) {
      float mask = 1.0;
      if (uEye.z > NOSE) {
        vec2 q = uEye.xy + (p.xy - uEye.xy) * (uEye.z - NOSE) / max(uEye.z - p.z, 0.0001);
        float hole = uOpen * 0.57;
        mask = (1.0 - smoothstep(hole * 0.84, hole, length(q))) * step(0.001, uOpen);
      }
      alpha *= mask * exp(-depth * 0.15);
      lit = 0.5;
    } else {
      float k = clamp((uReveal * 1.35 - (5.0 - aPos.z) / 10.5 - aA.y * 0.12) / 0.16, 0.0, 1.0);
      alpha *= k * mix(0.5, 1.0, lit);
      grow = mix(2.6, 1.0, k);
    }
    if (accent > 1.5) {
      float w = 0.5 + 0.5 * cos(aA.z - uTime * 2.6);
      alpha *= 0.3 + 0.7 * w * w * w;
      lit = 1.0;
    } else if (accent > 0.5) {
      alpha *= 0.72 + 0.28 * sin(uTime * 1.4 + aA.y * 6.2832);
      lit = 1.0;
    }
    alpha *= smoothstep(0.08, 0.8, depth) * (1.0 + 0.5 * hot);
    lit = mix(lit, 1.0, 0.45 * hot);
    px = aA.x * grow * (0.78 + 0.34 * lit) * (1.0 + 0.16 * hot) * uScale / depth;
  }

  float ratio = min(1.0, px / uMinPx);
  gl_PointSize = min(max(px, uMinPx), uMaxPx);
  gl_Position = uProj * mv;
  if (group > 1.5 && group < 2.5) {
    gl_Position.z = 0.9999 * gl_Position.w;
  } else {
    vec4 front = uProj * vec4(mv.xy, mv.z + BIAS, 1.0);
    gl_Position.z = front.z / front.w * gl_Position.w;
  }
  gl_Position.xy += uShift * gl_Position.w;
  vAlpha = alpha * ratio * ratio;
  vLit = lit;
  vAccent = max(step(0.5, accent), 0.62 * hot);
}
`;

const FRAGMENT = `
precision mediump float;
uniform vec3 uLo;
uniform vec3 uHi;
uniform vec3 uAcc;
varying float vAlpha;
varying float vLit;
varying float vAccent;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.36, d) * vAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(mix(uLo, uHi, vLit), uAcc, vAccent);
  gl_FragColor = vec4(col * a, a);
}
`;

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function orbit(az: number, el: number, dist: number): Vec3 {
  return [
    CENTER[0] + Math.sin(az) * Math.cos(el) * dist,
    CENTER[1] + Math.sin(el) * dist,
    CENTER[2] + Math.cos(az) * Math.cos(el) * dist,
  ];
}

function lookAt(out: Float32Array, eye: Vec3, target: Vec3, roll: number) {
  const f = normalize([target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]);
  const r = normalize([-f[2], 0, f[0]]);
  const u: Vec3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  const rx = r[0] * c + u[0] * s;
  const ry = r[1] * c + u[1] * s;
  const rz = r[2] * c + u[2] * s;
  const ux = u[0] * c - r[0] * s;
  const uy = u[1] * c - r[1] * s;
  const uz = u[2] * c - r[2] * s;
  out[0] = rx;
  out[1] = ux;
  out[2] = -f[0];
  out[3] = 0;
  out[4] = ry;
  out[5] = uy;
  out[6] = -f[1];
  out[7] = 0;
  out[8] = rz;
  out[9] = uz;
  out[10] = -f[2];
  out[11] = 0;
  out[12] = -(rx * eye[0] + ry * eye[1] + rz * eye[2]);
  out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
  out[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
  out[15] = 1;
}

function perspective(out: Float32Array, focal: number, aspect: number, near: number, far: number) {
  out.fill(0);
  out[0] = focal / aspect;
  out[5] = focal;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
}

function colour(name: string, fallback: Rgb): Rgb {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!hex) return fallback;
  const v = parseInt(hex[1], 16);
  return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function palette() {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    light,
    bg: colour('--bg', [0, 0, 0]),
    lo: colour(light ? '--faint' : '--dot-2', [0.42, 0.42, 0.45]),
    hi: colour('--fg', [0.96, 0.96, 0.97]),
    acc: colour('--ui', [0.55, 0.42, 1]),
  };
}

function glPainter(canvas: HTMLCanvasElement, cloud: Cloud): Painter | null {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const colours = palette();
  const names = [
    'uView', 'uProj', 'uEye', 'uLight', 'uShift', 'uTime', 'uSpin', 'uOpen', 'uInside',
    'uReveal', 'uScale', 'uMinPx', 'uMaxPx', 'uLo', 'uHi', 'uAcc', 'uZone', 'uGlow',
  ];
  let dots: WebGLProgram | null = null;
  let solid: WebGLProgram | null = null;
  let dotBuffer: WebGLBuffer | null = null;
  let solidBuffer: WebGLBuffer | null = null;
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  let solidUniforms: Record<string, WebGLUniformLocation | null> = {};
  let height = 1;
  let ratio = 1;
  let maxPoint = 64;

  function build(vertex: string, fragment: string, attributes: string[]) {
    const program = gl!.createProgram()!;
    for (const [type, source] of [[gl!.VERTEX_SHADER, vertex], [gl!.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      gl!.attachShader(program, shader);
    }
    attributes.forEach((name, at) => gl!.bindAttribLocation(program, at, name));
    gl!.linkProgram(program);
    return gl!.getProgramParameter(program, gl!.LINK_STATUS) ? program : null;
  }

  function setup() {
    dots = build(VERTEX, FRAGMENT, ['aPos', 'aNrm', 'aA', 'aB']);
    solid = build(SOLID_VERTEX, SOLID_FRAGMENT, ['aPos']);
    if (!dots || !solid) return false;
    dotBuffer = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, dotBuffer);
    gl!.bufferData(gl!.ARRAY_BUFFER, cloud.data, gl!.STATIC_DRAW);
    solidBuffer = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, solidBuffer);
    gl!.bufferData(gl!.ARRAY_BUFFER, cloud.mesh, gl!.STATIC_DRAW);
    uniforms = Object.fromEntries(names.map((name) => [name, gl!.getUniformLocation(dots!, name)]));
    solidUniforms = Object.fromEntries(
      ['uView', 'uProj', 'uShift'].map((name) => [name, gl!.getUniformLocation(solid!, name)]),
    );
    gl!.useProgram(dots);
    gl!.uniform3fv(uniforms.uLight, LIGHT);
    gl!.uniform3fv(uniforms.uLo, colours.lo);
    gl!.uniform3fv(uniforms.uHi, colours.hi);
    gl!.uniform3fv(uniforms.uAcc, colours.acc);
    gl!.blendFunc(gl!.ONE, colours.light ? gl!.ONE_MINUS_SRC_ALPHA : gl!.ONE);
    gl!.depthFunc(gl!.LEQUAL);
    gl!.clearColor(colours.bg[0], colours.bg[1], colours.bg[2], 1);
    const range = gl!.getParameter(gl!.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
    maxPoint = Math.min(range ? range[1] : 64, 160);
    return true;
  }

  if (!setup()) return null;

  const lost = (e: Event) => {
    e.preventDefault();
    dots = null;
  };
  const restored = () => {
    setup();
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);

  return {
    resize(width, h, r) {
      height = h;
      ratio = r;
      canvas.width = Math.max(1, Math.round(width * r));
      canvas.height = Math.max(1, Math.round(h * r));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    draw(shot) {
      if (!dots || !solid) return;
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(solid);
      gl.bindBuffer(gl.ARRAY_BUFFER, solidBuffer);
      gl.enableVertexAttribArray(0);
      for (const at of [1, 2, 3]) gl.disableVertexAttribArray(at);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
      gl.uniformMatrix4fv(solidUniforms.uView, false, shot.view);
      gl.uniformMatrix4fv(solidUniforms.uProj, false, shot.proj);
      gl.uniform2f(solidUniforms.uShift, shot.shiftX, shot.shiftY);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.colorMask(false, false, false, false);
      gl.drawArrays(gl.TRIANGLES, 0, cloud.mesh.length / 3);

      gl.useProgram(dots);
      gl.bindBuffer(gl.ARRAY_BUFFER, dotBuffer);
      const bytes = STRIDE * 4;
      [3, 3, 4, 4].forEach((size, at) => {
        gl.enableVertexAttribArray(at);
        gl.vertexAttribPointer(at, size, gl.FLOAT, false, bytes, [0, 12, 24, 40][at]);
      });
      gl.uniformMatrix4fv(uniforms.uView, false, shot.view);
      gl.uniformMatrix4fv(uniforms.uProj, false, shot.proj);
      gl.uniform3fv(uniforms.uEye, shot.eye);
      gl.uniform2f(uniforms.uShift, shot.shiftX, shot.shiftY);
      gl.uniform1f(uniforms.uTime, shot.time);
      gl.uniform1f(uniforms.uSpin, shot.spin);
      gl.uniform1f(uniforms.uOpen, shot.open);
      gl.uniform1f(uniforms.uInside, shot.inside);
      gl.uniform1f(uniforms.uReveal, shot.reveal);
      gl.uniform1f(uniforms.uScale, (height * ratio * shot.focal) / 2);
      gl.uniform1f(uniforms.uMinPx, 1.7 * ratio);
      gl.uniform1f(uniforms.uMaxPx, maxPoint);
      gl.uniform1f(uniforms.uZone, shot.zone);
      gl.uniform1f(uniforms.uGlow, shot.glow);
      gl.colorMask(true, true, true, true);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.drawArrays(gl.POINTS, 0, cloud.outside);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.POINTS, cloud.outside, cloud.count - cloud.outside);
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

function flatPainter(canvas: HTMLCanvasElement, data: Float32Array, count: number): Painter | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const colours = palette();
  const css = (c: Rgb) => `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
  const shades = Array.from({ length: 12 }, (_, i) =>
    css([0, 1, 2].map((k) => lerp(colours.lo[k], colours.hi[k], i / 11)) as Rgb),
  );
  const accent = css(colours.acc);
  let width = 1;
  let height = 1;
  let ratio = 1;

  return {
    resize(w, h, r) {
      width = w;
      height = h;
      ratio = r;
      canvas.width = Math.max(1, Math.round(w * r));
      canvas.height = Math.max(1, Math.round(h * r));
    },
    draw(shot) {
      const v = shot.view;
      const scale = (height * shot.focal) / 2;
      const cs = Math.cos(shot.spin);
      const sn = Math.sin(shot.spin);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = css(colours.bg);
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < count; i++) {
        const o = i * STRIDE;
        const group = data[o + 12];
        if (group === 1) continue;
        let x = data[o];
        let y = data[o + 1];
        const z = data[o + 2];
        let nx = data[o + 3];
        let ny = data[o + 4];
        const nz = data[o + 5];
        let alpha = 1;
        let lit = 0.6;
        let radius = 0.85;
        let vx: number;
        let vy: number;
        let vz: number;
        if (group === 2) {
          vx = v[0] * x + v[4] * y + v[8] * z;
          vy = v[1] * x + v[5] * y + v[9] * z;
          vz = v[2] * x + v[6] * y + v[10] * z;
          alpha = data[o + 8] * 0.8;
          radius = data[o + 6] * 0.6;
        } else {
          if (data[o + 10] > 0.5) {
            [x, y] = [cs * x - sn * y, sn * x + cs * y];
            [nx, ny] = [cs * nx - sn * ny, sn * nx + cs * ny];
          }
          vx = v[0] * x + v[4] * y + v[8] * z + v[12];
          vy = v[1] * x + v[5] * y + v[9] * z + v[13];
          vz = v[2] * x + v[6] * y + v[10] * z + v[14];
          const ex = shot.eye[0] - x;
          const ey = shot.eye[1] - y;
          const ez = shot.eye[2] - z;
          let facing = (nx * ex + ny * ey + nz * ez) / (Math.hypot(ex, ey, ez) || 1);
          let lam = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
          const side = data[o + 13];
          if (side > 1.5) {
            facing = 1;
            lam = 0.1;
          } else if (side > 0.5) {
            facing = Math.abs(facing);
            lam = Math.abs(lam);
          }
          const hl = lam * 0.5 + 0.5;
          lit = clamp(hl * hl + Math.pow(1 - clamp(facing), 3) * 0.3);
          alpha = smooth(-0.05, 0.3, facing) * lerp(0.4, 1, lit);
          if (data[o + 11] > 0.5) lit = 1;
          radius = Math.max(0.85, (data[o + 6] * (0.72 + 0.5 * lit) * scale) / -vz / 2);
        }
        if (vz >= -0.05 || alpha < 0.02) continue;
        const sx = (((shot.focal / shot.aspect) * vx) / -vz + shot.shiftX + 1) * 0.5 * width;
        const sy = (1 - ((shot.focal * vy) / -vz + shot.shiftY)) * 0.5 * height;
        if (sx < -4 || sy < -4 || sx > width + 4 || sy > height + 4) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = data[o + 11] > 0.5 ? accent : shades[Math.round(lit * 11)];
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, TAU);
        ctx.fill();
      }
    },
    dispose() {},
  };
}

export function createScene(canvas: HTMLCanvasElement, options: SceneOptions): Scene {
  const cloud = buildCloud();
  const live = glPainter(canvas, cloud);
  const painter = live ?? flatPainter(canvas, cloud.data, cloud.count);
  const animated = live !== null && !options.reduced;

  const view = new Float32Array(16);
  const proj = new Float32Array(16);
  const probe = new Float32Array(16);
  let width = 1;
  let height = 1;
  let base = { az: WIDE.az, el: WIDE.el, roll: 0, dist: 20, shiftX: 0, shiftY: 0 };
  let clock = 0;
  let last = 0;
  let raf = 0;
  let entered = -1;
  let from = { az: 0, el: 0, dist: 0 };
  let covered: (() => void) | null = null;
  let pointerX = 0;
  let pointerY = 0;
  let aimX = 0;
  let aimY = 0;
  let stopped = false;
  let zone = 0;
  let lit = -1;
  let glow = 0;
  let cam = { focal: 1, aspect: 1, shiftX: 0, shiftY: 0 };

  function project(p: Vec3) {
    const depth = -(view[2] * p[0] + view[6] * p[1] + view[10] * p[2] + view[14]);
    const nx = ((cam.focal / cam.aspect) * (view[0] * p[0] + view[4] * p[1] + view[8] * p[2] + view[12])) / depth;
    const ny = (cam.focal * (view[1] * p[0] + view[5] * p[1] + view[9] * p[2] + view[13])) / depth;
    return {
      x: (nx + cam.shiftX + 1) * 0.5 * width,
      y: (1 - ny - cam.shiftY) * 0.5 * height,
      unit: depth > 0 ? ((height / 2) * cam.focal) / depth : 0,
    };
  }

  function pick(x: number, y: number) {
    let best = 1;
    let found = 0;
    ZONES.forEach((z, index) => {
      for (const sample of z.samples) {
        const p = project(sample);
        if (p.unit <= 0) continue;
        const score = Math.hypot(p.x - x, p.y - y) / (z.radius * p.unit);
        if (score < best) {
          best = score;
          found = index + 1;
        }
      }
    });
    return found;
  }

  function bounds(dist: number, focal: number, aspect: number) {
    lookAt(probe, orbit(base.az, base.el, dist), CENTER, base.roll);
    const d = cloud.data;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < cloud.solid; i += 3) {
      const o = i * STRIDE;
      const x = d[o];
      const y = d[o + 1];
      const z = d[o + 2];
      const vz = probe[2] * x + probe[6] * y + probe[10] * z + probe[14];
      if (vz > -0.1) continue;
      const px = ((focal / aspect) * (probe[0] * x + probe[4] * y + probe[8] * z + probe[12])) / -vz;
      const py = (focal * (probe[1] * x + probe[5] * y + probe[9] * z + probe[13])) / -vz;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
    return { x0, x1, y0, y1 };
  }

  function fit() {
    const aspect = width / height;
    const focal = 1 / Math.tan(FOV / 2);
    const wide = aspect > 1.05;
    const layout = wide ? WIDE : TALL;
    const [rx0, ry0, rx1, ry1] = options.frame?.(wide) ?? layout.rect;
    base = { az: layout.az, el: layout.el, roll: layout.roll, dist: 22, shiftX: 0, shiftY: 0 };
    for (let i = 0; i < 7; i++) {
      const b = bounds(base.dist, focal, aspect);
      base.dist *= Math.max((b.x1 - b.x0) / ((rx1 - rx0) * 2), (b.y1 - b.y0) / ((ry1 - ry0) * 2));
    }
    const b = bounds(base.dist, focal, aspect);
    base.shiftX = rx0 + rx1 - 1 - (b.x0 + b.x1) / 2;
    base.shiftY = 1 - (ry0 + ry1) - (b.y0 + b.y1) / 2;
  }

  function shot(): Shot {
    const t = clock;
    const aspect = width / height;
    const intro = animated ? easeOut(clamp(t / 2.6)) : 1;
    let az = base.az + (1 - intro) * 0.42;
    let el = base.el + (1 - intro) * 0.08;
    let dist = base.dist * (1 + (1 - intro) * 0.16);
    if (animated) {
      az += Math.sin(t * 0.19) * 0.085 + pointerX * 0.1;
      el += Math.sin(t * 0.15 + 1.3) * 0.04 - pointerY * 0.06;
    }
    let target: Vec3 = CENTER;
    let eye = orbit(az, el, dist);
    let roll = base.roll;
    let fov = FOV;
    let fade = 1;
    let open = 0;
    let inside = 0;

    if (entered >= 0) {
      const e = t - entered;
      const a = easeInOut(clamp(e / SWING));
      eye = orbit(lerp(from.az, 0, a), lerp(from.el, 0, a), lerp(from.dist, DIVE_FROM - CENTER[2], a));
      target = [0, 0, lerp(CENTER[2], NOSE_Z, a)];
      roll = base.roll * (1 - a) - Math.sin(a * Math.PI) * 0.11;
      fade = 1 - a;
      open = easeInOut(clamp((e - 0.7) / 0.85));
      if (e > SWING) {
        const u = clamp((e - SWING) / DIVE);
        const z = lerp(DIVE_FROM, DIVE_TO, u * u * u);
        eye = [0, 0, z];
        target = [0, 0, z - LOOK_AHEAD];
        fov = lerp(FOV, FOV_INSIDE, u * u);
        roll = easeInOut(u) * 0.7;
        inside = smooth(NOSE_Z + 1.2, NOSE_Z - 0.6, z);
      }
    } else {
      from = { az, el, dist };
    }

    const focal = 1 / Math.tan(fov / 2);
    const reach = Math.hypot(eye[0] - CENTER[0], eye[1] - CENTER[1], eye[2] - CENTER[2]);
    const near = Math.max(0.05, reach - 8.5);
    lookAt(view, eye, target, roll);
    perspective(proj, focal, aspect, near, reach + 14);

    cam = { focal, aspect, shiftX: base.shiftX * fade, shiftY: base.shiftY * fade };
    if (entered >= 0) zone = 0;
    if (zone > 0) lit = ZONES[zone - 1].id;
    if (zone > 0 && options.onzone) {
      const p = project(ZONES[zone - 1].anchor);
      options.onzone(p.x, p.y);
    }

    if (options.onanchor) {
      const vz = view[10] * NOSE_Z + view[14];
      const nx = ((focal / aspect) * (view[8] * NOSE_Z + view[12])) / -vz + base.shiftX * fade;
      const ny = (focal * (view[9] * NOSE_Z + view[13])) / -vz + base.shiftY * fade;
      const seen = entered >= 0 ? 0 : smooth(0.75, 1, intro);
      options.onanchor((nx + 1) * 0.5 * width, (1 - ny) * 0.5 * height, seen);
    }

    return {
      view,
      proj,
      eye,
      focal,
      aspect,
      near,
      shiftX: base.shiftX * fade,
      shiftY: base.shiftY * fade,
      time: animated ? t : 0,
      spin: animated ? t * SPIN_SPEED : 0.4,
      open,
      inside,
      reveal: animated ? clamp((t - 0.1) / 1.9) : 1,
      zone: lit,
      glow,
    };
  }

  function paint() {
    painter?.draw(shot());
  }

  function tick(now: number) {
    raf = 0;
    if (stopped) return;
    clock += Math.min(0.05, (now - last) / 1000);
    last = now;
    pointerX += (aimX - pointerX) * 0.045;
    pointerY += (aimY - pointerY) * 0.045;
    glow += ((zone > 0 ? 1 : 0) - glow) * 0.16;
    paint();
    if (entered >= 0) {
      const e = clock - entered;
      if (covered && e >= SWING + DIVE - COVER_LEAD) {
        covered();
        covered = null;
      }
      if (e >= SWING + DIVE + 0.6) return;
    }
    raf = requestAnimationFrame(tick);
  }

  function run() {
    if (!animated || raf || stopped || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  const observer = new ResizeObserver(() => {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    const scale = (window.devicePixelRatio || 1) * (window.visualViewport?.scale ?? 1);
    painter?.resize(width, height, Math.min(scale, 2.5));
    fit();
    paint();
  });
  observer.observe(canvas);

  const onVisible = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      run();
    }
  };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    aimX = (e.clientX / window.innerWidth - 0.5) * 2;
    aimY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pointermove', onPointer, { passive: true });
  run();

  return {
    pick(x, y) {
      return entered >= 0 ? 0 : pick(x, y);
    },
    focus(next) {
      zone = next;
      if (!animated) {
        glow = next > 0 ? 1 : 0;
        paint();
      }
    },
    refit() {
      fit();
      if (!animated) paint();
    },
    enter() {
      if (!animated) return Promise.resolve();
      if (entered >= 0) return Promise.resolve();
      entered = clock;
      run();
      return new Promise((resolve) => (covered = resolve));
    },
    skip() {
      if (entered < 0 || !covered) return;
      entered = clock - (SWING + DIVE - COVER_LEAD);
    },
    destroy() {
      stopped = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointermove', onPointer);
      painter?.dispose();
    },
  };
}
