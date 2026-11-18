import { PartyAudio } from './audio';
import { hexToRgba, PartyEconomy } from './economy';
import {
  ARENA_H,
  ARENA_MAPS,
  ARENA_W,
  ArenaMapDef,
  buildMapBackground,
  drawArenaPillar,
  drawArenaPlatform,
  drawIceBlock,
  getLaserState,
  getMovingBounds,
  getPendulumBob,
  randomMapKey,
  roundRectPath,
} from './maps';
import { drawShuriken, drawWeaponSprite } from './pngAssets';
import {
  applyRagdollImpulse,
  applyWeaponKickToRig,
  convertRigToDead,
  createRagdollRig,
  drawRagdollStickman,
  RagdollRig,
  stepActiveRagdoll,
  stepDeadRagdoll,
} from './ragdoll';
import {
  clearReleasedActions,
  inputPlayers,
  MapId,
  PLAYER_COLORS,
  PLAYER_NAMES,
  pollKeyboard,
  resetInputs,
  WeaponChoice,
  WeaponId,
} from './types';

const W = ARENA_W;
const H = ARENA_H;
const GRAV = 0.55;

const WD: Record<WeaponId, { cd: number; dur: number; hit?: number }> = {
  fist: { cd: 16, dur: 10, hit: 4 },
  sword: { cd: 22, dur: 14, hit: 6 },
  hammer: { cd: 60, dur: 28, hit: 15 },
  spear: { cd: 46, dur: 10, hit: 5 },
  gun: { cd: 16, dur: 8 },
  smg: { cd: 4, dur: 3 },
  shotgun: { cd: 48, dur: 12 },
  bow: { cd: 42, dur: 10 },
  bomb: { cd: 56, dur: 10 },
  mine: { cd: 70, dur: 8 },
  sniper: { cd: 90, dur: 14 },
  rocket: { cd: 78, dur: 14 },
  flame: { cd: 3, dur: 4 },
  axe: { cd: 40, dur: 20, hit: 10 },
  laser: { cd: 12, dur: 6 },
  shuriken: { cd: 30, dur: 8 },
  staff: { cd: 50, dur: 12 },
  frost: { cd: 20, dur: 8 },
  tesla: { cd: 44, dur: 10 },
  rifle: { cd: 6, dur: 4 },
  minigun: { cd: 2, dur: 3 },
  grenade: { cd: 64, dur: 12 },
  chainsaw: { cd: 5, dur: 5, hit: 1 },
  boomerang: { cd: 36, dur: 8 },
  katana: { cd: 12, dur: 9, hit: 3 },
};

const ME: Partial<Record<WeaponId, { d: number; kx: number; ky: number; r: number }>> = {
  sword: { d: 18, kx: 8, ky: -4, r: 66 },
  hammer: { d: 38, kx: 18, ky: -9, r: 62 },
  fist: { d: 7, kx: 5, ky: -2, r: 44 },
  axe: { d: 26, kx: 13, ky: -7, r: 58 },
  katana: { d: 11, kx: 6, ky: -3, r: 74 },
  chainsaw: { d: 5, kx: 2, ky: -1, r: 50 },
};

const AM: Record<WeaponId, number> = {
  fist: Infinity,
  sword: 30,
  hammer: 12,
  spear: 10,
  gun: 28,
  smg: 44,
  shotgun: 10,
  bow: 16,
  bomb: 5,
  mine: 4,
  sniper: 6,
  rocket: 5,
  flame: 120,
  axe: 16,
  laser: 34,
  shuriken: 14,
  staff: 10,
  frost: 22,
  tesla: 12,
  rifle: 40,
  minigun: 150,
  grenade: 6,
  chainsaw: 90,
  boomerang: 10,
  katana: 24,
};

const LIM = new Set<WeaponId>(['flame', 'mine']);
const BURST_DURATIONS: Partial<Record<WeaponId, number>> = {
  chainsaw: 210,
  minigun: 210,
  flame: 200,
  smg: 180,
  rifle: 180,
  laser: 180,
};
const MUZ: Partial<Record<WeaponId, number>> = {
  gun: 34, smg: 36, shotgun: 46, sniper: 64, rocket: 44, laser: 36,
  frost: 42, flame: 38, staff: 66, tesla: 46, rifle: 56, minigun: 60, grenade: 58,
};
const MUZC: Partial<Record<WeaponId, string>> = {
  gun: '#ffd54a', smg: '#ffd54a', shotgun: '#ffb02e', sniper: '#ff6a6a', rocket: '#ffb347',
  laser: '#4ff', frost: '#9df', flame: '#ff9a2e', staff: '#d58bff', tesla: '#8ff',
  rifle: '#ffd54a', minigun: '#ffd54a', grenade: '#ffb347',
};
const CAS = new Set<WeaponId>(['gun', 'smg', 'rifle', 'minigun', 'sniper', 'shotgun']);
const PC: Record<string, string> = { L: '#5ff', H: '#cfd8e0', O: '#c6f', Z: '#9df' };
const LOOTW: Record<string, number> = {
  sword: 10, hammer: 7, spear: 8, gun: 10, smg: 8, shotgun: 8, bow: 7, bomb: 8,
  mine: 5, sniper: 5, rocket: 4, flame: 6, axe: 8, laser: 8, shuriken: 7, staff: 6,
  frost: 6, tesla: 6, rifle: 8, minigun: 5, grenade: 4, chainsaw: 5, boomerang: 6, katana: 8,
};
const DM: Record<string, number> = { b: 11, p: 8, F: 3, s: 4, A: 30, S: 32, L: 12, H: 8, O: 22, Z: 5, r: 8, m: 2.6 };
const KB: Record<string, number> = { b: 4, p: 2.5, F: 1, s: 1.2, A: 6, S: 9, L: 3, H: 2, O: 9, Z: 1, r: 2.2, m: 0.8 };
const GR: Record<string, number[]> = {
  gun: [7, 9], smg: [20, 8, 32, 1], shotgun: [3, 2, 20, 6], sniper: [4, 2, 20, 3],
  rocket: [9, 13, 24, 4], flame: [12, 0], laser: [7, 11], frost: [7, 11], tesla: [7, 11],
  mine: [8, 2], bomb: [8, 0], bow: [6, 0], spear: [10, 0, 26, 0], staff: [6, 0, 22, 0],
  shuriken: [8, 0], rifle: [15, 9, 34, 3], minigun: [17, 12, 29, 11], grenade: [8, 10, 25, 10],
  chainsaw: [-3, 10, 13, 10], sword: [0, 0], katana: [0, 0], hammer: [4, 0], axe: [4, 0],
  boomerang: [12, 0],
};
const ONE_RANGED = new Set<WeaponId>(['gun', 'laser', 'frost', 'tesla', 'flame']);

export interface Fighter {
  index: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hw: number;
  hh: number;
  dir: number;
  aim: number;
  va: number;
  fs: number;
  hp: number;
  alive: boolean;
  ground: boolean;
  jumps: number;
  jh: boolean;
  highJ: boolean;
  coyoteT?: number;
  jumpBuf?: number;
  dropT: number;
  weapon: WeaponId;
  atkWeapon?: WeaponId;
  weapon0?: WeaponId;
  base: WeaponId;
  fuel: number;
  cd: number;
  atkT: number;
  atkP: number;
  hitDone: boolean;
  phase: number;
  inv: number;
  shield: number;
  empty: boolean;
  ammo: number;
  flash: number;
  recoil: number;
  slow: number;
  mf: number;
  sq: number;
  burstT: number;
  portalCd: number;
  score: number;
  leanX: number;
  leanVx: number;
  headX: number;
  headVx: number;
  headY: number;
  headVy: number;
  tilt: number;
  tiltV: number;
  prevVx: number;
  prevVy: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: string;
  o: number;
  l: number;
  hw?: number;
  hh?: number;
  arm?: number;
  bounce?: boolean;
  ground?: boolean;
  age?: number;
  hs?: Record<number, number>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  m: number;
  c: string;
  r: number;
  g: boolean;
}

interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  len: number;
  c: string;
}

interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  l: number;
  c?: string;
  pts?: [number, number][];
}

interface Crate {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hw: number;
  hh: number;
  w: WeaponId;
  ground?: boolean;
}

interface ExplosionFx {
  x: number;
  y: number;
  t: number;
  r?: number;
}

export interface IceBlockState {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  shake: number;
}

interface IceShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  pts: [number, number][];
  c: string;
  l: number;
  m: number;
}

interface BrassCasing {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  life: number;
  maxLife: number;
}

interface SlashTrail {
  pts: [number, number][];
  color: string;
  life: number;
  maxLife: number;
  width: number;
}

interface ImpactRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  life: number;
  maxLife: number;
}

interface AfterimageGhost {
  rig: RagdollRig;
  color: string;
  life: number;
  maxLife: number;
}

interface DamagePopup {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  big?: boolean;
}

export interface FightSerializedState {
  map: Exclude<MapId, 'random'>;
  cfg: { n: number; rounds: number; loot: boolean; rndMap: boolean; weps: WeaponChoice[] };
  fs: Fighter[];
  proj: Projectile[];
  beams: Beam[];
  fx: ExplosionFx[];
  crates: Crate[];
  parts: Particle[];
  debris: Debris[];
  ice?: IceBlockState[];
  t: number;
  cd: number;
  over: boolean;
  banner: number;
  bannerTxt: string;
  bannerCol: string;
  lavaY: number;
  round: number;
  gs: 'playing' | 'matchEnd';
  fightFlash?: number;
}

export interface FightCallbacks {
  onHudUpdate: (scores: number[], count: number, round: number, maxRounds: number) => void;
  onMatchEnd: (scores: number[], winnerIndices: number[]) => void;
  onSendNet?: () => void;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const jag = (x1: number, y1: number, x2: number, y2: number): [number, number][] => {
  const n = 10;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const q: [number, number][] = [[x1, y1]];
  for (let k = 1; k < n; k++) {
    const o = Math.random() * 22 - 11;
    q.push([x1 + (dx * k) / n + nx * o, y1 + (dy * k) / n + ny * o]);
  }
  q.push([x2, y2]);
  return q;
};

const rndWep = (): WeaponId => {
  const ks = Object.keys(LOOTW) as WeaponId[];
  let r = Math.random() * ks.reduce((a, k) => a + LOOTW[k], 0);
  for (const k of ks) {
    r -= LOOTW[k];
    if (r <= 0) return k;
  }
  return 'sword';
};

export class FightEngine {
  on = false;
  paused = false;
  netRole: 'host' | 'guest' | null = null;
  gameState: 'playing' | 'matchEnd' = 'playing';
  currentRound = 1;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private callbacks: FightCallbacks | null = null;
  private raf = 0;
  private last = 0;
  private acc = 0;

  private Mkey: Exclude<MapId, 'random'> = 'abandoned_city';
  private M: ArenaMapDef = ARENA_MAPS.abandoned_city;
  private bg: HTMLCanvasElement | null = null;

  private fs: Fighter[] = [];
  private beams: Beam[] = [];
  private parts: Particle[] = [];
  private debris: Debris[] = [];
  private proj: Projectile[] = [];
  private crates: Crate[] = [];
  private fx: ExplosionFx[] = [];
  private iceBlocks: IceBlockState[] = [];
  private iceShards: IceShard[] = [];
  private snow: { x: number; y: number; s: number; v: number }[] = [];
  private rigs: RagdollRig[] = [];
  private deadRagdolls: RagdollRig[] = [];
  private casings: BrassCasing[] = [];
  private slashTrails: SlashTrail[] = [];
  private rings: ImpactRing[] = [];
  private ghosts: AfterimageGhost[] = [];
  private popups: DamagePopup[] = [];
  private wallTouch: number[] = [0, 0, 0, 0];
  private hitStop = 0;
  private camX = W / 2;
  private camY = H / 2;
  private camZoom = 1;
  private lastHitKx = 0;
  private lastHitKy = 0;

  private t = 0;
  private shake = 0;
  private banner = 0;
  private bannerTxt = '';
  private bannerCol = '#fff';
  private cd = 0;
  private fightFlash = 0;
  private over = false;
  private lavaY = 760;
  private crateT = 0;
  private cfg: { n: number; rounds: number; weps: WeaponChoice[]; rndMap: boolean; loot: boolean } = {
    n: 2,
    rounds: 3,
    weps: ['sword', 'sword', 'sword', 'sword'],
    rndMap: false,
    loot: false,
  };

  private crateIcons = new Map<WeaponId, { image: HTMLCanvasElement; x: number; y: number; w: number; h: number }>();

  start(
    canvas: HTMLCanvasElement,
    map: MapId,
    n: number,
    rounds: number,
    weps: WeaponChoice[],
    loot: boolean,
    netRole: 'host' | 'guest' | null,
    callbacks: FightCallbacks
  ) {
    this.stop();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;
    this.netRole = netRole;

    const rm = map === 'random';
    this.setMap(rm ? randomMapKey() : map);
    this.cfg = { n, rounds: rounds || 3, weps: weps || [], rndMap: rm, loot };
    this.fs = [];
    this.currentRound = 1;
    this.paused = false;
    this.gameState = 'playing';
    this.snow = Array.from({ length: 70 }, () => ({
      x: rnd(0, W),
      y: rnd(0, H),
      s: rnd(0.7, 2.2),
      v: rnd(0.35, 1.25),
    }));

    PartyEconomy.beginMatch();
    this.newRound();
    this.on = true;
    this.last = 0;
    this.acc = 0;
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.on = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  restart() {
    PartyEconomy.beginMatch();
    this.fs.forEach((f) => {
      f.score = 0;
    });
    this.currentRound = 1;
    this.gameState = 'playing';
    this.paused = false;
    this.newRound();
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) resetInputs();
  }

  private setMap(k: Exclude<MapId, 'random'>) {
    this.Mkey = ARENA_MAPS[k] ? k : 'abandoned_city';
    this.M = ARENA_MAPS[this.Mkey];
    this.bg = buildMapBackground(this.M.style);
  }

  private giveWeapon(f: Fighter, w: WeaponId) {
    f.weapon = w;
    f.empty = false;
    f.ammo = this.cfg.loot || LIM.has(w) ? AM[w] : Infinity;
  }

  getFighterPos(index: number): { x: number; y: number } | null {
    const f = this.fs[index];
    if (!f || !f.alive) return null;
    return { x: f.x, y: f.y - 8 };
  }

  private spawnFighter(i: number, wep: WeaponId): Fighter {
    const s = this.M.sp[i];
    const p = this.M.pl[s[0]];
    return {
      index: i,
      color: PLAYER_COLORS[i],
      x: p[0] + p[2] * s[1],
      y: Math.min(-56, p[1] - 280) - i * 28,
      vx: 0,
      vy: 1.8,
      hw: 11,
      hh: 26,
      dir: i % 2 ? -1 : 1,
      aim: i % 2 ? Math.PI : 0,
      va: i % 2 ? Math.PI : 0,
      fs: i % 2 ? -1 : 1,
      hp: 100,
      alive: true,
      ground: false,
      jumps: 0,
      jh: false,
      highJ: false,
      coyoteT: 0,
      jumpBuf: 0,
      dropT: 0,
      weapon: wep,
      base: 'sword',
      fuel: 130,
      cd: 0,
      atkT: 0,
      atkP: 0,
      hitDone: true,
      phase: 0,
      inv: 0,
      shield: 90,
      empty: false,
      ammo: Infinity,
      flash: 0,
      recoil: 0,
      slow: 0,
      mf: 0,
      sq: 0,
      burstT: 0,
      portalCd: 0,
      score: this.fs[i] ? this.fs[i].score : 0,
      leanX: 0,
      leanVx: 0,
      headX: 0,
      headVx: 0,
      headY: 0,
      headVy: 0,
      tilt: 0,
      tiltV: 0,
      prevVx: 0,
      prevVy: 1.8,
    };
  }

  private newRound() {
    resetInputs();
    if (this.cfg.rndMap) this.setMap(randomMapKey());
    this.beams = [];
    this.proj = [];
    this.parts = [];
    this.debris = [];
    this.crates = [];
    this.fx = [];
    this.iceShards = [];
    this.deadRagdolls = [];
    this.casings = [];
    this.slashTrails = [];
    this.rings = [];
    this.ghosts = [];
    this.popups = [];
    this.wallTouch = [0, 0, 0, 0];
    this.hitStop = 0;
    this.camX = W / 2;
    this.camY = H / 2;
    this.camZoom = 1;
    this.iceBlocks = (this.M.ice || []).map((ic, idx) => ({
      id: idx,
      x: ic.x,
      y: ic.y,
      w: ic.w,
      h: ic.h,
      hp: ic.hp,
      maxHp: ic.hp,
      shake: 0,
    }));
    this.crateT = this.cfg.loot ? 60 : 260;
    this.lavaY = 760;
    this.over = false;
    this.banner = 0;
    this.t = 0;

    const scores = this.fs.map((f) => f.score);
    this.fs = [];
    this.rigs = [];
    for (let i = 0; i < this.cfg.n; i++) {
      let w0: WeaponChoice = this.cfg.loot ? 'fist' : this.cfg.weps[i] || 'sword';
      if (w0 === 'random') w0 = rndWep();
      const f = this.spawnFighter(i, w0);
      f.base = this.cfg.loot ? 'fist' : LIM.has(w0) ? 'sword' : w0;
      this.giveWeapon(f, w0);
      f.weapon0 = f.weapon;
      f.score = scores[i] || 0;
      this.fs.push(f);
      this.rigs.push(createRagdollRig(f.index, f.color, f.x, f.y, f.dir, 1));
    }
    this.cd = 120;
    this.fightFlash = 0;
    this.emitHud();
  }

  private emitHud() {
    this.callbacks?.onHudUpdate(
      this.fs.map((f) => f.score),
      this.cfg.n,
      this.currentRound,
      this.cfg.rounds
    );
  }

  serialize(): FightSerializedState {
    return {
      map: this.Mkey,
      cfg: {
        n: this.cfg.n,
        rounds: this.cfg.rounds,
        loot: this.cfg.loot,
        rndMap: this.cfg.rndMap,
        weps: this.cfg.weps,
      },
      fs: this.fs,
      proj: this.proj,
      beams: this.beams,
      fx: this.fx,
      crates: this.crates,
      parts: this.parts.length > 140 ? this.parts.slice(-140) : this.parts,
      debris: this.debris.length > 60 ? this.debris.slice(-60) : this.debris,
      ice: this.iceBlocks.length ? this.iceBlocks : undefined,
      t: this.t,
      cd: this.cd,
      over: this.over,
      banner: this.banner,
      bannerTxt: this.bannerTxt,
      bannerCol: this.bannerCol,
      lavaY: this.lavaY,
      round: this.currentRound,
      gs: this.gameState,
      fightFlash: this.fightFlash,
    };
  }

  apply(s: FightSerializedState) {
    if (!s) return;
    const prevCd = this.cd;
    const prevAlive = this.fs.map((f) => f.alive);
    if (this.Mkey !== s.map) this.setMap(s.map);
    this.cfg = s.cfg;
    this.fs = s.fs;
    if (s.round !== this.currentRound || this.rigs.length !== this.fs.length) {
      this.deadRagdolls = [];
      this.casings = [];
      this.slashTrails = [];
      this.rings = [];
      this.ghosts = [];
      this.popups = [];
      this.rigs = this.fs.map((f) => createRagdollRig(f.index, f.color, f.x, f.y, f.dir, 1));
    } else {
      for (let i = 0; i < this.fs.length; i++) {
        const f = this.fs[i];
        const rig = this.rigs[i];
        if (!rig) continue;
        if (prevAlive[i] && !f.alive) {
          this.deadRagdolls.push(convertRigToDead(rig, f.vx * 1.15, f.vy - 3, 210));
          this.rings.push({ x: f.x, y: f.y, r: 8, maxR: 62, color: f.color, life: 18, maxLife: 18 });
        }
        if (f.alive) {
          const hold = this.getWeaponHoldState(f, rig);
          stepActiveRagdoll(rig, {
            x: f.x,
            y: f.y,
            vx: f.vx,
            vy: f.vy,
            dir: f.dir,
            aim: f.va,
            ground: f.ground,
            phase: f.phase,
            sq: f.sq,
            recoil: f.recoil,
            atkT: f.atkT,
            atkP: f.atkP,
            weapon: f.weapon,
            twoHanded: hold.twoHanded,
            handTarget1: hold.hand1,
            handTarget2: hold.hand2,
            platforms: this.getAllPlatforms(),
            gravity: this.M.g || GRAV,
            time: s.t,
          });
        }
      }
    }
    this.proj = s.proj;
    this.beams = s.beams;
    this.fx = s.fx;
    this.crates = s.crates;
    this.parts = s.parts;
    this.debris = s.debris;
    if (s.ice) {
      for (const nextB of s.ice) {
        const prevB = this.iceBlocks.find((b) => b.id === nextB.id);
        if (prevB && prevB.hp > 0 && nextB.hp <= 0) {
          this.spawnIceShatter(nextB);
        }
      }
      this.iceBlocks = s.ice;
    } else {
      this.iceBlocks = [];
    }
    this.t = s.t;
    this.cd = s.cd;
    this.fightFlash = typeof s.fightFlash === 'number' ? s.fightFlash : prevCd > 0 && s.cd === 0 ? 52 : Math.max(0, this.fightFlash - 1);
    this.over = s.over;
    this.banner = s.banner;
    this.bannerTxt = s.bannerTxt;
    this.bannerCol = s.bannerCol;
    this.lavaY = s.lavaY;
    this.currentRound = s.round;
    this.emitHud();
    if (s.gs === 'matchEnd' && this.gameState !== 'matchEnd') {
      this.gameState = 'matchEnd';
      this.triggerMatchEnd();
    } else if (s.gs !== 'matchEnd') {
      this.gameState = s.gs;
    }
  }

  private triggerMatchEnd() {
    const scores = this.fs.map((f) => f.score);
    const maxS = Math.max(...scores, 0);
    const winners = this.fs.filter((f) => f.score === maxS).map((f) => f.index);
    this.callbacks?.onMatchEnd(scores, winners);
  }

  private getAllPlatforms(): [number, number, number, number][] {
    const list: [number, number, number, number][] = [...this.M.pl];
    if (this.M.pillars) {
      for (const pl of this.M.pillars) {
        list.push([pl.x, pl.y, pl.w, pl.h]);
      }
    }
    for (const ic of this.iceBlocks) {
      if (ic.hp > 0) list.push([ic.x, ic.y, ic.w, ic.h]);
    }
    if (this.M.moving) {
      for (const mv of this.M.moving) {
        list.push(getMovingBounds(mv, this.t));
      }
    }
    return list;
  }

  private spawnIceShatter(b: IceBlockState) {
    PartyAudio.play('ice');
    this.shake = Math.max(this.shake, 7.5);
    const cols = ['#3a8696', '#67e8f9', '#bae6fd', '#f8fafc'];
    const count = Math.max(10, Math.round(b.w / 18));
    for (let i = 0; i < count; i++) {
      const sx = b.x + ((i + 0.5) / count) * b.w + rnd(-8, 8);
      const sy = b.y + rnd(3, b.h - 3);
      const sz = rnd(9, 19);
      const pts: [number, number][] = [
        [-sz * rnd(0.6, 1), -sz * rnd(0.3, 0.7)],
        [sz * rnd(0.4, 1), -sz * rnd(0.4, 0.8)],
        [sz * rnd(0.5, 1.1), sz * rnd(0.3, 0.75)],
        [-sz * rnd(0.3, 0.9), sz * rnd(0.3, 0.7)],
      ];
      this.iceShards.push({
        x: sx,
        y: sy,
        vx: rnd(-4.5, 4.5),
        vy: rnd(-4.2, 2.4),
        a: rnd(0, 6.28),
        va: rnd(-0.2, 0.2),
        pts,
        c: cols[i % cols.length],
        l: 75,
        m: 75,
      });
    }
    this.burst(b.x + b.w / 2, b.y + b.h / 2, '#e0f2fe', 18, 5.5, 26, true);
  }

  private damageIceBlock(b: IceBlockState, dmg: number, hitX: number, hitY: number) {
    if (b.hp <= 0) return;
    b.hp = Math.max(0, b.hp - dmg);
    b.shake = Math.min(8, b.shake + 4.5);
    this.burst(hitX, hitY, '#bae6fd', 6, 3.2, 16, true);
    if (b.hp <= 0) {
      this.spawnIceShatter(b);
    } else {
      PartyAudio.play('iceCrack');
    }
  }

  private damageIceSegment(x0: number, y0: number, x1: number, y1: number, dmg: number) {
    for (const b of this.iceBlocks) {
      if (b.hp > 0 && this.segRect(x0, y0, x1, y1, [b.x - 2, b.y - 2, b.w + 4, b.h + 4])) {
        this.damageIceBlock(b, dmg, x1, y1);
      }
    }
  }

  private damageIceRadius(x: number, y: number, r: number, dmg: number) {
    for (const b of this.iceBlocks) {
      if (b.hp <= 0) continue;
      const cx = Math.max(b.x, Math.min(x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(y, b.y + b.h));
      const d = Math.hypot(x - cx, y - cy);
      if (d < r) {
        const k = Math.max(0.45, 1 - d / r);
        this.damageIceBlock(b, dmg * k, cx, cy);
      }
    }
  }

  private getBlockingWallRects(): [number, number, number, number][] {
    if (!this.M.walls && !this.M.bounceWalls) return [];
    return [
      [0, -60, 16, H + 120],
      [W - 16, -60, 16, H + 120],
    ];
  }

  private inRect(x: number, y: number): boolean {
    if ((this.M.walls || this.M.bounceWalls) && (x <= 16 || x >= W - 16)) {
      return true;
    }
    return this.getAllPlatforms().some(
      (p) => x > p[0] && x < p[0] + p[2] && y > p[1] && y < p[1] + p[3]
    );
  }

  private segRect(x0: number, y0: number, x1: number, y1: number, r: [number, number, number, number]): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    let t0 = 0;
    let t1 = 1;
    const p = [-dx, dx, -dy, dy];
    const q = [x0 - r[0], r[0] + r[2] - x0, y0 - r[1], r[1] + r[3] - y0];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return false;
      } else {
        const tt = q[i] / p[i];
        if (p[i] < 0) {
          if (tt > t1) return false;
          if (tt > t0) t0 = tt;
        } else {
          if (tt < t0) return false;
          if (tt < t1) t1 = tt;
        }
      }
    }
    return true;
  }

  private segFighter(x0: number, y0: number, x1: number, y1: number, f: Fighter, pad: number): boolean {
    return this.segRect(x0, y0, x1, y1, [
      f.x - f.hw - pad,
      f.y - f.hh - pad,
      f.hw * 2 + pad * 2,
      f.hh * 2 + pad * 2,
    ]);
  }

  private ov(o: { x: number; y: number; hw: number; hh: number }, p: [number, number, number, number]): boolean {
    return o.x + o.hw > p[0] && o.x - o.hw < p[0] + p[2] && o.y + o.hh > p[1] && o.y - o.hh < p[1] + p[3];
  }

  private burst(x: number, y: number, c: string, n: number, sp: number, life: number, g: boolean) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283);
      const s = rnd(0.3, 1) * sp;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, l: life, m: life, c, r: rnd(1.5, 4), g });
    }
  }

  private kill(f: Fighter, kx = 0, ky = 0) {
    if (!f.alive) return;
    f.alive = false;
    this.shake = Math.max(this.shake, 13);
    this.hitStop = Math.max(this.hitStop, 4);
    const killKx = kx || this.lastHitKx || f.vx;
    const killKy = ky || this.lastHitKy || f.vy - 3;
    const rig = this.rigs[f.index];
    if (rig) {
      this.deadRagdolls.push(convertRigToDead(rig, killKx, killKy, 240));
    }
    this.rings.push({ x: f.x, y: f.y, r: 10, maxR: 72, color: f.color, life: 20, maxLife: 20 });
    this.popups.push({
      x: f.x,
      y: f.y - 26,
      vx: rnd(-0.4, 0.4),
      vy: -1.8,
      text: 'KO!',
      color: f.color,
      life: 44,
      maxLife: 44,
      big: true,
    });
    this.burst(f.x, f.y, f.color, 26, 7.2, 46, true);
    this.burst(f.x, f.y, '#ff2e4c', 12, 5.4, 52, false);
  }

  private hurt(f: Fighter, dmg: number, kx: number, ky: number, px?: number, py?: number, force?: boolean) {
    if (!f.alive || f.shield > 0 || (f.inv > 0 && !force)) return;
    f.hp -= dmg;
    f.vx += kx;
    f.vy += ky;
    this.lastHitKx = kx;
    this.lastHitKy = ky;
    // Active ragdoll whiplash + temporary balance-break stun
    f.leanVx -= kx * 0.55;
    f.headVx -= kx * 0.85;
    f.headVy -= Math.min(6, Math.abs(ky) * 0.45 + 2.2);
    f.tiltV += Math.sign(kx || 1) * Math.min(0.28, Math.abs(kx) * 0.028);
    const rig = this.rigs[f.index];
    const stunFrames = dmg >= 14 || Math.hypot(kx, ky) >= 6.5 ? Math.min(22, Math.round(dmg * 0.45 + Math.hypot(kx, ky) * 0.45)) : 4;
    if (rig) {
      applyRagdollImpulse(rig, kx, ky, stunFrames, py);
    }
    f.flash = 6;
    f.inv = force ? 2 : 6;
    this.shake = Math.max(this.shake, 3.5 + dmg / 5);
    if (dmg >= 22) {
      this.hitStop = Math.max(this.hitStop, dmg >= 36 ? 4 : 2);
      this.rings.push({ x: px ?? f.x, y: py ?? f.y, r: 6, maxR: 42, color: '#ffffff', life: 12, maxLife: 12 });
    }
    this.popups.push({
      x: (px ?? f.x) + rnd(-6, 6),
      y: (py ?? f.y) - 22,
      vx: kx * 0.08,
      vy: -1.4,
      text: `-${Math.max(1, Math.round(dmg))}`,
      color: dmg >= 28 ? '#fde047' : '#ffffff',
      life: 32,
      maxLife: 32,
    });
    PartyAudio.play('hit');
    this.burst(px ?? f.x, py ?? f.y, '#ff3b5c', 8, 4.8, 28, false);
    if (f.hp <= 0) this.kill(f, kx * 1.15, ky - 2.5);
  }

  private updateFighterSprings(f: Fighter, inpX = 0) {
    const pvx = typeof f.prevVx === 'number' ? f.prevVx : f.vx;
    const pvy = typeof f.prevVy === 'number' ? f.prevVy : f.vy;
    const dvx = f.vx - pvx;
    const dvy = f.vy - pvy;
    f.prevVx = f.vx;
    f.prevVy = f.vy;

    const air = !f.ground;
    const speedRatio = Math.min(1, Math.abs(f.vx) / 3.4);
    const run = f.ground ? speedRatio : 0;

    // 1. Torso horizontal spring lag + acceleration whip
    const targetLean = Math.max(-9, Math.min(9, f.vx * 1.32 + inpX * 1.4));
    f.leanVx = ((f.leanVx || 0) + (targetLean - (f.leanX || 0)) * 0.25 - dvx * 0.82) * 0.75;
    f.leanX = Math.max(-13, Math.min(13, (f.leanX || 0) + f.leanVx));

    // 2. Head secondary spring pendulum (lags behind torso & snaps on braking/knockback)
    const targetHeadX = f.leanX * 1.18;
    f.headVx = ((f.headVx || 0) + (targetHeadX - (f.headX || 0)) * 0.21 - dvx * 1.05) * 0.73;
    f.headX = Math.max(-16, Math.min(16, (f.headX || 0) + f.headVx));

    // 3. Head vertical bounce (run stride bob + jump/fall stretch + landing squash)
    const targetHeadY = air
      ? Math.max(-4.5, Math.min(5.5, -f.vy * 0.34))
      : -Math.abs(Math.cos(f.phase)) * 3.2 * run;
    f.headVy = ((f.headVy || 0) + (targetHeadY - (f.headY || 0)) * 0.26 - dvy * 0.55) * 0.72;
    f.headY = Math.max(-9, Math.min(11, (f.headY || 0) + f.headVy));

    // 4. Body pitch tilt (leans forward on sprint, tilts dynamically with air velocity/knockback)
    const targetTilt = air
      ? Math.max(-0.46, Math.min(0.46, f.vx * 0.052))
      : Math.max(-0.24, Math.min(0.24, f.vx * 0.036));
    f.tiltV = ((f.tiltV || 0) + (targetTilt - (f.tilt || 0)) * 0.22 + dvx * 0.02) * 0.78;
    f.tilt = Math.max(-0.62, Math.min(0.62, (f.tilt || 0) + f.tiltV));

    // Snappy Stick Fight stride phase driven by real horizontal speed
    f.phase += Math.abs(f.vx) * 0.165;
  }

  private boom(x: number, y: number, R = 130, D = 55, kbScale = 1) {
    PartyAudio.play('boom');
    this.fx.push({ x, y, t: 0, r: R });
    this.rings.push({ x, y, r: 10, maxR: R * 0.95, color: '#fbbf24', life: 16, maxLife: 16 });
    this.shake = Math.max(this.shake, 17);
    this.burst(x, y, '#fef08a', 26, 10.5, 42, true);
    this.burst(x, y, '#ffb02e', 34, 8.5, 46, true);
    this.burst(x, y, '#ff5a1f', 24, 6.2, 42, true);
    this.damageIceRadius(x, y, R * 0.92, D * 1.25);
    for (const f of this.fs) {
      if (!f.alive) continue;
      const dx = f.x - x;
      const dy = f.y - y;
      const d = Math.hypot(dx, dy);
      if (d < R) {
        const k = 1 - d / R;
        f.inv = 0;
        this.hitStop = Math.max(this.hitStop, 3);
        this.hurt(
          f,
          D * k,
          (dx / (d || 1)) * 16 * kbScale * k,
          (dy / (d || 1)) * 12 * kbScale * k - 6.8 * kbScale * k,
          f.x,
          f.y
        );
      }
    }
  }

  private assistedAim(f: Fighter): number {
    const inp = inputPlayers[f.index];
    if (inp && Math.hypot(inp.x, inp.y) > 0.35) return f.aim;
    let best: number | null = null;
    let bs = 1e9;
    for (const o of this.fs) {
      if (!o.alive || o === f) continue;
      const dx = o.x - f.x;
      const dy = o.y - f.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 560 || dist < 8) continue;
      let da = Math.atan2(dy, dx) - f.aim;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      if (Math.abs(da) < 0.38) {
        const score = dist + Math.abs(da) * 180;
        if (score < bs) {
          bs = score;
          best = f.aim + da * 0.7;
        }
      }
    }
    return best === null ? f.aim : best;
  }

  private moveBody(o: { x: number; y: number; vx: number; vy: number; hw: number; hh: number; ground?: boolean; jumps?: number; dropT?: number; bounce?: boolean; index?: number }) {
    const pls = this.getAllPlatforms();
    const steps = Math.min(10, Math.max(1, Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) / 5)));
    let dx = o.vx / steps;
    let dy = o.vy / steps;
    let hitGround = false;
    let wallDir = 0;

    const hasWalls = !!(this.M.walls || this.M.bounceWalls);
    const pad = hasWalls ? 16 : 0;
    const lo = pad + o.hw;
    const hi = W - pad - o.hw;

    for (let s = 0; s < steps; s++) {
      o.x += dx;
      for (const p of pls) {
        if (this.ov(o, p)) {
          if (dx > 0 || (dx === 0 && o.x < p[0] + p[2] / 2)) {
            o.x = p[0] - o.hw;
            wallDir = 1;
          } else {
            o.x = p[0] + p[2] + o.hw;
            wallDir = -1;
          }
          o.vx = o.bounce ? -o.vx * 0.5 : 0;
          dx = o.vx / steps;
        }
      }

      if (o.x < lo) {
        o.x = lo;
        if (hasWalls) wallDir = -1;
        o.vx = this.M.bounceWalls ? Math.max(5.5, -o.vx * 0.85) : o.bounce ? -o.vx * 0.5 : 0;
        dx = o.vx / steps;
      } else if (o.x > hi) {
        o.x = hi;
        if (hasWalls) wallDir = 1;
        o.vx = this.M.bounceWalls ? Math.min(-5.5, -o.vx * 0.85) : o.bounce ? -o.vx * 0.5 : 0;
        dx = o.vx / steps;
      }

      const prevBottom = o.y + o.hh;
      const prevTop = o.y - o.hh;
      o.y += dy;

      if (hasWalls && o.y - o.hh < 4 && o.vy < 0) {
        o.y = 4 + o.hh;
        o.vy = this.M.bounceWalls ? Math.max(3, -o.vy * 0.5) : o.bounce ? -o.vy * 0.45 : 0;
        dy = o.vy / steps;
      }

      for (const p of pls) {
        if (this.ov(o, p)) {
          if (prevBottom <= p[1] + 10 && o.vy >= 0) {
            o.y = p[1] - o.hh;
            hitGround = true;
            o.vy = o.bounce && Math.abs(o.vy) > 2 ? -o.vy * 0.45 : 0;
            dy = o.vy / steps;
          } else if (prevTop >= p[1] + p[3] - 10 && o.vy < 0) {
            o.y = p[1] + p[3] + o.hh;
            o.vy = o.bounce ? -o.vy * 0.45 : 0;
            dy = o.vy / steps;
          } else {
            if (o.x < p[0] + p[2] / 2) {
              o.x = p[0] - o.hw;
              wallDir = 1;
            } else {
              o.x = p[0] + p[2] + o.hw;
              wallDir = -1;
            }
            o.vx = o.bounce ? -o.vx * 0.5 : 0;
            dx = o.vx / steps;
          }
        }
      }
    }

    // Final minimum-penetration push-out guarantee for all solid structures
    for (const p of pls) {
      if (this.ov(o, p)) {
        const penLeft = o.x + o.hw - p[0];
        const penRight = p[0] + p[2] - (o.x - o.hw);
        const penTop = o.y + o.hh - p[1];
        const penBot = p[1] + p[3] - (o.y - o.hh);
        const minPen = Math.min(penLeft, penRight, penTop, penBot);
        if (minPen === penTop) {
          o.y = p[1] - o.hh;
          if (o.vy > 0) o.vy = 0;
          hitGround = true;
        } else if (minPen === penBot) {
          o.y = p[1] + p[3] + o.hh;
          if (o.vy < 0) o.vy = 0;
        } else if (minPen === penLeft) {
          o.x = p[0] - o.hw;
          if (o.vx > 0) o.vx = 0;
        } else {
          o.x = p[0] + p[2] + o.hw;
          if (o.vx < 0) o.vx = 0;
        }
      }
    }

    if (o.x < lo) o.x = lo;
    else if (o.x > hi) o.x = hi;

    o.ground = hitGround;
    if (typeof o.index === 'number') {
      this.wallTouch[o.index] = hitGround ? 0 : wallDir;
    }
  }

  private attack0(f: Fighter) {
    const wp = f.weapon;
    const w = WD[wp];
    const a = this.assistedAim(f);
    const ax = Math.cos(a);
    const ay = Math.sin(a);
    const d = f.dir;
    f.cd = w.cd;
    f.atkT = w.dur;
    f.hitDone = false;
    f.atkWeapon = wp;

    const hx = f.x + ax * 18;
    const hy = f.y - 8 + ay * 18;
    const mx = (n: number) => hx + ax * n;
    const my = (n: number) => hy + ay * n;
    const sh = (spd: number, spr: number) => {
      const b = a + rnd(-spr, spr);
      return [Math.cos(b) * spd, Math.sin(b) * spd];
    };

    if (wp === 'gun') {
      const [vx, vy] = sh(16, 0.04);
      this.proj.push({ x: mx(22), y: my(22), vx, vy, t: 'b', o: f.index, l: 52 });
      f.vx -= ax * 1.2;
      f.recoil = 1;
      this.burst(mx(28), my(28), '#ffd54a', 5, 3, 8, true);
    } else if (wp === 'shotgun') {
      for (let i = 0; i < 6; i++) {
        const [vx, vy] = sh(rnd(13, 17), 0.2);
        this.proj.push({ x: mx(22), y: my(22), vx, vy, t: 'p', o: f.index, l: 22 });
      }
      f.vx -= ax * 11;
      f.vy -= ay * 9;
      f.recoil = 1;
      this.shake = Math.max(this.shake, 6);
      this.burst(mx(30), my(30), '#ffd54a', 10, 5, 10, true);
    } else if (wp === 'sniper') {
      let x = mx(30);
      let y = my(30);
      const hit = new Set<Fighter>();
      for (let i = 0; i < 230; i++) {
        const px = x;
        const py = y;
        x += ax * 6;
        y += ay * 6;
        if (x < -10 || x > W + 10 || y < -60 || y > H + 60) break;
        if (this.inRect(x, y)) {
          this.damageIceSegment(px, py, x, y, 52);
          break;
        }
        for (const o of this.fs) {
          if (o.alive && o !== f && !hit.has(o) && Math.abs(o.x - x) < o.hw + 3 && Math.abs(o.y - y) < o.hh) {
            hit.add(o);
            this.hurt(o, 55, ax * 15, ay * 10 - 4, x, y);
          }
        }
      }
      this.beams.push({ x1: mx(30), y1: my(30), x2: x, y2: y, l: 14 });
      f.vx -= ax * 6;
      f.vy -= ay * 3;
      f.recoil = 1.5;
      this.shake = Math.max(this.shake, 7);
      this.burst(mx(34), my(34), '#ff6a6a', 8, 5, 10, true);
    } else if (wp === 'rocket') {
      this.proj.push({ x: mx(24), y: my(24), vx: ax * 7, vy: ay * 7, t: 'R', o: f.index, l: 140 });
      f.vx -= ax * 2;
      f.recoil = 1;
      this.burst(mx(-10), my(-10), '#ddd', 6, 3, 16, false);
    } else if (wp === 'flame') {
      for (let k = 0; k < 2; k++) {
        const b = a + rnd(-0.12, 0.12);
        const s2 = rnd(5.5, 8);
        this.proj.push({ x: mx(26), y: my(26), vx: Math.cos(b) * s2 + f.vx * 0.3, vy: Math.sin(b) * s2, t: 'F', o: f.index, l: 24 });
      }
    } else if (wp === 'smg') {
      const [vx, vy] = sh(15, 0.06);
      this.proj.push({ x: mx(22), y: my(22), vx, vy, t: 's', o: f.index, l: 36 });
      f.vx -= ax * 1.0;
      f.vy -= ay * 0.2;
      f.recoil = Math.min(1.6, f.recoil + 0.8);
      this.shake = Math.max(this.shake, 2.4);
      this.burst(mx(30), my(30), '#ffd54a', 3, 3, 6, true);
    } else if (wp === 'bow') {
      this.proj.push({ x: mx(18), y: my(18) - 2, vx: ax * 13, vy: ay * 13 - 1.2, t: 'A', o: f.index, l: 100 });
      f.recoil = 0.8;
    } else if (wp === 'mine') {
      this.proj.push({ x: f.x + d * 14, y: f.y + 8, vx: d * 2.5, vy: -3, t: 'M', o: f.index, l: 1600, hw: 6, hh: 6, arm: 45 });
    } else if (wp === 'spear') {
      const [vx, vy] = sh(17, 0.02);
      this.proj.push({ x: mx(30), y: my(30), vx, vy, t: 'S', o: f.index, l: 70 });
      f.recoil = 0.6;
    } else if (wp === 'rifle') {
      const [vx, vy] = sh(18, 0.03);
      this.proj.push({ x: mx(26), y: my(26), vx, vy, t: 'r', o: f.index, l: 48 });
      f.vx -= ax * 1.3;
      f.vy -= ay * 0.25;
      f.recoil = Math.min(1.8, f.recoil + 0.9);
      this.shake = Math.max(this.shake, 2.8);
      this.burst(mx(34), my(34), '#ffd54a', 3, 3, 8, true);
    } else if (wp === 'minigun') {
      const [vx, vy] = sh(17, 0.09);
      this.proj.push({ x: mx(30), y: my(30), vx, vy, t: 'm', o: f.index, l: 38 });
      f.vx -= ax * 1.1;
      f.vy -= ay * 0.35;
      f.recoil = Math.min(1.8, f.recoil + 0.9);
      this.shake = Math.max(this.shake, 3.2);
      this.burst(mx(38), my(38), '#ffd54a', 2, 3, 6, true);
    } else if (wp === 'grenade') {
      this.proj.push({ x: mx(30), y: my(30), vx: ax * 11 + f.vx * 0.3, vy: ay * 11 - 2, t: 'N', o: f.index, l: 90, hw: 7, hh: 7, bounce: true });
      f.vx -= ax * 3;
      f.vy -= ay * 1.5;
      f.recoil = 1.4;
      this.shake = Math.max(this.shake, 5);
      this.burst(mx(36), my(36), '#bbb', 8, 4, 16, false);
    } else if (wp === 'chainsaw') {
      f.recoil = 0.3;
      f.vx += ax * 0.8;
    } else if (wp === 'katana') {
      f.vx += ax * 8;
      f.vy += ay * 2;
    } else if (wp === 'boomerang') {
      this.proj.push({ x: mx(16), y: my(16), vx: ax * 12 + f.vx * 0.3, vy: ay * 12, t: 'Y', o: f.index, l: 200, age: 0 });
      f.recoil = 0.3;
    } else if (wp === 'axe') {
      f.vx += ax * 5;
      f.vy += ay * 2;
    } else if (wp === 'laser') {
      const [vx, vy] = sh(20, 0.02);
      this.proj.push({ x: mx(26), y: my(26), vx, vy, t: 'L', o: f.index, l: 50 });
      f.recoil = 0.5;
      this.burst(mx(34), my(34), '#4ff', 4, 3, 8, true);
    } else if (wp === 'shuriken') {
      for (const o of [-0.16, 0, 0.16]) {
        const b = a + o;
        this.proj.push({ x: mx(16), y: my(16), vx: Math.cos(b) * 12, vy: Math.sin(b) * 12, t: 'H', o: f.index, l: 60 });
      }
      f.recoil = 0.6;
    } else if (wp === 'staff') {
      this.proj.push({ x: mx(40), y: my(40), vx: ax * 5, vy: ay * 5, t: 'O', o: f.index, l: 150 });
      f.recoil = 0.8;
      this.burst(mx(40), my(40), '#d58bff', 10, 4, 14, true);
    } else if (wp === 'frost') {
      const [vx, vy] = sh(11, 0.05);
      this.proj.push({ x: mx(30), y: my(30), vx, vy, t: 'Z', o: f.index, l: 60 });
      f.recoil = 0.6;
      this.burst(mx(34), my(34), '#9df', 6, 3, 12, true);
    } else if (wp === 'tesla') {
      const sx = mx(30);
      const sy = my(30);
      let tg: Fighter | null = null;
      let bd = 1e9;
      for (const o of this.fs) {
        if (o.alive && o !== f) {
          const dx = o.x - f.x;
          const dy = o.y - f.y;
          const pr = dx * ax + dy * ay;
          const pp = Math.abs(dx * ay - dy * ax);
          if (pr > -10 && pr < 300 && pp < 54 && pr < bd) {
            bd = pr;
            tg = o;
          }
        }
      }
      if (tg) {
        this.hurt(tg, 20, ax * 8, ay * 5 - 4, tg.x, tg.y);
        this.beams.push({ x1: sx, y1: sy, x2: tg.x, y2: tg.y, l: 12, c: '#8ff', pts: jag(sx, sy, tg.x, tg.y) });
        let t2: Fighter | null = null;
        let b2 = 1e9;
        for (const o of this.fs) {
          if (o.alive && o !== f && o !== tg) {
            const dd = Math.hypot(o.x - tg.x, o.y - tg.y);
            if (dd < 170 && dd < b2) {
              b2 = dd;
              t2 = o;
            }
          }
        }
        if (t2) {
          this.hurt(t2, 12, Math.sign(t2.x - tg.x) * 5, -4, t2.x, t2.y);
          this.beams.push({ x1: tg.x, y1: tg.y, x2: t2.x, y2: t2.y, l: 12, c: '#8ff', pts: jag(tg.x, tg.y, t2.x, t2.y) });
        }
      } else {
        const ex = sx + ax * 150;
        const ey = sy + ay * 150;
        this.beams.push({ x1: sx, y1: sy, x2: ex, y2: ey, l: 8, c: '#8ff', pts: jag(sx, sy, ex, ey) });
      }
      f.recoil = 0.6;
      this.burst(sx, sy, '#8ff', 6, 4, 10, true);
      this.shake = Math.max(this.shake, 3);
    } else if (wp === 'sword') {
      f.vx += ax * 6;
      f.vy += ay * 3;
    } else if (wp === 'bomb') {
      this.proj.push({ x: hx, y: hy - 6, vx: ax * 7 + f.vx * 0.5, vy: ay * 7 - 5, t: 'B', o: f.index, l: 80, hw: 7, hh: 7, bounce: true, arm: 12 });
    }

    if (MUZ[wp]) {
      f.mf = 4;
      if (CAS.has(wp)) PartyAudio.play('shot');
    }
    if (CAS.has(wp)) {
      this.casings.push({
        x: hx + ax * 4,
        y: hy - 5,
        vx: -d * rnd(1.5, 3.4) - ax * 0.6,
        vy: -rnd(2.8, 5.2),
        a: rnd(0, 6.28),
        va: -d * rnd(0.22, 0.45),
        life: 62,
        maxLife: 62,
      });
    }
  }

  private attack(f: Fighter) {
    const prevRec = f.recoil;
    this.attack0(f);
    const kick = Math.max(0, f.recoil - prevRec * 0.5);
    const rig = this.rigs[f.index];
    if (kick > 0.15) {
      const ca = Math.cos(f.aim);
      f.leanVx = (f.leanVx || 0) - ca * kick * 1.45;
      f.headVx = (f.headVx || 0) - ca * kick * 1.9;
      f.tiltV = (f.tiltV || 0) - ca * kick * 0.038;
      if (rig) {
        const g = GR[f.weapon] || [0, 0];
        applyWeaponKickToRig(rig, f.aim, kick * 4.2, g.length > 2);
      }
    }
    if (ME[f.weapon] && rig) {
      applyWeaponKickToRig(rig, f.aim + Math.PI, f.weapon === 'hammer' || f.weapon === 'axe' ? 5.2 : 3.2, (GR[f.weapon] || []).length > 2);
    }
    if (f.ammo !== Infinity && --f.ammo <= 0) f.empty = true;
  }

  private meleeHit(f: Fighter, wp?: WeaponId) {
    const w = wp || f.atkWeapon || f.weapon;
    const m = ME[w];
    if (!m) return;
    const a = this.assistedAim(f);
    const ax = Math.cos(a);
    const ay = Math.sin(a);
    for (const o of this.fs) {
      if (o === f || !o.alive) continue;
      const dx = o.x - f.x;
      const dy = o.y - f.y;
      const pr = dx * ax + dy * ay;
      const pp = Math.abs(dx * ay - dy * ax);
      if (pr > -14 && pr < m.r + 16 && pp < 50) {
        this.hurt(o, m.d, ax * m.kx, ay * m.kx * 0.6 + m.ky, o.x, o.y, true);
      }
    }
    this.damageIceRadius(f.x + ax * (m.r * 0.65), f.y - 4 + ay * (m.r * 0.65), m.r * 0.72, m.d * 1.15);
    if (w === 'chainsaw') this.burst(f.x + ax * 52, f.y - 8 + ay * 52, '#ffd54a', 3, 5, 10, true);
    if (w === 'hammer') {
      this.shake = Math.max(this.shake, 11);
      this.rings.push({ x: f.x + ax * 48, y: f.y + ay * 48 + 8, r: 8, maxR: 58, color: '#fde047', life: 16, maxLife: 16 });
      this.burst(f.x + ax * 50, f.y + ay * 50 + 10, '#cfd8dc', 12, 5.5, 22, true);
    }
  }

  private aimUpdate(f: Fighter) {
    const inp = inputPlayers[f.index];
    if (typeof inp.aimAngle === 'number' && Number.isFinite(inp.aimAngle)) {
      f.aim = inp.aimAngle;
    } else {
      const x = inp.releaseAction ? inp.releaseX : inp.x;
      const y = inp.releaseAction ? inp.releaseY : inp.y;
      if (Math.hypot(x, y) > 0.35) f.aim = Math.atan2(y, x);
    }
    if (Math.abs(Math.cos(f.aim)) > 0.2) f.dir = Math.cos(f.aim) > 0 ? 1 : -1;
  }

  private step() {
    if (this.hitStop > 0) {
      this.hitStop--;
      this.shake *= 0.92;
      return;
    }
    this.t++;
    if (this.shake > 0) this.shake *= 0.88;
    if (this.fightFlash > 0) this.fightFlash--;
    const allPlats = this.getAllPlatforms();
    if (this.cd > 0) {
      this.cd--;
      for (const f of this.fs) {
        if (!f.alive) continue;
        f.vy = Math.min(14.5, f.vy + (this.M.g || GRAV));
        f.vx *= 0.9;
        const pg = f.ground;
        const pvy = f.vy;
        this.moveBody(f);
        if (f.ground) {
          f.jumps = 1;
          f.coyoteT = 6;
        } else {
          f.coyoteT = Math.max(0, (f.coyoteT || 0) - 1);
        }
        if (f.ground && !pg && pvy > 3.5) {
          f.sq = Math.min(11, Math.round(pvy * 0.9));
          f.headVy = (f.headVy || 0) + Math.min(5.5, pvy * 0.45);
          this.burst(f.x, f.y + 26, '#dfe6ee', 8, 2.6, 15, false);
          PartyAudio.play('jump');
        }
        if (f.sq > 0) f.sq--;
        this.updateFighterSprings(f, 0);
        let da = f.aim - f.va;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        f.va += da * 0.25;
        f.fs += (f.dir - f.fs) * 0.25;
        const rig = this.rigs[f.index];
        if (rig) {
          const hold = this.getWeaponHoldState(f, rig);
          stepActiveRagdoll(rig, {
            x: f.x,
            y: f.y,
            vx: f.vx,
            vy: f.vy,
            dir: f.dir,
            aim: f.va,
            ground: f.ground,
            phase: f.phase,
            sq: f.sq,
            recoil: f.recoil,
            atkT: f.atkT,
            atkP: f.atkP,
            weapon: f.weapon,
            twoHanded: hold.twoHanded,
            handTarget1: hold.hand1,
            handTarget2: hold.hand2,
            platforms: allPlats,
            gravity: this.M.g || GRAV,
            time: this.t,
          });
        }
      }
      if (this.cd === 0) {
        this.fightFlash = 52;
        this.shake = Math.max(this.shake, 4.5);
      }
    }

    if (!this.over && this.cd <= 0) {
      if (this.M.lava) {
        const riseTime = Math.max(0, this.t - 160);
        this.lavaY = Math.max(335, 760 - riseTime * 0.11);
        if (this.t % 4 === 0) {
          this.parts.push({
            x: rnd(20, W - 20),
            y: this.lavaY + rnd(2, 14),
            vx: rnd(-1.2, 1.2),
            vy: rnd(-3.2, -1.2),
            l: 24,
            m: 24,
            c: Math.random() < 0.5 ? '#ffcf33' : '#ff4a11',
            r: rnd(2, 4),
            g: true,
          });
        }
      }

      this.crateT--;
      if (this.crateT <= 0 && this.cfg.loot && this.crates.length < 3) {
        this.crateT = this.cfg.loot ? 250 : 420;
        const pp = this.M.pl[Math.floor(Math.random() * this.M.pl.length)];
        this.crates.push({
          x: pp[0] + rnd(16, Math.max(17, pp[2] - 16)),
          y: -30,
          vx: 0,
          vy: 0,
          hw: 14,
          hh: 14,
          w: rndWep(),
        });
      }

      for (const f of this.fs) {
        if (!f.alive) continue;
        const inp = inputPlayers[f.index];

        // Snappy Stick Fight locomotion + fast responsive turns + double jump
        const cap = f.slow > 0 ? 3.1 : 6.05;
        const isIcy = (this.M.fr || 0.85) > 0.91;
        if (Math.abs(inp.x) > 0.14) {
          const accel = f.ground ? (isIcy ? 0.88 : 1.32) : 0.86;
          if (inp.x > 0) {
            if (f.vx < cap) f.vx = Math.min(cap, f.vx + inp.x * accel);
          } else {
            if (f.vx > -cap) f.vx = Math.max(-cap, f.vx + inp.x * accel);
          }
        }

        this.aimUpdate(f);
        {
          let da = f.aim - f.va;
          while (da > Math.PI) da -= 2 * Math.PI;
          while (da < -Math.PI) da += 2 * Math.PI;
          if (Math.abs(da) > 2.8) {
            const mid = f.va + da / 2;
            if (Math.sin(mid) > 0) da += da > 0 ? -2 * Math.PI : 2 * Math.PI;
          }
          f.va += da * 0.32;
          f.fs += (f.dir - f.fs) * 0.32;
          if (Math.abs(f.dir - f.fs) < 0.02) f.fs = f.dir;
        }

        // Responsive ground braking vs slick ice vs airy knockback carry
        const groundDrag = Math.abs(inp.x) > 0.14 ? (isIcy ? 0.96 : 0.90) : (this.M.fr || 0.78);
        f.vx *= f.ground ? groundDrag : 0.962;

        if (inp.y > 0.65) f.dropT = 14;
        if (f.dropT > 0) f.dropT--;

        // Double jump + 6-frame coyote time + 7-frame jump buffer + wall jump
        const wantJ = inp.jump;
        if (wantJ && !f.jh) {
          f.jumpBuf = 7;
        } else if (!wantJ) {
          f.jh = false;
        }
        if ((f.jumpBuf || 0) > 0) f.jumpBuf = (f.jumpBuf || 0) - 1;

        const wt = this.wallTouch[f.index] || 0;
        const isWallSliding = !f.ground && wt !== 0 && f.vy > 0 && Math.sign(inp.x) === wt;

        if ((f.jumpBuf || 0) > 0 && (f.ground || (f.coyoteT || 0) > 0 || wt !== 0)) {
          const isWallJump = !f.ground && (f.coyoteT || 0) <= 0 && wt !== 0;
          if (isWallJump) {
            f.vy = -13.6 * (this.M.js || 1);
            f.vx = -wt * 8.4;
            f.dir = -wt;
            f.jumps = 0;
            this.burst(f.x + wt * 11, f.y, '#e4e4e7', 7, 3.2, 14, false);
            this.rings.push({ x: f.x + wt * 11, y: f.y, r: 4, maxR: 26, color: '#ffffff', life: 10, maxLife: 10 });
          } else {
            f.vy = -14.2 * (this.M.js || 1) * (f.slow > 0 ? 0.8 : 1);
            f.jumps = 0;
            this.burst(f.x, f.y + 24, '#ffffff', 6, 2.4, 12, false);
          }
          f.ground = false;
          f.coyoteT = 0;
          f.jumpBuf = 0;
          f.jh = true;
          f.highJ = inp.y < -0.8;
          f.headVy = (f.headVy || 0) + 3.2;
          PartyAudio.play('jump');
        }
        if (inp.y >= -0.72) f.highJ = false;

        // Variable jump cut + snappy Stick Fight fall gravity + fast-fall slam + wall slide friction
        const baseG = this.M.g || GRAV;
        if (f.vy < -3.2 && !wantJ && !f.highJ) {
          f.vy *= 0.86;
        }
        const fastFall = !f.ground && inp.y > 0.72 ? 1.38 : 1.0;
        f.vy = Math.min(isWallSliding ? 2.6 : 16, f.vy + baseG * (f.vy > 0 ? 1.12 * fastFall : 1.0));
        if (isWallSliding && this.t % 4 === 0) {
          this.burst(f.x + wt * 11, f.y + 4, '#d4d4d8', 1, 1.4, 10, false);
        }

        // Carry fighter smoothly with moving platforms
        if (f.ground && this.M.moving) {
          for (const mv of this.M.moving) {
            const cur = getMovingBounds(mv, this.t);
            const prev = getMovingBounds(mv, this.t - 1);
            if (Math.abs(f.y + f.hh - prev[1]) <= 4 && f.x >= prev[0] - f.hw && f.x <= prev[0] + prev[2] + f.hw) {
              f.x += cur[0] - prev[0];
              f.y += cur[1] - prev[1];
            }
          }
        }

        const pg = f.ground;
        const pvy = f.vy;
        this.moveBody(f);
        if (f.ground) {
          f.jumps = 0;
          f.coyoteT = 6;
        } else {
          f.coyoteT = Math.max(0, (f.coyoteT || 0) - 1);
        }
        if (f.ground && !pg && pvy > 3.5) {
          f.sq = Math.min(12, Math.round(pvy * 0.92));
          f.headVy = (f.headVy || 0) + Math.min(6, pvy * 0.48);
          this.burst(f.x, f.y + 26, '#dfe6ee', pvy > 10 ? 12 : 7, pvy > 10 ? 3.5 : 2.5, 16, false);
          if (pvy > 11.5) {
            this.rings.push({ x: f.x, y: f.y + 25, r: 5, maxR: 34, color: 'rgba(255,255,255,0.65)', life: 12, maxLife: 12 });
            this.shake = Math.max(this.shake, 2.8);
          }
        }
        if (f.sq > 0) f.sq--;
        if (f.ground && Math.abs(f.vx) > 3.2 && this.t % 5 === 0) {
          this.burst(f.x - f.dir * 8, f.y + 26, '#cfd8e0', 2, 1.5, 12, false);
        }

        if (this.M.belts && f.ground) {
          for (const [bi, dr] of this.M.belts) {
            const bp = this.M.pl[bi];
            if (Math.abs(f.y + f.hh - bp[1]) < 3 && f.x > bp[0] && f.x < bp[0] + bp[2]) {
              f.vx += dr * 0.28;
            }
          }
        }

        if (this.M.pads) {
          for (const pd of this.M.pads) {
            if (f.ground && Math.abs(f.x - pd[0]) < pd[2] / 2 && Math.abs(f.y + f.hh - pd[1]) < 4) {
              f.vy = -18.2;
              f.jumps = 0;
              f.coyoteT = 0;
              f.ground = false;
              this.burst(f.x, f.y + 24, '#7dff9a', 12, 4, 18, true);
              PartyAudio.play('jump');
            }
          }
        }

        if (this.M.lifts) {
          for (const lz of this.M.lifts) {
            if (f.x >= lz.x && f.x <= lz.x + lz.w && f.y + f.hh >= lz.y && f.y - f.hh <= lz.y + lz.h) {
              f.vy = Math.max(-8.6, f.vy - (lz.force || 0.9));
              f.ground = false;
            }
          }
        }

        if (this.M.bumpers) {
          for (const bp of this.M.bumpers) {
            const dx = f.x - bp.x;
            const dy = f.y - bp.y;
            const d = Math.hypot(dx, dy);
            const hitR = bp.r + 15;
            if (d < hitR) {
              const nx = dx / (d || 1);
              const ny = dy / (d || 1);
              f.x = bp.x + nx * hitR;
              f.y = bp.y + ny * hitR;
              f.vx = nx * bp.power;
              f.vy = ny * bp.power - 3.2;
              this.burst(bp.x + nx * bp.r, bp.y + ny * bp.r, bp.color, 10, 4.5, 16, true);
              PartyAudio.play('jump');
            }
          }
        }

        if (f.portalCd > 0) f.portalCd--;
        if (this.M.portals && f.portalCd <= 0) {
          for (const pt of this.M.portals) {
            if (Math.hypot(f.x - pt.ax, f.y - pt.ay) < 32) {
              this.burst(f.x, f.y, pt.color, 14, 5, 22, true);
              f.x = pt.bx;
              f.y = pt.by;
              f.portalCd = 55;
              this.burst(f.x, f.y, pt.color, 14, 5, 22, true);
              PartyAudio.play('portal');
              break;
            } else if (Math.hypot(f.x - pt.bx, f.y - pt.by) < 32) {
              this.burst(f.x, f.y, pt.color, 14, 5, 22, true);
              f.x = pt.ax;
              f.y = pt.ay;
              f.portalCd = 55;
              this.burst(f.x, f.y, pt.color, 14, 5, 22, true);
              PartyAudio.play('portal');
              break;
            }
          }
        }

        this.updateFighterSprings(f, inp.x);
        const rig = this.rigs[f.index];
        if (rig) {
          const hold = this.getWeaponHoldState(f, rig);
          stepActiveRagdoll(rig, {
            x: f.x,
            y: f.y,
            vx: f.vx,
            vy: f.vy,
            dir: f.dir,
            aim: f.va,
            ground: f.ground,
            wallSlide: isWallSliding ? wt : 0,
            phase: f.phase,
            sq: f.sq,
            recoil: f.recoil,
            atkT: f.atkT,
            atkP: f.atkP,
            weapon: f.weapon,
            twoHanded: hold.twoHanded,
            handTarget1: hold.hand1,
            handTarget2: hold.hand2,
            platforms: allPlats,
            gravity: this.M.g || GRAV,
            time: this.t,
          });
          if (Math.hypot(f.vx, f.vy) > 9.6 && this.t % 2 === 0) {
            const clone = createRagdollRig(f.index, f.color, f.x, f.y, f.dir, 1);
            clone.pelvis = { ...rig.pelvis };
            clone.chest = { ...rig.chest };
            clone.head = { ...rig.head };
            clone.lKnee = { ...rig.lKnee };
            clone.lFoot = { ...rig.lFoot };
            clone.rKnee = { ...rig.rKnee };
            clone.rFoot = { ...rig.rFoot };
            clone.lElbow = { ...rig.lElbow };
            clone.lHand = { ...rig.lHand };
            clone.rElbow = { ...rig.rElbow };
            clone.rHand = { ...rig.rHand };
            this.ghosts.push({ rig: clone, color: f.color, life: 8, maxLife: 8 });
          }
        }
        if (f.cd > 0) f.cd--;
        if (f.inv > 0) f.inv--;
        if (f.shield > 0) f.shield--;
        if (f.flash > 0) f.flash--;
        if (f.mf > 0) f.mf--;
        if (f.slow > 0) {
          f.slow--;
          if (this.t % 6 === 0) this.burst(f.x + rnd(-10, 10), f.y + rnd(-20, 20), '#bff', 1, 1, 14, true);
        }
        f.recoil *= 0.85;

        if (f.empty && f.atkT <= 0) {
          f.empty = false;
          f.burstT = 0;
          f.weapon = f.base;
          f.ammo = Infinity;
        }

        const burstDur = BURST_DURATIONS[f.weapon];
        if (inp.releaseAction && burstDur) {
          f.burstT = burstDur;
        }
        if (f.burstT > 0) f.burstT--;

        if ((inp.action || inp.releaseAction || f.burstT > 0) && f.cd <= 0 && !f.empty) {
          this.attack(f);
        }

        if (f.atkT > 0) {
          const aw = f.atkWeapon || f.weapon;
          f.atkT--;
          f.atkP = 1 - f.atkT / WD[aw].dur;
          if ((aw === 'sword' || aw === 'katana' || aw === 'hammer' || aw === 'axe') && f.atkP > 0.15 && f.atkP < 0.88 && rig) {
            const reach = aw === 'katana' ? 54 : aw === 'sword' ? 46 : 48;
            const hold = this.getWeaponHoldState(f, rig);
            const tipX = rig.rHand.x + Math.cos(hold.weaponAngle) * reach;
            const tipY = rig.rHand.y + Math.sin(hold.weaponAngle) * reach;
            const prevTrail = this.slashTrails[this.slashTrails.length - 1];
            if (prevTrail && prevTrail.life === prevTrail.maxLife && prevTrail.pts.length < 9) {
              prevTrail.pts.push([tipX, tipY]);
            } else {
              this.slashTrails.push({
                pts: [[rig.rHand.x, rig.rHand.y], [tipX, tipY]],
                color: aw === 'katana' ? '#38bdf8' : aw === 'hammer' ? '#facc15' : '#e4e4e7',
                life: 10,
                maxLife: 10,
                width: aw === 'hammer' || aw === 'axe' ? 12 : 8,
              });
            }
          }
          if (!f.hitDone && ME[aw] && WD[aw].dur - f.atkT >= (WD[aw].hit || 0)) {
            f.hitDone = true;
            this.meleeHit(f, aw);
          }
        }

        for (let i = this.crates.length - 1; i >= 0; i--) {
          const c = this.crates[i];
          if (Math.abs(c.x - f.x) < f.hw + c.hw && Math.abs(c.y - f.y) < f.hh + c.hh) {
            this.giveWeapon(f, c.w);
            f.cd = 10;
            this.crates.splice(i, 1);
            this.burst(c.x, c.y, '#ffd54a', 14, 5, 25, true);
            PartyAudio.play('coin');
          }
        }

        if (this.M.lava) {
          if (f.y > H + 120 || f.y + f.hh > this.lavaY + 4) {
            if (f.y < H) this.burst(f.x, this.lavaY, '#ff7a1f', 20, 6, 30, true);
            this.kill(f);
          }
        } else if (this.M.chasm) {
          if (f.y - f.hh > H + 40) {
            this.burst(f.x, H - 6, '#bae6fd', 18, 6, 28, true);
            this.kill(f);
          }
        } else if (f.y + f.hh > H - 92) {
          f.y = H - 92 - f.hh;
          if (f.vy > 0) f.vy = 0;
          f.ground = true;
          f.jumps = 2;
        }

        if (this.M.pendulums) {
          for (const pd of this.M.pendulums) {
            const [bx, by] = getPendulumBob(pd, this.t);
            if (Math.hypot(f.x - bx, f.y - by) < pd.radius + 11) {
              this.kill(f);
            }
          }
        }

        if (this.M.lasers) {
          for (const ls of this.M.lasers) {
            if (getLaserState(ls, this.t) === 'active' && this.segFighter(ls.x1, ls.y1, ls.x2, ls.y2, f, 6)) {
              this.hurt(f, 45, Math.sign(f.x - 640 || 1) * 9, -6, f.x, f.y);
            }
          }
        }
      }

      // Stick Fight physical fighter-vs-fighter jostle & head-stomp bounce
      for (let i = 0; i < this.fs.length; i++) {
        const a = this.fs[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < this.fs.length; j++) {
          const b = this.fs[j];
          if (!b.alive) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const minX = a.hw + b.hw - 2;
          const minY = a.hh + b.hh - 4;
          if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
            if (a.vy > 2.2 && a.y < b.y - b.hh * 0.72) {
              a.vy = -10.6;
              a.y = b.y - b.hh - a.hh;
              b.sq = 8;
              b.headVy = (b.headVy || 0) + 4.2;
              this.burst(a.x, a.y + a.hh, '#ffffff', 5, 2.5, 12, false);
              PartyAudio.play('jump');
            } else if (b.vy > 2.2 && b.y < a.y - a.hh * 0.72) {
              b.vy = -10.6;
              b.y = a.y - a.hh - b.hh;
              a.sq = 8;
              a.headVy = (a.headVy || 0) + 4.2;
              this.burst(b.x, b.y + b.hh, '#ffffff', 5, 2.5, 12, false);
              PartyAudio.play('jump');
            } else {
              const s = dx === 0 ? (i % 2 ? -1 : 1) : Math.sign(dx);
              const overlap = minX - Math.abs(dx);
              a.x -= s * overlap * 0.45;
              b.x += s * overlap * 0.45;
              const relVx = a.vx - b.vx;
              if (relVx * s > 0) {
                const push = relVx * 0.42;
                a.vx -= push;
                b.vx += push;
                a.tiltV -= s * 0.04;
                b.tiltV += s * 0.04;
              }
            }
          }
        }
      }

      for (const c of this.crates) {
        c.vy = Math.min(3.6, c.vy + (this.M.g || GRAV) * 0.6);
        this.moveBody(c);
      }
      this.crates = this.crates.filter((c) => c.y < H + 60);

      const pls = [...this.getAllPlatforms(), ...this.getBlockingWallRects()];
      for (let i = this.proj.length - 1; i >= 0; i--) {
        const p = this.proj[i];
        p.l--;
        if (p.t === 'M') {
          p.vy += this.M.g || GRAV;
          this.moveBody(p as unknown as { x: number; y: number; vx: number; vy: number; hw: number; hh: number; ground?: boolean; bounce?: boolean });
          if (p.ground) p.vx *= 0.8;
          p.arm = (p.arm || 0) - 1;
          if (p.l <= 0) {
            this.proj.splice(i, 1);
            continue;
          }
          if ((p.arm || 0) <= 0) {
            for (const o of this.fs) {
              if (o.alive && Math.abs(o.x - p.x) < 28 && Math.abs(o.y - p.y) < 34) {
                this.boom(p.x, p.y, 105, 48);
                this.proj.splice(i, 1);
                break;
              }
            }
          }
          continue;
        }
        if (p.t === 'N') {
          p.vy += 0.32;
          this.moveBody(p as unknown as { x: number; y: number; vx: number; vy: number; hw: number; hh: number; bounce?: boolean });
          let hp = false;
          for (const o of this.fs) {
            if (o.alive && o.index !== p.o && Math.abs(o.x - p.x) < o.hw + 8 && Math.abs(o.y - p.y) < o.hh + 8) hp = true;
          }
          if (hp || p.l <= 0) {
            this.boom(p.x, p.y, 120, 50);
            this.proj.splice(i, 1);
          } else if (this.t % 3 === 0) {
            this.parts.push({ x: p.x, y: p.y, vx: rnd(-0.4, 0.4), vy: rnd(-0.6, 0), l: 20, m: 20, c: '#888', r: rnd(2, 4), g: false });
          }
          continue;
        }
        if (p.t === 'Y') {
          p.age = (p.age || 0) + 1;
          const ow = this.fs[p.o];
          if (p.age >= 28) {
            if (ow && ow.alive) {
              const dx = ow.x - p.x;
              const dy = ow.y - p.y;
              const dd = Math.hypot(dx, dy) || 1;
              p.vx += (dx / dd) * 0.9;
              p.vy += (dy / dd) * 0.9;
              const sp = Math.hypot(p.vx, p.vy);
              if (sp > 13) {
                p.vx *= 13 / sp;
                p.vy *= 13 / sp;
              }
              if (dd < 22) {
                this.proj.splice(i, 1);
                continue;
              }
            } else {
              p.l = 0;
            }
          }
          p.x += p.vx;
          p.y += p.vy;
          if (p.age < 28 && this.inRect(p.x, p.y)) p.age = 28;
          for (const o of this.fs) {
            if (o.alive && o.index !== p.o && Math.abs(o.x - p.x) < o.hw + 10 && Math.abs(o.y - p.y) < o.hh + 6) {
              if (!p.hs) p.hs = {};
              if (p.hs[o.index] === undefined || p.age - p.hs[o.index] > 14) {
                p.hs[o.index] = p.age;
                this.hurt(o, 14, Math.sign(p.vx || 1) * 5, -4, p.x, p.y, true);
              }
            }
          }
          if (p.l <= 0 || p.x < -40 || p.x > W + 40 || p.y < -120 || p.y > H + 120) this.proj.splice(i, 1);
          continue;
        }
        if (p.t === 'B') {
          p.vy += 0.35;
          this.moveBody(p as unknown as { x: number; y: number; vx: number; vy: number; hw: number; hh: number; bounce?: boolean });
          if ((p.arm || 0) > 0) p.arm = (p.arm || 0) - 1;
          let hit = false;
          for (const o of this.fs) {
            if (!o.alive) continue;
            if (o.index === p.o && (p.arm || 0) > 0) continue;
            if (Math.abs(o.x - p.x) < o.hw + 10 && Math.abs(o.y - p.y) < o.hh + 10) {
              hit = true;
              break;
            }
          }
          if (hit || p.l <= 0) {
            this.boom(p.x, p.y, 130, 48);
            this.proj.splice(i, 1);
          } else if (this.t % 2 === 0) {
            this.parts.push({ x: p.x + rnd(-3, 3), y: p.y - 8, vx: rnd(-0.6, 0.6), vy: rnd(-1.2, -0.3), l: 14, m: 14, c: '#ffd54a', r: rnd(1.5, 3), g: false });
          }
          continue;
        }
        if (p.t === 'R') {
          p.vx *= 1.025;
          p.vy *= 1.025;
          p.x += p.vx;
          p.y += p.vy;
          if (this.t % 2) {
            this.parts.push({ x: p.x - p.vx * 0.9, y: p.y - p.vy * 0.9, vx: rnd(-0.5, 0.5), vy: rnd(-0.8, 0.2), l: 26, m: 26, c: '#ffb347', r: rnd(3, 6), g: true });
          } else {
            this.parts.push({ x: p.x - p.vx * 0.9, y: p.y - p.vy * 0.9, vx: 0, vy: -0.3, l: 34, m: 34, c: '#777', r: rnd(3, 6), g: false });
          }
          let hit = this.inRect(p.x, p.y) || p.x < -20 || p.x > W + 20 || p.y < -80 || p.y > H + 80 || p.l <= 0;
          for (const f of this.fs) {
            if (f.alive && f.index !== p.o && Math.abs(f.x - p.x) < f.hw + 8 && Math.abs(f.y - p.y) < f.hh + 4) hit = true;
          }
          if (hit) {
            this.boom(p.x, p.y, 125, 50);
            this.proj.splice(i, 1);
          }
          continue;
        }

        if (p.t === 'A') p.vy += 0.16;
        if (p.t === 'S') p.vy += 0.2;
        if (p.t === 'H') p.vy += 0.04;
        if (p.t === 'O') {
          let best: Fighter | null = null;
          let bd = 1e9;
          for (const o of this.fs) {
            if (o.alive && o.index !== p.o) {
              const dd = Math.hypot(o.x - p.x, o.y - p.y);
              if (dd < bd) {
                bd = dd;
                best = o;
              }
            }
          }
          if (best) {
            p.vx += ((best.x - p.x) / bd) * 0.32;
            p.vy += ((best.y - p.y) / bd) * 0.32;
            const sp = Math.hypot(p.vx, p.vy);
            if (sp > 6.5) {
              p.vx *= 6.5 / sp;
              p.vy *= 6.5 / sp;
            }
          }
          if (this.t % 2) this.parts.push({ x: p.x, y: p.y, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), l: 20, m: 20, c: '#c6f', r: rnd(2, 4), g: true });
        }
        if (p.t === 'Z' && this.t % 2) {
          this.parts.push({ x: p.x, y: p.y, vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), l: 14, m: 14, c: '#bff', r: rnd(1.5, 3), g: true });
        }

        const px0 = p.x;
        const py0 = p.y;
        p.x += p.vx;
        p.y += p.vy;
        const hitPlat = pls.some((r) => this.segRect(px0, py0, p.x, p.y, r));
        if (hitPlat) {
          this.damageIceSegment(px0, py0, p.x, p.y, DM[p.t] || 14);
        }
        let dead =
          p.l <= 0 ||
          p.x < -20 ||
          p.x > W + 20 ||
          p.y < -80 ||
          p.y > H + 80 ||
          hitPlat;
        if (!dead) {
          for (const f of this.fs) {
            if (f.alive && f.index !== p.o && this.segFighter(px0, py0, p.x, p.y, f, 5)) {
              this.hurt(f, DM[p.t] || 15, Math.sign(p.vx) * (KB[p.t] || 5), -2, p.x, p.y, true);
              if (p.t === 'Z') f.slow = 150;
              if (p.t === 'O') {
                this.burst(p.x, p.y, '#c6f', 18, 6, 28, true);
                this.shake = Math.max(this.shake, 5);
              }
              dead = true;
              break;
            }
          }
        }
        if (dead) {
          this.burst(p.x, p.y, PC[p.t] || '#ffd54a', 3, 2, 8, true);
          this.proj.splice(i, 1);
        }
      }

      const alive = this.fs.filter((f) => f.alive);
      if (alive.length <= 1) {
        this.over = true;
        this.banner = 140;
        if (alive.length === 1) {
          alive[0].score++;
          this.bannerTxt = `${PLAYER_NAMES[alive[0].index] || `P${alive[0].index + 1}`} qazandı!`;
          this.bannerCol = alive[0].color;
        } else {
          this.bannerTxt = 'Bərabərlik';
          this.bannerCol = '#ffffff';
        }
        this.emitHud();
      }
    } else if (this.over) {
      for (const f of this.fs) {
        if (f.alive) {
          f.vy = Math.min(14, f.vy + (this.M.g || GRAV));
          f.vx *= 0.86;
          this.moveBody(f);
          const rig = this.rigs[f.index];
          if (rig) {
            const hold = this.getWeaponHoldState(f, rig);
            stepActiveRagdoll(rig, {
              x: f.x,
              y: f.y,
              vx: f.vx,
              vy: f.vy,
              dir: f.dir,
              aim: f.va,
              ground: f.ground,
              phase: f.phase,
              sq: f.sq,
              recoil: f.recoil,
              atkT: f.atkT,
              atkP: f.atkP,
              weapon: f.weapon,
              twoHanded: hold.twoHanded,
              handTarget1: hold.hand1,
              handTarget2: hold.hand2,
              platforms: allPlats,
              gravity: this.M.g || GRAV,
              time: this.t,
            });
          }
        }
      }
      if (--this.banner <= 0) {
        if (this.currentRound >= this.cfg.rounds) {
          this.over = false;
          this.gameState = 'matchEnd';
          this.triggerMatchEnd();
        } else {
          this.currentRound++;
          this.newRound();
        }
      }
    }

    const deadPlats = [...allPlats, ...this.getBlockingWallRects()];
    const hasWalls = !!(this.M.walls || this.M.bounceWalls);
    for (let i = this.deadRagdolls.length - 1; i >= 0; i--) {
      const dr = this.deadRagdolls[i];
      const keep = stepDeadRagdoll(dr, deadPlats, this.M.g || GRAV, W, H, hasWalls, !!this.M.bounceWalls);
      if (this.M.lava && dr.pelvis.y > this.lavaY) {
        this.burst(dr.pelvis.x, this.lavaY, '#ff7a1f', 12, 4, 24, true);
        this.deadRagdolls.splice(i, 1);
      } else if (!keep) {
        this.deadRagdolls.splice(i, 1);
      }
    }

    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.vy += 0.28;
      c.x += c.vx;
      c.y += c.vy;
      c.a += c.va;
      if (c.vy > 0 && this.inRect(c.x, c.y + 2)) {
        c.vy *= -0.45;
        c.vx *= 0.65;
        c.va *= 0.6;
        c.y -= 2;
      }
      if (--c.life <= 0) this.casings.splice(i, 1);
    }
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      if (--this.slashTrails[i].life <= 0) this.slashTrails.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += (r.maxR - r.r) * 0.25;
      if (--r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      if (--this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pp = this.popups[i];
      pp.x += pp.vx;
      pp.y += pp.vy;
      pp.vy *= 0.94;
      if (--pp.life <= 0) this.popups.splice(i, 1);
    }

    for (const ic of this.iceBlocks) {
      if (ic.shake > 0) ic.shake = Math.max(0, ic.shake - 0.6);
    }
    for (let i = this.iceShards.length - 1; i >= 0; i--) {
      const sh = this.iceShards[i];
      sh.vy += 0.36;
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.a += sh.va;
      if (--sh.l <= 0 || sh.y > H + 90) this.iceShards.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.vy += 0.22;
      p.x += p.vx;
      p.y += p.vy;
      if (p.vy > 0 && this.inRect(p.x, p.y)) {
        p.vy *= -0.3;
        p.vx *= 0.6;
      }
      if (--p.l <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy += 0.45;
      d.x += d.vx;
      d.y += d.vy;
      d.a += d.va;
      if (this.inRect(d.x, d.y + 4) && d.vy > 0) {
        d.vy *= -0.35;
        d.vx *= 0.7;
        d.va *= 0.6;
        d.y -= 2;
      }
      if (d.y > H + 80) this.debris.splice(i, 1);
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      if (++this.fx[i].t > 32) this.fx.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      if (--this.beams[i].l <= 0) this.beams.splice(i, 1);
    }

    // Smooth bounded Stick-Fight dynamic camera zoom & pan toward action
    const camTargets = this.fs.filter((f) => f.alive);
    let targetZoom = 1;
    let targetCamX = W / 2;
    let targetCamY = H / 2;
    if (camTargets.length >= 2 && this.cd <= 0 && !this.over) {
      let minX = W;
      let maxX = 0;
      let minY = H;
      let maxY = 0;
      for (const f of camTargets) {
        if (f.x < minX) minX = f.x;
        if (f.x > maxX) maxX = f.x;
        if (f.y < minY) minY = f.y;
        if (f.y > maxY) maxY = f.y;
      }
      const spanX = Math.max(220, maxX - minX);
      const spanY = Math.max(150, maxY - minY);
      const fitZ = Math.min(W / (spanX + 460), H / (spanY + 310));
      targetZoom = Math.max(1, Math.min(1.14, fitZ));
      targetCamX = (minX + maxX) * 0.5;
      targetCamY = (minY + maxY) * 0.5;
    }
    this.camZoom += (targetZoom - this.camZoom) * 0.06;
    const halfViewW = W / (2 * this.camZoom);
    const halfViewH = H / (2 * this.camZoom);
    const clampedX = Math.max(halfViewW, Math.min(W - halfViewW, targetCamX));
    const clampedY = Math.max(halfViewH, Math.min(H - halfViewH, targetCamY));
    this.camX += (clampedX - this.camX) * 0.08;
    this.camY += (clampedY - this.camY) * 0.08;

    clearReleasedActions();
  }

  private getCrateIcon(w: WeaponId) {
    const existing = this.crateIcons.get(w);
    if (existing) return existing;
    const image = document.createElement('canvas');
    image.width = 240;
    image.height = 160;
    const g = image.getContext('2d')!;
    g.setTransform(2, 0, 0, 2, 55, 80);
    drawWeaponSprite(g, w, 120);
    const pixels = g.getImageData(0, 0, image.width, image.height).data;
    let left = image.width, top = image.height, right = 0, bottom = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (pixels[(y * image.width + x) * 4 + 3] < 8) continue;
        if (x < left) left = x;
        if (y < top) top = y;
        if (x > right) right = x;
        if (y > bottom) bottom = y;
      }
    }
    const icon = { image, x: left, y: top, w: Math.max(1, right - left + 1), h: Math.max(1, bottom - top + 1) };
    this.crateIcons.set(w, icon);
    return icon;
  }

  private getWeaponHoldState(f: Fighter, rig: RagdollRig, curT = this.t) {
    const wp = f.weapon;
    const d = f.dir || 1;
    const g = GR[wp] || [0, 0];
    const twoHanded = g.length > 2;
    const atk = f.atkT > 0;
    const p = f.atkP;
    let ang = f.va;
    let extra = 0;
    if (atk) {
      if (wp === 'fist' || wp === 'spear' || wp === 'staff') extra = -0.5 + 1.0 * p;
      else if (wp === 'sword') extra = -1.4 + 2.8 * p;
      else if (wp === 'katana') extra = -1.2 + 2.4 * p;
      else if (wp === 'hammer' || wp === 'axe') {
        extra = p < 0.55 ? -2.0 * (p / 0.55) : -2.0 + 3.0 * ((p - 0.55) / 0.45);
      } else if (wp === 'chainsaw') {
        extra = Math.sin(curT * 1.9) * 0.07;
      }
    } else {
      extra =
        wp === 'hammer' || wp === 'axe'
          ? -0.9
          : wp === 'sword'
          ? -0.35
          : wp === 'katana'
          ? -0.45
          : wp === 'bomb'
          ? -0.5
          : wp === 'boomerang'
          ? -0.3
          : 0;
    }
    ang += d * extra - d * f.recoil * 0.12;
    const rc = f.recoil * 6.5;
    let d1 =
      wp === 'fist'
        ? 13 + (atk ? 11 * Math.sin(p * Math.PI) : 0)
        : twoHanded
        ? Math.max(6, 21 - ((g[2] || 0) - g[0]))
        : ONE_RANGED.has(wp)
        ? 20
        : 16;
    d1 -= rc;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const sgn = Math.abs(f.fs) < 0.05 ? (f.fs < 0 ? -0.05 : 0.05) : f.fs;
    const shx = rig.chest.x;
    const shy = rig.chest.y;
    const hand1: [number, number] = [shx + ca * d1, shy + sa * d1];
    let hand2: [number, number] | undefined;
    if (twoHanded) {
      const lx = (g[2] || 0) - g[0];
      const ly = ((g[3] || 0) - g[1]) * sgn;
      hand2 = [hand1[0] + lx * ca - ly * sa, hand1[1] + lx * sa + ly * ca];
    }
    return {
      hand1,
      hand2,
      weaponAngle: ang,
      weaponFlip: sgn,
      gripOffset: [g[0], g[1]] as [number, number],
      twoHanded,
    };
  }

  drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, curT = this.t) {
    if (f.shield > 0 && f.shield % 6 < 3) return;
    let rig = this.rigs[f.index];
    if (!rig) {
      rig = createRagdollRig(f.index, f.color, f.x, f.y, f.dir, 1);
      this.rigs[f.index] = rig;
    }
    rig.color = f.color;
    rig.dir = f.dir;
    const hold = this.getWeaponHoldState(f, rig, curT);
    const wp = f.weapon;
    const col = f.flash > 0 ? '#ffffff' : f.slow > 0 ? '#9fe8ff' : f.color;

    drawRagdollStickman(ctx, rig, {
      color: col,
      flash: f.flash > 0,
      shield: f.shield > 0,
      slow: f.slow > 0,
      weapon: wp,
      hideWeapon: wp === 'spear' && f.cd > 8,
      weaponAngle: hold.weaponAngle,
      weaponFlip: hold.weaponFlip,
      gripOffset: hold.gripOffset,
      muzzleOffset: MUZ[wp],
      muzzleColor: MUZC[wp],
      muzzleFlash: f.mf,
      twoHanded: hold.twoHanded,
      time: curT,
    });
  }

  private draw() {
    if (!this.canvas || !this.ctx || !this.bg) return;
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const sc = Math.min(cw / W, ch / H);
    const ox = (cw - W * sc) / 2;
    const oy = (ch - H * sc) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, cw, ch);

    const shakeMag = PartyEconomy.shakeEnabled() ? this.shake : 0;
    const sx = (Math.random() - 0.5) * shakeMag;
    const sy = (Math.random() - 0.5) * shakeMag;
    ctx.setTransform(sc, 0, 0, sc, ox + sx * sc, oy + sy * sc);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-30, -30, W + 60, H + 60);
    ctx.clip();
    ctx.translate(W / 2, H / 2);
    ctx.scale(this.camZoom, this.camZoom);
    ctx.translate(-this.camX, -this.camY);

    ctx.drawImage(this.bg, 0, 0);

    // Ambient atmosphere per arena
    if (this.M.style === 'city') {
      // Drifting warm fire embers & ash
      for (let i = 0; i < this.snow.length; i++) {
        const s = this.snow[i];
        const ex = (s.x + Math.sin(this.t * 0.015 + i) * 26 + this.t * 0.25) % W;
        const ey = H - ((s.y * 1.2 + this.t * s.v * 0.6) % H);
        ctx.fillStyle = i % 3 === 0 ? 'rgba(251,146,60,0.68)' : 'rgba(212,212,216,0.28)';
        ctx.fillRect(ex, ey, s.s + 0.5, s.s + 0.5);
      }
    } else if (this.M.style === 'harbor') {
      // Moody slanted harbor rain
      ctx.strokeStyle = 'rgba(186,230,253,0.24)';
      ctx.lineWidth = 1.2;
      for (const s of this.snow) {
        const y = (s.y + this.t * s.v * 2.2) % H;
        const x = (s.x + this.t * 0.55) % W;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 14);
        ctx.stroke();
      }
    } else if (this.M.style === 'subway') {
      // Subtle floating underground dust motes + emergency flicker tint
      for (let i = 0; i < 36; i++) {
        const s = this.snow[i];
        const mx = (s.x + Math.sin(this.t * 0.01 + i) * 18) % W;
        const my = (s.y + Math.cos(this.t * 0.012 + i * 2) * 12) % H;
        ctx.fillStyle = i % 5 === 0 ? 'rgba(250,204,21,0.28)' : 'rgba(228,228,231,0.22)';
        ctx.fillRect(mx, my, s.s, s.s);
      }
    } else if (this.M.style === 'fortress') {
      // Glowing forest fireflies around mossy ruins
      ctx.save();
      ctx.shadowColor = '#c8ff78';
      ctx.shadowBlur = 8;
      for (const s of this.snow) {
        ctx.fillStyle = `rgba(190,255,120,${0.4 + 0.42 * Math.sin(this.t * 0.018 + s.s * 9)})`;
        ctx.beginPath();
        ctx.arc(
          (s.x + Math.sin(this.t * 0.008 + s.s * 5) * 24) % W,
          80 + ((s.x * 7.3) % 470) + Math.sin(this.t * 0.009 + s.x) * 16,
          s.s + 0.8,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();
    } else if (this.M.style === 'bridge') {
      // Sunset canyon breeze dust & warm embers
      for (let i = 0; i < this.snow.length; i++) {
        const s = this.snow[i];
        const bx = (s.x + this.t * s.v * 1.1) % W;
        const by = (s.y + Math.sin(this.t * 0.02 + i) * 14) % H;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(251,146,60,0.58)' : 'rgba(254,215,170,0.22)';
        ctx.fillRect(bx, by, s.s + 0.6, s.s * 0.7);
      }
    } else if (this.M.style === 'lab') {
      // Glowing cyan & green bio-spores inside quarantine lab
      ctx.save();
      ctx.shadowColor = '#2dd4bf';
      ctx.shadowBlur = 7;
      for (let i = 0; i < 42; i++) {
        const s = this.snow[i];
        const lx = (s.x + Math.sin(this.t * 0.012 + i) * 20) % W;
        const ly = (s.y + Math.cos(this.t * 0.015 + i * 2) * 18) % H;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(45,212,191,0.52)' : 'rgba(74,222,128,0.48)';
        ctx.beginPath();
        ctx.arc(lx, ly, s.s * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (this.M.style === 'rooftop') {
      // High-altitude ash & slanted wind streaks over burning skyline
      for (let i = 0; i < this.snow.length; i++) {
        const s = this.snow[i];
        const rx = (s.x + this.t * s.v * 1.6) % W;
        const ry = (s.y + this.t * s.v * 0.5) % H;
        ctx.fillStyle = i % 4 === 0 ? 'rgba(249,115,22,0.55)' : 'rgba(203,213,225,0.28)';
        ctx.fillRect(rx, ry, s.s + 1.2, s.s * 0.7);
      }
    }

    // Lift / Wind / Anti-grav columns
    if (this.M.lifts) {
      for (const lz of this.M.lifts) {
        const col = lz.color || '#38bdf8';
        ctx.save();
        const lgBeam = ctx.createLinearGradient(0, lz.y + lz.h, 0, lz.y);
        lgBeam.addColorStop(0, hexToRgba(col, 0.26));
        lgBeam.addColorStop(1, hexToRgba(col, 0.04));
        ctx.fillStyle = lgBeam;
        ctx.fillRect(lz.x, lz.y, lz.w, lz.h);
        ctx.strokeStyle = hexToRgba(col, 0.45);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(lz.x, lz.y, lz.w, lz.h);
        ctx.setLineDash([]);
        // Rising chevron rings inside lift column
        ctx.strokeStyle = hexToRgba(col, 0.75);
        ctx.lineWidth = 2;
        const stepH = 44;
        const shift = (this.t * 2.1) % stepH;
        for (let cy = lz.y + lz.h - shift; cy > lz.y + 12; cy -= stepH) {
          ctx.beginPath();
          ctx.moveTo(lz.x + 12, cy + 8);
          ctx.lineTo(lz.x + lz.w / 2, cy);
          ctx.lineTo(lz.x + lz.w - 12, cy + 8);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Swinging spiked pendulums (Sky Citadel)
    if (this.M.pendulums) {
      for (const pd of this.M.pendulums) {
        const [bx, by, a] = getPendulumBob(pd, this.t);
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(pd.px, pd.py);
        ctx.lineTo(bx, by);
        ctx.stroke();

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(a * 2.5 + this.t * 0.05);
        ctx.fillStyle = '#09090b';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const an = (k / 16) * Math.PI * 2;
          const r = k % 2 ? pd.radius : pd.radius + 9;
          if (k) ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
          else ctx.moveTo(Math.cos(an) * r, Math.sin(an) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Security Laser Gates (Laser Vault)
    if (this.M.lasers) {
      for (const ls of this.M.lasers) {
        const state = getLaserState(ls, this.t);
        // Emitters
        ctx.fillStyle = '#e4e4e7';
        ctx.beginPath();
        ctx.arc(ls.x1, ls.y1, 7, 0, Math.PI * 2);
        ctx.arc(ls.x2, ls.y2, 7, 0, Math.PI * 2);
        ctx.fill();

        if (state === 'warn') {
          ctx.save();
          ctx.strokeStyle = this.t % 12 < 6 ? '#facc15' : 'rgba(250,204,21,0.35)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(ls.x1, ls.y1);
          ctx.lineTo(ls.x2, ls.y2);
          ctx.stroke();
          ctx.restore();
        } else if (state === 'active') {
          ctx.save();
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(ls.x1, ls.y1);
          ctx.lineTo(ls.x2, ls.y2);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ls.x1, ls.y1);
          ctx.lineTo(ls.x2, ls.y2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Static, pillar, breakable ice & moving platforms
    this.M.pl.forEach((p, idx) => drawArenaPlatform(ctx, p, this.M.style, this.M.plMeta?.[idx], this.t));
    if (this.M.pillars) {
      for (const pl of this.M.pillars) drawArenaPillar(ctx, pl, this.M.style);
    }
    for (const ic of this.iceBlocks) {
      if (ic.hp > 0) drawIceBlock(ctx, ic.x, ic.y, ic.w, ic.h, ic.hp / (ic.maxHp || 1), ic.shake);
    }
    if (this.M.moving) {
      for (const mv of this.M.moving) {
        const b = getMovingBounds(mv, this.t);
        drawArenaPlatform(ctx, b, this.M.style, undefined, this.t);
      }
    }

    // Side walls / bounce barriers
    if (this.M.walls || this.M.bounceWalls) {
      for (const x of [0, W - 16]) {
        ctx.fillStyle = this.M.bounceWalls ? 'rgba(56,189,248,0.22)' : 'rgba(9,9,11,0.88)';
        ctx.fillRect(x, -20, 16, H + 40);
        ctx.fillStyle = this.M.bounceWalls ? '#38bdf8' : 'rgba(255,255,255,0.18)';
        ctx.fillRect(x ? x : 14, -20, 2, H + 40);
      }
    }

    // Conveyor belts
    if (this.M.belts) {
      for (const [bi, dr] of this.M.belts) {
        const b = this.M.pl[bi];
        ctx.save();
        ctx.beginPath();
        ctx.rect(b[0], b[1] + 4, b[2], 10);
        ctx.clip();
        ctx.fillStyle = '#fbbf24';
        for (let x = b[0] - 24 + ((((this.t * 1.4 * dr) % 24) + 24) % 24); x < b[0] + b[2]; x += 24) {
          ctx.fillRect(x, b[1] + 5, 10, 6);
        }
        ctx.restore();
      }
    }

    // Jump pads
    if (this.M.pads) {
      for (const pd of this.M.pads) {
        ctx.save();
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#4ade80';
        roundRectPath(ctx, pd[0] - pd[2] / 2, pd[1] - 6, pd[2], 6, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(134,239,172,0.55)';
        ctx.fillRect(pd[0] - pd[2] / 2 + 6, pd[1] - 14 + Math.sin(this.t * 0.2) * 3, pd[2] - 12, 3);
        ctx.restore();
      }
    }

    // Bounce Bumpers (Pinball / Pirate Barrel / Orbital Core)
    if (this.M.bumpers) {
      for (const bp of this.M.bumpers) {
        const pulse = 1 + Math.sin(this.t * 0.12 + bp.x) * 0.08;
        ctx.save();
        ctx.shadowColor = bp.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = bp.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = bp.color;
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.r * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Portals
    if (this.M.portals) {
      for (const pt of this.M.portals) {
        for (const [px, py] of [[pt.ax, pt.ay], [pt.bx, pt.by]]) {
          ctx.save();
          ctx.translate(px, py);
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 16;
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 14, 26, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.rotate(this.t * 0.08);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Loot crates
    for (const c of this.crates) {
      ctx.save();
      if (!c.ground) {
        ctx.strokeStyle = '#ffd54a';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(255,213,74,.35)';
        ctx.beginPath();
        ctx.arc(c.x, c.y - 34, 22, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(c.x - 22, c.y - 34);
        ctx.lineTo(c.x - 8, c.y - 14);
        ctx.moveTo(c.x + 22, c.y - 34);
        ctx.lineTo(c.x + 8, c.y - 14);
        ctx.stroke();
      }
      ctx.shadowColor = '#ffd54a';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#27272a';
      roundRectPath(ctx, c.x - 14, c.y - 14, 28, 28, 4);
      ctx.fill();
      ctx.strokeStyle = '#ffd54a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const icon = this.getCrateIcon(c.w);
      const fit = Math.min(22 / icon.w, 22 / icon.h);
      ctx.drawImage(
        icon.image,
        icon.x,
        icon.y,
        icon.w,
        icon.h,
        c.x - (icon.w * fit) / 2,
        c.y - (icon.h * fit) / 2,
        icon.w * fit,
        icon.h * fit
      );
      ctx.restore();
    }

    // Projectiles
    for (const p of this.proj) {
      if (p.t === 'B') {
        ctx.save();
        ctx.translate(p.x, p.y);
        drawWeaponSprite(ctx, 'bomb', this.t * 16);
        ctx.restore();
        if (p.l < 30 && p.l % 6 < 3) {
          ctx.fillStyle = 'rgba(255,60,30,.5)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 13, 0, 6.3);
          ctx.fill();
        }
      } else if (p.t === 'S') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.translate(-80, 0);
        drawWeaponSprite(ctx, 'spear', this.t * 16);
        ctx.restore();
      } else if (p.t === 'A') {
        ctx.strokeStyle = '#d9b27a';
        ctx.lineWidth = 2.5;
        const a = Math.atan2(p.vy, p.vx);
        const c = Math.cos(a);
        const sn = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(p.x - c * 14, p.y - sn * 14);
        ctx.lineTo(p.x + c * 8, p.y + sn * 8);
        ctx.stroke();
        ctx.fillStyle = '#dfe6ee';
        ctx.beginPath();
        ctx.moveTo(p.x + c * 13, p.y + sn * 13);
        ctx.lineTo(p.x + c * 5 - sn * 3, p.y + sn * 5 + c * 3);
        ctx.lineTo(p.x + c * 5 + sn * 3, p.y + sn * 5 - c * 3);
        ctx.fill();
      } else if (p.t === 'M') {
        ctx.save();
        ctx.translate(p.x, p.y);
        drawWeaponSprite(ctx, 'mine', this.t * 16);
        if ((p.arm || 0) <= 0 && this.t % 24 < 8) {
          ctx.fillStyle = 'rgba(255,40,40,.6)';
          ctx.beginPath();
          ctx.arc(8, -3, 6, 0, 6.3);
          ctx.fill();
        }
        ctx.restore();
      } else if (p.t === 'R') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = '#d0d6dc';
        ctx.fillRect(-9, -3, 18, 6);
        ctx.fillStyle = '#e23';
        ctx.beginPath();
        ctx.moveTo(9, -3);
        ctx.lineTo(15, 0);
        ctx.lineTo(9, 3);
        ctx.fill();
        ctx.restore();
      } else if (p.t === 'N') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(this.t * 0.2);
        ctx.fillStyle = '#4a5640';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = '#ffcf33';
        ctx.fillRect(-7.5, -1.5, 15, 3);
        ctx.restore();
      } else if (p.t === 'Y') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(this.t * 0.5);
        ctx.translate(-12, 0);
        drawWeaponSprite(ctx, 'boomerang', this.t * 16);
        ctx.restore();
      } else if (p.t === 'L') {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.shadowColor = '#4ff';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#4ff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.3, p.y - p.vy * 1.3);
        ctx.stroke();
        ctx.restore();
      } else if (p.t === 'H') {
        ctx.save();
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 6;
        drawShuriken(ctx, p.x, p.y, 11, this.t * 0.5);
        ctx.restore();
      } else if (p.t === 'O') {
        const pu = 1 + Math.sin(this.t * 0.4) * 0.15;
        ctx.save();
        ctx.shadowColor = '#c6f';
        ctx.shadowBlur = 20;
        const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 13 * pu);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.45, '#d58bff');
        g.addColorStop(1, 'rgba(120,30,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 13 * pu, 0, 6.3);
        ctx.fill();
        ctx.restore();
      } else if (p.t === 'Z') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.shadowColor = '#9df';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#dff6ff';
        ctx.beginPath();
        ctx.moveTo(12, 0); ctx.lineTo(0, -5); ctx.lineTo(-10, 0); ctx.lineTo(0, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.t === 'F') {
        const k = p.l / 24;
        const rad = 5 + (1 - k) * 9;
        ctx.globalAlpha = k;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, '#fff3a0');
        g.addColorStop(0.5, '#ff8a1f');
        g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, 6.3);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = '#ffe27a';
        ctx.lineWidth = p.t === 'p' ? 2 : 3;
        ctx.shadowColor = '#ffd54a';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Sniper sights
    for (const f of this.fs) {
      if (f.alive && f.weapon === 'sniper') {
        const ax = Math.cos(f.aim);
        const ay = Math.sin(f.aim);
        const x0 = f.x + ax * 38;
        const y0 = f.y - 8 + ay * 38;
        let x = x0;
        let y = y0;
        for (let i = 0; i < 230; i++) {
          x += ax * 6;
          y += ay * 6;
          if (x < -10 || x > W + 10 || y < -60 || y > H + 60 || this.inRect(x, y)) break;
        }
        ctx.save();
        ctx.strokeStyle = `rgba(255,40,40,${0.55 + 0.25 * Math.sin(this.t * 0.4)})`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#f22';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = '#ff5050';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 6.3);
        ctx.fill();
        ctx.restore();
      }
    }

    // High-speed afterimages
    for (const gh of this.ghosts) {
      drawRagdollStickman(ctx, gh.rig, {
        color: gh.color,
        weapon: 'none',
        alpha: (gh.life / gh.maxLife) * 0.28,
      });
    }

    // Limp dead ragdoll corpses bouncing across platforms
    for (const dr of this.deadRagdolls) {
      const alpha = Math.min(1, dr.deadLife / 40);
      drawRagdollStickman(ctx, dr, {
        color: dr.color,
        weapon: 'none',
        alpha,
      });
    }

    // Shadows & active fighters
    for (const f of this.fs) {
      if (f.alive && f.ground) {
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath();
        ctx.ellipse(f.x, f.y + 27, 15, 4, 0, 0, 6.3);
        ctx.fill();
      }
    }
    for (const f of this.fs) if (f.alive) this.drawFighter(ctx, f);

    // Tapered glowing melee slash ribbons
    for (const tr of this.slashTrails) {
      if (tr.pts.length < 2) continue;
      const a = tr.life / tr.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let k = 1; k < tr.pts.length; k++) {
        const t = k / (tr.pts.length - 1);
        ctx.globalAlpha = a * t * 0.78;
        ctx.strokeStyle = tr.color;
        ctx.lineWidth = tr.width * t;
        ctx.beginPath();
        ctx.moveTo(tr.pts[k - 1][0], tr.pts[k - 1][1]);
        ctx.lineTo(tr.pts[k][0], tr.pts[k][1]);
        ctx.stroke();

        ctx.globalAlpha = a * t * 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.2, tr.width * t * 0.35);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bouncing brass shell casings
    for (const c of this.casings) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.life / 16);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.a);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-3, -1.2, 6, 2.4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-2, -1.2, 2, 2.4);
      ctx.restore();
    }

    // Name tags & HP bars (anchored dynamically above simulated ragdoll head)
    ctx.save();
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.fs) {
      if (!f.alive) continue;
      const rig = this.rigs[f.index];
      const hx = rig ? rig.head.x : f.x;
      const hy = rig ? rig.head.y : f.y - 21;
      const nm = PLAYER_NAMES[f.index] || `P${f.index + 1}`;
      const look = PartyEconomy.look(f.index);
      const ext = PartyEconomy.headTop(look, 12);
      const hpY = hy - ext - 10;
      const w = ctx.measureText(nm).width + 18;
      const x = hx;
      const y = hpY - 13;
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(x - 18, hpY, 36, 4);
      ctx.fillStyle = f.hp > 40 ? '#4ade80' : '#f87171';
      ctx.fillRect(x - 18, hpY, (36 * Math.max(0, f.hp)) / 100, 4);
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 18, hpY, 36, 4);

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(9,9,11,0.85)';
      roundRectPath(ctx, x - w / 2, y - 9, w, 18, 5);
      ctx.fill();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(x - w / 2 + 8, y, 2.5, 0, 6.3);
      ctx.fill();
      ctx.fillStyle = '#f4f4f5';
      ctx.fillText(nm, x + 4, y + 0.5);
    }
    ctx.restore();

    // Expanding impact shockwave rings & floating damage popups
    for (const r of this.rings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.75;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1.2, 3.2 * (r.life / r.maxLife));
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const pp of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (pp.life / pp.maxLife) * 1.4);
      ctx.font = pp.big ? '900 24px "Barlow Condensed", sans-serif' : '800 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(9,9,11,0.85)';
      ctx.strokeText(pp.text, pp.x, pp.y);
      ctx.fillStyle = pp.color;
      ctx.fillText(pp.text, pp.x, pp.y);
      ctx.restore();
    }

    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.a);
      ctx.strokeStyle = d.c;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-d.len / 2, 0);
      ctx.lineTo(d.len / 2, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Angular flying Stick-Fight Ice Shards
    for (const sh of this.iceShards) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (sh.l / sh.m) * 1.35);
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.a);
      ctx.fillStyle = sh.c;
      ctx.strokeStyle = 'rgba(224,242,254,0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      sh.pts.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1])));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      if (p.g) {
        ctx.globalAlpha = p.l / p.m;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.6, 0, 6.3);
        ctx.fill();
      }
    }
    for (const b of this.beams) {
      const bc = b.c || '#ff5a5a';
      ctx.globalAlpha = Math.min(1, b.l / 14);
      ctx.strokeStyle = bc;
      ctx.lineWidth = 5;
      ctx.shadowColor = bc;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      if (b.pts) b.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      else {
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
      }
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // Stick-Fight Comic Fireball Explosions (layered glowing spheres + flame streaks + shockwave ring)
    for (const e of this.fx) {
      const k = Math.min(1, e.t / 32);
      const baseR = e.r || 125;
      const rad = (0.38 + Math.sin(k * Math.PI * 0.65) * 0.92) * baseR;
      const fade = Math.max(0, 1 - Math.pow(k, 1.4));

      // Outer ambient golden glow
      const og = ctx.createRadialGradient(e.x, e.y, rad * 0.1, e.x, e.y, rad * 1.35);
      og.addColorStop(0, `rgba(254, 240, 138, ${0.82 * fade})`);
      og.addColorStop(0.5, `rgba(251, 146, 60, ${0.42 * fade})`);
      og.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(e.x, e.y, rad * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Secondary comic lobes for dynamic Stick Fight fireball silhouette
      const seed = (e.x * 0.13 + e.y * 0.07) % 6.28;
      for (let m = 0; m < 5; m++) {
        const ma = seed + (m / 5) * Math.PI * 2 + k * 0.35;
        const dist = rad * (0.28 + (m % 2) * 0.16);
        const lr = rad * (0.42 - k * 0.14);
        ctx.fillStyle = m % 2 ? `rgba(253, 224, 71, ${0.78 * fade})` : `rgba(249, 115, 22, ${0.65 * fade})`;
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(ma) * dist, e.y + Math.sin(ma) * dist, Math.max(2, lr), 0, Math.PI * 2);
        ctx.fill();
      }

      // Bright white-yellow core flash
      if (k < 0.55) {
        ctx.fillStyle = `rgba(255, 255, 240, ${0.95 * (1 - k / 0.55)})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, rad * 0.44, 0, Math.PI * 2);
        ctx.fill();
      }

      // Expanding crisp shockwave ring & flame rays
      ctx.strokeStyle = `rgba(254, 240, 138, ${0.65 * (1 - k)})`;
      ctx.lineWidth = Math.max(1.5, 6 * (1 - k));
      ctx.beginPath();
      ctx.arc(e.x, e.y, baseR * (0.25 + k * 1.15), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(253, 224, 71, ${0.7 * fade})`;
      ctx.lineWidth = Math.max(1.5, 4.5 * (1 - k));
      ctx.lineCap = 'round';
      for (let ray = 0; ray < 6; ray++) {
        const ra = seed + ray * 1.047 + 0.3;
        const r0 = rad * 0.45;
        const r1 = rad * (1.05 + k * 0.45);
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(ra) * r0, e.y + Math.sin(ra) * r0);
        ctx.lineTo(e.x + Math.cos(ra) * r1, e.y + Math.sin(ra) * r1);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.parts) {
      if (!p.g) {
        ctx.globalAlpha = p.l / p.m;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }
    }
    ctx.globalAlpha = 1;

    if (this.M.lava) {
      const surfGlow = ctx.createLinearGradient(0, Math.max(0, this.lavaY - 45), 0, this.lavaY + 25);
      surfGlow.addColorStop(0, 'rgba(255,70,10,0)');
      surfGlow.addColorStop(1, 'rgba(255,120,20,0.45)');
      ctx.fillStyle = surfGlow;
      ctx.fillRect(0, Math.max(0, this.lavaY - 45), W, 70);

      const g = ctx.createLinearGradient(0, this.lavaY, 0, H);
      g.addColorStop(0, '#ffe54c');
      g.addColorStop(0.12, '#ff6a1a');
      g.addColorStop(0.45, '#c91f06');
      g.addColorStop(1, '#450602');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 15) {
        const wave = Math.sin(x * 0.035 + this.t * 0.07) * 5 + Math.sin(x * 0.08 - this.t * 0.11) * 2.5;
        ctx.lineTo(x, this.lavaY + wave);
      }
      ctx.lineTo(W, H);
      ctx.fill();
    }

    ctx.restore(); // End dynamic action camera transform before screen-space HUD & Vignette

    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.52)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(244,244,245,0.68)';
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${this.M.name}${this.cfg.loot ? '  ·  Loot Drop' : ''}  ·  Raund ${this.currentRound}/${this.cfg.rounds}`, W / 2, 26);

    if (this.cd > 0) {
      const beat = Math.max(1, Math.ceil(this.cd / 40));
      const sub = (this.cd % 40 || 40) / 40;
      const pop = 0.92 + (1 - sub) * 0.22;
      ctx.save();
      ctx.translate(W / 2, H / 2 - 24);
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(9,9,11,0.85)';
      ctx.font = '900 108px "Barlow Condensed", sans-serif';
      ctx.strokeText(String(beat), 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(beat), 0, 0);
      ctx.restore();
    } else if (this.fightFlash > 0 && !this.over) {
      const prog = 1 - this.fightFlash / 52;
      const alpha = prog < 0.18 ? prog / 0.18 : prog > 0.72 ? (1 - prog) / 0.28 : 1;
      const scl = prog < 0.22 ? 1.45 - (prog / 0.22) * 0.45 : 1 + prog * 0.08;
      ctx.save();
      ctx.translate(W / 2, H / 2 - 18);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Impact ring & horizontal speed streak
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.lineWidth = Math.max(1, 5 * (1 - prog));
      ctx.beginPath();
      ctx.arc(0, 0, 45 + prog * 170, 0, Math.PI * 2);
      ctx.stroke();

      const slashW = 340 + prog * 180;
      const slashGrad = ctx.createLinearGradient(-slashW / 2, 0, slashW / 2, 0);
      slashGrad.addColorStop(0, 'rgba(250,204,21,0)');
      slashGrad.addColorStop(0.5, 'rgba(250,204,21,0.28)');
      slashGrad.addColorStop(1, 'rgba(250,204,21,0)');
      ctx.fillStyle = slashGrad;
      ctx.fillRect(-slashW / 2, -46, slashW, 92);

      ctx.scale(scl, scl);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'italic 900 116px "Barlow Condensed", sans-serif';
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(9,9,11,0.92)';
      ctx.strokeText('FIGHT!', 0, 0);

      const txtGrad = ctx.createLinearGradient(0, -50, 0, 50);
      txtGrad.addColorStop(0, '#ffffff');
      txtGrad.addColorStop(0.55, '#fde047');
      txtGrad.addColorStop(1, '#f97316');
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 24;
      ctx.fillStyle = txtGrad;
      ctx.fillText('FIGHT!', 0, 0);
      ctx.restore();
    }

    if (this.over && this.banner > 0) {
      const elapsed = 140 - this.banner;
      const prog = Math.min(1, elapsed / 24);
      const easeOutBack = 1 + 2.1 * Math.pow(prog - 1, 3) + 1.1 * Math.pow(prog - 1, 2);
      const bannerY = -84 + (116 + 84) * Math.min(1.06, Math.max(0, easeOutBack));
      const isDraw = this.bannerTxt.toLowerCase().includes('bərabərlik');
      const winName = isDraw ? 'BƏRABƏRLİK!' : this.bannerTxt.replace(/\s*qazandı!?$/i, '').trim();
      const winCol = this.bannerCol || '#ffffff';

      ctx.save();
      ctx.translate(W / 2, bannerY);
      ctx.globalAlpha = Math.min(1, prog * 2);

      if (!isDraw) {
        ctx.font = '800 54px "Barlow Condensed", sans-serif';
        const nameW = ctx.measureText(winName).width;
        ctx.font = '800 40px "Barlow Condensed", sans-serif';
        const tagW = ctx.measureText('QAZANDI!').width + 26;
        const totalW = Math.max(280, nameW + tagW + 66);

        ctx.fillStyle = 'rgba(9,9,11,0.92)';
        roundRectPath(ctx, -totalW / 2, -42, totalW, 84, 14);
        ctx.fill();
        ctx.shadowColor = winCol;
        ctx.shadowBlur = 22;
        ctx.strokeStyle = winCol;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const startX = -totalW / 2 + 24;
        ctx.font = '800 54px "Barlow Condensed", sans-serif';
        ctx.fillStyle = winCol;
        ctx.fillText(winName, startX, 2);

        const pillX = startX + nameW + 14;
        ctx.fillStyle = winCol;
        roundRectPath(ctx, pillX, -22, tagW, 44, 8);
        ctx.fill();
        ctx.fillStyle = '#09090b';
        ctx.font = '800 36px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QAZANDI!', pillX + tagW / 2, 2);
      } else {
        ctx.fillStyle = 'rgba(9,9,11,0.9)';
        roundRectPath(ctx, -165, -36, 330, 72, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 50px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BƏRABƏRLİK!', 0, 2);
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  private loop = (now: number) => {
    if (!this.on || !this.canvas) return;
    this.raf = requestAnimationFrame(this.loop);

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetW = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const targetH = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    pollKeyboard(this.netRole !== null);
    if (this.paused) {
      this.acc = 0;
      return;
    }

    if (!this.last) this.last = now;
    this.acc += now - this.last;
    this.last = now;
    const STEP = 1000 / 60;
    let n = 0;
    if (this.netRole !== 'guest') {
      while (this.acc >= STEP && n < 4) {
        if (this.gameState === 'playing' || this.over) this.step();
        this.acc -= STEP;
        n++;
      }
    } else {
      this.acc = 0;
    }
    if (this.acc > STEP * 4) this.acc = 0;

    this.draw();
    if (this.netRole && this.callbacks?.onSendNet) {
      this.callbacks.onSendNet();
    }
  };
}

export const fightEngine = new FightEngine();

const previewRigs = new Map<number, { rig: RagdollRig; lastTime: number }>();

export function pokeFighterPreview(index: number, nx = 0.5, ny = 0.45) {
  const entry = previewRigs.get(index);
  if (!entry) return;
  const kx = (nx - 0.5) >= 0 ? -7.5 : 7.5;
  const ky = (ny - 0.5) * 6 - 3.5;
  applyRagdollImpulse(entry.rig, kx, ky, 14, 70 + (ny - 0.4) * 60);
}

export function renderFighterPreview(cv: HTMLCanvasElement, index: number, phase: number) {
  const g = cv.getContext('2d');
  if (!g) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cssW = cv.clientWidth || cv.width || 160;
  const cssH = cv.clientHeight || cv.height || 186;
  const targetW = Math.max(1, Math.round(cssW * dpr));
  const targetH = Math.max(1, Math.round(cssH * dpr));
  if (cv.width !== targetW || cv.height !== targetH) {
    cv.width = targetW;
    cv.height = targetH;
  }

  const w = 160;
  const h = 186;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  // Full-bleed monochrome studio backdrop
  const backdrop = g.createLinearGradient(0, 0, 0, cssH);
  backdrop.addColorStop(0, '#18181b');
  backdrop.addColorStop(0.65, '#101115');
  backdrop.addColorStop(1, '#09090b');
  g.fillStyle = backdrop;
  g.fillRect(0, 0, cssW, cssH);

  const scale = Math.min(cssW / w, cssH / h);
  const offX = (cssW - w * scale) / 2;
  const offY = (cssH - h * scale) / 2;

  g.save();
  g.translate(offX, offY);
  g.scale(scale, scale);

  const col = PLAYER_COLORS[index] || '#3b82f6';
  const cx = w / 2;
  const bounce = Math.sin(phase * 2.1) * 1.6;
  const sway = Math.cos(phase * 1.05) * 1.4;

  // Subtle floor grid perspective lines
  g.strokeStyle = 'rgba(255,255,255,0.045)';
  g.lineWidth = 1;
  for (let gx = -30; gx <= 190; gx += 22) {
    g.beginPath();
    g.moveTo(cx + (gx - cx) * 0.42, 134);
    g.lineTo(gx, h + 10);
    g.stroke();
  }

  // Ambient character spotlight aura behind figure
  const aura = g.createRadialGradient(cx, 94, 8, cx, 94, 72);
  aura.addColorStop(0, hexToRgba(col, 0.22));
  aura.addColorStop(0.55, 'rgba(255,255,255,0.04)');
  aura.addColorStop(1, 'rgba(9,9,11,0)');
  g.fillStyle = aura;
  g.fillRect(-30, 0, w + 60, h);

  // Studio Pedestal
  g.fillStyle = 'rgba(0,0,0,0.68)';
  g.beginPath();
  g.ellipse(cx, 166, 44, 8.5, 0, 0, Math.PI * 2);
  g.fill();

  const stage = g.createLinearGradient(0, 155, 0, 169);
  stage.addColorStop(0, 'rgba(244,244,245,0.36)');
  stage.addColorStop(1, 'rgba(39,39,42,0.95)');
  g.fillStyle = stage;
  g.beginPath();
  g.ellipse(cx, 161, 36, 6.5, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = hexToRgba(col, 0.5);
  g.lineWidth = 1.2;
  g.stroke();

  // Live Interactive Active-Ragdoll Preview Rig
  let entry = previewRigs.get(index);
  if (!entry) {
    entry = { rig: createRagdollRig(index, col, cx, 118, 1, 1.38), lastTime: phase };
    previewRigs.set(index, entry);
  }
  entry.rig.color = col;
  entry.rig.index = index;
  if (Math.abs(phase - entry.lastTime) > 0.001) {
    entry.lastTime = phase;
    stepActiveRagdoll(entry.rig, {
      x: cx + sway * 0.5,
      y: 121 + bounce * 0.5,
      vx: sway * 0.25,
      vy: 0,
      dir: 1,
      aim: -0.15 + Math.sin(phase * 1.4) * 0.12,
      ground: true,
      phase: 0,
      sq: 0,
      recoil: 0,
      atkT: 0,
      atkP: 0,
      weapon: 'fist',
      twoHanded: false,
      handTarget1: [cx + 24 + sway, 85 + bounce * 0.8],
      gravity: 0.36,
      time: phase * 30,
    });
  }

  drawRagdollStickman(g, entry.rig, {
    color: col,
    weapon: 'fist',
    twoHanded: false,
    time: phase * 30,
  });

  g.restore();
}
