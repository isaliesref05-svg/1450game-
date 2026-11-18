import { PartyEconomy } from './economy';
import { drawWeaponSprite } from './pngAssets';
import { WeaponId } from './types';

export interface RNode {
  x: number;
  y: number;
  ox: number;
  oy: number;
}

export interface RagdollRig {
  pelvis: RNode;
  chest: RNode;
  head: RNode;
  lKnee: RNode;
  lFoot: RNode;
  rKnee: RNode;
  rFoot: RNode;
  lElbow: RNode;
  lHand: RNode;
  rElbow: RNode;
  rHand: RNode;
  cloth: RNode[];
  stunT: number;
  maxStun: number;
  dead: boolean;
  deadLife: number;
  maxDeadLife: number;
  color: string;
  index: number;
  dir: number;
  scale: number;
  hipSquash: number;
}

export interface RagdollDriveParams {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: number;
  aim: number;
  ground: boolean;
  wallSlide?: number; // -1 left wall, 1 right wall, 0 none
  phase: number;
  sq: number;
  recoil: number;
  atkT: number;
  atkP: number;
  weapon: WeaponId | 'none';
  twoHanded: boolean;
  handTarget1?: [number, number];
  handTarget2?: [number, number];
  platforms?: [number, number, number, number][];
  gravity?: number;
  time: number;
}

function makeNode(x: number, y: number, vx = 0, vy = 0): RNode {
  return { x, y, ox: x - vx, oy: y - vy };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function solveDist(a: RNode, b: RNode, rest: number, stiff = 1, wA = 0.5, wB = 0.5) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.0001) return;
  const diff = ((d - rest) / d) * stiff;
  a.x += dx * diff * wA;
  a.y += dy * diff * wA;
  b.x -= dx * diff * wB;
  b.y -= dy * diff * wB;
}

function pullNode(n: RNode, tx: number, ty: number, k: number) {
  n.x += (tx - n.x) * k;
  n.y += (ty - n.y) * k;
}

function integrateNode(n: RNode, damp: number, grav: number, maxSpd = 26) {
  const vx = clamp((n.x - n.ox) * damp, -maxSpd, maxSpd);
  const vy = clamp((n.y - n.oy) * damp, -maxSpd, maxSpd);
  n.ox = n.x;
  n.oy = n.y;
  n.x += vx;
  n.y += vy + grav;
}

export function createRagdollRig(
  index: number,
  color: string,
  x: number,
  y: number,
  dir = 1,
  scale = 1
): RagdollRig {
  const s = scale;
  const px = x;
  const py = y + 7 * s;
  const cx = x;
  const cy = y - 10 * s;
  const hx = x;
  const hy = y - 21.5 * s;
  return {
    pelvis: makeNode(px, py),
    chest: makeNode(cx, cy),
    head: makeNode(hx, hy),
    lKnee: makeNode(px - 4 * s, py + 10 * s),
    lFoot: makeNode(px - 6 * s, py + 19 * s),
    rKnee: makeNode(px + 4 * s, py + 10 * s),
    rFoot: makeNode(px + 6 * s, py + 19 * s),
    lElbow: makeNode(cx - 7 * s * dir, cy + 7 * s),
    lHand: makeNode(cx - 10 * s * dir, cy + 13 * s),
    rElbow: makeNode(cx + 8 * s * dir, cy + 6 * s),
    rHand: makeNode(cx + 15 * s * dir, cy + 2 * s),
    cloth: [
      makeNode(cx, cy - 2 * s),
      makeNode(cx - 5 * s * dir, cy + 3 * s),
      makeNode(cx - 10 * s * dir, cy + 8 * s),
      makeNode(cx - 14 * s * dir, cy + 13 * s),
    ],
    stunT: 0,
    maxStun: 1,
    dead: false,
    deadLife: 0,
    maxDeadLife: 180,
    color,
    index,
    dir,
    scale: s,
    hipSquash: 0,
  };
}

export function applyRagdollImpulse(
  rig: RagdollRig,
  kx: number,
  ky: number,
  stunFrames = 0,
  hitY?: number
) {
  const s = rig.scale;
  const whip = clamp(Math.hypot(kx, ky) * 0.14, 0.3, 2.2);
  // Determine whether hit struck upper or lower body for authentic torque
  const upperBias =
    hitY !== undefined ? (hitY < rig.chest.y + 4 ? 1.35 : 0.7) : 1.0;

  const nudge = (n: RNode, mx: number, my: number) => {
    n.ox -= mx;
    n.oy -= my;
  };

  nudge(rig.chest, kx * 0.65 * upperBias, ky * 0.55 - 1.2 * s);
  nudge(rig.head, kx * 0.95 * upperBias, ky * 0.65 - 2.4 * whip * s);
  nudge(rig.pelvis, kx * 0.45, ky * 0.45);
  nudge(rig.lHand, kx * 0.8 + (Math.random() - 0.5) * 3, ky * 0.6 - 2.0);
  nudge(rig.rHand, kx * 0.8 + (Math.random() - 0.5) * 3, ky * 0.6 - 2.0);
  nudge(rig.lFoot, kx * 0.25, ky * 0.25 + 1.2);
  nudge(rig.rFoot, kx * 0.25, ky * 0.25 + 1.2);

  if (stunFrames > rig.stunT) {
    rig.stunT = stunFrames;
    rig.maxStun = Math.max(stunFrames, 1);
  }
}

export function applyWeaponKickToRig(
  rig: RagdollRig,
  aimAngle: number,
  strength: number,
  twoHanded = false
) {
  const ax = Math.cos(aimAngle);
  const ay = Math.sin(aimAngle);
  const kickX = -ax * strength;
  const kickY = -ay * strength - Math.abs(ax) * strength * 0.22;

  rig.rHand.ox -= kickX * 1.35;
  rig.rHand.oy -= kickY * 1.35;
  rig.rElbow.ox -= kickX * 0.95;
  rig.rElbow.oy -= kickY * 0.95;
  if (twoHanded) {
    rig.lHand.ox -= kickX * 1.05;
    rig.lHand.oy -= kickY * 1.05;
  }
  rig.chest.ox -= kickX * 0.48;
  rig.chest.oy -= kickY * 0.35;
  rig.head.ox -= kickX * 0.62;
  rig.head.oy -= kickY * 0.4;
}

export function convertRigToDead(
  rig: RagdollRig,
  kx: number,
  ky: number,
  maxLife = 220
): RagdollRig {
  rig.dead = true;
  rig.deadLife = maxLife;
  rig.maxDeadLife = maxLife;
  rig.stunT = 0;

  const spin = (kx >= 0 ? 1 : -1) * clamp(Math.hypot(kx, ky) * 0.35, 1.8, 6.5);
  const kick = (n: RNode, vxAdd: number, vyAdd: number) => {
    n.ox = n.x - (n.x - n.ox) * 0.75 - vxAdd;
    n.oy = n.y - (n.y - n.oy) * 0.75 - vyAdd;
  };
  kick(rig.head, kx * 1.05 + spin * 0.5, ky * 0.9 - 3.6);
  kick(rig.chest, kx * 0.9, ky * 0.85 - 2.2);
  kick(rig.pelvis, kx * 0.78, ky * 0.8 - 1.4);
  kick(rig.lHand, kx * 1.2 + (Math.random() - 0.5) * 5, ky - 4);
  kick(rig.rHand, kx * 1.2 + (Math.random() - 0.5) * 5, ky - 4);
  kick(rig.lFoot, kx * 0.65 - spin * 0.5, ky * 0.65 + 1.5);
  kick(rig.rFoot, kx * 0.65 + spin * 0.5, ky * 0.65 + 1.5);
  return rig;
}

function findGroundY(
  x: number,
  pelvisY: number,
  defaultGroundY: number,
  platforms?: [number, number, number, number][]
): number {
  if (!platforms || platforms.length === 0) return defaultGroundY;
  let best = defaultGroundY;
  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (x >= p[0] - 4 && x <= p[0] + p[2] + 4) {
      if (p[1] >= pelvisY + 8 && p[1] <= pelvisY + 27 && p[1] < best + 6) {
        best = p[1];
      }
    }
  }
  return best;
}

export function stepActiveRagdoll(rig: RagdollRig, p: RagdollDriveParams) {
  const s = rig.scale;
  const g = p.gravity ?? 0.42;
  rig.dir = p.dir;

  if (rig.stunT > 0) rig.stunT--;

  // Smooth landing squash decay
  const targetSquash = p.sq > 0 ? clamp(p.sq * 0.65, 0, 7) : 0;
  rig.hipSquash += (targetSquash - rig.hipSquash) * 0.35;

  const stunRatio = rig.stunT > 0 ? rig.stunT / Math.max(1, rig.maxStun) : 0;
  // Stiffness drops sharply during stagger so the body visibly collapses/whiplashes
  const stiff = clamp(1 - stunRatio * 0.78, 0.16, 1.0);

  const nodes = [
    rig.pelvis,
    rig.chest,
    rig.head,
    rig.lKnee,
    rig.lFoot,
    rig.rKnee,
    rig.rFoot,
    rig.lElbow,
    rig.lHand,
    rig.rElbow,
    rig.rHand,
  ];
  for (let i = 0; i < nodes.length; i++) {
    integrateNode(nodes[i], 0.84, g * 0.34, 24);
  }

  // Pelvis anchor follows authoritative physics body
  const basePelvisX = p.x;
  const speedRatio = clamp(Math.abs(p.vx) / 3.8, 0, 1);
  const run = p.ground ? speedRatio : 0;
  const strideBob = p.ground
    ? -Math.abs(Math.cos(p.phase)) * 3.0 * run
    : Math.sin(p.time * 0.08 + rig.index) * 0.5;
  const basePelvisY = p.y + (7 + rig.hipSquash * 0.75) * s + strideBob * s;

  // Detect huge position jumps (e.g. portals / spawn) and teleport rig cleanly
  if (Math.hypot(basePelvisX - rig.pelvis.x, basePelvisY - rig.pelvis.y) > 75) {
    const dx = basePelvisX - rig.pelvis.x;
    const dy = basePelvisY - rig.pelvis.y;
    for (const n of nodes) {
      n.x += dx;
      n.y += dy;
      n.ox += dx;
      n.oy += dy;
    }
    for (const cn of rig.cloth) {
      cn.x += dx;
      cn.y += dy;
      cn.ox += dx;
      cn.oy += dy;
    }
  }

  pullNode(rig.pelvis, basePelvisX, basePelvisY, 0.65 + 0.25 * stiff);

  // Spine lean & head secondary spring
  const leanTarget = clamp(p.vx * 1.45 + p.dir * (run * 2.2), -10 * s, 10 * s);
  const chestTargetX = basePelvisX + leanTarget;
  const chestTargetY = basePelvisY - (17.2 - rig.hipSquash * 0.35) * s;
  pullNode(rig.chest, chestTargetX, chestTargetY, 0.38 * stiff);

  const headTargetX = rig.chest.x + leanTarget * 0.22 + p.dir * 1.0 * s;
  const headTargetY = rig.chest.y - 11.4 * s;
  pullNode(rig.head, headTargetX, headTargetY, 0.31 * stiff);

  // Feet & Knees: procedural active gait vs airborne flail vs wall-slide brace
  const groundY = p.y + 26 * s;
  const airFactor = p.ground ? 1 : 0.42;
  const legStiff = stiff * airFactor;

  if (p.wallSlide && p.wallSlide !== 0 && !p.ground) {
    const wx = basePelvisX + p.wallSlide * 9.5 * s;
    pullNode(rig.rFoot, wx, basePelvisY + 12 * s, 0.42 * stiff);
    pullNode(rig.lFoot, basePelvisX - p.wallSlide * 5 * s, basePelvisY + 18 * s, 0.35 * stiff);
    pullNode(rig.rKnee, basePelvisX + p.wallSlide * 3 * s, basePelvisY + 4 * s, 0.3 * stiff);
    pullNode(rig.lKnee, basePelvisX - p.wallSlide * 3 * s, basePelvisY + 9 * s, 0.3 * stiff);
  } else if (p.ground) {
    const sp0 = 5.6 * (1 - run) * s;
    const sinA = Math.sin(p.phase);
    const sinB = Math.sin(p.phase + Math.PI);
    const liftA = Math.max(0, Math.cos(p.phase)) * 10.5 * run * s;
    const liftB = Math.max(0, Math.cos(p.phase + Math.PI)) * 10.5 * run * s;

    const fxA = basePelvisX + sinA * 14.2 * run * s + sp0 * p.dir;
    const fxB = basePelvisX + sinB * 14.2 * run * s - sp0 * p.dir;
    const gYA = findGroundY(fxA, basePelvisY, groundY, p.platforms);
    const gYB = findGroundY(fxB, basePelvisY, groundY, p.platforms);

    pullNode(rig.rFoot, fxA, gYA - liftA, 0.56 * stiff);
    pullNode(rig.lFoot, fxB, gYB - liftB, 0.56 * stiff);

    // Knee forward anatomical hint
    pullNode(
      rig.rKnee,
      (rig.pelvis.x + rig.rFoot.x) * 0.5 + p.dir * 5.2 * s,
      (rig.pelvis.y + rig.rFoot.y) * 0.5 - liftA * 0.45,
      0.34 * stiff
    );
    pullNode(
      rig.lKnee,
      (rig.pelvis.x + rig.lFoot.x) * 0.5 + p.dir * 5.2 * s,
      (rig.pelvis.y + rig.lFoot.y) * 0.5 - liftB * 0.45,
      0.34 * stiff
    );
  } else {
    // Midair dynamic flail & velocity trail
    const airVel = clamp(0.75 + Math.hypot(p.vx, p.vy) * 0.075, 0.7, 1.85);
    const flailA = Math.sin(p.time * 0.42 + rig.index) * 5.2 * airVel * s;
    const flailB = Math.cos(p.time * 0.36 + rig.index * 1.4) * 4.5 * airVel * s;
    const tuck = p.vy < -1 ? -6.5 * s : 2.5 * s;

    pullNode(
      rig.rFoot,
      basePelvisX + 8.5 * p.dir * s - p.vx * 0.9 + flailA,
      basePelvisY + 15 * s + tuck - Math.abs(flailA) * 0.35,
      0.24 * legStiff + 0.12
    );
    pullNode(
      rig.lFoot,
      basePelvisX - 8.0 * p.dir * s - p.vx * 0.9 - flailB,
      basePelvisY + 17 * s + tuck * 0.6 + flailB * 0.3,
      0.24 * legStiff + 0.12
    );
    pullNode(
      rig.rKnee,
      (rig.pelvis.x + rig.rFoot.x) * 0.5 + p.dir * 6 * s,
      (rig.pelvis.y + rig.rFoot.y) * 0.5 - 2 * s,
      0.25 * stiff
    );
    pullNode(
      rig.lKnee,
      (rig.pelvis.x + rig.lFoot.x) * 0.5 + p.dir * 5 * s,
      (rig.pelvis.y + rig.lFoot.y) * 0.5 - 2 * s,
      0.25 * stiff
    );
  }

  // Arms & Weapon Grip Coupling
  if (p.handTarget1) {
    pullNode(rig.rHand, p.handTarget1[0], p.handTarget1[1], 0.64 * stiff);
    const ex = (rig.chest.x + rig.rHand.x) * 0.5 - p.dir * 3.5 * s;
    const ey = (rig.chest.y + rig.rHand.y) * 0.5 + 4.8 * s;
    pullNode(rig.rElbow, ex, ey, 0.34 * stiff);
  }

  if (p.twoHanded && p.handTarget2) {
    pullNode(rig.lHand, p.handTarget2[0], p.handTarget2[1], 0.58 * stiff);
    const ex2 = (rig.chest.x + rig.lHand.x) * 0.5 - p.dir * 3.2 * s;
    const ey2 = (rig.chest.y + rig.lHand.y) * 0.5 + 5.2 * s;
    pullNode(rig.lElbow, ex2, ey2, 0.32 * stiff);
  } else {
    // Counter-balance off-hand
    const offX =
      p.wallSlide && p.wallSlide !== 0 && !p.ground
        ? rig.chest.x + p.wallSlide * 11 * s
        : p.ground
        ? rig.chest.x + Math.sin(p.phase + Math.PI) * 12.5 * run * s - p.dir * 3.5 * s
        : rig.chest.x - p.dir * 9.5 * s - p.vx * 0.6;
    const offY =
      p.wallSlide && p.wallSlide !== 0 && !p.ground
        ? rig.chest.y - 6 * s
        : p.ground
        ? rig.chest.y + 12.5 * s
        : rig.chest.y - 3.5 * s + Math.cos(p.time * 0.35 + rig.index) * 4.5 * s;
    pullNode(rig.lHand, offX, offY, 0.38 * stiff);
    pullNode(
      rig.lElbow,
      (rig.chest.x + rig.lHand.x) * 0.5 - p.dir * 3.5 * s,
      (rig.chest.y + rig.lHand.y) * 0.5 + 3.5 * s,
      0.28 * stiff
    );
  }

  // Distance constraints (4 iterations for rock-solid stickman silhouette)
  const L_SPINE = 17.0 * s;
  const L_NECK = 11.4 * s;
  const L_LEG = 11.2 * s;
  const L_ARM = 10.6 * s;

  for (let it = 0; it < 4; it++) {
    solveDist(rig.pelvis, rig.chest, L_SPINE, 0.95, 0.3, 0.7);
    solveDist(rig.chest, rig.head, L_NECK, 0.92, 0.35, 0.65);
    // Keep head from collapsing into pelvis on heavy squash
    const hdx = rig.head.x - rig.pelvis.x;
    const hdy = rig.head.y - rig.pelvis.y;
    const hd = Math.hypot(hdx, hdy);
    if (hd < 22 * s && hd > 0.001) {
      const push = (22 * s - hd) * 0.35;
      rig.head.x += (hdx / hd) * push;
      rig.head.y += (hdy / hd) * push;
    }

    solveDist(rig.pelvis, rig.lKnee, L_LEG, 0.95, 0.25, 0.75);
    solveDist(rig.lKnee, rig.lFoot, L_LEG, 0.95, 0.45, 0.55);
    solveDist(rig.pelvis, rig.rKnee, L_LEG, 0.95, 0.25, 0.75);
    solveDist(rig.rKnee, rig.rFoot, L_LEG, 0.95, 0.45, 0.55);

    solveDist(rig.chest, rig.lElbow, L_ARM, 0.92, 0.25, 0.75);
    solveDist(rig.lElbow, rig.lHand, L_ARM, 0.92, 0.45, 0.55);
    solveDist(rig.chest, rig.rElbow, L_ARM, 0.92, 0.25, 0.75);
    solveDist(rig.rElbow, rig.rHand, L_ARM, 0.92, 0.45, 0.55);
  }

  // Trailing Verlet cloth/scarf ribbon
  if (rig.cloth.length > 0) {
    rig.cloth[0].x = rig.chest.x;
    rig.cloth[0].y = rig.chest.y - 1.5 * s;
    rig.cloth[0].ox = rig.cloth[0].x;
    rig.cloth[0].oy = rig.cloth[0].y;
    for (let i = 1; i < rig.cloth.length; i++) {
      integrateNode(rig.cloth[i], 0.86, 0.14 * s, 20);
      rig.cloth[i].x -= p.vx * 0.08;
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < rig.cloth.length - 1; i++) {
        solveDist(rig.cloth[i], rig.cloth[i + 1], 5.6 * s, 0.95, i === 0 ? 0 : 0.45, i === 0 ? 1 : 0.55);
      }
    }
  }
}

export function stepDeadRagdoll(
  rig: RagdollRig,
  platforms: [number, number, number, number][],
  gravity: number,
  arenaW: number,
  arenaH: number,
  hasWalls: boolean,
  bounceWalls = false
): boolean {
  rig.deadLife--;
  const s = rig.scale;
  const g = gravity * 0.72;
  const nodes: [RNode, number][] = [
    [rig.pelvis, 5.5 * s],
    [rig.chest, 5.5 * s],
    [rig.head, 9.7 * s],
    [rig.lKnee, 3.5 * s],
    [rig.lFoot, 3.5 * s],
    [rig.rKnee, 3.5 * s],
    [rig.rFoot, 3.5 * s],
    [rig.lElbow, 3.2 * s],
    [rig.lHand, 3.8 * s],
    [rig.rElbow, 3.2 * s],
    [rig.rHand, 3.8 * s],
  ];

  for (let i = 0; i < nodes.length; i++) {
    integrateNode(nodes[i][0], 0.985, g, 24);
  }

  const L_SPINE = 17.0 * s;
  const L_NECK = 11.4 * s;
  const L_LEG = 11.2 * s;
  const L_ARM = 10.6 * s;

  for (let it = 0; it < 5; it++) {
    solveDist(rig.pelvis, rig.chest, L_SPINE, 1);
    solveDist(rig.chest, rig.head, L_NECK, 1);
    solveDist(rig.pelvis, rig.lKnee, L_LEG, 1);
    solveDist(rig.lKnee, rig.lFoot, L_LEG, 1);
    solveDist(rig.pelvis, rig.rKnee, L_LEG, 1);
    solveDist(rig.rKnee, rig.rFoot, L_LEG, 1);
    solveDist(rig.chest, rig.lElbow, L_ARM, 1);
    solveDist(rig.lElbow, rig.lHand, L_ARM, 1);
    solveDist(rig.chest, rig.rElbow, L_ARM, 1);
    solveDist(rig.rElbow, rig.rHand, L_ARM, 1);

    // Collide joints against platforms & arena walls
    for (let i = 0; i < nodes.length; i++) {
      const [n, r] = nodes[i];
      if (hasWalls) {
        const rest = bounceWalls ? 0.75 : 0.38;
        if (n.x - r < 16) {
          const vx = n.x - n.ox;
          n.x = 16 + r;
          n.ox = n.x + vx * rest;
        } else if (n.x + r > arenaW - 16) {
          const vx = n.x - n.ox;
          n.x = arenaW - 16 - r;
          n.ox = n.x + vx * rest;
        }
      }

      for (let pi = 0; pi < platforms.length; pi++) {
        const p = platforms[pi];
        const nearX = clamp(n.x, p[0], p[0] + p[2]);
        const nearY = clamp(n.y, p[1], p[1] + p[3]);
        const dx = n.x - nearX;
        const dy = n.y - nearY;
        const dist = Math.hypot(dx, dy);
        if (dist < r) {
          const vx = n.x - n.ox;
          const vy = n.y - n.oy;
          if (dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            n.x = nearX + nx * r;
            n.y = nearY + ny * r;
            // Bounce + ground friction
            if (ny < -0.5) {
              n.ox = n.x - vx * 0.82;
              n.oy = n.y + Math.abs(vy) * 0.34;
            } else {
              n.ox = n.x + vx * 0.35;
              n.oy = n.y - vy * 0.88;
            }
          } else {
            n.y = p[1] - r;
            n.ox = n.x - vx * 0.8;
            n.oy = n.y + Math.abs(vy) * 0.3;
          }
        }
      }
    }
  }

  if (rig.cloth.length > 0) {
    rig.cloth[0].x = rig.chest.x;
    rig.cloth[0].y = rig.chest.y;
    for (let i = 1; i < rig.cloth.length; i++) {
      integrateNode(rig.cloth[i], 0.9, g * 0.5, 20);
    }
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < rig.cloth.length - 1; i++) {
        solveDist(rig.cloth[i], rig.cloth[i + 1], 5.6 * s, 0.95, i === 0 ? 0 : 0.45, i === 0 ? 1 : 0.55);
      }
    }
  }

  return rig.deadLife > 0 && rig.pelvis.y < arenaH + 140;
}

export interface DrawRagdollOptions {
  color: string;
  flash?: boolean;
  shield?: boolean;
  slow?: boolean;
  weapon?: WeaponId | 'none';
  hideWeapon?: boolean;
  weaponAngle?: number;
  weaponFlip?: number;
  gripOffset?: [number, number];
  muzzleOffset?: number;
  muzzleColor?: string;
  muzzleFlash?: number;
  twoHanded?: boolean;
  alpha?: number;
  time?: number;
}

export function drawRagdollStickman(
  ctx: CanvasRenderingContext2D,
  rig: RagdollRig,
  opts: DrawRagdollOptions
) {
  const s = rig.scale;
  const col = opts.flash ? '#ffffff' : opts.color;
  const look = PartyEconomy.look(rig.index);
  const isClassicOutfit = !look.outfit || look.outfit.id === 'classic' || look.outfit.id === 'default';
  const d = rig.dir || 1;
  const time = opts.time ?? Date.now() * 0.016;

  ctx.save();
  if (opts.alpha !== undefined && opts.alpha < 1) {
    ctx.globalAlpha *= opts.alpha;
  }

  if (opts.shield) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(rig.pelvis.x, rig.pelvis.y - 6 * s, 28 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (opts.slow) {
    ctx.save();
    ctx.strokeStyle = 'rgba(150,235,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rig.pelvis.x, rig.pelvis.y - 6 * s, 25 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Trailing Scarf / Speed Ribbon
  if ((look.accessory?.kind === 'scarf' || Math.hypot(rig.chest.x - rig.chest.ox, rig.chest.y - rig.chest.oy) > 4.5) && rig.cloth.length >= 3) {
    const scarfCol = look.accessory?.kind === 'scarf' ? '#ef4444' : col;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha *= look.accessory?.kind === 'scarf' ? 0.95 : 0.35;
    ctx.strokeStyle = scarfCol;
    ctx.lineWidth = look.accessory?.kind === 'scarf' ? 4.2 * s : 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(rig.cloth[0].x, rig.cloth[0].y);
    for (let i = 1; i < rig.cloth.length; i++) {
      ctx.lineTo(rig.cloth[i].x, rig.cloth[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Wings behind stickman
  if (look.accessory?.kind === 'wings') {
    PartyEconomy.drawAccessory(ctx, 'wings', rig.chest.x, rig.chest.y + 1 * s, 0.95 * s, d);
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawSegLimb = (
    a: RNode,
    b: RNode,
    c: RNode,
    width: number,
    footDir = 0
  ) => {
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      if (footDir !== 0) {
        const legAng = Math.atan2(c.y - b.y, c.x - b.x) - Math.PI / 2;
        const fx = Math.cos(legAng) * footDir * 4.2 * s;
        const fy = Math.sin(legAng) * footDir * 4.2 * s + 0.3 * s;
        ctx.lineTo(c.x + fx, c.y + fy);
      }
      ctx.stroke();
    };
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = width + 3.2 * s;
    trace();
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    trace();
  };

  // Back leg & Front leg
  drawSegLimb(rig.pelvis, rig.lKnee, rig.lFoot, 5.0 * s, d);
  drawSegLimb(rig.pelvis, rig.rKnee, rig.rFoot, 5.0 * s, d);

  if (!isClassicOutfit && !opts.flash) {
    PartyEconomy.drawFittedShorts(
      ctx,
      look.outfit,
      rig.pelvis.x,
      rig.pelvis.y,
      rig.lKnee.x,
      rig.lKnee.y,
      rig.rKnee.x,
      rig.rKnee.y,
      5.0 * s
    );
  }

  // Off-hand arm behind torso if single-handed
  if (!opts.twoHanded) {
    drawSegLimb(rig.chest, rig.lElbow, rig.lHand, 4.8 * s);
    if (!isClassicOutfit && !opts.flash) {
      PartyEconomy.drawFittedSleeve(
        ctx,
        look.outfit,
        rig.chest.x,
        rig.chest.y,
        rig.lElbow.x,
        rig.lElbow.y,
        4.8 * s
      );
    }
    ctx.fillStyle = col;
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.arc(rig.lHand.x, rig.lHand.y, 3.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Curved Spine from pelvis -> chest
  const midX = (rig.pelvis.x + rig.chest.x) * 0.5 - d * 1.4 * s;
  const midY = (rig.pelvis.y + rig.chest.y) * 0.5;
  ctx.beginPath();
  ctx.moveTo(rig.pelvis.x, rig.pelvis.y);
  ctx.quadraticCurveTo(midX, midY, rig.chest.x, rig.chest.y - 1 * s);
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 9.4 * s;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = 6.2 * s;
  ctx.stroke();

  if (!isClassicOutfit && !opts.flash) {
    PartyEconomy.drawOutfit(
      ctx,
      look.outfit,
      rig.pelvis.x,
      rig.pelvis.y,
      rig.chest.x,
      rig.chest.y - 0.5 * s,
      11.2 * s
    );
  }

  if (
    !opts.flash &&
    (look.accessory?.kind === 'scarf' ||
      look.accessory?.kind === 'bowtie' ||
      look.accessory?.kind === 'necklace')
  ) {
    PartyEconomy.drawAccessory(
      ctx,
      look.accessory.kind,
      rig.chest.x,
      rig.chest.y - 2 * s,
      0.9 * s,
      d
    );
  }

  // Iconic Eyeless Stick Fight Head with crisp solid ink outline
  const headR = 9.8 * s;
  ctx.save();
  ctx.beginPath();
  ctx.arc(rig.head.x, rig.head.y, headR, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 2.0 * s;
  ctx.stroke();

  if (!opts.flash) {
    ctx.beginPath();
    ctx.arc(rig.head.x - d * 2.2 * s, rig.head.y - 2.6 * s, headR * 0.56, Math.PI * 1.05, Math.PI * 1.85);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.4 * s;
    ctx.stroke();
  }
  ctx.restore();

  if (!opts.flash) {
    PartyEconomy.drawHeadgear(ctx, look, rig.head.x, rig.head.y, 1 * s, d);
  }

  // Draw equipped weapon locked to physical rHand
  if (opts.weapon && opts.weapon !== 'none' && opts.weapon !== 'fist' && !opts.hideWeapon) {
    const gOff = opts.gripOffset || [0, 0];
    const ang = opts.weaponAngle ?? 0;
    const sgn = opts.weaponFlip ?? d;
    ctx.save();
    ctx.translate(rig.rHand.x, rig.rHand.y);
    ctx.rotate(ang);
    ctx.scale(s, (Math.abs(sgn) < 0.05 ? (sgn < 0 ? -0.05 : 0.05) : sgn) * s);
    ctx.translate(-gOff[0], -gOff[1]);
    drawWeaponSprite(ctx, opts.weapon, time * 16.6);
    if ((opts.muzzleFlash || 0) > 0 && opts.muzzleOffset) {
      ctx.globalCompositeOperation = 'lighter';
      const m0 = opts.muzzleOffset;
      const r0 = 10 + (opts.muzzleFlash || 0) * 3;
      const g0 = ctx.createRadialGradient(m0, 0, 0, m0, 0, r0);
      g0.addColorStop(0, '#fff');
      g0.addColorStop(0.4, opts.muzzleColor || '#ffd54a');
      g0.addColorStop(1, 'rgba(255,160,0,0)');
      ctx.fillStyle = g0;
      ctx.beginPath();
      ctx.arc(m0, 0, r0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  // Lead Arm (rHand)
  drawSegLimb(rig.chest, rig.rElbow, rig.rHand, 4.8 * s);
  if (!isClassicOutfit && !opts.flash) {
    PartyEconomy.drawFittedSleeve(
      ctx,
      look.outfit,
      rig.chest.x,
      rig.chest.y,
      rig.rElbow.x,
      rig.rElbow.y,
      4.8 * s
    );
  }
  ctx.fillStyle = col;
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.arc(rig.rHand.x, rig.rHand.y, (opts.weapon === 'fist' ? 4.6 : 3.5) * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!opts.flash && look.accessory?.kind === 'bracelet') {
    PartyEconomy.drawAccessory(ctx, 'bracelet', rig.rHand.x, rig.rHand.y, 1 * s, d);
  }

  // Second Arm when two-handed weapon is gripped
  if (opts.twoHanded) {
    drawSegLimb(rig.chest, rig.lElbow, rig.lHand, 4.8 * s);
    if (!isClassicOutfit && !opts.flash) {
      PartyEconomy.drawFittedSleeve(
        ctx,
        look.outfit,
        rig.chest.x,
        rig.chest.y,
        rig.lElbow.x,
        rig.lElbow.y,
        4.8 * s
      );
    }
    ctx.fillStyle = col;
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.arc(rig.lHand.x, rig.lHand.y, 3.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
