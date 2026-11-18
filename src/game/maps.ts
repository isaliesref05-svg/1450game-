import { MapId } from './types';

export const ARENA_W = 1280;
export const ARENA_H = 720;

export type ArenaPropKind =
  | 'ground'
  | 'car'
  | 'bus'
  | 'crate'
  | 'overpass'
  | 'container'
  | 'catwalk'
  | 'subway'
  | 'concrete'
  | 'stone'
  | 'timber'
  | 'pod'
  | 'helicopter'
  | 'hvac';

export interface PlatformVisualMeta {
  kind: ArenaPropKind;
  color?: string;
}

export interface MovingPlatformDef {
  x: number;
  y: number;
  w: number;
  h: number;
  dx: number;
  dy: number;
  speed: number;
  phase?: number;
}

export interface PillarDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IceDef {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
}

export interface PortalDef {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  color: string;
}

export interface LaserGateDef {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  period: number;
  offset: number;
  activeLen: number;
  warnLen: number;
}

export interface PendulumDef {
  px: number;
  py: number;
  len: number;
  amp: number;
  speed: number;
  phase: number;
  radius: number;
}

export interface BumperDef {
  x: number;
  y: number;
  r: number;
  power: number;
  color: string;
}

export interface LiftZoneDef {
  x: number;
  y: number;
  w: number;
  h: number;
  force?: number;
  color?: string;
}

export interface ArenaMapDef {
  id: Exclude<MapId, 'random'>;
  name: string;
  style: 'city' | 'harbor' | 'subway' | 'fortress' | 'bridge' | 'lab' | 'rooftop';
  pl: [number, number, number, number][];
  plMeta: PlatformVisualMeta[];
  sp: [number, number][];
  g?: number;
  js?: number;
  fr?: number;
  walls?: boolean;
  bounceWalls?: boolean;
  lava?: boolean;
  chasm?: boolean;
  belts?: [number, number][];
  pads?: [number, number, number][];
  moving?: MovingPlatformDef[];
  pillars?: PillarDef[];
  ice?: IceDef[];
  portals?: PortalDef[];
  lasers?: LaserGateDef[];
  pendulums?: PendulumDef[];
  bumpers?: BumperDef[];
  lifts?: LiftZoneDef[];
}

export const ARENA_MAPS: Record<Exclude<MapId, 'random'>, ArenaMapDef> = {
  abandoned_city: {
    id: 'abandoned_city',
    name: 'Tərk Edilmiş Şəhər',
    style: 'city',
    walls: true,
    pl: [
      [0, 628, 1280, 92],
      [96, 560, 152, 68],
      [300, 574, 58, 54],
      [895, 526, 240, 102],
      [40, 428, 290, 26],
      [445, 448, 390, 26],
      [950, 405, 290, 26],
      [525, 312, 230, 24],
    ],
    plMeta: [
      { kind: 'ground' },
      { kind: 'car', color: '#4d5d4e' },
      { kind: 'crate' },
      { kind: 'bus', color: '#85642d' },
      { kind: 'overpass' },
      { kind: 'overpass' },
      { kind: 'overpass' },
      { kind: 'overpass' },
    ],
    sp: [
      [4, 0.45],
      [6, 0.55],
      [5, 0.28],
      [5, 0.72],
    ],
  },

  harbor_docks: {
    id: 'harbor_docks',
    name: 'Gecə Limanı',
    style: 'harbor',
    walls: true,
    pl: [
      [0, 628, 1280, 92],
      [85, 532, 230, 96],
      [345, 574, 58, 54],
      [945, 532, 245, 96],
      [1000, 444, 190, 88],
      [120, 405, 255, 24],
      [455, 456, 370, 24],
      [510, 322, 260, 24],
    ],
    plMeta: [
      { kind: 'ground' },
      { kind: 'container', color: '#7f1d1d' },
      { kind: 'crate' },
      { kind: 'container', color: '#1e3a5f' },
      { kind: 'container', color: '#3f6212' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
    ],
    sp: [
      [5, 0.5],
      [4, 0.5],
      [6, 0.3],
      [6, 0.7],
    ],
    pads: [
      [445, 628, 70],
      [865, 628, 70],
    ],
  },

  subway_ruins: {
    id: 'subway_ruins',
    name: 'Yeraltı Metro',
    style: 'subway',
    walls: true,
    pl: [
      [0, 628, 1280, 92],
      [415, 512, 450, 116],
      [70, 518, 145, 110],
      [1065, 518, 145, 110],
      [190, 396, 250, 24],
      [840, 396, 250, 24],
      [505, 282, 270, 24],
    ],
    plMeta: [
      { kind: 'ground' },
      { kind: 'subway' },
      { kind: 'concrete' },
      { kind: 'concrete' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
    ],
    sp: [
      [4, 0.45],
      [5, 0.55],
      [1, 0.3],
      [1, 0.7],
    ],
    pads: [
      [295, 628, 68],
      [985, 628, 68],
    ],
  },

  mountain_fortress: {
    id: 'mountain_fortress',
    name: 'Meşə Qalası',
    style: 'fortress',
    walls: true,
    pl: [
      [0, 628, 1280, 92],
      [75, 526, 200, 102],
      [1005, 526, 200, 102],
      [315, 574, 58, 54],
      [907, 574, 58, 54],
      [460, 456, 360, 24],
      [140, 394, 245, 24],
      [895, 394, 245, 24],
      [515, 318, 250, 24],
    ],
    plMeta: [
      { kind: 'ground' },
      { kind: 'stone' },
      { kind: 'stone' },
      { kind: 'crate' },
      { kind: 'crate' },
      { kind: 'timber' },
      { kind: 'timber' },
      { kind: 'timber' },
      { kind: 'timber' },
    ],
    sp: [
      [6, 0.5],
      [7, 0.5],
      [5, 0.3],
      [5, 0.7],
    ],
    pendulums: [
      { px: 640, py: -20, len: 265, amp: 0.42, speed: 0.022, phase: 0, radius: 22 },
    ],
  },

  broken_bridge: {
    id: 'broken_bridge',
    name: 'Dağılmış Körpü',
    style: 'bridge',
    walls: true,
    pl: [
      [0, 628, 1280, 92],
      [78, 542, 168, 86],
      [296, 574, 58, 54],
      [930, 518, 245, 110],
      [55, 416, 265, 24],
      [440, 454, 400, 26],
      [960, 392, 265, 24],
      [515, 318, 250, 24],
    ],
    plMeta: [
      { kind: 'ground' },
      { kind: 'car', color: '#4b5320' },
      { kind: 'crate' },
      { kind: 'bus', color: '#3f4a3c' },
      { kind: 'catwalk' },
      { kind: 'overpass' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
    ],
    sp: [
      [4, 0.45],
      [6, 0.55],
      [5, 0.25],
      [5, 0.75],
    ],
  },

  bio_lab: {
    id: 'bio_lab',
    name: 'Karantin Laboratoriyası',
    style: 'lab',
    walls: true,
    pl: [
      [0, 628, 1280, 92],
      [90, 524, 185, 104],
      [1005, 524, 185, 104],
      [318, 574, 58, 54],
      [904, 574, 58, 54],
      [450, 464, 380, 24],
      [115, 396, 255, 24],
      [910, 396, 255, 24],
      [515, 328, 250, 24],
    ],
    plMeta: [
      { kind: 'ground' },
      { kind: 'pod', color: '#0ea5e9' },
      { kind: 'pod', color: '#22c55e' },
      { kind: 'crate' },
      { kind: 'crate' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
    ],
    sp: [
      [6, 0.5],
      [7, 0.5],
      [5, 0.3],
      [5, 0.7],
    ],
    pads: [
      [405, 628, 66],
      [875, 628, 66],
    ],
  },

  rooftop_helipad: {
    id: 'rooftop_helipad',
    name: 'Gecə Damı',
    style: 'rooftop',
    walls: true,
    pl: [
      [0, 628, 1280, 92],
      [84, 534, 176, 94],
      [1020, 534, 176, 94],
      [465, 520, 350, 108],
      [95, 404, 265, 24],
      [920, 404, 265, 24],
      [495, 376, 290, 24],
    ],
    plMeta: [
      { kind: 'ground' },
      { kind: 'hvac' },
      { kind: 'hvac' },
      { kind: 'helicopter' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
      { kind: 'catwalk' },
    ],
    sp: [
      [4, 0.5],
      [5, 0.5],
      [3, 0.25],
      [3, 0.75],
    ],
  },
};

export function randomMapKey(): Exclude<MapId, 'random'> {
  const keys = Object.keys(ARENA_MAPS) as Exclude<MapId, 'random'>[];
  return keys[Math.floor(Math.random() * keys.length)];
}

export function getMovingBounds(m: MovingPlatformDef, t: number): [number, number, number, number] {
  const ph = t * m.speed + (m.phase || 0);
  return [
    m.x + Math.sin(ph) * m.dx,
    m.y + Math.sin(ph) * m.dy,
    m.w,
    m.h,
  ];
}

export function getPendulumBob(p: PendulumDef, t: number): [number, number, number] {
  const ang = p.amp * Math.sin(t * p.speed + p.phase);
  return [p.px + Math.sin(ang) * p.len, p.py + Math.cos(ang) * p.len, ang];
}

export function getLaserState(l: LaserGateDef, t: number): 'idle' | 'warn' | 'active' {
  const cyc = (t + l.offset) % l.period;
  if (cyc > l.period - l.activeLen) return 'active';
  if (cyc > l.period - l.activeLen - l.warnLen) return 'warn';
  return 'idle';
}

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function buildMapBackground(style: ArenaMapDef['style']): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ARENA_W;
  c.height = ARENA_H;
  const g = c.getContext('2d')!;
  const r = seeded(47);

  if (style === 'city') {
    // Apocalyptic Last-of-Us Dusk City Ruins (mirrors Zombie Survival sky)
    const gr = g.createLinearGradient(0, 0, 0, ARENA_H);
    gr.addColorStop(0, '#080c0b');
    gr.addColorStop(0.45, '#17211b');
    gr.addColorStop(0.78, '#2b1d15');
    gr.addColorStop(1, '#12100f');
    g.fillStyle = gr;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Smoky fire horizon glow
    const haze = g.createRadialGradient(640, 500, 30, 640, 500, 760);
    haze.addColorStop(0, 'rgba(234,88,12,0.26)');
    haze.addColorStop(0.5, 'rgba(180,83,9,0.10)');
    haze.addColorStop(1, 'transparent');
    g.fillStyle = haze;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Faint moon glow in smoke
    const moon = g.createRadialGradient(990, 120, 6, 990, 120, 155);
    moon.addColorStop(0, 'rgba(254,243,199,0.34)');
    moon.addColorStop(0.35, 'rgba(251,146,60,0.10)');
    moon.addColorStop(1, 'transparent');
    g.fillStyle = moon;
    g.fillRect(800, 0, 380, 290);

    // Distant jagged skyline silhouettes
    g.fillStyle = '#0d1210';
    const farHeights = [230, 310, 190, 340, 260, 220, 330, 245, 295, 200, 280];
    for (let i = 0; i < farHeights.length; i++) {
      const bx = i * 118 - 10;
      const bw = 96;
      const bh = farHeights[i];
      g.fillRect(bx, 635 - bh, bw, bh);
      // Crumbling top notch
      g.clearRect(bx + 18, 635 - bh, 18, 12);
      g.fillStyle = '#0d1210';
    }

    // Midground ruined buildings with glowing fire windows & moss patches
    const midBuildings = [
      { x: 40, w: 145, h: 320, fire: true },
      { x: 245, w: 130, h: 255, fire: false },
      { x: 440, w: 155, h: 350, fire: true },
      { x: 675, w: 140, h: 290, fire: false },
      { x: 890, w: 150, h: 345, fire: true },
      { x: 1095, w: 155, h: 280, fire: false },
    ];
    for (const b of midBuildings) {
      const by = 635 - b.h;
      g.fillStyle = '#151917';
      g.beginPath();
      g.moveTo(b.x, 635);
      g.lineTo(b.x, by + 16);
      g.lineTo(b.x + b.w * 0.32, by);
      g.lineTo(b.x + b.w * 0.65, by + 22);
      g.lineTo(b.x + b.w, by + 6);
      g.lineTo(b.x + b.w, 635);
      g.closePath();
      g.fill();

      // Window grid
      const cols = Math.floor((b.w - 22) / 24);
      for (let wy = by + 40; wy < 590; wy += 34) {
        for (let c2 = 0; c2 < cols; c2++) {
          const wx = b.x + 14 + c2 * 24;
          const lit = b.fire && r() < 0.24;
          if (lit) {
            const wg = g.createRadialGradient(wx + 6, wy + 8, 1, wx + 6, wy + 8, 22);
            wg.addColorStop(0, 'rgba(251,146,60,0.45)');
            wg.addColorStop(1, 'transparent');
            g.fillStyle = wg;
            g.fillRect(wx - 16, wy - 14, 44, 44);
          }
          g.fillStyle = lit ? '#f97316' : 'rgba(6,8,7,0.88)';
          g.fillRect(wx, wy, 13, 18);
        }
      }

      // Overgrown green moss streaks
      g.fillStyle = 'rgba(77,124,15,0.42)';
      g.fillRect(b.x + 8, by + 14, b.w * 0.42, 8);
      g.fillRect(b.x + b.w * 0.56, by + 56, b.w * 0.3, 6);
    }
  } else if (style === 'harbor') {
    // Moody Stormy Night Harbor Docks
    const gr = g.createLinearGradient(0, 0, 0, ARENA_H);
    gr.addColorStop(0, '#040911');
    gr.addColorStop(0.52, '#0c1826');
    gr.addColorStop(1, '#122436');
    g.fillStyle = gr;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Distant city & warehouse silhouettes across harbor bay
    g.fillStyle = '#07101b';
    for (let x = 0; x < ARENA_W; x += 90) {
      const h = 95 + (x % 150);
      g.fillRect(x, 470 - h, 82, h + 165);
    }

    // Tall Industrial Shipyard Gantry Cranes
    g.strokeStyle = '#122030';
    g.lineWidth = 8;
    for (const cx of [255, 1020]) {
      g.strokeRect(cx - 24, 155, 48, 475);
      g.beginPath();
      g.moveTo(cx - 120, 155);
      g.lineTo(cx + 160, 115);
      g.moveTo(cx, 155);
      g.lineTo(cx + 135, 122);
      g.stroke();
      // Red aviation warning light at crane top
      const rl = g.createRadialGradient(cx + 155, 115, 1, cx + 155, 115, 26);
      rl.addColorStop(0, 'rgba(239,68,68,0.85)');
      rl.addColorStop(1, 'transparent');
      g.fillStyle = rl;
      g.fillRect(cx + 125, 85, 60, 60);
      g.fillStyle = '#ef4444';
      g.fillRect(cx + 152, 112, 5, 5);
    }

    // Volumetric sodium dock spotlights
    for (const lx of [180, 640, 1100]) {
      const cone = g.createLinearGradient(lx, 55, lx, 620);
      cone.addColorStop(0, 'rgba(253,224,71,0.16)');
      cone.addColorStop(1, 'transparent');
      g.fillStyle = cone;
      g.beginPath();
      g.moveTo(lx - 18, 55);
      g.lineTo(lx + 18, 55);
      g.lineTo(lx + 170, 620);
      g.lineTo(lx - 170, 620);
      g.closePath();
      g.fill();
      g.fillStyle = '#fef08a';
      g.fillRect(lx - 10, 48, 20, 6);
    }

    // Dark harbor bay reflection water strip behind pier
    g.fillStyle = '#061321';
    g.fillRect(0, 565, ARENA_W, 75);
  } else if (style === 'subway') {
    // Gritty Underground Abandoned Subway Station Vault
    const gr = g.createLinearGradient(0, 0, 0, ARENA_H);
    gr.addColorStop(0, '#07080c');
    gr.addColorStop(0.5, '#13161e');
    gr.addColorStop(1, '#0b0d12');
    g.fillStyle = gr;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Tiled subterranean concrete station wall pattern
    g.strokeStyle = 'rgba(255,255,255,0.03)';
    g.lineWidth = 1;
    for (let y = 135; y < 625; y += 26) {
      g.beginPath(); g.moveTo(110, y); g.lineTo(1170, y); g.stroke();
    }
    for (let x = 110; x < 1170; x += 52) {
      g.beginPath(); g.moveTo(x, 135); g.lineTo(x, 625); g.stroke();
    }

    // Subway station colored stripe & station placard
    g.fillStyle = 'rgba(245,158,11,0.22)';
    g.fillRect(110, 210, 1060, 14);
    g.fillStyle = '#090b0f';
    roundRectPath(ctxClean(g), 515, 165, 250, 38, 6);
    g.fill();
    g.strokeStyle = 'rgba(245,158,11,0.45)';
    g.lineWidth = 1.5;
    g.stroke();

    // Heavy iron tunnel arch columns
    for (const cx of [140, 405, 640, 875, 1140]) {
      g.fillStyle = '#181c24';
      g.fillRect(cx - 18, 0, 36, 628);
      g.fillStyle = '#252b36';
      g.fillRect(cx - 14, 0, 8, 628);
      g.fillStyle = '#0c0e14';
      g.fillRect(cx + 12, 0, 6, 628);
    }

    // Dark train tunnels on left and right edges
    for (const tx of [0, 1175]) {
      g.fillStyle = '#040507';
      g.fillRect(tx, 180, 105, 450);
    }

    // Overhead fluorescent ceiling fixtures + warm emergency amber bulbs
    for (const lx of [272, 522, 758, 1008]) {
      const fg = g.createRadialGradient(lx, 74, 4, lx, 145, 180);
      fg.addColorStop(0, 'rgba(186,230,253,0.20)');
      fg.addColorStop(1, 'transparent');
      g.fillStyle = fg;
      g.fillRect(lx - 180, 30, 360, 300);
      g.fillStyle = '#e0f2fe';
      g.fillRect(lx - 38, 64, 76, 5);
    }
  } else if (style === 'fortress') {
    // Misty Twilight Pine Forest & Ruined Mountain Stone Fortress
    const gr = g.createLinearGradient(0, 0, 0, ARENA_H);
    gr.addColorStop(0, '#050c0a');
    gr.addColorStop(0.5, '#0e201a');
    gr.addColorStop(1, '#14261f');
    g.fillStyle = gr;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Large silver moon + forest mist halo
    const moon = g.createRadialGradient(640, 140, 12, 640, 140, 260);
    moon.addColorStop(0, 'rgba(236,253,245,0.92)');
    moon.addColorStop(0.18, 'rgba(167,243,208,0.34)');
    moon.addColorStop(1, 'transparent');
    g.fillStyle = moon;
    g.fillRect(360, 0, 560, 400);
    g.fillStyle = '#ecfdf5';
    g.beginPath(); g.arc(640, 140, 34, 0, Math.PI * 2); g.fill();

    // Tall layered pine tree silhouettes
    g.fillStyle = '#071510';
    for (let tx = 35; tx < ARENA_W; tx += 95) {
      const th = 220 + (tx % 140);
      g.fillRect(tx - 6, 628 - th, 12, th);
      for (let tier = 0; tier < 4; tier++) {
        const ty = 628 - th + tier * 38;
        const tw = 34 + tier * 14;
        g.beginPath();
        g.moveTo(tx, ty - 28);
        g.lineTo(tx - tw, ty + 28);
        g.lineTo(tx + tw, ty + 28);
        g.closePath();
        g.fill();
      }
    }

    // Ruined stone castle towers & battlements on left/right horizon
    g.fillStyle = '#141918';
    for (const [bx, bw, bh] of [[28, 120, 390], [1132, 120, 390]]) {
      g.fillRect(bx, 628 - bh, bw, bh);
      for (let cr = 0; cr < 4; cr++) {
        g.fillRect(bx + cr * 32, 628 - bh - 18, 18, 18);
      }
    }

    // Warm iron wall torch glow sconces
    for (const [tx, ty] of [[155, 390], [1125, 390], [360, 495], [920, 495]]) {
      const tg = g.createRadialGradient(tx, ty, 3, tx, ty, 85);
      tg.addColorStop(0, 'rgba(251,146,60,0.44)');
      tg.addColorStop(1, 'transparent');
      g.fillStyle = tg;
      g.fillRect(tx - 90, ty - 90, 180, 180);
      g.fillStyle = '#fb923c';
      g.beginPath(); g.arc(tx, ty, 5.5, 0, Math.PI * 2); g.fill();
    }
  } else if (style === 'bridge') {
    // Sunset Canyon Twilight & Broken Suspension Bridge
    const gr = g.createLinearGradient(0, 0, 0, ARENA_H);
    gr.addColorStop(0, '#100c18');
    gr.addColorStop(0.42, '#2d1620');
    gr.addColorStop(0.76, '#612516');
    gr.addColorStop(1, '#1b110e');
    g.fillStyle = gr;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Dusk sun haze
    const sun = g.createRadialGradient(640, 480, 20, 640, 480, 560);
    sun.addColorStop(0, 'rgba(251,146,60,0.44)');
    sun.addColorStop(0.45, 'rgba(239,68,68,0.16)');
    sun.addColorStop(1, 'transparent');
    g.fillStyle = sun;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Distant canyon cliffs & river mist
    g.fillStyle = '#181014';
    g.beginPath();
    g.moveTo(0, 630);
    g.lineTo(0, 410); g.lineTo(190, 445); g.lineTo(360, 520); g.lineTo(540, 555);
    g.lineTo(740, 550); g.lineTo(930, 505); g.lineTo(1110, 430); g.lineTo(1280, 400); g.lineTo(1280, 630);
    g.closePath();
    g.fill();

    // Giant rusted suspension bridge pylons & snapped cables
    g.strokeStyle = '#120d10';
    g.fillStyle = '#140f12';
    for (const px of [245, 1035]) {
      g.fillRect(px - 22, 85, 14, 545);
      g.fillRect(px + 8, 85, 14, 545);
      g.fillRect(px - 26, 130, 52, 16);
      g.fillRect(px - 24, 260, 48, 14);
      g.fillStyle = '#ef4444';
      g.fillRect(px - 2, 78, 4, 6);
      g.fillStyle = '#140f12';
    }
    // Sweeping suspension cables
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, 260); g.quadraticCurveTo(130, 195, 245, 92);
    g.quadraticCurveTo(640, 315, 1035, 92);
    g.quadraticCurveTo(1165, 195, 1280, 255);
    g.stroke();
    g.lineWidth = 1.6;
    for (let sx = 45; sx < ARENA_W - 20; sx += 52) {
      if (sx > 560 && sx < 720) continue; // Broken center span gap
      const t = (sx - 245) / (1035 - 245);
      const topY = sx < 245 ? 190 : sx > 1035 ? 190 : 92 + 4 * t * (1 - t) * 185;
      g.beginPath(); g.moveTo(sx, topY); g.lineTo(sx, 628); g.stroke();
    }
  } else if (style === 'lab') {
    // Subterranean Quarantine Research Bunker
    const gr = g.createLinearGradient(0, 0, 0, ARENA_H);
    gr.addColorStop(0, '#040b0e');
    gr.addColorStop(0.5, '#091a1f');
    gr.addColorStop(1, '#050d10');
    g.fillStyle = gr;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Armored lab wall panels & pipes
    g.strokeStyle = 'rgba(45,212,191,0.06)';
    g.lineWidth = 1.5;
    for (let x = 80; x < ARENA_W; x += 120) {
      g.beginPath(); g.moveTo(x, 60); g.lineTo(x, 628); g.stroke();
    }
    g.fillStyle = '#0c1c22';
    g.fillRect(0, 56, ARENA_W, 24);
    g.fillRect(0, 180, ARENA_W, 12);

    // Glowing background cryo-containment specimen cylinders
    for (const [cx, col] of [[240, '#2dd4bf'], [640, '#4ade80'], [1040, '#38bdf8']] as [number, string][]) {
      const vg = g.createRadialGradient(cx, 355, 8, cx, 355, 155);
      vg.addColorStop(0, `${col}33`);
      vg.addColorStop(1, 'transparent');
      g.fillStyle = vg;
      g.fillRect(cx - 160, 195, 320, 320);

      g.fillStyle = 'rgba(15,23,42,0.75)';
      roundRectPath(g, cx - 36, 215, 72, 265, 8);
      g.fill();
      g.fillStyle = `${col}26`;
      g.fillRect(cx - 28, 240, 56, 215);
      g.fillStyle = '#0f172a';
      g.fillRect(cx - 42, 208, 84, 26);
      g.fillRect(cx - 42, 460, 84, 28);
      g.strokeStyle = `${col}66`;
      g.lineWidth = 2;
      g.strokeRect(cx - 28, 240, 56, 215);
    }

    // Quarantine warning chevron ribbon
    g.fillStyle = 'rgba(234,179,8,0.22)';
    g.fillRect(0, 592, ARENA_W, 14);
  } else {
    // High-Rise Rooftop Helipad Above Burning Metropolis
    const gr = g.createLinearGradient(0, 0, 0, ARENA_H);
    gr.addColorStop(0, '#04060c');
    gr.addColorStop(0.55, '#0f1422');
    gr.addColorStop(0.85, '#25171b');
    gr.addColorStop(1, '#121318');
    g.fillStyle = gr;
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Sweeping searchlight beams in night sky
    for (const [lx, dx] of [[220, 210], [1050, -240]]) {
      const bm = g.createLinearGradient(lx, 620, lx + dx, 0);
      bm.addColorStop(0, 'rgba(186,230,253,0.16)');
      bm.addColorStop(1, 'transparent');
      g.fillStyle = bm;
      g.beginPath();
      g.moveTo(lx - 18, 620); g.lineTo(lx + 18, 620);
      g.lineTo(lx + dx + 130, 0); g.lineTo(lx + dx - 130, 0);
      g.closePath();
      g.fill();
    }

    // Distant skyscraper skyline with lit windows & orange fire smoke
    const towers = [
      [20, 95, 290], [140, 110, 350], [280, 90, 260], [400, 125, 380],
      [560, 100, 305], [700, 115, 360], [850, 95, 275], [980, 130, 395], [1140, 110, 320],
    ];
    for (const [tx, tw, th] of towers) {
      g.fillStyle = '#090c14';
      g.fillRect(tx, 628 - th, tw, th);
      for (let wy = 628 - th + 24; wy < 595; wy += 26) {
        for (let wx = tx + 14; wx < tx + tw - 16; wx += 22) {
          const lit = r() < 0.24;
          if (!lit) continue;
          g.fillStyle = r() < 0.28 ? '#f97316' : 'rgba(253,224,71,0.45)';
          g.fillRect(wx, wy, 9, 12);
        }
      }
      // Red rooftop aircraft beacon
      g.fillStyle = '#ef4444';
      g.fillRect(tx + tw / 2 - 2, 628 - th - 12, 4, 12);
    }

    // Rooftop safety railing silhouette
    g.strokeStyle = '#1e293b';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 588); g.lineTo(ARENA_W, 588); g.stroke();
    for (let rx = 20; rx < ARENA_W; rx += 56) {
      g.beginPath(); g.moveTo(rx, 588); g.lineTo(rx, 628); g.stroke();
    }
  }

  return c;
}

function ctxClean(g: CanvasRenderingContext2D) {
  return g;
}

export function drawArenaPillar(
  ctx: CanvasRenderingContext2D,
  p: PillarDef,
  style: ArenaMapDef['style']
) {
  const { x, y, w, h } = p;
  ctx.save();
  const pal: Record<ArenaMapDef['style'], [string, string, string]> = {
    city: ['#3f4441', '#1b1e1c', '#4d7c0f'],
    harbor: ['#475569', '#1e293b', '#f59e0b'],
    subway: ['#3f3f46', '#18181b', '#fbbf24'],
    fortress: ['#57534e', '#292524', '#4ade80'],
    bridge: ['#57433c', '#291e1a', '#f97316'],
    lab: ['#1e3a42', '#0b181d', '#2dd4bf'],
    rooftop: ['#334155', '#0f172a', '#eab308'],
  };
  const [cTop, cBot, accent] = pal[style];
  const gr = ctx.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, cBot);
  gr.addColorStop(0.35, cTop);
  gr.addColorStop(1, cBot);
  ctx.fillStyle = gr;
  roundRectPath(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, w, 3);
  ctx.restore();
}

export function drawIceBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hpRatio: number,
  shake = 0
) {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.fillStyle = `rgba(125,211,252,${0.35 + hpRatio * 0.45})`;
  roundRectPath(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.restore();
}

export function drawArenaPlatform(
  ctx: CanvasRenderingContext2D,
  p: [number, number, number, number],
  style: ArenaMapDef['style'],
  meta?: PlatformVisualMeta,
  time = 0
) {
  const [x, y, w, h] = p;
  const kind: ArenaPropKind = meta?.kind || (h >= 60 ? 'ground' : style === 'harbor' ? 'catwalk' : style === 'fortress' ? 'timber' : 'overpass');
  ctx.save();

  if (kind === 'ground') {
    if (style === 'city') {
      const roadGrad = ctx.createLinearGradient(0, y, 0, y + h);
      roadGrad.addColorStop(0, '#272a27');
      roadGrad.addColorStop(0.32, '#171917');
      roadGrad.addColorStop(1, '#090a09');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(x, y, w, h);
      // Mossy sidewalk curb + yellow road dashes
      ctx.fillStyle = '#3f6212';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = 'rgba(250,204,21,0.36)';
      for (let rx = x + 28; rx < x + w - 40; rx += 92) {
        ctx.fillRect(rx, y + 18, 46, 4);
      }
    } else if (style === 'harbor') {
      const pier = ctx.createLinearGradient(0, y, 0, y + h);
      pier.addColorStop(0, '#334155');
      pier.addColorStop(0.25, '#1e293b');
      pier.addColorStop(1, '#090d14');
      ctx.fillStyle = pier;
      ctx.fillRect(x, y, w, h);
      // Caution harbor rim
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = '#18181b';
      for (let sx = x; sx < x + w; sx += 28) ctx.fillRect(sx, y, 14, 5);
      // Iron mooring bollards
      ctx.fillStyle = '#475569';
      for (let bx = x + 64; bx < x + w - 64; bx += 290) {
        ctx.fillRect(bx - 6, y - 10, 12, 10);
        ctx.fillRect(bx - 8, y - 12, 16, 4);
      }
    } else if (style === 'subway') {
      const sub = ctx.createLinearGradient(0, y, 0, y + h);
      sub.addColorStop(0, '#272932');
      sub.addColorStop(0.3, '#171920');
      sub.addColorStop(1, '#090a0d');
      ctx.fillStyle = sub;
      ctx.fillRect(x, y, w, h);
      // Yellow tactile warning edge + railway sleepers below
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(x, y + 18, w, 4);
      ctx.fillStyle = '#27272a';
      for (let rx = x + 16; rx < x + w; rx += 32) ctx.fillRect(rx, y + 22, 14, 8);
    } else if (style === 'bridge') {
      const road = ctx.createLinearGradient(0, y, 0, y + h);
      road.addColorStop(0, '#2e2a29');
      road.addColorStop(0.35, '#191615');
      road.addColorStop(1, '#090808');
      ctx.fillStyle = road;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = 'rgba(253,224,71,0.45)';
      for (let rx = x + 28; rx < x + w - 40; rx += 88) ctx.fillRect(rx, y + 16, 44, 4);
    } else if (style === 'lab') {
      const labF = ctx.createLinearGradient(0, y, 0, y + h);
      labF.addColorStop(0, '#162c33');
      labF.addColorStop(0.35, '#0b171c');
      labF.addColorStop(1, '#04090b');
      ctx.fillStyle = labF;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = 'rgba(45,212,191,0.16)';
      for (let rx = x + 16; rx < x + w; rx += 40) ctx.fillRect(rx, y + 12, 22, 6);
    } else if (style === 'rooftop') {
      const rf = ctx.createLinearGradient(0, y, 0, y + h);
      rf.addColorStop(0, '#272e3a');
      rf.addColorStop(0.35, '#141922');
      rf.addColorStop(1, '#07090e');
      ctx.fillStyle = rf;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = 'rgba(250,204,21,0.52)';
      ctx.fillRect(420, y + 8, 440, 5);
    } else {
      const yard = ctx.createLinearGradient(0, y, 0, y + h);
      yard.addColorStop(0, '#36322d');
      yard.addColorStop(0.35, '#1f1c19');
      yard.addColorStop(1, '#0d0b0a');
      ctx.fillStyle = yard;
      ctx.fillRect(x, y, w, h);
      // Mossy cobblestone top trim
      ctx.fillStyle = '#3f6212';
      ctx.fillRect(x, y, w, 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.5;
      for (let sx = x; sx < x + w; sx += 44) ctx.strokeRect(sx, y + 5, 44, 20);
    }
    ctx.restore();
    return;
  }

  // Drop shadow on wall/ground
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  roundRectPath(ctx, x + 3, y + 5, w, h, 4);
  ctx.fill();

  if (kind === 'car') {
    // Rusted abandoned sedan (same craft as Zombie mode)
    ctx.fillStyle = meta?.color || '#4d5d4e';
    roundRectPath(ctx, x, y + 20, w, h - 28, 6);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.2, y, w * 0.56, 24, 5);
    ctx.fill();
    // Dark shattered cabin glass
    ctx.fillStyle = '#0f172a';
    roundRectPath(ctx, x + w * 0.25, y + 4, w * 0.21, 14, 2);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.51, y + 4, w * 0.21, 14, 2);
    ctx.fill();
    // Moss roof trim + bumpers
    ctx.fillStyle = 'rgba(101,163,13,0.52)';
    ctx.fillRect(x + w * 0.24, y, w * 0.48, 3);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(x - 2, y + h - 20, 8, 7);
    ctx.fillRect(x + w - 6, y + h - 20, 8, 7);
    // Flat rubber wheels
    for (const wx of [x + 28, x + w - 28]) {
      ctx.fillStyle = '#09090b';
      ctx.beginPath(); ctx.arc(wx, y + h - 10, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#52525b';
      ctx.beginPath(); ctx.arc(wx, y + h - 10, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'bus') {
    // Abandoned weathered transit bus
    ctx.fillStyle = meta?.color || '#85642d';
    roundRectPath(ctx, x, y, w, h - 12, 7);
    ctx.fill();
    ctx.fillStyle = '#18181b';
    for (let wx = x + 16; wx < x + w - 26; wx += 30) {
      roundRectPath(ctx, wx, y + 12, 22, 20, 3);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y + 42, w, 6);
    ctx.fillStyle = 'rgba(101,163,13,0.52)';
    ctx.fillRect(x + 8, y, w - 16, 4);
    for (const wx of [x + 38, x + w - 38]) {
      ctx.fillStyle = '#09090b';
      ctx.beginPath(); ctx.arc(wx, y + h - 12, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#52525b';
      ctx.beginPath(); ctx.arc(wx, y + h - 12, 5.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'crate') {
    ctx.fillStyle = '#451a03';
    roundRectPath(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + w - 5, y + h - 5);
    ctx.moveTo(x + w - 5, y + 5); ctx.lineTo(x + 5, y + h - 5);
    ctx.stroke();
  } else if (kind === 'overpass') {
    // Cracked concrete highway bridge slab with moss & swaying hanging vines
    const cg = ctx.createLinearGradient(0, y, 0, y + h);
    cg.addColorStop(0, '#3f423e');
    cg.addColorStop(1, '#1c1e1c');
    ctx.fillStyle = cg;
    roundRectPath(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(x + 2, y, w - 4, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // Hanging moss vines
    ctx.strokeStyle = 'rgba(101,163,13,0.62)';
    ctx.lineWidth = 1.8;
    for (let vx = x + 22; vx < x + w - 18; vx += 46) {
      const sway = Math.sin(time * 0.04 + vx) * 3.5;
      ctx.beginPath();
      ctx.moveTo(vx, y + h);
      ctx.lineTo(vx + sway, y + h + 18 + (vx % 14));
      ctx.stroke();
    }
  } else if (kind === 'container') {
    // Corrugated steel shipping container
    const baseCol = meta?.color || '#7f1d1d';
    ctx.fillStyle = baseCol;
    roundRectPath(ctx, x, y, w, h, 3);
    ctx.fill();
    // Vertical steel corrugation ribs
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let rx = x + 12; rx < x + w - 10; rx += 14) {
      ctx.fillRect(rx, y + 6, 5, h - 12);
    }
    // Top/bottom steel frame rails & corner castings
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y + h - 6, w, 6);
    ctx.strokeStyle = '#090b0f';
    ctx.lineWidth = 2;
    roundRectPath(ctx, x, y, w, h, 3);
    ctx.stroke();
  } else if (kind === 'catwalk') {
    // Industrial steel girder catwalk
    const tg = ctx.createLinearGradient(0, y, 0, y + h);
    tg.addColorStop(0, '#475569');
    tg.addColorStop(1, '#1e293b');
    ctx.fillStyle = tg;
    roundRectPath(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 2, y, w - 4, 3);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    for (let gx = x + 14; gx < x + w - 12; gx += 26) {
      ctx.beginPath();
      ctx.moveTo(gx, y + 4); ctx.lineTo(gx + 13, y + h - 3);
      ctx.moveTo(gx + 13, y + 4); ctx.lineTo(gx, y + h - 3);
      ctx.stroke();
    }
  } else if (kind === 'subway') {
    // Abandoned Steel Metro Train Car
    const tg = ctx.createLinearGradient(0, y, 0, y + h);
    tg.addColorStop(0, '#52525b');
    tg.addColorStop(0.5, '#3f3f46');
    tg.addColorStop(1, '#18181b');
    ctx.fillStyle = tg;
    roundRectPath(ctx, x, y + 8, w, h - 22, 8);
    ctx.fill();
    // Roof AC pods
    ctx.fillStyle = '#27272a';
    roundRectPath(ctx, x + 55, y, 70, 10, 3); ctx.fill();
    roundRectPath(ctx, x + w - 125, y, 70, 10, 3); ctx.fill();
    // Orange transit stripe
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x + 6, y + 54, w - 12, 6);
    // Passenger windows & double doors
    for (let wx = x + 22; wx < x + w - 42; wx += 44) {
      const isDoor = Math.abs(wx - (x + 110)) < 20 || Math.abs(wx - (x + w - 140)) < 20;
      ctx.fillStyle = isDoor ? '#27272a' : '#090b10';
      roundRectPath(ctx, wx, y + 18, 28, isDoor ? 58 : 26, 3);
      ctx.fill();
      if (!isDoor && ((wx / 44) | 0) % 3 === 1) {
        ctx.fillStyle = 'rgba(253,224,71,0.18)';
        ctx.fillRect(wx + 2, y + 20, 24, 22);
      }
    }
    // Rail bogies & steel wheels
    ctx.fillStyle = '#09090b';
    for (const bx of [x + 48, x + 92, x + w - 92, x + w - 48]) {
      ctx.beginPath(); ctx.arc(bx, y + h - 10, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#71717a';
      ctx.beginPath(); ctx.arc(bx, y + h - 10, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#09090b';
    }
  } else if (kind === 'concrete') {
    const kg = ctx.createLinearGradient(0, y, 0, y + h);
    kg.addColorStop(0, '#44464e');
    kg.addColorStop(1, '#1d1f24');
    ctx.fillStyle = kg;
    roundRectPath(ctx, x, y, w, h, 3);
    ctx.fill();
    // Closed metal shutter window
    ctx.fillStyle = '#18181b';
    roundRectPath(ctx, x + 16, y + 22, w - 32, 34, 2);
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x, y, w, 4);
  } else if (kind === 'stone') {
    const sg = ctx.createLinearGradient(0, y, 0, y + h);
    sg.addColorStop(0, '#57534e');
    sg.addColorStop(1, '#292524');
    ctx.fillStyle = sg;
    roundRectPath(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(x + 2, y, w - 4, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.42)';
    ctx.lineWidth = 1.5;
    for (let sx = x + 40; sx < x + w; sx += 40) {
      ctx.beginPath(); ctx.moveTo(sx, y + 5); ctx.lineTo(sx, y + h); ctx.stroke();
    }
  } else if (kind === 'pod') {
    // Armored bio-containment lab chamber
    const glow = meta?.color || '#2dd4bf';
    ctx.fillStyle = '#0f1d24';
    roundRectPath(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.fillStyle = `${glow}44`;
    roundRectPath(ctx, x + 16, y + 16, w - 32, h - 34, 4);
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, w, 10);
    ctx.fillRect(x, y + h - 10, w, 10);
  } else if (kind === 'helicopter') {
    // Damaged evacuation helicopter hull sitting on helipad
    ctx.fillStyle = '#334155';
    roundRectPath(ctx, x + 28, y + 20, w - 95, h - 38, 18);
    ctx.fill();
    // Tail boom & vertical fin
    ctx.fillRect(x + w - 85, y + 36, 75, 16);
    ctx.fillStyle = '#1e293b';
    roundRectPath(ctx, x + w - 26, y + 16, 20, 42, 4);
    ctx.fill();
    // Canopy cockpit glass
    ctx.fillStyle = '#0f172a';
    roundRectPath(ctx, x + 36, y + 28, 64, 34, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(56,189,248,0.28)';
    ctx.fillRect(x + 42, y + 32, 32, 12);
    // Yellow rescue stripe & rotor mast
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x + 95, y + 54, w - 175, 6);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x + w * 0.36 - 8, y + 6, 16, 16);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(x + 6, y, w - 34, 5);
    // Landing skids
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 45, y + h - 8, w - 140, 6);
    ctx.fillRect(x + 70, y + h - 20, 6, 14);
    ctx.fillRect(x + w - 125, y + h - 20, 6, 14);
  } else if (kind === 'hvac') {
    // Industrial rooftop AC chiller unit with vents
    const hg = ctx.createLinearGradient(0, y, 0, y + h);
    hg.addColorStop(0, '#475569');
    hg.addColorStop(1, '#1e293b');
    ctx.fillStyle = hg;
    roundRectPath(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(x + w * 0.34, y + h * 0.54, 24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Louver grille
    ctx.fillStyle = '#1e293b';
    for (let vy = y + 22; vy < y + h - 18; vy += 9) {
      ctx.fillRect(x + w * 0.62, vy, w * 0.28, 4);
    }
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x, y, w, 4);
  } else {
    // Timber watchtower deck
    const wg = ctx.createLinearGradient(0, y, 0, y + h);
    wg.addColorStop(0, '#784822');
    wg.addColorStop(1, '#3b210d');
    ctx.fillStyle = wg;
    roundRectPath(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.fillStyle = '#9a5e2e';
    ctx.fillRect(x, y, w, 4);
    ctx.strokeStyle = '#241307';
    ctx.lineWidth = 1.6;
    for (let bx = x + 32; bx < x + w; bx += 32) {
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + h); ctx.stroke();
    }
  }

  ctx.restore();
}
