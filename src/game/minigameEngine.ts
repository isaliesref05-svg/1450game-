import { PartyAudio } from './audio';
import { PartyEconomy } from './economy';
import { roundRectPath } from './maps';
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
  MinigameId,
  PLAYER_COLORS,
  PLAYER_NAMES,
  pollKeyboard,
  resetInputs,
} from './types';

export interface MiniPlayer {
  index: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  radius: number;
  angle: number;
  color: string;
  alive: boolean;
  score: number;
  roundStart: number;
  isAttacking: boolean;
  attackTimer: number;
  dashCooldown: number;
  coins: number;
  raceX: number;
  invincible: number;
  onGround: boolean;
  jumpsLeft: number;
  jh: boolean;
  highJ: boolean;
  kingTicks: number;
  throwCd: number;
  snowCd: number;
  trail: { x: number; y: number; life: number }[];
  phase: number;
  leanX: number;
  leanVx: number;
  headX: number;
  headVx: number;
  headY: number;
  headVy: number;
  tilt: number;
  tiltV: number;
  sq: number;
  coyoteT: number;
  jumpBuf: number;
  prevVx: number;
  prevVy: number;
  zHop: number;
  zVel: number;
  weap: 'blaster' | 'shotgun' | 'rapid' | 'grenade';
  weapT: number;
  shield: boolean;
}

interface MiniParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

interface FloatingPopup {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
}

interface MiniProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: number;
  life: number;
  snow: boolean;
  color?: string;
  radius?: number;
  bounces?: number;
  dmg?: number;
  kind?: 'bolt' | 'shotgun' | 'sniper' | 'grenade';
}

interface CoinItem {
  x: number;
  y: number;
  radius: number;
  life: number;
  diamond: boolean;
  kind?: 'shotgun' | 'rapid' | 'medkit' | 'shield' | 'paintbomb' | 'grenade' | 'power' | 'repair';
}

interface ZombieEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  kind: 0 | 1 | 2 | 3; // 0: Walker, 1: Runner, 2: Brute, 3: Red Boss
  phase: number;
  hitFlash: number;
}

interface ZombieBarrel {
  id: number;
  x: number;
  y: number;
  hp: number;
  respawnT: number;
}

interface SawBlade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
}

interface ArenaPillar {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SlashArc {
  x: number;
  y: number;
  angle: number;
  color: string;
  life: number;
  maxLife: number;
  radius: number;
}

interface RingFx {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  life: number;
  maxLife: number;
}

interface RaceObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: 'crate' | 'wall' | 'platform' | 'spring' | 'boost' | 'floor' | 'saw';
  r?: number;
  baseY?: number;
  dy?: number;
  speed?: number;
}

interface LaserBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  warn: number;
  active: number;
  width: number;
  color: string;
}

interface LavaPlat {
  x: number;
  y: number;
  w: number;
  dx: number;
  minX: number;
  maxX: number;
  kind?: 'stone' | 'spring' | 'crumble';
  crumbleT?: number;
}

interface MiniBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  lastKicker: number;
  holder: number;
  fuse: number;
  noPick: number;
  maxFuse?: number;
}

interface ZombiePlatform {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'concrete' | 'car' | 'bus' | 'bridge' | 'crate';
  color?: string;
}

interface ZombieBuilding {
  x: number;
  w: number;
  h: number;
  layer: 0 | 1;
  broken: number;
  fire: boolean;
  moss: number;
  seed: number;
}

interface ZombieEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
}

export interface MiniSerializedState {
  mini: MinigameId;
  gs: 'playing' | 'roundEnd' | 'matchEnd';
  cr: number;
  gt: number;
  gtm: number;
  cd: number | null;
  pl: Partial<MiniPlayer>[];
  pr: MiniProjectile[];
  ball: MiniBall | null;
  coins: CoinItem[];
  ro: number;
  ob: RaceObstacle[];
  rf: number;
  beams?: LaserBeam[];
  plats?: LavaPlat[];
  lavaY?: number;
  lavaCamY?: number;
  zombies?: ZombieEntity[];
  saws?: SawBlade[];
  pillars?: ArenaPillar[];
  slashes?: SlashArc[];
  rings?: RingFx[];
  ringScale?: number;
  wave?: number;
  zKills?: number;
  zPlats?: ZombiePlatform[];
  zBarrels?: ZombieBarrel[];
}

export interface MiniCallbacks {
  onHudUpdate: (values: (number | string)[], count: number, round: number, maxRounds: number) => void;
  onMatchEnd: (scores: number[], winnerIndices: number[]) => void;
  onSendNet?: () => void;
}

function pointSegDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export class MinigameEngine {
  on = false;
  paused = false;
  netRole: 'host' | 'guest' | null = null;
  gameState: 'playing' | 'roundEnd' | 'matchEnd' = 'playing';
  currentMinigame: MinigameId = 'zombie';
  currentRound = 1;
  maxRounds = 3;
  playerCount = 2;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private callbacks: MiniCallbacks | null = null;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private roundTimerHandle: ReturnType<typeof setTimeout> | null = null;
  private cw = 960;
  private ch = 540;

  private players: MiniPlayer[] = [];
  private particles: MiniParticle[] = [];
  private popups: FloatingPopup[] = [];
  private projectiles: MiniProjectile[] = [];
  private ball: MiniBall | null = null;
  private coins: CoinItem[] = [];
  private zombies: ZombieEntity[] = [];
  private saws: SawBlade[] = [];
  private pillars: ArenaPillar[] = [];
  private slashes: SlashArc[] = [];
  private rings: RingFx[] = [];
  private ringScale = 1;
  private zombieWave = 1;
  private readonly zMaxWaves = 20;
  private zombieWon = false;
  private zombieKills = 0;
  private nextBossAt = 8;
  private waveBossSpawned = false;
  private zombieSpawnTimer = 0;
  private readonly zWorldW = 2400;
  private readonly zGroundY = 515;
  private zCamX = 1200;
  private zCamY = 300;
  private zCamZoom = 1;
  private zPlats: ZombiePlatform[] = [];
  private zBarrels: ZombieBarrel[] = [];
  private zBuildings: ZombieBuilding[] = [];
  private zEmbers: ZombieEmber[] = [];
  private sawSpawnTimer = 0;
  private raceOffset = 0;
  private raceObstacles: RaceObstacle[] = [];
  private raceFinishX = 0;
  private beams: LaserBeam[] = [];
  private laserSpawnTimer = 0;
  private plats: LavaPlat[] = [];
  private lavaY = 520;
  private lavaCamY = 0;
  private highestPlatY = 0;
  private lavaTick = 0;
  private coinSpawnTimer = 0;
  private gameTimer = 0;
  private gameTimerMax = 0;
  private countdownTimer = 0;
  private countdownActive = false;
  private shakeMag = 0;
  private shakeDur = 0;
  private shakeX = 0;
  private shakeY = 0;
  private hudTick = 0;
  private roundEndTicks = 0;
  private miniTick = 0;
  private hitStop = 0;
  private rigs: RagdollRig[] = [];
  private deadRagdolls: { rig: RagdollRig; floorY?: number }[] = [];
  private sakuraPetals: { x: number; y: number; r: number; sp: number; drift: number }[] = [];

  start(
    canvas: HTMLCanvasElement,
    minigame: MinigameId,
    pCount: number,
    rounds: number,
    netRole: 'host' | 'guest' | null,
    callbacks: MiniCallbacks
  ) {
    this.stop();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = Math.max(1, canvas.clientWidth || canvas.width || 960);
    const cssH = Math.max(1, canvas.clientHeight || canvas.height || 540);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    this.cw = cssW;
    this.ch = cssH;
    this.currentMinigame = minigame;
    this.playerCount = pCount || 2;
    this.maxRounds = rounds || 3;
    this.currentRound = 1;
    this.netRole = netRole;
    this.callbacks = callbacks;
    this.paused = false;

    this.sakuraPetals = Array.from({ length: 34 }, () => ({
      x: Math.random() * cssW,
      y: Math.random() * cssH,
      r: 2.2 + Math.random() * 2.5,
      sp: 0.55 + Math.random() * 0.9,
      drift: 0.4 + Math.random() * 0.8,
    }));

    PartyEconomy.beginMatch();
    this.spawnPlayers();
    this.initMinigame();
    this.gameState = 'playing';
    this.countdownActive = minigame !== 'zombie';
    this.countdownTimer = minigame !== 'zombie' ? 150 : 0;
    this.emitHud();

    this.on = true;
    this.last = 0;
    this.acc = 0;
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.on = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.roundTimerHandle) {
      clearTimeout(this.roundTimerHandle);
      this.roundTimerHandle = null;
    }
  }

  getPlayerPos(index: number): { x: number; y: number } | null {
    const p = this.players[index];
    if (!p || !p.alive) return null;
    if (this.currentMinigame === 'zombie') {
      return {
        x: (p.x - this.zCamX) * this.zCamZoom + this.cw / 2,
        y: (p.y - this.zCamY) * this.zCamZoom + this.ch / 2,
      };
    }
    return { x: p.x, y: p.y };
  }

  restart() {
    if (this.roundTimerHandle) {
      clearTimeout(this.roundTimerHandle);
      this.roundTimerHandle = null;
    }
    PartyEconomy.beginMatch();
    this.currentRound = 1;
    this.players.forEach((p) => {
      p.score = 0;
      p.roundStart = 0;
    });
    this.startRound();
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) resetInputs();
  }

  serialize(): MiniSerializedState {
    return {
      mini: this.currentMinigame,
      gs: this.gameState,
      cr: this.currentRound,
      gt: this.gameTimer,
      gtm: this.gameTimerMax,
      cd: this.countdownActive ? this.countdownTimer : null,
      pl: this.players.map((p) => ({
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        hp: p.hp,
        alive: p.alive,
        angle: p.angle,
        score: p.score,
        coins: p.coins,
        raceX: p.raceX,
        isAttacking: p.isAttacking,
        invincible: p.invincible,
        zHop: p.zHop,
        weap: p.weap,
        weapT: p.weapT,
        shield: p.shield,
        dashCooldown: p.dashCooldown,
      })),
      pr: this.projectiles,
      ball: this.ball,
      coins: this.coins,
      ro: this.raceOffset,
      ob: this.raceObstacles,
      rf: this.raceFinishX,
      beams: this.beams,
      plats: this.plats,
      lavaY: this.lavaY,
      lavaCamY: this.lavaCamY,
      zombies: this.zombies,
      saws: this.saws,
      pillars: this.pillars,
      slashes: this.slashes,
      rings: this.rings,
      ringScale: this.ringScale,
      wave: this.zombieWave,
      zKills: this.zombieKills,
      zPlats: this.currentMinigame === 'zombie' ? this.zPlats : undefined,
      zBarrels: this.currentMinigame === 'zombie' ? this.zBarrels : undefined,
    };
  }

  apply(d: MiniSerializedState) {
    if (!d || !this.players.length) return;
    const prevMini = this.currentMinigame;
    const prevAlive = this.players.map((p) => p.alive);
    this.currentMinigame = d.mini;
    d.pl.forEach((st, i) => {
      if (this.players[i]) Object.assign(this.players[i], st);
    });
    if (this.rigs.length !== this.players.length || d.mini !== prevMini || d.cr !== this.currentRound) {
      this.deadRagdolls = [];
      this.rigs = this.players.map((p) =>
        createRagdollRig(p.index, p.color, p.x, p.y, Math.cos(p.angle) >= 0 ? 1 : -1, 0.94)
      );
      if (d.mini === 'zombie' && this.zBuildings.length === 0) {
        this.initZombieAtmosphere();
      }
    } else {
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        const rig = this.rigs[i];
        if (prevAlive[i] && !p.alive && rig) {
          this.spawnMiniDeadRagdoll(p, rig);
        }
      }
    }
    this.projectiles = d.pr;
    this.ball = d.ball;
    this.coins = d.coins;
    this.raceOffset = d.ro;
    this.raceObstacles = d.ob;
    this.raceFinishX = d.rf;
    if (d.beams) this.beams = d.beams;
    if (d.plats) this.plats = d.plats;
    if (typeof d.lavaY === 'number') this.lavaY = d.lavaY;
    if (typeof d.lavaCamY === 'number') this.lavaCamY = d.lavaCamY;
    if (d.zombies) this.zombies = d.zombies;
    if (d.saws) this.saws = d.saws;
    if (d.pillars) this.pillars = d.pillars;
    if (d.slashes) this.slashes = d.slashes;
    if (d.rings) this.rings = d.rings;
    if (typeof d.ringScale === 'number') this.ringScale = d.ringScale;
    if (typeof d.wave === 'number') this.zombieWave = d.wave;
    if (typeof d.zKills === 'number') this.zombieKills = d.zKills;
    if (d.zPlats) this.zPlats = d.zPlats;
    if (d.zBarrels) this.zBarrels = d.zBarrels;
    this.gameTimer = d.gt;
    this.gameTimerMax = d.gtm;
    this.currentRound = d.cr;
    this.countdownActive = d.cd !== null;
    if (d.cd !== null) this.countdownTimer = d.cd;
    this.emitHud();
    if (d.gs === 'matchEnd' && this.gameState !== 'matchEnd') {
      this.gameState = 'matchEnd';
      this.triggerMatchEnd();
    } else if (d.gs !== 'matchEnd') {
      this.gameState = d.gs;
    }
  }

  private emitHud() {
    const useCoins = this.currentMinigame === 'zombie';
    const vals = this.players.map((p) => (useCoins ? p.coins : p.score));
    this.callbacks?.onHudUpdate(vals, this.playerCount, this.currentRound, this.maxRounds);
  }

  private triggerMatchEnd() {
    const scores = this.players.map((p) => p.score);
    const maxS = Math.max(...scores, 0);
    const winners = this.players.filter((p) => p.score === maxS).map((p) => p.index);
    this.callbacks?.onMatchEnd(scores, winners);
  }

  private spawnPlayers() {
    const prevScores = this.players.map((p) => p.score);
    this.players = [];
    const cx = this.cw / 2;
    const cy = this.ch / 2;
    const spawnDist = Math.min(this.cw, this.ch) * 0.22;

    for (let i = 0; i < this.playerCount; i++) {
      const angle = (Math.PI * 2 * i) / this.playerCount - Math.PI / 2;
      const sc = prevScores[i] || 0;
      this.players.push({
        index: i,
        x: cx + Math.cos(angle) * spawnDist,
        y: cy + Math.sin(angle) * spawnDist,
        vx: 0,
        vy: 0,
        hp: 100,
        radius: 17,
        angle: Math.atan2(cy - (cy + Math.sin(angle) * spawnDist), cx - (cx + Math.cos(angle) * spawnDist)),
        color: PLAYER_COLORS[i],
        alive: true,
        score: sc,
        roundStart: sc,
        isAttacking: false,
        attackTimer: 0,
        dashCooldown: 0,
        coins: 0,
        raceX: 0,
        invincible: 0,
        onGround: true,
        jumpsLeft: 1,
        jh: false,
        highJ: false,
        kingTicks: 0,
        throwCd: 0,
        snowCd: 0,
        trail: [],
        phase: i * 1.1,
        leanX: 0,
        leanVx: 0,
        headX: 0,
        headVx: 0,
        headY: 0,
        headVy: 0,
        tilt: 0,
        tiltV: 0,
        sq: 0,
        coyoteT: 0,
        jumpBuf: 0,
        prevVx: 0,
        prevVy: 0,
        zHop: 0,
        zVel: 0,
        weap: 'blaster',
        weapT: 0,
        shield: false,
      });
    }
  }

  private initMinigame() {
    this.projectiles = [];
    this.particles = [];
    this.popups = [];
    this.coins = [];
    this.zombies = [];
    this.saws = [];
    this.pillars = [];
    this.slashes = [];
    this.rings = [];
    this.raceObstacles = [];
    this.beams = [];
    this.plats = [];
    this.ball = null;
    this.coinSpawnTimer = 0;
    this.laserSpawnTimer = 40;
    this.zombieSpawnTimer = 25;
    this.sawSpawnTimer = 0;
    this.zombieWave = 1;
    this.ringScale = 1;
    this.raceOffset = 0;
    this.lavaTick = 0;

    const cw = this.cw;
    const ch = this.ch;

    switch (this.currentMinigame) {
      case 'zombie': {
        this.gameTimer = 0;
        this.gameTimerMax = 0;
        this.zombieKills = 0;
        this.zombieWave = 1;
        this.zombieWon = false;
        this.nextBossAt = 8;
        this.waveBossSpawned = false;
        this.zombieSpawnTimer = 30;
        const gy = this.zGroundY;
        this.zPlats = [
          // Left ruined highway & rusted sedan
          { x: 95, y: gy - 122, w: 265, h: 16, kind: 'bridge' },
          { x: 215, y: gy - 46, w: 54, h: 46, kind: 'crate' },
          { x: 405, y: gy - 47, w: 128, h: 47, kind: 'car', color: '#4d5d4e' },
          // Collapsed apartment balcony & overturned bus
          { x: 575, y: gy - 148, w: 225, h: 16, kind: 'concrete' },
          { x: 845, y: gy - 76, w: 192, h: 76, kind: 'bus', color: '#85642d' },
          // Center overpass & military barricade
          { x: 1090, y: gy - 168, w: 240, h: 16, kind: 'bridge' },
          { x: 1175, y: gy - 48, w: 62, h: 48, kind: 'crate' },
          // Right-center rusted SUV & mossy overpass
          { x: 1385, y: gy - 50, w: 134, h: 50, kind: 'car', color: '#5c4b42' },
          { x: 1565, y: gy - 140, w: 235, h: 16, kind: 'concrete' },
          // Right overturned city bus & ruins
          { x: 1855, y: gy - 76, w: 188, h: 76, kind: 'bus', color: '#6b5335' },
          { x: 2075, y: gy - 126, w: 225, h: 16, kind: 'bridge' },
          { x: 2150, y: gy - 46, w: 54, h: 46, kind: 'crate' },
        ];
        const barrelXs = [650, 1750];
        this.zBarrels = barrelXs.map((bx, idx) => ({
          id: idx + 1,
          x: bx,
          y: gy - 16,
          hp: 1,
          respawnT: 0,
        }));
        this.initZombieAtmosphere();

        const centerX = this.zWorldW * 0.5;
        this.players.forEach((p, idx) => {
          const offset = (idx - (this.playerCount - 1) / 2) * 58;
          p.x = centerX + offset;
          p.y = gy - 22;
          p.vx = 0;
          p.vy = 0;
          p.onGround = true;
          p.jumpsLeft = 1;
          p.angle = idx % 2 === 0 ? 0 : Math.PI;
          p.hp = 100;
          p.coins = 0;
          p.weap = 'blaster';
          p.weapT = 0;
        });

        this.zCamZoom = Math.max(this.cw / this.zWorldW, Math.min(1.12, Math.max(this.cw / 960, this.ch / 480)));
        const viewH = this.ch / this.zCamZoom;
        this.zCamX = centerX;
        this.zCamY = gy + 54 - viewH * 0.5;

        // Initial slow zombies approaching from both sides
        for (const sx of [780, 910, 1490, 1620]) {
          this.spawnZombieAt(sx, gy - 18, 0);
        }
        break;
      }
      case 'samurai': {
        this.gameTimer = 45 * 60;
        this.gameTimerMax = this.gameTimer;
        this.pillars = [
          { x: cw * 0.30 - 18, y: ch * 0.34 - 18, w: 36, h: 36 },
          { x: cw * 0.70 - 18, y: ch * 0.34 - 18, w: 36, h: 36 },
          { x: cw * 0.30 - 18, y: ch * 0.70 - 18, w: 36, h: 36 },
          { x: cw * 0.70 - 18, y: ch * 0.70 - 18, w: 36, h: 36 },
        ];
        const sSpawns: [number, number][] = [
          [cw * 0.16, ch * 0.28],
          [cw * 0.84, ch * 0.74],
          [cw * 0.84, ch * 0.28],
          [cw * 0.16, ch * 0.74],
        ];
        this.players.forEach((p, idx) => {
          const [sx, sy] = sSpawns[idx % sSpawns.length];
          p.x = sx;
          p.y = sy;
          p.angle = Math.atan2(ch * 0.52 - sy, cw * 0.5 - sx);
          p.hp = 100;
        });
        break;
      }
      case 'sniper': {
        this.gameTimer = 45 * 60;
        this.gameTimerMax = this.gameTimer;
        this.pillars = [
          { x: cw * 0.5 - 22, y: ch * 0.5 - 32, w: 44, h: 64 },
          { x: cw * 0.26 - 20, y: ch * 0.36 - 22, w: 40, h: 44 },
          { x: cw * 0.74 - 20, y: ch * 0.66 - 22, w: 40, h: 44 },
          { x: cw * 0.26 - 20, y: ch * 0.68 - 20, w: 40, h: 40 },
          { x: cw * 0.74 - 20, y: ch * 0.34 - 20, w: 40, h: 40 },
        ];
        const sniperSpawns: [number, number, number][] = [
          [cw * 0.11, ch * 0.25, 0.3],
          [cw * 0.89, ch * 0.78, Math.PI + 0.3],
          [cw * 0.89, ch * 0.25, Math.PI - 0.3],
          [cw * 0.11, ch * 0.78, -0.3],
        ];
        this.players.forEach((p, i) => {
          const [sx, sy, sa] = sniperSpawns[i % sniperSpawns.length];
          p.x = sx;
          p.y = sy;
          p.angle = sa;
          p.hp = 100;
          p.throwCd = 20;
        });
        break;
      }
      case 'blades': {
        this.gameTimer = 45 * 60;
        this.gameTimerMax = this.gameTimer;
        this.pillars = [
          { x: cw * 0.32 - 20, y: ch * 0.52 - 22, w: 40, h: 44 },
          { x: cw * 0.68 - 20, y: ch * 0.52 - 22, w: 40, h: 44 },
        ];
        this.players.forEach((p) => { p.hp = 100; p.shield = false; });
        const speeds: [number, number][] = [[4.6, 3.5], [-4.4, 3.8]];
        for (let k = 0; k < 2; k++) {
          const [vx, vy] = speeds[k];
          this.saws.push({
            x: k === 0 ? cw * 0.18 : cw * 0.82,
            y: k === 0 ? 95 : ch - 75,
            vx,
            vy,
            r: 22,
            rot: 0,
          });
        }
        break;
      }
      case 'sumo':
        this.ringScale = 1;
        this.gameTimer = 0;
        this.players.forEach((p) => { p.hp = 999; p.shield = false; });
        break;
      case 'futbol':
        this.ball = { x: cw / 2, y: (ch + 44) / 2, vx: 0, vy: 0, radius: 13, lastKicker: -1, holder: -1, fuse: 0, noPick: 0 };
        this.gameTimer = 0;
        if (this.playerCount >= 2) {
          this.players[0].x = cw * 0.22; this.players[0].y = (ch + 44) / 2;
          this.players[1].x = cw * 0.78; this.players[1].y = (ch + 44) / 2;
        }
        if (this.playerCount >= 3) {
          this.players[2].x = cw * 0.28; this.players[2].y = ch * 0.34;
        }
        if (this.playerCount >= 4) {
          this.players[3].x = cw * 0.72; this.players[3].y = ch * 0.34;
        }
        break;
      case 'race': {
        this.raceFinishX = Math.max(7600, cw * 6.35);
        this.raceOffset = 0;
        const deckY = ch - 78;
        // Starting concrete landing bay
        this.raceObstacles.push({ x: 0, y: deckY, w: 340, h: 110, kind: 'floor' });

        let cx = 340;
        let segIdx = 0;
        while (cx < this.raceFinishX - 420) {
          const pattern = segIdx % 6;
          if (pattern === 0) {
            // Saw chasm with twin spinning buzzsaws + mid-air concrete platform bridge
            const gapW = 240;
            this.raceObstacles.push({ x: cx + 62, y: deckY + 2, w: 48, h: 48, kind: 'saw', r: 24, baseY: deckY + 2, dy: 0, speed: 0 });
            this.raceObstacles.push({ x: cx + 148, y: deckY - 12, w: 50, h: 50, kind: 'saw', r: 25, baseY: deckY - 12, dy: 28, speed: 0.065 });
            this.raceObstacles.push({ x: cx + 66, y: deckY - 94, w: 108, h: 18, kind: 'platform' });
            cx += gapW;
            const landW = 220;
            this.raceObstacles.push({ x: cx, y: deckY, w: landW, h: 110, kind: 'floor' });
            cx += landW;
          } else if (pattern === 1) {
            // Elevated stair ledges + spring launcher over hazard saw bay
            this.raceObstacles.push({ x: cx + 12, y: deckY - 72, w: 120, h: 18, kind: 'platform' });
            this.raceObstacles.push({ x: cx + 168, y: deckY - 124, w: 125, h: 18, kind: 'platform' });
            this.raceObstacles.push({ x: cx + 92, y: deckY + 6, w: 52, h: 52, kind: 'saw', r: 26, baseY: deckY + 6, dy: 0, speed: 0 });
            this.raceObstacles.push({ x: cx + 215, y: deckY + 6, w: 52, h: 52, kind: 'saw', r: 26, baseY: deckY + 6, dy: 0, speed: 0 });
            cx += 320;
            const landW = 240;
            this.raceObstacles.push({ x: cx, y: deckY - 16, w: landW, h: 126, kind: 'floor' });
            this.raceObstacles.push({ x: cx + landW - 64, y: deckY - 30, w: 46, h: 14, kind: 'spring' });
            cx += landW;
          } else if (pattern === 2) {
            // Twin high-speed concrete ledges with bobbing vertical buzzsaw between them
            this.raceObstacles.push({ x: cx + 40, y: deckY - 102, w: 118, h: 18, kind: 'platform' });
            this.raceObstacles.push({ x: cx + 168, y: deckY - 54, w: 46, h: 46, kind: 'saw', r: 23, baseY: deckY - 64, dy: 44, speed: 0.08 });
            this.raceObstacles.push({ x: cx + 224, y: deckY - 82, w: 118, h: 18, kind: 'platform' });
            cx += 365;
            const landW = 235;
            this.raceObstacles.push({ x: cx, y: deckY, w: landW, h: 110, kind: 'floor' });
            this.raceObstacles.push({ x: cx + 96, y: deckY - 46, w: 44, h: 46, kind: 'crate' });
            cx += landW;
          } else if (pattern === 3) {
            // Double chasm hop with low concrete block + moving saw guard
            const gapA = 148;
            this.raceObstacles.push({ x: cx + 52, y: deckY + 10, w: 48, h: 48, kind: 'saw', r: 24, baseY: deckY + 10, dy: 0, speed: 0 });
            cx += gapA;
            this.raceObstacles.push({ x: cx, y: deckY - 26, w: 138, h: 136, kind: 'floor' });
            this.raceObstacles.push({ x: cx + 195, y: deckY - 72, w: 46, h: 46, kind: 'saw', r: 23, baseY: deckY - 72, dy: 38, speed: 0.075 });
            cx += 138 + 155;
            const landW = 220;
            this.raceObstacles.push({ x: cx, y: deckY, w: landW, h: 110, kind: 'floor' });
            cx += landW;
          } else if (pattern === 4) {
            // Triple concrete stepping pillars over spinning factory saw pit + upper deck
            this.raceObstacles.push({ x: cx + 18, y: deckY - 62, w: 105, h: 18, kind: 'platform' });
            this.raceObstacles.push({ x: cx + 155, y: deckY - 110, w: 110, h: 18, kind: 'platform' });
            this.raceObstacles.push({ x: cx + 298, y: deckY - 68, w: 105, h: 18, kind: 'platform' });
            this.raceObstacles.push({ x: cx + 82, y: deckY + 8, w: 50, h: 50, kind: 'saw', r: 25, baseY: deckY + 8, dy: 0, speed: 0 });
            this.raceObstacles.push({ x: cx + 225, y: deckY + 4, w: 52, h: 52, kind: 'saw', r: 26, baseY: deckY + 4, dy: 24, speed: 0.07 });
            cx += 425;
            const landW = 220;
            this.raceObstacles.push({ x: cx, y: deckY, w: landW, h: 110, kind: 'floor' });
            this.raceObstacles.push({ x: cx + 86, y: deckY - 46, w: 44, h: 46, kind: 'crate' });
            cx += landW;
          } else {
            // Spring vault runway over twin oscillating buzzsaws
            this.raceObstacles.push({ x: cx, y: deckY, w: 140, h: 110, kind: 'floor' });
            this.raceObstacles.push({ x: cx + 82, y: deckY - 14, w: 46, h: 14, kind: 'spring' });
            cx += 140;
            this.raceObstacles.push({ x: cx + 48, y: deckY - 22, w: 50, h: 50, kind: 'saw', r: 25, baseY: deckY - 22, dy: 34, speed: 0.068 });
            this.raceObstacles.push({ x: cx + 148, y: deckY - 42, w: 50, h: 50, kind: 'saw', r: 25, baseY: deckY - 42, dy: 34, speed: -0.072 });
            this.raceObstacles.push({ x: cx + 68, y: deckY - 118, w: 120, h: 18, kind: 'platform' });
            cx += 235;
            const landW = 230;
            this.raceObstacles.push({ x: cx, y: deckY, w: landW, h: 110, kind: 'floor' });
            cx += landW;
          }
          segIdx++;
        }

        // Final concrete runway & Finish Gate
        this.raceObstacles.push({ x: cx, y: deckY, w: this.raceFinishX - cx + 280, h: 110, kind: 'floor' });

        this.players.forEach((p, idx) => {
          p.hp = 999;
          p.raceX = 76 + idx * 18;
          p.x = p.raceX;
          p.y = deckY - 22;
          p.vx = 0;
          p.vy = 0;
          p.onGround = true;
          p.jumpsLeft = 0;
          p.dashCooldown = 0;
          p.invincible = 0;
        });
        break;
      }
      case 'bomb':
        this.pillars = [
          { x: cw * 0.24 - 20, y: ch * 0.34 - 20, w: 40, h: 40 },
          { x: cw * 0.76 - 20, y: ch * 0.34 - 20, w: 40, h: 40 },
          { x: cw * 0.24 - 20, y: ch * 0.68 - 20, w: 40, h: 40 },
          { x: cw * 0.76 - 20, y: ch * 0.68 - 20, w: 40, h: 40 },
        ];
        this.players.forEach((p) => { p.hp = 100; p.throwCd = 0; });
        this.ball = { x: cw / 2, y: ch / 2, vx: 0, vy: 0, radius: 13, lastKicker: -1, holder: -1, fuse: 6 * 60, maxFuse: 6 * 60, noPick: 0 };
        break;
      case 'laser':
        this.gameTimer = 45 * 60;
        this.gameTimerMax = this.gameTimer;
        this.laserSpawnTimer = 35;
        this.players.forEach((p) => { p.hp = 100; p.shield = false; });
        break;
      case 'lava': {
        this.lavaY = ch + 24;
        this.lavaCamY = 0;
        this.lavaTick = 0;
        this.plats = [
          { x: cw * 0.14, y: ch - 46, w: cw * 0.72, dx: 0, minX: 0, maxX: cw, kind: 'stone' },
        ];
        this.highestPlatY = ch - 46;
        this.generateLavaPlats(ch - 900);
        this.players.forEach((p, idx) => {
          p.hp = 999;
          p.x = cw * (0.28 + (idx / Math.max(1, this.playerCount - 1)) * 0.44);
          p.y = ch - 70;
          p.onGround = true;
          p.jumpsLeft = 1;
        });
        break;
      }
    }

    this.deadRagdolls = [];
    this.hitStop = 0;
    this.miniTick = 0;
    this.rigs = this.players.map((p) =>
      createRagdollRig(p.index, p.color, p.x, p.y, Math.cos(p.angle) >= 0 ? 1 : -1, 0.94)
    );
  }

  private startRound() {
    resetInputs();
    this.gameState = 'playing';
    this.roundEndTicks = 0;
    this.countdownActive = this.currentMinigame !== 'zombie';
    this.countdownTimer = this.currentMinigame !== 'zombie' ? 150 : 0;
    this.spawnPlayers();
    this.initMinigame();
    this.emitHud();
  }

  private endRound() {
    if (this.gameState !== 'playing') return;
    this.gameState = 'roundEnd';
    this.roundEndTicks = 0;
    this.emitHud();
    this.roundTimerHandle = setTimeout(() => {
      if (!this.on) return;
      if (this.currentRound >= this.maxRounds) {
        this.gameState = 'matchEnd';
        this.triggerMatchEnd();
      } else {
        this.currentRound++;
        this.startRound();
      }
    }, 2000);
  }

  private spawnParticle(x: number, y: number, color: string, count: number, speed: number, life = 35) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.3 + Math.random() * 0.7) * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        maxLife: life,
        color,
        radius: 2 + Math.random() * 3.5,
      });
    }
  }

  private spawnRing(x: number, y: number, maxR: number, color: string, life = 22) {
    this.rings.push({ x, y, r: 8, maxR, color, life, maxLife: life });
  }

  private addPopup(x: number, y: number, text: string, color: string) {
    this.popups.push({ x, y, vy: -1.1, text, color, life: 45 });
  }

  private triggerShake(mag: number, dur: number) {
    if (!PartyEconomy.shakeEnabled()) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeDur = Math.max(this.shakeDur, dur);
  }

  private getSidePlatforms(): [number, number, number, number][] {
    if (this.currentMinigame === 'lava') {
      return this.plats.map((pl) => [pl.x, pl.y, pl.w, 13] as [number, number, number, number]);
    }
    if (this.currentMinigame === 'race') {
      const list: [number, number, number, number][] = [];
      for (const obs of this.raceObstacles) {
        if (obs.kind === 'saw' || obs.kind === 'spring' || obs.kind === 'boost') continue;
        list.push([obs.x - this.raceOffset, obs.y, obs.w, obs.h]);
      }
      return list;
    }
    if (this.currentMinigame === 'zombie') {
      const list: [number, number, number, number][] = [[0, this.zGroundY, this.zWorldW, 96]];
      for (const zp of this.zPlats) {
        list.push([zp.x, zp.y, zp.w, zp.h]);
      }
      return list;
    }
    return [];
  }

  private spawnMiniDeadRagdoll(p: MiniPlayer, rig: RagdollRig) {
    const deadRig = convertRigToDead(rig, p.vx * 1.15, p.vy - 3.6, 190);
    const hasAbyss =
      this.currentMinigame === 'sumo' ||
      this.currentMinigame === 'lava' ||
      this.currentMinigame === 'zombie';
    this.deadRagdolls.push({
      rig: deadRig,
      floorY: hasAbyss ? undefined : Math.min(this.ch - 10, p.y + 24),
    });
  }

  private driveMiniRig(p: MiniPlayer) {
    let rig = this.rigs[p.index];
    const dir = Math.cos(p.angle) >= 0 ? 1 : -1;
    if (!rig) {
      rig = createRagdollRig(p.index, p.color, p.x, p.y, dir, 0.94);
      this.rigs[p.index] = rig;
    }
    rig.color = p.color;
    rig.dir = dir;

    const sideView =
      this.currentMinigame === 'race' ||
      this.currentMinigame === 'lava' ||
      this.currentMinigame === 'zombie';
    const hopY = 0;
    const holdingBomb = this.currentMinigame === 'bomb' && this.ball?.holder === p.index;
    const hasWeapon = this.currentMinigame === 'zombie' || this.currentMinigame === 'samurai' || this.currentMinigame === 'sniper';

    let handTarget1: [number, number] | undefined;
    let handTarget2: [number, number] | undefined;
    let twoHanded = false;
    if (holdingBomb) {
      handTarget1 = [rig.chest.x + 6 * dir, p.y - hopY - 24];
      handTarget2 = [rig.chest.x - 6 * dir, p.y - hopY - 24];
      twoHanded = true;
    } else if (hasWeapon || p.isAttacking) {
      handTarget1 = [rig.chest.x + Math.cos(p.angle) * 16, rig.chest.y + Math.sin(p.angle) * 16];
      if (this.currentMinigame === 'sniper' || (this.currentMinigame === 'zombie' && p.weap !== 'blaster')) {
        twoHanded = true;
        handTarget2 = [rig.chest.x + Math.cos(p.angle) * 23, rig.chest.y + Math.sin(p.angle) * 23];
      }
    }

    stepActiveRagdoll(rig, {
      x: p.x,
      y: p.y - hopY,
      vx: p.vx,
      vy: sideView ? p.vy : 0,
      dir,
      aim: p.angle,
      ground: sideView ? p.onGround : hopY <= 1,
      phase: p.phase,
      sq: p.sq,
      recoil: p.isAttacking ? 0.35 : 0,
      atkT: p.attackTimer,
      atkP: p.isAttacking ? 0.5 : 0,
      weapon: 'none',
      twoHanded,
      handTarget1,
      handTarget2,
      platforms: sideView ? this.getSidePlatforms() : undefined,
      gravity: sideView ? 0.44 : 0.14,
      time: this.miniTick,
    });
  }

  private killPlayer(p: MiniPlayer) {
    if (!p.alive) return;
    p.alive = false;
    const rig = this.rigs[p.index];
    if (rig) {
      this.spawnMiniDeadRagdoll(p, rig);
    }
    if (this.currentMinigame !== 'race') {
      this.hitStop = Math.max(this.hitStop, 3);
    }
    this.spawnParticle(p.x, p.y, p.color, 26, 5.8, 42);
    this.spawnRing(p.x, p.y, 48, p.color, 20);
    this.triggerShake(7, 14);
  }

  private resolvePillarCollisions(entity: { x: number; y: number; radius: number; vx?: number; vy?: number }) {
    for (const pil of this.pillars) {
      const nearX = Math.max(pil.x, Math.min(pil.x + pil.w, entity.x));
      const nearY = Math.max(pil.y, Math.min(pil.y + pil.h, entity.y));
      const dx = entity.x - nearX;
      const dy = entity.y - nearY;
      const dist = Math.hypot(dx, dy);
      if (dist < entity.radius) {
        if (dist > 0.001) {
          const push = entity.radius - dist;
          entity.x += (dx / dist) * push;
          entity.y += (dy / dist) * push;
        } else {
          const left = entity.x - pil.x;
          const right = pil.x + pil.w - entity.x;
          const top = entity.y - pil.y;
          const bot = pil.y + pil.h - entity.y;
          const minD = Math.min(left, right, top, bot);
          if (minD === left) entity.x = pil.x - entity.radius;
          else if (minD === right) entity.x = pil.x + pil.w + entity.radius;
          else if (minD === top) entity.y = pil.y - entity.radius;
          else entity.y = pil.y + pil.h + entity.radius;
        }
      }
    }
  }

  private step() {
    if (this.hitStop > 0) {
      this.hitStop--;
      this.shakeMag *= 0.92;
      return;
    }
    this.miniTick++;
    if (this.countdownActive) {
      this.countdownTimer--;
      if (this.countdownTimer <= -25) this.countdownActive = false;
    }

    if (this.shakeDur > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeMag * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeMag * 2;
      this.shakeDur--;
      this.shakeMag *= 0.9;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    for (const sk of this.sakuraPetals) {
      sk.y += sk.sp;
      sk.x += Math.sin(sk.y * 0.025 + sk.r) * sk.drift;
      if (sk.y > this.ch) { sk.y = -6; sk.x = Math.random() * this.cw; }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      if (--p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pp = this.popups[i];
      pp.y += pp.vy;
      if (--pp.life <= 0) this.popups.splice(i, 1);
    }
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      if (--this.slashes[i].life <= 0) this.slashes.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += (r.maxR - r.r) * 0.24;
      if (--r.life <= 0) this.rings.splice(i, 1);
    }

    const sidePlats = this.getSidePlatforms();
    const isLava = this.currentMinigame === 'lava';
    const isZombie = this.currentMinigame === 'zombie';
    if (isZombie) {
      this.stepZombieEmbers();
      this.updateZombieCamera();
    }
    for (let i = this.deadRagdolls.length - 1; i >= 0; i--) {
      const entry = this.deadRagdolls[i];
      const plats = entry.floorY !== undefined ? [[0, entry.floorY, this.cw, 36] as [number, number, number, number]] : sidePlats;
      const keep = stepDeadRagdoll(
        entry.rig,
        plats,
        entry.floorY !== undefined ? 0.24 : isLava || isZombie || this.currentMinigame === 'race' ? 0.42 : 0.34,
        isZombie ? this.zWorldW : this.cw,
        isLava ? this.lavaCamY + this.ch + 140 : isZombie ? this.zGroundY + 90 : this.ch,
        true,
        false
      );
      if (isLava && entry.rig.pelvis.y > this.lavaY) {
        this.deadRagdolls.splice(i, 1);
      } else if (!keep) {
        this.deadRagdolls.splice(i, 1);
      }
    }

    if (this.gameState === 'roundEnd') {
      this.roundEndTicks++;
    }

    if (this.gameState !== 'playing' || (this.countdownActive && this.countdownTimer >= 0)) {
      for (const p of this.players) {
        if (p.alive) this.driveMiniRig(p);
      }
      return;
    }

    const isRace = this.currentMinigame === 'race';

    if (isLava) {
      for (const pl of this.plats) {
        if (pl.dx !== 0) {
          pl.x += pl.dx;
          if (pl.x < pl.minX) { pl.x = pl.minX; pl.dx = Math.abs(pl.dx); }
          if (pl.x + pl.w > pl.maxX) { pl.x = pl.maxX - pl.w; pl.dx = -Math.abs(pl.dx); }
        }
      }
    }

    if (!isRace) {
      for (const p of this.players) {
        if (!p.alive) continue;
        const inp = inputPlayers[p.index];

        if (isLava) {
          const cap = 4.95;
          const accel = p.onGround ? 1.02 : 0.70;
          if (Math.abs(inp.x) > 0.12) {
            if (inp.x > 0 && p.vx < cap) p.vx = Math.min(cap, p.vx + inp.x * accel);
            else if (inp.x < 0 && p.vx > -cap) p.vx = Math.max(-cap, p.vx + inp.x * accel);
          }

          const wantJ = inp.jump;
          if (wantJ && !p.jh) {
            p.jumpBuf = 7;
          } else if (!wantJ) {
            p.jh = false;
          }
          if (p.jumpBuf > 0) p.jumpBuf--;

          if (p.jumpBuf > 0 && (p.onGround || p.coyoteT > 0)) {
            p.vy = -11.4;
            p.onGround = false;
            p.coyoteT = 0;
            p.jumpBuf = 0;
            p.jumpsLeft = 0;
            p.jh = true;
            p.highJ = inp.y < -0.8;
            p.headVy += 2.8;
            this.spawnParticle(p.x, p.y + 18, '#ffffff', 5, 2.2, 12);
            PartyAudio.play('jump');
          }
          if (inp.y >= -0.72) p.highJ = false;
          if (p.vy < -2.6 && !wantJ && !p.highJ) p.vy *= 0.87;

          const prevBottom = p.y + p.radius;
          const prevOnGround = p.onGround;
          const preLandVy = p.vy;
          p.vy = Math.min(12.5, p.vy + 0.42 * (p.vy > 0 ? 1.14 : 1.0));
          p.vx *= p.onGround ? (Math.abs(inp.x) > 0.12 ? 0.88 : 0.78) : 0.96;
          p.x += p.vx;
          p.y += p.vy;

          p.onGround = false;
          for (const pl of this.plats) {
            if (pl.kind === 'crumble' && pl.crumbleT !== undefined && pl.crumbleT <= 0) continue;
            if (p.x + p.radius * 0.6 > pl.x && p.x - p.radius * 0.6 < pl.x + pl.w && p.vy >= 0) {
              if (prevBottom <= pl.y + 11 && p.y + p.radius >= pl.y) {
                p.y = pl.y - p.radius;
                if (pl.kind === 'spring') {
                  p.vy = -15.4;
                  p.onGround = false;
                  p.coyoteT = 0;
                  p.headVy += 4.2;
                  this.spawnParticle(p.x, pl.y, '#4ade80', 10, 3.6, 18);
                  PartyAudio.play('jump');
                } else {
                  if (pl.kind === 'crumble' && pl.crumbleT === undefined) {
                    pl.crumbleT = 46;
                    this.spawnParticle(p.x, pl.y + 4, '#fb923c', 4, 2.2, 12);
                  }
                  p.vy = 0;
                  p.x += pl.dx;
                  p.onGround = true;
                  p.coyoteT = 6;
                  p.jumpsLeft = 1;
                }
              }
            }
          }
          if (!p.onGround) p.coyoteT = Math.max(0, p.coyoteT - 1);
          if (p.onGround && !prevOnGround && preLandVy > 3.2) {
            p.sq = Math.min(10, Math.round(preLandVy * 0.85));
            p.headVy += Math.min(5, preLandVy * 0.42);
          }
          p.x = Math.max(p.radius, Math.min(this.cw - p.radius, p.x));
        } else if (isZombie) {
          const cap = 5.1;
          const accel = p.onGround ? 1.06 : 0.72;
          if (Math.abs(inp.x) > 0.12) {
            if (inp.x > 0 && p.vx < cap) p.vx = Math.min(cap, p.vx + inp.x * accel);
            else if (inp.x < 0 && p.vx > -cap) p.vx = Math.max(-cap, p.vx + inp.x * accel);
          }

          const wantJ = inp.jump;
          if (wantJ && !p.jh) {
            p.jumpBuf = 7;
          } else if (!wantJ) {
            p.jh = false;
          }
          if (p.jumpBuf > 0) p.jumpBuf--;

          // Drop through elevated platforms/cars when pressing down while on an elevated surface
          if (inp.y > 0.68 && p.onGround && p.y + 22 < this.zGroundY - 6) {
            p.y += 7;
            p.vy = 1.6;
            p.onGround = false;
            p.coyoteT = 0;
          } else if (p.jumpBuf > 0 && (p.onGround || p.coyoteT > 0)) {
            p.vy = -12.1;
            p.onGround = false;
            p.coyoteT = 0;
            p.jumpBuf = 0;
            p.jumpsLeft = 0;
            p.jh = true;
            p.highJ = inp.y < -0.8;
            p.headVy += 2.8;
            this.spawnParticle(p.x, p.y + 20, '#d4d4d8', 5, 2.2, 12);
            PartyAudio.play('jump');
          }
          if (inp.y >= -0.72) p.highJ = false;
          if (p.vy < -2.6 && !wantJ && !p.highJ) p.vy *= 0.87;

          const footHh = 22;
          const prevBottom = p.y + footHh;
          const prevOnGround = p.onGround;
          const preLandVy = p.vy;
          p.vy = Math.min(13.2, p.vy + 0.42 * (p.vy > 0 ? 1.14 : 1.0));
          p.vx *= p.onGround ? (Math.abs(inp.x) > 0.12 ? 0.87 : 0.77) : 0.96;
          p.x += p.vx;
          p.y += p.vy;

          p.onGround = false;
          if (p.y + footHh >= this.zGroundY) {
            p.y = this.zGroundY - footHh;
            p.vy = 0;
            p.onGround = true;
            p.coyoteT = 6;
            p.jumpsLeft = 1;
          } else {
            for (const zp of this.zPlats) {
              if (p.x + p.radius * 0.55 > zp.x && p.x - p.radius * 0.55 < zp.x + zp.w && p.vy >= 0) {
                if (prevBottom <= zp.y + 11 && p.y + footHh >= zp.y) {
                  p.y = zp.y - footHh;
                  p.vy = 0;
                  p.onGround = true;
                  p.coyoteT = 6;
                  p.jumpsLeft = 1;
                  break;
                }
              }
            }
          }
          if (!p.onGround) p.coyoteT = Math.max(0, p.coyoteT - 1);
          if (p.onGround && !prevOnGround && preLandVy > 3.2) {
            p.sq = Math.min(10, Math.round(preLandVy * 0.85));
            p.headVy += Math.min(5, preLandVy * 0.42);
          }
          p.x = Math.max(p.radius + 14, Math.min(this.zWorldW - p.radius - 14, p.x));
        } else {
          const isBombHolder = this.currentMinigame === 'bomb' && this.ball?.holder === p.index;
          const moveBoost = isBombHolder ? 1.46 : 1.24;
          p.vx += inp.x * moveBoost;
          p.vy += inp.y * moveBoost;
          p.vx *= 0.87;
          p.vy *= 0.87;
          p.x += p.vx;
          p.y += p.vy;
        }

        // Aim angle
        if (typeof inp.aimAngle === 'number' && !Number.isNaN(inp.aimAngle)) {
          p.angle = inp.aimAngle;
        } else if (isZombie) {
          const aimX = inp.releaseAction ? inp.releaseX : inp.x;
          const aimY = inp.releaseAction ? inp.releaseY : inp.y;
          if (Math.abs(aimX) > 0.14) {
            const verticalTilt = inp.jump && aimY < -0.5 ? 0 : aimY * 0.68;
            p.angle = Math.atan2(verticalTilt, aimX);
          } else if (aimY > 0.48) {
            p.angle = Math.cos(p.angle) >= 0 ? 0.45 : Math.PI - 0.45;
          } else if (aimY < -0.48 && !inp.jump) {
            p.angle = Math.cos(p.angle) >= 0 ? -0.68 : Math.PI + 0.68;
          }
        } else {
          const aimX = inp.releaseAction ? inp.releaseX : inp.x;
          const aimY = inp.releaseAction ? inp.releaseY : inp.y;
          if (Math.abs(aimX) > 0.1 || Math.abs(aimY) > 0.1) {
            p.angle = Math.atan2(aimY, aimX);
          }
        }

        if (Math.hypot(p.vx, p.vy) > 2.2) {
          p.trail.push({ x: p.x, y: p.y, life: 10 });
          if (p.trail.length > 8) p.trail.shift();
        }
        p.trail = p.trail.filter((tr) => --tr.life > 0);

        if (p.invincible > 0) p.invincible--;
        if (p.attackTimer > 0 && --p.attackTimer <= 0) p.isAttacking = false;
        if (p.dashCooldown > 0) p.dashCooldown--;
        if (p.weapT > 0 && --p.weapT <= 0) p.weap = 'blaster';

        // Boundary & Pillar collisions
        if (this.currentMinigame === 'sumo') {
          const cx = this.cw / 2;
          const cy = this.ch / 2;
          const ringR = Math.min(this.cw, this.ch) * 0.37 * this.ringScale;
          if (Math.hypot(p.x - cx, p.y - cy) > ringR) this.killPlayer(p);
        } else if (this.currentMinigame === 'futbol') {
          p.x = Math.max(10 + p.radius, Math.min(this.cw - 10 - p.radius, p.x));
          p.y = Math.max(52 + p.radius, Math.min(this.ch - 8 - p.radius, p.y));
        } else if (!isLava && !isZombie) {
          p.x = Math.max(p.radius + 8, Math.min(this.cw - p.radius - 8, p.x));
          p.y = Math.max(p.radius + 46, Math.min(this.ch - p.radius - 8, p.y));
        }

        if (this.pillars.length > 0) {
          this.resolvePillarCollisions(p);
        }

        this.updateMiniSprings(p, isLava || isZombie);
      }
    }

    // Dash / Shove mechanics
    if (['sumo', 'blades', 'bomb', 'laser', 'lava'].includes(this.currentMinigame)) {
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (!p.alive) continue;
        const inp = inputPlayers[i];
        if ((inp.action || inp.releaseAction) && p.dashCooldown <= 0) {
          const dashPow =
            this.currentMinigame === 'laser' ? 15.2 :
            this.currentMinigame === 'sumo' ? (p.shield ? 17.0 : 13.8) :
            this.currentMinigame === 'blades' ? 13.2 : 12.4;
          const dax = Math.cos(p.angle);
          const day = Math.sin(p.angle);
          p.vx += dax * dashPow;
          if (!isLava) p.vy += day * dashPow;
          else p.vy -= 4.4;
          p.leanVx -= dax * 4.5;
          p.headVx -= dax * 6.0;
          p.tiltV += dax * 0.16;
          p.dashCooldown =
            this.currentMinigame === 'blades' ? 30 :
            this.currentMinigame === 'laser' ? 34 :
            this.currentMinigame === 'lava' ? 34 : 32;
          p.isAttacking = true;
          p.attackTimer = 14;
          if (this.currentMinigame === 'laser') {
            p.invincible = Math.max(p.invincible, 15);
            this.spawnRing(p.x, p.y, 34, '#38bdf8', 12);
          }
          if (this.currentMinigame === 'sumo') {
            this.spawnRing(p.x, p.y, p.shield ? 58 : 44, p.shield ? '#fbbf24' : p.color, 16);
          }
          this.spawnParticle(p.x, p.y, p.color, 8, 3.6, 16);
          PartyAudio.play('jump');
        }
        for (let j = i + 1; j < this.players.length; j++) {
          const o = this.players[j];
          if (!o.alive) continue;
          const dx = o.x - p.x;
          const dy = o.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < p.radius + o.radius) {
            const ang = Math.atan2(dy, dx);
            const mult = this.currentMinigame === 'sumo' ? 11.4 : 9.4;
            const atkMultP = this.currentMinigame === 'sumo' && p.shield ? 1.45 : 1.0;
            const atkMultO = this.currentMinigame === 'sumo' && o.shield ? 1.45 : 1.0;
            const defMultO = this.currentMinigame === 'sumo' && o.shield ? 0.6 : 1.0;
            const defMultP = this.currentMinigame === 'sumo' && p.shield ? 0.6 : 1.0;
            const f1 = (p.isAttacking ? mult : 3.8) * atkMultP * defMultO;
            const f2 = (o.isAttacking ? mult : 3.8) * atkMultO * defMultP;
            const ca = Math.cos(ang);
            const sa = Math.sin(ang);
            o.vx += ca * f1;
            o.vy += sa * f1;
            p.vx -= ca * f2;
            p.vy -= sa * f2;
            o.leanVx -= ca * f1 * 0.45;
            o.headVx -= ca * f1 * 0.65;
            o.tiltV += ca * 0.12;
            p.leanVx += ca * f2 * 0.45;
            p.headVx += ca * f2 * 0.65;
            p.tiltV -= ca * 0.12;
            const rO = this.rigs[o.index];
            const rP = this.rigs[p.index];
            if (rO) applyRagdollImpulse(rO, ca * f1 * 0.75, sa * f1 * 0.75 - 1.5, p.isAttacking ? 10 : 3);
            if (rP) applyRagdollImpulse(rP, -ca * f2 * 0.75, -sa * f2 * 0.75 - 1.5, o.isAttacking ? 10 : 3);
            if (p.isAttacking || o.isAttacking) {
              this.spawnParticle((p.x + o.x) / 2, (p.y + o.y) / 2, '#fbbf24', 10, 4, 16);
              this.triggerShake(5, 8);
            }
            PartyAudio.play('hit');
          }
        }
      }
    }

    // Projectiles (zombie blasters + sniper ricochet bullets)
    this.updateProjectiles();

    // Mode-specific simulation
    switch (this.currentMinigame) {
      case 'zombie': this.updateZombie(); break;
      case 'samurai': this.updateSamurai(); break;
      case 'sniper': this.updateSniper(); break;
      case 'blades': this.updateBlades(); break;
      case 'sumo': this.updateSumo(); break;
      case 'futbol': this.updateFutbol(); break;
      case 'race': this.updateRace(); break;
      case 'bomb': this.updateBomb(); break;
      case 'laser': this.updateLaser(); break;
      case 'lava': this.updateLava(); break;
    }

    if (['sumo', 'samurai', 'sniper', 'blades', 'bomb', 'laser', 'lava'].includes(this.currentMinigame)) {
      const alive = this.players.filter((p) => p.alive);
      if (alive.length <= 1) {
        if (alive.length === 1) alive[0].score++;
        this.endRound();
      }
    }

    for (const p of this.players) {
      if (p.alive) this.driveMiniRig(p);
    }

    clearReleasedActions();
    if (++this.hudTick % 6 === 0) this.emitHud();
  }

  private handleZombieKilled(zi: number, owner: number) {
    const z = this.zombies[zi];
    if (!z) return;
    const ow = this.players[owner];
    if (z.kind === 3) {
      this.zombieKills += 3;
      if (ow) {
        ow.coins += 5;
        this.addPopup(z.x, z.y - 38, '+5 BOSS MƏHV EDİLDİ!', '#ef4444');
      } else {
        this.addPopup(z.x, z.y - 38, 'BOSS MƏHV EDİLDİ!', '#ef4444');
      }
      this.spawnParticle(z.x, z.y - 8, '#ef4444', 36, 7.2, 34);
      this.spawnParticle(z.x, z.y - 8, '#fbbf24', 22, 5.5, 28);
      this.spawnRing(z.x, z.y - 8, 96, '#ef4444', 24);
      this.triggerShake(13, 18);
      PartyAudio.play('boom');
      this.zombies.splice(zi, 1);

      if (this.zombieWave >= this.zMaxWaves) {
        this.zombieWon = true;
        this.addPopup(this.zCamX, this.zCamY - 56, '20 DALĞA TAMAMLANDI! QALİBİYYƏT!', '#4ade80');
        for (const p of this.players) {
          if (p.alive) {
            p.score++;
            p.coins += 20;
          }
        }
        PartyAudio.play('portal');
        this.endRound();
        return;
      }

      this.zombieWave++;
      this.waveBossSpawned = false;
      this.nextBossAt = this.zombieKills + Math.min(18, 7 + this.zombieWave);
      this.addPopup(this.zCamX, this.zCamY - 56, `DALĞA ${this.zombieWave} / ${this.zMaxWaves}!`, '#4ade80');
      PartyAudio.play('portal');

      // Drop bonus supply crates near Boss defeat (fallen players stay down)
      const dropKinds: ('shotgun' | 'rapid' | 'medkit' | 'grenade')[] = ['grenade', 'medkit'];
      dropKinds.forEach((dk, kIdx) => {
        const dx = Math.max(90, Math.min(this.zWorldW - 90, z.x + (kIdx === 0 ? -36 : 36)));
        this.coins.push({
          x: dx,
          y: this.zGroundY - 16,
          radius: 13,
          life: 700,
          diamond: dk !== 'medkit',
          kind: dk,
        });
      });
      return;
    }

    this.zombieKills++;
    if (ow) {
      ow.coins += 1;
      this.addPopup(z.x, z.y - 26, z.kind === 2 ? '+1 BRUTE!' : '+1', ow.color);
    }
    this.spawnParticle(z.x, z.y - 4, z.kind === 2 ? '#c084fc' : '#84cc16', 18, 5, 26);
    if (z.kind === 2) {
      this.spawnRing(z.x, z.y - 4, 48, '#a855f7', 18);
      this.triggerShake(6, 10);
      PartyAudio.play('boom');
    } else {
      PartyAudio.play('hit');
    }
    this.zombies.splice(zi, 1);
  }

  private triggerZombieExplosion(x: number, y: number, radius: number, dmg: number, owner: number) {
    PartyAudio.play('boom');
    this.triggerShake(13, 16);
    this.hitStop = Math.max(this.hitStop, 3);
    this.spawnRing(x, y, radius * 1.05, '#f97316', 24);
    this.spawnRing(x, y, radius * 0.65, '#fde047', 16);
    this.spawnParticle(x, y, '#f97316', 30, 7.2, 30);
    this.spawnParticle(x, y, '#fde047', 20, 5.4, 24);
    this.spawnParticle(x, y, '#3f3f46', 18, 4.4, 34);
    this.addPopup(x, y - 30, 'BOOM!', '#f97316');

    // Chain-detonate nearby red barrels
    for (const br of this.zBarrels) {
      if (br.hp <= 0) continue;
      if (Math.hypot(br.x - x, br.y - y) < radius * 0.92) {
        br.hp = 0;
        br.respawnT = 1350;
        this.triggerZombieExplosion(br.x, br.y, 155, 420, owner);
      }
    }

    // Blast damage + dramatic knockback launch on zombies
    for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
      const z = this.zombies[zi];
      const dx = z.x - x;
      const dy = (z.y - 6) - y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const falloff = Math.max(0.35, 1 - dist / radius);
        const blastDmg = Math.round(dmg * falloff);
        const ang = Math.atan2(dy, dx);
        const kb = (z.kind === 3 ? 6.5 : z.kind === 2 ? 9.5 : 13.5) * falloff;
        z.vx += Math.cos(ang) * kb;
        z.vy = Math.min(z.vy, -(z.kind === 3 ? 4.8 : 7.8) * falloff);
        z.hp -= blastDmg;
        z.hitFlash = 9;
        if (z.hp <= 0) {
          this.handleZombieKilled(zi, owner);
        }
      }
    }

    // Mild co-op safe knockback for nearby players
    for (const pl of this.players) {
      if (!pl.alive) continue;
      const dx = pl.x - x;
      const dy = pl.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius * 0.85) {
        const ang = Math.atan2(dy, dx);
        const f = Math.max(3.5, 9.5 * (1 - dist / (radius * 0.85)));
        pl.vx += Math.cos(ang) * f;
        pl.vy = Math.min(pl.vy, -5.2);
        const rPl = this.rigs[pl.index];
        if (rPl) applyRagdollImpulse(rPl, Math.cos(ang) * f, -3.5, 8);
        if (dist < 68 && pl.invincible <= 0) {
          pl.hp = Math.max(5, pl.hp - 10);
          pl.invincible = 24;
        }
      }
    }
  }

  private updateProjectiles() {
    const isZombie = this.currentMinigame === 'zombie';
    const maxW = isZombie ? this.zWorldW : this.cw;
    const minY = isZombie ? -400 : 46;
    const maxY = isZombie ? this.zGroundY + 4 : this.ch - 8;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];

      if (pr.kind === 'grenade') {
        pr.vy = Math.min(12, pr.vy + 0.28);
        pr.x += pr.vx;
        pr.y += pr.vy;
        pr.life--;

        if (pr.x < 12 || pr.x > maxW - 12) {
          pr.vx *= -0.68;
          pr.x = Math.max(12, Math.min(maxW - 12, pr.x));
        }
        if (pr.y + 6 >= this.zGroundY) {
          pr.y = this.zGroundY - 6;
          pr.vy = -Math.abs(pr.vy) * 0.54;
          pr.vx *= 0.78;
          if (Math.abs(pr.vy) < 1.1) pr.vy = 0;
        } else if (pr.vy > 0) {
          for (const zp of this.zPlats) {
            if (pr.x > zp.x && pr.x < zp.x + zp.w && pr.y + 6 >= zp.y && pr.y - pr.vy + 6 <= zp.y + 10) {
              pr.y = zp.y - 6;
              pr.vy = -Math.abs(pr.vy) * 0.52;
              pr.vx *= 0.78;
              break;
            }
          }
        }
        if (pr.life % 3 === 0) {
          this.spawnParticle(pr.x, pr.y - 4, '#f97316', 1, 1.2, 10);
        }

        let detonate = pr.life <= 0;
        if (!detonate) {
          for (const br of this.zBarrels) {
            if (br.hp > 0 && Math.abs(pr.x - br.x) < 16 && Math.abs(pr.y - br.y) < 20) {
              detonate = true;
              break;
            }
          }
        }
        if (!detonate && pr.life < 74) {
          for (const z of this.zombies) {
            const zr = z.kind === 3 ? 34 : z.kind === 2 ? 25 : 18;
            if (Math.hypot(z.x - pr.x, z.y - 6 - pr.y) < zr + 7) {
              detonate = true;
              break;
            }
          }
        }
        if (detonate) {
          this.triggerZombieExplosion(pr.x, pr.y, 145, 250, pr.owner);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      pr.x += pr.vx;
      pr.y += pr.vy;
      pr.life--;

      if (pr.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Arena wall collision (ricochet if bounces > 0)
      let hitWall = false;
      if (pr.x < 8 || pr.x > maxW - 8) {
        if ((pr.bounces || 0) > 0) {
          pr.bounces!--;
          pr.vx *= -1;
          pr.x = Math.max(9, Math.min(maxW - 9, pr.x));
          this.spawnParticle(pr.x, pr.y, pr.color || '#ef4444', 6, 3, 12);
          PartyAudio.play('iceCrack');
        } else {
          hitWall = true;
        }
      }
      if (pr.y < minY || pr.y > maxY) {
        if ((pr.bounces || 0) > 0) {
          pr.bounces!--;
          pr.vy *= -1;
          pr.y = Math.max(minY + 1, Math.min(maxY - 1, pr.y));
          this.spawnParticle(pr.x, pr.y, pr.color || '#ef4444', 6, 3, 12);
          PartyAudio.play('iceCrack');
        } else {
          if (isZombie && pr.y >= this.zGroundY) {
            this.spawnParticle(pr.x, this.zGroundY - 2, '#d4d4d8', 4, 2.2, 10);
          }
          hitWall = true;
        }
      }
      if (hitWall) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Pillar collisions
      let destroyedByPillar = false;
      for (const pil of this.pillars) {
        if (pr.x >= pil.x && pr.x <= pil.x + pil.w && pr.y >= pil.y && pr.y <= pil.y + pil.h) {
          if ((pr.bounces || 0) > 0) {
            pr.bounces!--;
            const prevX = pr.x - pr.vx;
            if (prevX < pil.x || prevX > pil.x + pil.w) pr.vx *= -1;
            else pr.vy *= -1;
            pr.x += pr.vx;
            pr.y += pr.vy;
            this.spawnParticle(pr.x, pr.y, pr.color || '#fbbf24', 7, 3.2, 14);
            PartyAudio.play('iceCrack');
          } else {
            this.spawnParticle(pr.x, pr.y, '#a1a1aa', 5, 2.4, 12);
            destroyedByPillar = true;
          }
          break;
        }
      }
      if (destroyedByPillar) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit explosive red gasoline barrels (1-shot big explosion!)
      if (isZombie) {
        let hitBarrel = false;
        for (const br of this.zBarrels) {
          if (br.hp <= 0) continue;
          if (Math.abs(pr.x - br.x) < 15 && Math.abs(pr.y - br.y) < 19) {
            br.hp = 0;
            br.respawnT = 1350;
            this.triggerZombieExplosion(br.x, br.y, 155, 420, pr.owner);
            hitBarrel = true;
            break;
          }
        }
        if (hitBarrel) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Hit Zombies in side-view Zombie mode
      if (isZombie) {
        let hitZ = false;
        for (let zi = this.zombies.length - 1; zi >= 0; zi--) {
          const z = this.zombies[zi];
          const zr = z.kind === 3 ? 34 : z.kind === 2 ? 25 : z.kind === 1 ? 17 : 19;
          const zCenterY = z.y - (z.kind === 3 ? 12 : z.kind === 2 ? 6 : 3);
          if (Math.hypot(z.x - pr.x, zCenterY - pr.y) < zr + (pr.radius || 5)) {
            const dmg = pr.dmg || 28;
            z.hp -= dmg;
            z.hitFlash = 7;
            z.vx += Math.sign(pr.vx || 1) * (z.kind === 3 ? 0.9 : z.kind === 2 ? 1.8 : 4.2);
            z.vy = Math.min(z.vy, z.kind === 3 ? -0.4 : z.kind === 2 ? -0.8 : -2.2);
            this.spawnParticle(pr.x, pr.y, z.kind === 3 ? '#ef4444' : '#84cc16', 7, 3.4, 14);
            if (z.hp <= 0) {
              this.handleZombieKilled(zi, pr.owner);
            } else {
              PartyAudio.play('hit');
            }
            hitZ = true;
            break;
          }
        }
        if (hitZ) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Hit Players in Sniper mode
      if (this.currentMinigame === 'sniper') {
        for (const pl of this.players) {
          if (!pl.alive || pl.invincible > 0) continue;
          if (pl.index === pr.owner && pr.life > 110) continue;
          if (Math.hypot(pl.x - pr.x, pl.y - pr.y) < pl.radius + (pr.radius || 5)) {
            const ang = Math.atan2(pr.vy, pr.vx);
            pl.hp -= pr.dmg || 55;
            pl.vx += Math.cos(ang) * 10.5;
            pl.vy += Math.sin(ang) * 10.5;
            pl.invincible = 24;
            const rPl = this.rigs[pl.index];
            if (rPl) applyRagdollImpulse(rPl, Math.cos(ang) * 11, Math.sin(ang) * 11 - 2.5, 14, pr.y);
            this.hitStop = Math.max(this.hitStop, 3);
            this.spawnParticle(pr.x, pr.y, pr.color || '#ef4444', 18, 5.2, 24);
            this.spawnRing(pl.x, pl.y, 42, pr.color || '#ef4444', 16);
            this.triggerShake(7, 10);
            PartyAudio.play('boom');
            if (pl.hp <= 0) this.killPlayer(pl);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  private initZombieAtmosphere() {
    this.zBuildings = [];
    let bx = -120;
    let idx = 0;
    while (bx < this.zWorldW + 260) {
      const w = 110 + ((idx * 37) % 85);
      const h = 190 + ((idx * 73) % 210);
      this.zBuildings.push({
        x: bx,
        w,
        h,
        layer: 0,
        broken: (idx * 19) % 36,
        fire: idx % 4 === 1,
        moss: 0.4 + ((idx * 17) % 6) * 0.1,
        seed: idx + 1,
      });
      bx += w - 8 + ((idx * 23) % 24);
      idx++;
    }
    let nx = -80;
    let nIdx = 0;
    while (nx < this.zWorldW + 240) {
      const w = 135 + ((nIdx * 43) % 95);
      const h = 150 + ((nIdx * 61) % 165);
      this.zBuildings.push({
        x: nx,
        w,
        h,
        layer: 1,
        broken: (nIdx * 29) % 42,
        fire: nIdx % 3 === 1,
        moss: 0.55 + ((nIdx * 13) % 5) * 0.08,
        seed: nIdx + 40,
      });
      nx += w + 28 + ((nIdx * 31) % 70);
      nIdx++;
    }
    this.zEmbers = Array.from({ length: 58 }, () => ({
      x: Math.random() * this.zWorldW,
      y: 80 + Math.random() * (this.zGroundY - 60),
      vx: -0.25 + Math.random() * 0.55,
      vy: -0.45 - Math.random() * 0.9,
      r: 1.4 + Math.random() * 2.2,
      a: 0.35 + Math.random() * 0.55,
    }));
  }

  private stepZombieEmbers() {
    for (const em of this.zEmbers) {
      em.x += em.vx + Math.sin(this.miniTick * 0.02 + em.y * 0.03) * 0.25;
      em.y += em.vy;
      if (em.y < 30 || em.x < -30 || em.x > this.zWorldW + 30) {
        em.x = Math.random() * this.zWorldW;
        em.y = this.zGroundY - 10 - Math.random() * 140;
      }
    }
  }

  private updateZombieCamera() {
    const alive = this.players.filter((p) => p.alive);
    const group = alive.length > 0 ? alive : this.players;
    if (group.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of group) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const spanX = Math.max(260, maxX - minX);
    const spanY = Math.max(170, maxY - minY);
    const minZoom = this.cw / this.zWorldW;
    const maxZoom = Math.max(minZoom, Math.min(1.26, Math.max(this.cw / 920, this.ch / 470)));
    const fitZoom = Math.min(this.cw / (spanX + 420), this.ch / (spanY + 250));
    const targetZoom = Math.max(minZoom, Math.min(maxZoom, fitZoom));

    this.zCamZoom += (targetZoom - this.zCamZoom) * 0.085;
    const viewW = this.cw / this.zCamZoom;
    const viewH = this.ch / this.zCamZoom;

    const midX = (minX + maxX) * 0.5;
    const halfViewW = viewW * 0.5;
    const targetX = Math.max(halfViewW, Math.min(this.zWorldW - halfViewW, midX));

    // Anchor road nicely near bottom of screen while expanding upward when zooming out
    const desiredBottom = Math.max(maxY + 95, this.zGroundY + 56);
    const desiredCenter = (minY + maxY) * 0.5 - 32;
    const targetY = Math.min(desiredBottom - viewH * 0.5, desiredCenter);

    this.zCamX += (targetX - this.zCamX) * 0.13;
    this.zCamY += (targetY - this.zCamY) * 0.13;
    this.zCamX = Math.max(halfViewW, Math.min(this.zWorldW - halfViewW, this.zCamX));
  }

  private spawnZombieAt(x: number, y: number, forceKind?: 0 | 1 | 2 | 3) {
    let kind: 0 | 1 | 2 | 3 = forceKind ?? 0;
    if (forceKind === undefined) {
      const r = Math.random();
      if (this.zombieWave >= 2 && r < 0.14) kind = 2;
      else if (r < 0.4) kind = 1;
      else kind = 0;
    }
    const maxHp =
      kind === 3
        ? (this.zombieWave >= this.zMaxWaves ? 2800 : 340 + this.zombieWave * 110)
        : kind === 2
          ? 140 + this.zombieWave * 6
          : kind === 1
            ? 36 + Math.floor(this.zombieWave * 1.5)
            : 60 + this.zombieWave * 2;
    this.zombies.push({
      x: Math.max(30, Math.min(this.zWorldW - 30, x)),
      y,
      vx: 0,
      vy: 0,
      hp: maxHp,
      maxHp,
      kind,
      phase: Math.random() * Math.PI * 2,
      hitFlash: 0,
    });
  }

  private spawnZombie(forceKind?: 0 | 1 | 2 | 3) {
    const alive = this.players.filter((p) => p.alive);
    const anchor = alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)] : this.players[0];
    const ax = anchor ? anchor.x : this.zWorldW * 0.5;
    const side = Math.random() < 0.5 ? -1 : 1;
    let x = ax + side * (360 + Math.random() * 280);
    if (x < 36 || x > this.zWorldW - 36) {
      x = ax - side * (360 + Math.random() * 260);
    }
    x = Math.max(36, Math.min(this.zWorldW - 36, x));
    this.spawnZombieAt(x, forceKind === 3 ? this.zGroundY - 32 : this.zGroundY - 18, forceKind);
  }

  private getZombieSurfaceY(x: number): number {
    let bestY = this.zGroundY;
    for (const zp of this.zPlats) {
      if (x >= zp.x + 14 && x <= zp.x + zp.w - 14 && zp.y < bestY) {
        bestY = zp.y;
      }
    }
    return bestY;
  }

  private updateZombie() {
    this.gameTimer++;

    // End-of-wave Giant Red Boss Zombie spawn (every 10 zombie kills)
    if (this.zombieKills >= this.nextBossAt && !this.waveBossSpawned) {
      this.waveBossSpawned = true;
      this.spawnZombie(3);
      this.addPopup(this.zCamX, this.zCamY - 56, 'BOSS ZOMBİ GƏLDİ!', '#ef4444');
      this.spawnRing(this.zCamX, this.zGroundY - 40, 120, '#ef4444', 26);
      this.triggerShake(9, 14);
      PartyAudio.play('portal');
    }

    // Respawn exploded red gasoline barrels after cooldown
    for (const br of this.zBarrels) {
      if (br.hp <= 0) {
        if (--br.respawnT <= 0) {
          br.hp = 1;
          this.spawnParticle(br.x, br.y, '#ef4444', 8, 2.5, 16);
        }
      }
    }

    const spawnEvery = Math.max(26, 76 - Math.min(8, this.zombieWave) * 6);
    const maxZombies = Math.min(26, 15 + this.zombieWave * 2);
    if (--this.zombieSpawnTimer <= 0 && this.zombies.length < maxZombies) {
      this.zombieSpawnTimer = spawnEvery;
      this.spawnZombie();
    }

    // Supply pickups (Shotgun / Rapid / Medkit / Hand Grenade)
    if (++this.coinSpawnTimer >= 210 && this.coins.length < 4) {
      this.coinSpawnTimer = 0;
      const kinds: ('shotgun' | 'rapid' | 'medkit' | 'grenade')[] = ['shotgun', 'rapid', 'medkit', 'grenade'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const alive = this.players.filter((p) => p.alive);
      const refX = alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)].x : this.zCamX;
      const cx = Math.max(90, Math.min(this.zWorldW - 90, refX + (Math.random() - 0.5) * 700));
      const surfY = Math.random() < 0.55 ? this.getZombieSurfaceY(cx) : this.zGroundY;
      this.coins.push({
        x: cx,
        y: surfY - 16,
        radius: 13,
        life: 620,
        diamond: kind !== 'medkit',
        kind,
      });
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (--c.life <= 0) { this.coins.splice(i, 1); continue; }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.radius + c.radius + 6) {
          if (c.kind === 'medkit') {
            p.hp = Math.min(100, p.hp + 40);
            this.addPopup(p.x, p.y - 28, '+40 CAN', '#4ade80');
          } else if (c.kind === 'shotgun') {
            p.weap = 'shotgun';
            p.weapT = 9 * 60;
            this.addPopup(p.x, p.y - 28, 'SHOTGUN!', '#fbbf24');
          } else if (c.kind === 'grenade') {
            p.weap = 'grenade';
            p.weapT = 10 * 60;
            this.addPopup(p.x, p.y - 28, 'ƏL QUMBARASI!', '#f97316');
          } else {
            p.weap = 'rapid';
            p.weapT = 9 * 60;
            this.addPopup(p.x, p.y - 28, 'TURBO ATƏŞ!', '#38bdf8');
          }
          this.spawnParticle(
            c.x,
            c.y,
            c.kind === 'medkit' ? '#4ade80' : c.kind === 'grenade' ? '#f97316' : '#fbbf24',
            14,
            4,
            22
          );
          PartyAudio.play('coin');
          this.coins.splice(i, 1);
          break;
        }
      }
    }

    // Player shooting & grenade throws
    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.throwCd > 0) p.throwCd--;
      const inp = inputPlayers[p.index];
      if ((inp.action || inp.releaseAction) && p.throwCd <= 0) {
        if (p.weap === 'grenade') {
          p.throwCd = 28;
          this.projectiles.push({
            x: p.x + Math.cos(p.angle) * 16,
            y: p.y - 8 + Math.sin(p.angle) * 16,
            vx: Math.cos(p.angle) * 10.5 + p.vx * 0.3,
            vy: Math.sin(p.angle) * 10.5 - 3.2,
            owner: p.index,
            life: 82,
            snow: false,
            color: '#f97316',
            radius: 7,
            bounces: 4,
            dmg: 250,
            kind: 'grenade',
          });
        } else if (p.weap === 'shotgun') {
          p.throwCd = 24;
          for (const spread of [-0.16, 0, 0.16]) {
            const a = p.angle + spread;
            this.projectiles.push({
              x: p.x + Math.cos(a) * 18,
              y: p.y - 6 + Math.sin(a) * 18,
              vx: Math.cos(a) * 13,
              vy: Math.sin(a) * 13,
              owner: p.index,
              life: 44,
              snow: false,
              color: '#fbbf24',
              radius: 4.5,
              dmg: 34,
              kind: 'shotgun',
            });
          }
        } else if (p.weap === 'rapid') {
          p.throwCd = 6;
          const jitter = (Math.random() - 0.5) * 0.06;
          const a = p.angle + jitter;
          this.projectiles.push({
            x: p.x + Math.cos(a) * 18,
            y: p.y - 6 + Math.sin(a) * 18,
            vx: Math.cos(a) * 14.5,
            vy: Math.sin(a) * 14.5,
            owner: p.index,
            life: 62,
            snow: false,
            color: '#38bdf8',
            radius: 4.2,
            dmg: 24,
            kind: 'bolt',
          });
        } else {
          p.throwCd = 13;
          this.projectiles.push({
            x: p.x + Math.cos(p.angle) * 18,
            y: p.y - 6 + Math.sin(p.angle) * 18,
            vx: Math.cos(p.angle) * 13.5,
            vy: Math.sin(p.angle) * 13.5,
            owner: p.index,
            life: 68,
            snow: false,
            color: '#fbbf24',
            radius: 4.8,
            dmg: 35,
            kind: 'bolt',
          });
        }
        p.isAttacking = true;
        p.attackTimer = 6;
        p.vx -= Math.cos(p.angle) * 0.55;
        PartyAudio.play('shot');
      }
    }

    // Update Slower Side-View Zombies
    const alivePlayers = this.players.filter((p) => p.alive);
    for (let i = 0; i < this.zombies.length; i++) {
      const z = this.zombies[i];
      if (z.hitFlash > 0) z.hitFlash--;

      let nearest: MiniPlayer | null = null;
      let bestDist = Infinity;
      for (const pl of alivePlayers) {
        const d = Math.hypot(pl.x - z.x, pl.y - z.y);
        if (d < bestDist) { bestDist = d; nearest = pl; }
      }

      const sp =
        z.kind === 3
          ? 0.72 + this.zombieWave * 0.03
          : z.kind === 1
            ? 1.24 + this.zombieWave * 0.045
            : z.kind === 2
              ? 0.62 + this.zombieWave * 0.025
              : 0.78 + this.zombieWave * 0.035;

      if (nearest) {
        const dx = nearest.x - z.x;
        const dir = Math.abs(dx) > 6 ? Math.sign(dx) : 0;
        z.vx = z.vx * 0.84 + dir * sp * 0.16;
      } else {
        z.vx *= 0.88;
      }

      // Soft horizontal separation between zombies on same tier
      for (let j = i + 1; j < this.zombies.length; j++) {
        const o = this.zombies[j];
        if (Math.abs(o.y - z.y) > 30) continue;
        const dx = o.x - z.x;
        if (Math.abs(dx) < 22) {
          const s = dx === 0 ? 1 : Math.sign(dx);
          const push = (22 - Math.abs(dx)) * 0.05;
          z.vx -= s * push;
          o.vx += s * push;
        }
      }

      const zFoot = z.kind === 3 ? 32 : z.kind === 2 ? 23 : 18;
      const prevBot = z.y + zFoot;
      z.vy = Math.min(12, z.vy + 0.42);
      z.x = Math.max(20, Math.min(this.zWorldW - 20, z.x + z.vx));
      z.y += z.vy;

      let grounded = false;
      if (z.y + zFoot >= this.zGroundY) {
        z.y = this.zGroundY - zFoot;
        z.vy = 0;
        grounded = true;
      } else if (z.vy >= 0) {
        const wantDrop = nearest && nearest.y > z.y + 42;
        if (!wantDrop) {
          for (const zp of this.zPlats) {
            if (z.x + 8 > zp.x && z.x - 8 < zp.x + zp.w && prevBot <= zp.y + 10 && z.y + zFoot >= zp.y) {
              z.y = zp.y - zFoot;
              z.vy = 0;
              grounded = true;
              break;
            }
          }
        }
      }

      // Clamber jump up onto cars/platforms if player is perched higher
      if (grounded && nearest && nearest.y < z.y - 42 && Math.abs(nearest.x - z.x) < 170 && Math.random() < 0.025) {
        z.vy = z.kind === 3 ? -10.2 : -8.8;
      }

      z.phase += Math.abs(z.vx) * 0.22;

      // Bite players
      const zr = z.kind === 3 ? 30 : z.kind === 2 ? 22 : z.kind === 1 ? 14 : 16;
      for (const pl of alivePlayers) {
        if (pl.invincible > 0) continue;
        if (Math.hypot(pl.x - z.x, pl.y - z.y) < pl.radius + zr) {
          const bite = z.kind === 3 ? 36 : z.kind === 2 ? 30 : z.kind === 1 ? 16 : 20;
          pl.hp -= bite;
          pl.invincible = 34;
          const kDir = pl.x >= z.x ? 1 : -1;
          pl.vx += kDir * (z.kind === 3 ? 10.5 : 6.8);
          pl.vy = Math.min(pl.vy, z.kind === 3 ? -6.2 : -4.6);
          const rPl = this.rigs[pl.index];
          if (rPl) applyRagdollImpulse(rPl, kDir * (z.kind === 3 ? 10 : 7.2), -3.8, z.kind === 3 ? 12 : 8);
          this.spawnParticle(pl.x, pl.y, z.kind === 3 ? '#ef4444' : '#84cc16', 10, 4, 18);
          this.triggerShake(z.kind === 3 ? 9 : 5, 10);
          PartyAudio.play('hit');
          if (pl.hp <= 0) this.killPlayer(pl);
        }
      }
    }

    if (alivePlayers.length === 0) {
      const best = Math.max(...this.players.map((p) => p.coins), 0);
      for (const p of this.players) {
        if (p.coins === best) p.score++;
      }
      this.endRound();
    }
  }

  private updateSamurai() {
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (!p.alive) continue;
      const inp = inputPlayers[i];
      if ((inp.action || inp.releaseAction) && p.dashCooldown <= 0) {
        const dax = Math.cos(p.angle);
        const day = Math.sin(p.angle);
        p.vx += dax * 15.5;
        p.vy += day * 15.5;
        p.leanVx -= dax * 5.2;
        p.headVx -= dax * 6.5;
        p.tiltV += dax * 0.2;
        p.dashCooldown = 30;
        p.isAttacking = true;
        p.attackTimer = 14;
        const rP = this.rigs[p.index];
        if (rP) applyWeaponKickToRig(rP, p.angle + Math.PI, 4.5, false);
        this.slashes.push({
          x: p.x + dax * 14,
          y: p.y + day * 14,
          angle: p.angle,
          color: p.color,
          life: 11,
          maxLife: 11,
          radius: 44,
        });
        this.spawnParticle(p.x + dax * 22, p.y + day * 22, '#ffffff', 7, 3.6, 14);
        PartyAudio.play('shot');

        // Katana Hit / Parry Check
        for (const o of this.players) {
          if (!o.alive || o.index === p.index || o.invincible > 0) continue;
          const dx = o.x - p.x;
          const dy = o.y - p.y;
          const dist = Math.hypot(dx, dy);
          const angTo = Math.atan2(dy, dx);
          if (dist < 62 && angleDiff(p.angle, angTo) < 1.15) {
            const rO = this.rigs[o.index];
            if (o.isAttacking) {
              // KATANA PARRY CLASH!
              const mx = (p.x + o.x) / 2;
              const my = (p.y + o.y) / 2;
              this.spawnParticle(mx, my, '#fde047', 22, 6, 22);
              this.spawnRing(mx, my, 52, '#fbbf24', 18);
              this.addPopup(mx, my - 26, 'PARİ!', '#fde047');
              this.triggerShake(8, 12);
              this.hitStop = Math.max(this.hitStop, 3);
              p.vx -= Math.cos(angTo) * 9;
              p.vy -= Math.sin(angTo) * 9;
              o.vx += Math.cos(angTo) * 9;
              o.vy += Math.sin(angTo) * 9;
              if (rP) applyRagdollImpulse(rP, -Math.cos(angTo) * 9, -Math.sin(angTo) * 9, 10);
              if (rO) applyRagdollImpulse(rO, Math.cos(angTo) * 9, Math.sin(angTo) * 9, 10);
              p.invincible = 14;
              o.invincible = 14;
              PartyAudio.play('iceCrack');
            } else {
              o.hp -= 50;
              o.invincible = 24;
              o.vx += Math.cos(angTo) * 11;
              o.vy += Math.sin(angTo) * 11;
              if (rO) applyRagdollImpulse(rO, Math.cos(angTo) * 11, Math.sin(angTo) * 11 - 2.5, 14);
              this.hitStop = Math.max(this.hitStop, 3);
              this.spawnParticle(o.x, o.y, '#ef4444', 18, 5, 22);
              this.spawnRing(o.x, o.y, 40, p.color, 15);
              this.triggerShake(7, 10);
              PartyAudio.play('hit');
              if (o.hp <= 0) this.killPlayer(o);
            }
          }
        }
      }
    }
  }

  private raycastBouncePath(ox: number, oy: number, ang: number, maxDist: number, maxBounces = 2): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [{ x: ox, y: oy }];
    const step = 6;
    let vx = Math.cos(ang) * step;
    let vy = Math.sin(ang) * step;
    let x = ox;
    let y = oy;
    let bounces = 0;
    for (let d = 0; d < maxDist; d += step) {
      const nx = x + vx;
      const ny = y + vy;
      let bounced = false;
      if (nx <= 8 || nx >= this.cw - 8) {
        if (bounces < maxBounces) {
          pts.push({ x: Math.max(8, Math.min(this.cw - 8, nx)), y: ny });
          vx *= -1;
          bounces++;
          bounced = true;
        } else {
          pts.push({ x: Math.max(8, Math.min(this.cw - 8, nx)), y: ny });
          return pts;
        }
      }
      if (ny <= 46 || ny >= this.ch - 8) {
        if (bounces < maxBounces) {
          pts.push({ x: nx, y: Math.max(46, Math.min(this.ch - 8, ny)) });
          vy *= -1;
          bounces++;
          bounced = true;
        } else {
          pts.push({ x: nx, y: Math.max(46, Math.min(this.ch - 8, ny)) });
          return pts;
        }
      }
      if (!bounced) {
        for (const pil of this.pillars) {
          if (nx >= pil.x && nx <= pil.x + pil.w && ny >= pil.y && ny <= pil.y + pil.h) {
            if (bounces < maxBounces) {
              pts.push({ x: nx, y: ny });
              if (x < pil.x || x > pil.x + pil.w) vx *= -1;
              else vy *= -1;
              bounces++;
              bounced = true;
            } else {
              pts.push({ x: nx, y: ny });
              return pts;
            }
            break;
          }
        }
      }
      x = bounced ? x + vx : nx;
      y = bounced ? y + vy : ny;
    }
    pts.push({ x, y });
    return pts;
  }

  private updateSniper() {
    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.throwCd > 0) p.throwCd--;
      const inp = inputPlayers[p.index];
      if ((inp.action || inp.releaseAction) && p.throwCd <= 0) {
        p.throwCd = 32;
        const speed = 18.5;
        this.projectiles.push({
          x: p.x + Math.cos(p.angle) * 24,
          y: p.y - 6 + Math.sin(p.angle) * 24,
          vx: Math.cos(p.angle) * speed,
          vy: Math.sin(p.angle) * speed,
          owner: p.index,
          life: 130,
          snow: false,
          color: p.color,
          radius: 4.8,
          bounces: 2,
          dmg: 55,
          kind: 'sniper',
        });
        p.isAttacking = true;
        p.attackTimer = 10;
        p.vx -= Math.cos(p.angle) * 4.5;
        p.vy -= Math.sin(p.angle) * 4.5;
        this.spawnParticle(p.x + Math.cos(p.angle) * 24, p.y - 6 + Math.sin(p.angle) * 24, '#fbbf24', 8, 3.8, 12);
        this.triggerShake(4, 6);
        PartyAudio.play('shot');
      }
    }
  }

  private updateBlades() {
    this.sawSpawnTimer++;
    if (this.sawSpawnTimer === 60 * 11 && this.saws.length < 3) {
      this.saws.push({
        x: this.cw / 2,
        y: 80,
        vx: 4.6,
        vy: 3.8,
        r: 22,
        rot: 0,
      });
      this.addPopup(this.cw / 2, this.ch * 0.25, '+1 MİŞAR!', '#f97316');
      PartyAudio.play('portal');
    }
    if (this.sawSpawnTimer === 60 * 24 && this.saws.length < 4) {
      this.saws.push({
        x: this.cw / 2,
        y: this.ch - 60,
        vx: -4.8,
        vy: -4.0,
        r: 20,
        rot: 0,
      });
      this.addPopup(this.cw / 2, this.ch * 0.25, 'SON SÜRƏT!', '#ef4444');
      PartyAudio.play('portal');
    }

    // Spawn occasional Shield Orbs in center lanes
    if (++this.coinSpawnTimer >= 175 && this.coins.length < 2) {
      this.coinSpawnTimer = 0;
      this.coins.push({
        x: this.cw * (0.35 + Math.random() * 0.3),
        y: 90 + Math.random() * (this.ch - 140),
        radius: 12,
        life: 360,
        diamond: true,
        kind: 'shield',
      });
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (--c.life <= 0) { this.coins.splice(i, 1); continue; }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.radius + c.radius) {
          p.shield = true;
          p.hp = Math.min(100, p.hp + 20);
          this.addPopup(p.x, p.y - 24, 'QALXAN!', '#38bdf8');
          this.spawnParticle(c.x, c.y, '#38bdf8', 12, 3.6, 18);
          PartyAudio.play('coin');
          this.coins.splice(i, 1);
          break;
        }
      }
    }

    for (const s of this.saws) {
      s.rot += 0.24;
      s.vx *= 1.0004;
      s.vy *= 1.0004;
      const maxSp = 7.4;
      const curSp = Math.hypot(s.vx, s.vy);
      if (curSp > maxSp) {
        s.vx = (s.vx / curSp) * maxSp;
        s.vy = (s.vy / curSp) * maxSp;
      }
      s.x += s.vx;
      s.y += s.vy;
      if (s.x - s.r < 10) { s.x = 10 + s.r; s.vx = Math.abs(s.vx); this.spawnParticle(s.x - s.r, s.y, '#fbbf24', 5, 3, 12); }
      if (s.x + s.r > this.cw - 10) { s.x = this.cw - 10 - s.r; s.vx = -Math.abs(s.vx); this.spawnParticle(s.x + s.r, s.y, '#fbbf24', 5, 3, 12); }
      if (s.y - s.r < 48) { s.y = 48 + s.r; s.vy = Math.abs(s.vy); this.spawnParticle(s.x, s.y - s.r, '#fbbf24', 5, 3, 12); }
      if (s.y + s.r > this.ch - 10) { s.y = this.ch - 10 - s.r; s.vy = -Math.abs(s.vy); this.spawnParticle(s.x, s.y + s.r, '#fbbf24', 5, 3, 12); }

      // Bounce saws off cover pillars
      for (const pil of this.pillars) {
        const nearX = Math.max(pil.x, Math.min(pil.x + pil.w, s.x));
        const nearY = Math.max(pil.y, Math.min(pil.y + pil.h, s.y));
        const dx = s.x - nearX;
        const dy = s.y - nearY;
        const dist = Math.hypot(dx, dy);
        if (dist < s.r && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          s.x += nx * (s.r - dist);
          s.y += ny * (s.r - dist);
          const dot = s.vx * nx + s.vy * ny;
          if (dot < 0) {
            s.vx -= 2 * dot * nx;
            s.vy -= 2 * dot * ny;
            this.spawnParticle(nearX, nearY, '#fbbf24', 6, 3, 12);
          }
        }
      }

      for (const p of this.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (Math.hypot(p.x - s.x, p.y - s.y) < p.radius + s.r - 3) {
          const ang = Math.atan2(p.y - s.y, p.x - s.x);
          if (p.shield) {
            p.shield = false;
            p.invincible = 32;
            p.vx += Math.cos(ang) * 9;
            p.vy += Math.sin(ang) * 9;
            this.spawnRing(p.x, p.y, 44, '#38bdf8', 18);
            this.addPopup(p.x, p.y - 24, 'BLOKLANDI!', '#38bdf8');
            PartyAudio.play('ice');
          } else {
            p.hp -= 50;
            p.invincible = 32;
            p.vx += Math.cos(ang) * 11;
            p.vy += Math.sin(ang) * 11;
            const rP = this.rigs[p.index];
            if (rP) applyRagdollImpulse(rP, Math.cos(ang) * 11, Math.sin(ang) * 11 - 2, 14);
            this.hitStop = Math.max(this.hitStop, 2);
            this.spawnParticle(p.x, p.y, '#ef4444', 16, 5, 22);
            this.triggerShake(7, 10);
            PartyAudio.play('hit');
            if (p.hp <= 0) this.killPlayer(p);
          }
        }
      }
    }
  }

  private updateSumo() {
    this.gameTimer++;
    if (this.gameTimer > 60 * 8) {
      this.ringScale = Math.max(0.44, 1 - (this.gameTimer - 60 * 8) / (60 * 30));
    }
    if (++this.coinSpawnTimer >= 210 && this.coins.length < 1) {
      this.coinSpawnTimer = 0;
      const cx = this.cw / 2;
      const cy = this.ch / 2;
      const ringR = Math.min(this.cw, this.ch) * 0.2 * this.ringScale;
      const a = Math.random() * Math.PI * 2;
      this.coins.push({
        x: cx + Math.cos(a) * ringR,
        y: cy + Math.sin(a) * ringR,
        radius: 13,
        life: 320,
        diamond: true,
        kind: 'power',
      });
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (--c.life <= 0) { this.coins.splice(i, 1); continue; }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.radius + c.radius) {
          p.shield = true;
          this.spawnRing(p.x, p.y, 48, '#fbbf24', 18);
          this.spawnParticle(c.x, c.y, '#fbbf24', 14, 4, 20);
          this.addPopup(p.x, p.y - 26, 'GÜC ARTIŞI!', '#fbbf24');
          PartyAudio.play('coin');
          this.coins.splice(i, 1);
          break;
        }
      }
    }
  }

  private updateFutbol() {
    const b = this.ball;
    if (!b) return;
    b.vx *= 0.982;
    b.vy *= 0.982;
    b.x += b.vx;
    b.y += b.vy;
    if (b.y - b.radius < 48) { b.y = 48 + b.radius; b.vy *= -0.84; }
    if (b.y + b.radius > this.ch - 6) { b.y = this.ch - 6 - b.radius; b.vy *= -0.84; }

    // Corner bumpers so the ball never stalls in corners
    const corners: [number, number][] = [
      [18, 52],
      [this.cw - 18, 52],
      [18, this.ch - 10],
      [this.cw - 18, this.ch - 10],
    ];
    for (const [cx, cy] of corners) {
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < b.radius + 26 && dist > 0.01) {
        const nx = dx / dist;
        const ny = dy / dist;
        b.x = cx + nx * (b.radius + 26);
        b.y = cy + ny * (b.radius + 26);
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx = (b.vx - 2 * dot * nx) * 0.9 + nx * 1.4;
          b.vy = (b.vy - 2 * dot * ny) * 0.9 + ny * 1.4;
        }
      }
    }

    const goalW = 20;
    const goalH = this.ch * 0.34;
    const goalTop = (this.ch + 44) / 2 - goalH / 2;
    const goalBot = (this.ch + 44) / 2 + goalH / 2;

    if (b.x - b.radius < goalW && b.y > goalTop && b.y < goalBot) {
      this.players[1].score++;
      if (this.players[3]) this.players[3].score++;
      this.spawnParticle(b.x, b.y, '#ef4444', 32, 6.5, 38);
      this.spawnRing(b.x, b.y, 70, '#ef4444', 24);
      this.addPopup(this.cw / 2, this.ch / 2 - 40, 'GOL!', '#ef4444');
      this.triggerShake(8, 13);
      PartyAudio.play('coin');
      b.x = this.cw / 2; b.y = (this.ch + 44) / 2; b.vx = 0; b.vy = 0;
      if (this.players.some((p) => p.score - p.roundStart >= 3)) this.endRound();
      return;
    }
    if (b.x + b.radius > this.cw - goalW && b.y > goalTop && b.y < goalBot) {
      this.players[0].score++;
      if (this.players[2]) this.players[2].score++;
      this.spawnParticle(b.x, b.y, '#3b82f6', 32, 6.5, 38);
      this.spawnRing(b.x, b.y, 70, '#3b82f6', 24);
      this.addPopup(this.cw / 2, this.ch / 2 - 40, 'GOL!', '#3b82f6');
      this.triggerShake(8, 13);
      PartyAudio.play('coin');
      b.x = this.cw / 2; b.y = (this.ch + 44) / 2; b.vx = 0; b.vy = 0;
      if (this.players.some((p) => p.score - p.roundStart >= 3)) this.endRound();
      return;
    }

    if (b.x - b.radius < goalW && (b.y < goalTop || b.y > goalBot)) { b.x = goalW + b.radius; b.vx *= -0.84; }
    if (b.x + b.radius > this.cw - goalW && (b.y < goalTop || b.y > goalBot)) { b.x = this.cw - goalW - b.radius; b.vx *= -0.84; }

    // Midfield speed boost pads + Action tackle lunge
    const pads: [number, number][] = [
      [this.cw * 0.5, (this.ch + 44) * 0.28],
      [this.cw * 0.5, (this.ch + 44) * 0.76],
    ];
    for (const p of this.players) {
      if (!p.alive) continue;
      for (const [bx, by] of pads) {
        if (Math.hypot(p.x - bx, p.y - by) < p.radius + 16 && !p.isAttacking) {
          p.vx *= 1.45;
          p.vy *= 1.45;
          p.isAttacking = true;
          p.attackTimer = 16;
          this.spawnParticle(bx, by, '#38bdf8', 7, 3, 14);
        }
      }
      const inp = inputPlayers[p.index];
      if ((inp.action || inp.releaseAction) && p.dashCooldown <= 0) {
        p.vx += Math.cos(p.angle) * 9.5;
        p.vy += Math.sin(p.angle) * 9.5;
        p.dashCooldown = 28;
        p.isAttacking = true;
        p.attackTimer = 14;
        this.spawnParticle(p.x, p.y, p.color, 6, 3, 14);
        PartyAudio.play('jump');
      }
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < p.radius + b.radius) {
        const ang = Math.atan2(dy, dx);
        const superKick = inp.action || inp.releaseAction || p.isAttacking;
        const kick = superKick ? 14.2 : 5.4;
        b.vx = Math.cos(ang) * kick;
        b.vy = Math.sin(ang) * kick;
        b.lastKicker = p.index;
        b.x = p.x + Math.cos(ang) * (p.radius + b.radius + 1);
        b.y = p.y + Math.sin(ang) * (p.radius + b.radius + 1);
        if (superKick) this.spawnRing(b.x, b.y, 38, p.color, 14);
        this.spawnParticle(b.x, b.y, superKick ? '#fbbf24' : '#ffffff', 7, 3, 14);
        PartyAudio.play('hit');
      }
    }
  }

  private updateRace() {
    const bodyHw = 11;
    const footHh = 22;
    const headHh = 28;
    let maxX = 0;

    for (const obs of this.raceObstacles) {
      if (obs.kind === 'saw' && obs.dy && obs.speed) {
        obs.y = (obs.baseY ?? obs.y) + Math.sin(this.miniTick * obs.speed + obs.x * 0.015) * obs.dy;
      }
    }

    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.invincible > 0) p.invincible--;
      if (p.dashCooldown > 0) p.dashCooldown--;
      const inp = inputPlayers[p.index];
      if ((inp.action || inp.releaseAction) && p.dashCooldown <= 0) {
        p.dashCooldown = 44;
        p.isAttacking = true;
        p.attackTimer = 16;
        p.leanVx -= 3.6;
        this.spawnRing(p.x, p.y, 30, '#f59e0b', 11);
        this.spawnParticle(p.x, p.y, '#fbbf24', 7, 3.2, 14);
        PartyAudio.play('jump');
      }

      const targetVx = Math.abs(inp.x) > 0.1 ? inp.x * (Math.abs(inp.x) > 0.5 ? 5.65 : 3.6) : 0;
      if (Math.abs(inp.x) > 0.1) {
        p.angle = inp.x >= 0 ? 0 : Math.PI;
      }

      const prevRaceX = p.raceX;
      p.vx = targetVx + (p.isAttacking ? Math.sign(targetVx || Math.cos(p.angle) || 1) * 2.6 : 0);
      p.raceX = Math.max(24, p.raceX + p.vx);

      for (const obs of this.raceObstacles) {
        if (obs.kind === 'spring' || obs.kind === 'boost' || obs.kind === 'saw') continue;
        if (p.y + footHh > obs.y + 4 && p.y - headHh < obs.y + obs.h - 2) {
          if (p.raceX + bodyHw > obs.x && p.raceX - bodyHw < obs.x + obs.w) {
            if (prevRaceX <= obs.x - bodyHw + 5) {
              p.raceX = obs.x - bodyHw;
            } else if (prevRaceX >= obs.x + obs.w + bodyHw - 5) {
              p.raceX = obs.x + obs.w + bodyHw;
            } else {
              p.raceX = prevRaceX < obs.x + obs.w / 2 ? obs.x - bodyHw : obs.x + obs.w + bodyHw;
            }
          }
        }
      }

      const wantJ = inp.jump;
      if (wantJ && !p.jh) {
        p.jumpBuf = 8;
      } else if (!wantJ) {
        p.jh = false;
      }
      if (p.jumpBuf > 0) p.jumpBuf--;

      if (p.jumpBuf > 0 && (p.onGround || p.coyoteT > 0)) {
        p.vy = -12.0;
        p.onGround = false;
        p.coyoteT = 0;
        p.jumpBuf = 0;
        p.jumpsLeft = 0;
        p.jh = true;
        p.highJ = inp.y < -0.8;
        p.headVy += 2.6;
        this.spawnParticle(p.x, p.y + footHh, '#e4e4e7', 5, 2.2, 12);
        PartyAudio.play('jump');
      }
      if (inp.y >= -0.72) p.highJ = false;
      if (p.vy < -2.8 && !wantJ && !p.highJ) p.vy *= 0.87;

      const prevBottom = p.y + footHh;
      const prevTop = p.y - headHh;
      const prevOnGround = p.onGround;
      const preLandVy = p.vy;
      p.vy = Math.min(13.5, p.vy + 0.45 * (p.vy > 0 ? 1.12 : 1.0));
      p.y += p.vy;
      p.onGround = false;

      for (const obs of this.raceObstacles) {
        if (obs.kind === 'saw') continue;
        if (p.raceX + bodyHw <= obs.x + 1 || p.raceX - bodyHw >= obs.x + obs.w - 1) continue;

        if (obs.kind === 'spring') {
          if (p.y + footHh >= obs.y && p.y - headHh <= obs.y + obs.h) {
            p.y = obs.y - footHh;
            p.vy = -14.6;
            p.onGround = false;
            p.coyoteT = 0;
            p.jumpsLeft = 0;
            p.headVy += 4;
            this.spawnParticle(p.x, obs.y, '#4ade80', 10, 3.6, 18);
            PartyAudio.play('jump');
          }
          continue;
        }

        if (obs.kind === 'boost') {
          if (p.y + footHh >= obs.y - 4 && !p.isAttacking) {
            p.isAttacking = true;
            p.attackTimer = 20;
            p.leanVx -= 3.2;
            this.spawnParticle(p.x, p.y + footHh, '#fbbf24', 6, 2.8, 14);
          }
          continue;
        }

        if (p.vy >= 0 && prevBottom <= obs.y + 12 && p.y + footHh >= obs.y) {
          p.y = obs.y - footHh;
          p.vy = 0;
          p.onGround = true;
          p.coyoteT = 7;
          p.jumpsLeft = 0;
        } else if (p.vy < 0 && prevTop >= obs.y + obs.h - 10 && p.y - headHh <= obs.y + obs.h) {
          p.y = obs.y + obs.h + headHh;
          p.vy = 0.5;
        }
      }

      if (!p.onGround) p.coyoteT = Math.max(0, p.coyoteT - 1);
      if (p.onGround && !prevOnGround && preLandVy > 3.2) {
        p.sq = Math.min(10, Math.round(preLandVy * 0.85));
        p.headVy += Math.min(5, preLandVy * 0.42);
      }

      // Check buzzsaw collision or chasm fall -> checkpoint respawn on nearest safe concrete floor
      let sawHit = false;
      if (p.invincible <= 0) {
        for (const obs of this.raceObstacles) {
          if (obs.kind !== 'saw') continue;
          const scx = obs.x + obs.w / 2;
          const scy = obs.y + obs.h / 2;
          const sr = obs.r ?? obs.w * 0.45;
          if (Math.hypot(p.raceX - scx, p.y - scy) < bodyHw + sr - 4) {
            sawHit = true;
            break;
          }
        }
      }

      if (sawHit || p.y > this.ch + 28) {
        let safeFloor = this.raceObstacles[0];
        for (const obs of this.raceObstacles) {
          if (obs.kind === 'floor' && obs.x <= p.raceX + 20) safeFloor = obs;
        }
        const respawnX = safeFloor
          ? Math.max(safeFloor.x + 28, Math.min(safeFloor.x + safeFloor.w - 34, p.raceX - 48))
          : Math.max(64, p.raceX - 80);
        const respawnY = (safeFloor ? safeFloor.y : this.ch - 78) - footHh - 4;
        this.spawnParticle(p.x, Math.min(this.ch - 20, p.y), sawHit ? '#f97316' : '#ef4444', 14, 4.2, 22);
        p.raceX = respawnX;
        p.y = respawnY;
        p.vx = 0;
        p.vy = 0;
        p.onGround = true;
        p.jumpsLeft = 0;
        p.invincible = 65;
        this.addPopup(p.raceX - this.raceOffset, Math.max(84, p.y - 26), sawHit ? 'MİŞAR!' : 'DİQQƏT!', '#fbbf24');
        PartyAudio.play('hit');
        this.triggerShake(4, 7);
      }

      if (p.attackTimer > 0 && --p.attackTimer <= 0) p.isAttacking = false;
      if (Math.hypot(p.vx, p.vy) > 2.4) {
        p.trail.push({ x: p.x, y: p.y, life: 8 });
        if (p.trail.length > 6) p.trail.shift();
      }
      p.trail = p.trail.filter((tr) => --tr.life > 0);
      this.updateMiniSprings(p, true);

      if (p.raceX > maxX) maxX = p.raceX;
    }

    this.raceOffset = Math.max(0, maxX - this.cw * 0.36);
    for (const p of this.players) {
      p.x = p.raceX - this.raceOffset;
    }

    for (const p of this.players) {
      if (p.alive && p.raceX >= this.raceFinishX) {
        p.score++;
        for (const col of ['#4ade80', '#38bdf8', '#fbbf24', '#f472b6']) {
          this.spawnParticle(p.x, p.y - 20, col, 8, 5, 34);
        }
        this.addPopup(p.x, p.y - 34, 'FİNİŞ!', '#4ade80');
        PartyAudio.play('coin');
        this.endRound();
        return;
      }
    }
  }

  private updateBomb() {
    const b = this.ball;
    if (!b) return;
    if (b.noPick > 0) b.noPick--;

    if (b.holder >= 0 && this.players[b.holder]?.alive) {
      const h = this.players[b.holder];
      b.x = h.x;
      b.y = h.y - h.radius - 13;
      b.fuse--;
      if (h.throwCd > 0) h.throwCd--;
      const inp = inputPlayers[h.index];
      if ((inp.action || inp.releaseAction) && h.throwCd <= 0) {
        h.throwCd = 24;
        b.holder = -1;
        b.lastKicker = h.index;
        b.noPick = 24;
        b.vx = Math.cos(h.angle) * 11.5;
        b.vy = Math.sin(h.angle) * 11.5;
        PartyAudio.play('shot');
      } else if (b.fuse <= 0) {
        this.explodeHotBomb(b.x, b.y);
      } else if (b.noPick <= 0) {
        // Close contact hand-off pass to bumped rival
        for (const p of this.players) {
          if (!p.alive || p.index === h.index) continue;
          if (Math.hypot(p.x - h.x, p.y - h.y) < h.radius + p.radius + 4) {
            b.holder = p.index;
            b.lastKicker = h.index;
            b.noPick = 26;
            this.addPopup(p.x, p.y - 26, 'BOMBA KEÇDİ!', '#f97316');
            this.spawnRing(p.x, p.y, 40, '#f97316', 14);
            PartyAudio.play('hit');
            break;
          }
        }
      }
    } else {
      b.holder = -1;
      b.vx *= 0.945;
      b.vy *= 0.945;
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < 20 || b.x > this.cw - 20) { b.vx *= -0.82; b.x = Math.max(20, Math.min(this.cw - 20, b.x)); }
      if (b.y < 52 || b.y > this.ch - 20) { b.vy *= -0.82; b.y = Math.max(52, Math.min(this.ch - 20, b.y)); }
      for (const pil of this.pillars) {
        const nearX = Math.max(pil.x, Math.min(pil.x + pil.w, b.x));
        const nearY = Math.max(pil.y, Math.min(pil.y + pil.h, b.y));
        const dx = b.x - nearX;
        const dy = b.y - nearY;
        const dist = Math.hypot(dx, dy);
        if (dist < b.radius && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x += nx * (b.radius - dist);
          b.y += ny * (b.radius - dist);
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx = (b.vx - 2 * dot * nx) * 0.85;
            b.vy = (b.vy - 2 * dot * ny) * 0.85;
          }
        }
      }
      b.fuse--;
      if (b.fuse <= 0) {
        this.explodeHotBomb(b.x, b.y);
        return;
      }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (p.index === b.lastKicker && b.noPick > 0) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < p.radius + b.radius) {
          b.holder = p.index;
          b.lastKicker = p.index;
          b.noPick = 22;
          b.vx = 0;
          b.vy = 0;
          this.spawnParticle(p.x, p.y - 20, '#f97316', 7, 3, 14);
          PartyAudio.play('hit');
          break;
        }
      }
    }
  }

  private explodeHotBomb(bx: number, by: number) {
    PartyAudio.play('boom');
    this.spawnParticle(bx, by, '#f97316', 34, 6.8, 34);
    this.spawnParticle(bx, by, '#fbbf24', 20, 4.8, 28);
    this.spawnRing(bx, by, 96, '#ef4444', 24);
    this.triggerShake(11, 16);
    for (const p of this.players) {
      if (!p.alive) continue;
      if (Math.hypot(p.x - bx, p.y - by) < 92) {
        p.hp = 0;
        this.killPlayer(p);
      }
    }
    if (this.ball) {
      const nextFuse = Math.max(4 * 60, (this.ball.maxFuse || 6 * 60) - 60);
      this.ball.holder = -1;
      this.ball.lastKicker = -1;
      this.ball.fuse = nextFuse;
      this.ball.maxFuse = nextFuse;
      this.ball.x = this.cw / 2;
      this.ball.y = this.ch / 2;
      this.ball.vx = 0;
      this.ball.vy = 0;
    }
  }

  private updateLaser() {
    this.gameTimer--;
    const elapsed = (this.gameTimerMax - this.gameTimer) / 60;
    if (--this.laserSpawnTimer <= 0) {
      const interval = Math.max(36, Math.round(88 - elapsed * 1.35));
      this.laserSpawnTimer = interval;
      const mode = Math.floor(Math.random() * 5);
      const cols = ['#ef4444', '#f43f5e', '#38bdf8', '#a855f7'];
      const warnT = Math.max(34, 54 - Math.floor(elapsed * 0.6));
      if (mode === 0) {
        const yy = 66 + Math.random() * (this.ch - 96);
        this.beams.push({ x1: 0, y1: yy, x2: this.cw, y2: yy, warn: warnT, active: 22, width: 11, color: cols[0] });
      } else if (mode === 1) {
        const xx = 42 + Math.random() * (this.cw - 84);
        this.beams.push({ x1: xx, y1: 44, x2: xx, y2: this.ch, warn: warnT, active: 22, width: 11, color: cols[1] });
      } else if (mode === 2) {
        const flip = Math.random() < 0.5;
        const off = (Math.random() - 0.5) * this.cw * 0.45;
        this.beams.push({
          x1: flip ? this.cw + off : off,
          y1: 44,
          x2: flip ? off : this.cw + off,
          y2: this.ch,
          warn: warnT,
          active: 22,
          width: 11,
          color: cols[2],
        });
      } else if (mode === 3) {
        // Double cross-X laser pattern!
        const cx = 140 + Math.random() * (this.cw - 280);
        const cy = 110 + Math.random() * (this.ch - 180);
        this.beams.push({ x1: cx - 420, y1: cy - 320, x2: cx + 420, y2: cy + 320, warn: warnT + 10, active: 22, width: 10, color: cols[3] });
        this.beams.push({ x1: cx + 420, y1: cy - 320, x2: cx - 420, y2: cy + 320, warn: warnT + 10, active: 22, width: 10, color: cols[3] });
      } else {
        // Twin-corridor pinch lasers
        const cy = 96 + Math.random() * (this.ch - 210);
        this.beams.push({ x1: 0, y1: cy - 42, x2: this.cw, y2: cy - 42, warn: warnT + 8, active: 22, width: 10, color: cols[0] });
        this.beams.push({ x1: 0, y1: cy + 42, x2: this.cw, y2: cy + 42, warn: warnT + 8, active: 22, width: 10, color: cols[2] });
      }
    }

    // Shield orb spawns
    if (++this.coinSpawnTimer >= 165 && this.coins.length < 2) {
      this.coinSpawnTimer = 0;
      this.coins.push({
        x: 64 + Math.random() * (this.cw - 128),
        y: 80 + Math.random() * (this.ch - 120),
        radius: 12,
        life: 360,
        diamond: true,
        kind: 'shield',
      });
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (--c.life <= 0) { this.coins.splice(i, 1); continue; }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.radius + c.radius) {
          p.shield = true;
          p.hp = Math.min(100, p.hp + 20);
          p.score++;
          this.addPopup(p.x, p.y - 24, 'QALXAN!', '#38bdf8');
          this.spawnParticle(c.x, c.y, '#38bdf8', 12, 3.6, 18);
          PartyAudio.play('coin');
          this.coins.splice(i, 1);
          break;
        }
      }
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      if (b.warn > 0) {
        b.warn--;
        if (b.warn === 0) {
          this.triggerShake(4, 6);
          PartyAudio.play('shot');
        }
        continue;
      }
      b.active--;
      for (const p of this.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (pointSegDist(p.x, p.y, b.x1, b.y1, b.x2, b.y2) < p.radius + b.width * 0.75) {
          if (p.shield) {
            p.shield = false;
            p.invincible = 34;
            this.spawnRing(p.x, p.y, 44, '#38bdf8', 18);
            this.addPopup(p.x, p.y - 24, 'BLOKLANDI!', '#38bdf8');
            PartyAudio.play('ice');
          } else {
            p.hp -= 38;
            p.invincible = 34;
            const rP = this.rigs[p.index];
            if (rP) applyRagdollImpulse(rP, (Math.random() - 0.5) * 9, -5.5, 12);
            this.hitStop = Math.max(this.hitStop, 2);
            this.spawnParticle(p.x, p.y, b.color, 16, 4.5, 20);
            this.triggerShake(6, 10);
            PartyAudio.play('hit');
            if (p.hp <= 0) this.killPlayer(p);
          }
        }
      }
      if (b.active <= 0) this.beams.splice(i, 1);
    }

    if (this.gameTimer <= 0) {
      for (const p of this.players) if (p.alive) p.score++;
      this.endRound();
    }
  }

  private generateLavaPlats(targetMinY: number) {
    const cw = this.cw;
    let tier = this.plats.length;
    while (this.highestPlatY > targetMinY) {
      const gap = 66 + Math.random() * 16;
      this.highestPlatY -= gap;
      const y = this.highestPlatY;
      const w = Math.max(114, 158 - Math.min(34, tier * 0.65));
      const slot = tier % 3;
      const moving = tier >= 2 && Math.random() < 0.42;
      const isSpring = !moving && tier >= 2 && Math.random() < 0.24;
      const isCrumble = !moving && !isSpring && tier >= 3 && Math.random() < 0.28;
      const kind: 'stone' | 'spring' | 'crumble' = isSpring ? 'spring' : isCrumble ? 'crumble' : 'stone';
      if (slot === 0) {
        const x = 36 + Math.random() * Math.max(20, cw * 0.34 - w * 0.5);
        this.plats.push({
          x,
          y,
          w,
          dx: moving ? (Math.random() < 0.5 ? 0.9 : -0.9) : 0,
          minX: 24,
          maxX: cw * 0.55,
          kind,
        });
      } else if (slot === 1) {
        const x = cw * 0.52 + Math.random() * Math.max(20, cw * 0.4 - w);
        this.plats.push({
          x: Math.min(cw - w - 24, x),
          y,
          w,
          dx: moving ? (Math.random() < 0.5 ? -0.95 : 0.95) : 0,
          minX: cw * 0.44,
          maxX: cw - 24,
          kind,
        });
      } else {
        const x = cw * 0.32 + Math.random() * Math.max(15, cw * 0.32 - w * 0.5);
        this.plats.push({
          x,
          y,
          w: w + 12,
          dx: moving ? 1.15 : 0,
          minX: cw * 0.16,
          maxX: cw * 0.84,
          kind,
        });
      }
      tier++;
    }
  }

  private updateLava() {
    this.lavaTick++;
    const alive = this.players.filter((p) => p.alive);
    if (alive.length > 0) {
      const minY = Math.min(...alive.map((p) => p.y));
      const targetCam = Math.min(this.lavaCamY, minY - this.ch * 0.42);
      this.lavaCamY += (targetCam - this.lavaCamY) * 0.12;
    }

    for (const pl of this.plats) {
      if (pl.kind === 'crumble' && pl.crumbleT !== undefined && pl.crumbleT > 0) {
        pl.crumbleT--;
        if (pl.crumbleT === 0) {
          this.spawnParticle(pl.x + pl.w / 2, pl.y + 6, '#fb923c', 12, 3.6, 20);
          PartyAudio.play('iceCrack');
        }
      }
    }

    this.generateLavaPlats(this.lavaCamY - 280);
    this.plats = this.plats.filter((pl) => pl.y < this.lavaY + 140 && (pl.crumbleT === undefined || pl.crumbleT > 0));

    if (this.lavaTick > 70) {
      this.lavaY -= 0.38;
      const maxFloor = this.lavaCamY + this.ch + 120;
      if (this.lavaY > maxFloor) this.lavaY = maxFloor;
    }

    if (this.lavaTick % 5 === 0) {
      this.particles.push({
        x: Math.random() * this.cw,
        y: this.lavaY + 4,
        vx: (Math.random() - 0.5) * 1.6,
        vy: -1.8 - Math.random() * 2.2,
        life: 24,
        maxLife: 24,
        color: Math.random() < 0.5 ? '#fde047' : '#f97316',
        radius: 2 + Math.random() * 2.5,
      });
    }

    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.y + p.radius * 0.6 > this.lavaY || p.y > this.lavaCamY + this.ch + 45) {
        this.spawnParticle(p.x, Math.min(p.y, this.lavaY), '#f97316', 18, 5, 26);
        PartyAudio.play('boom');
        this.killPlayer(p);
      }
    }
  }


  private drawMiniHeader(ctx: CanvasRenderingContext2D, text: string, ratio?: number, minW = 152) {
    ctx.save();
    ctx.font = '700 13px "JetBrains Mono", monospace';
    const textW = ctx.measureText(text).width;
    const boxW = Math.min(this.cw - 140, Math.max(minW, textW + 28));
    ctx.fillStyle = 'rgba(9,9,11,0.88)';
    roundRectPath(ctx, this.cw / 2 - boxW / 2, 10, boxW, 26, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#f4f4f5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.cw / 2, 23);
    if (ratio !== undefined) {
      const bw = Math.min(boxW, Math.max(160, this.cw * 0.34));
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(this.cw / 2 - bw / 2, 40, bw, 4);
      ctx.fillStyle = ratio > 0.25 ? '#4ade80' : '#ef4444';
      ctx.fillRect(this.cw / 2 - bw / 2, 40, bw * Math.max(0, Math.min(1, ratio)), 4);
    }
    ctx.restore();
  }

  private drawZombie(ctx: CanvasRenderingContext2D, z: ZombieEntity) {
    ctx.save();
    ctx.translate(z.x, z.y);
    const sc = z.kind === 3 ? 1.82 : z.kind === 2 ? 1.38 : z.kind === 1 ? 0.94 : 1.04;
    ctx.scale(sc, sc);

    const isBoss = z.kind === 3;
    const bodyCol = z.hitFlash > 0
      ? '#ffffff'
      : isBoss
        ? '#dc2626'
        : z.kind === 2
          ? '#9333ea'
          : z.kind === 1
            ? '#a3e635'
            : '#4d7c0f';
    const sporeCol = z.hitFlash > 0 ? '#ffffff' : isBoss ? '#fca5a5' : z.kind === 2 ? '#d8b4fe' : '#bef264';
    const faceDir = z.vx >= 0 ? 1 : -1;
    const stride = Math.sin(z.phase);
    const bob = -Math.abs(Math.cos(z.phase)) * 2.4;

    if (isBoss) {
      const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, 30);
      aura.addColorStop(0, 'rgba(239,68,68,0.34)');
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.beginPath(); ctx.ellipse(0, 18, 10, 3.2, 0, 0, Math.PI * 2); ctx.fill();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [hx, fx] of [[-2, -4 + stride * 7], [2, 4 - stride * 7]] as [number, number][]) {
      ctx.beginPath(); ctx.moveTo(hx, 6 + bob); ctx.lineTo(fx, 18);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 6.2; ctx.stroke();
      ctx.strokeStyle = bodyCol; ctx.lineWidth = 4.4; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, 6 + bob); ctx.lineTo(faceDir * 3.5, -9 + bob);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = isBoss ? 9.2 : 7.6; ctx.stroke();
    ctx.strokeStyle = bodyCol; ctx.lineWidth = isBoss ? 7.0 : 5.6; ctx.stroke();

    if (isBoss) {
      // Dorsal spikes on Boss Zombie back
      ctx.fillStyle = '#7f1d1d';
      for (const sy of [-6, -1, 4]) {
        ctx.beginPath();
        ctx.moveTo(-faceDir * 2, sy + bob);
        ctx.lineTo(-faceDir * 9, sy - 3 + bob);
        ctx.lineTo(-faceDir * 2, sy + 3 + bob);
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.moveTo(faceDir * 2, -6 + bob);
    ctx.lineTo(faceDir * 14, -4 + bob + stride * 2.2);
    ctx.moveTo(faceDir * 1, -4 + bob);
    ctx.lineTo(faceDir * 13, 0 + bob - stride * 2.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 5.2; ctx.stroke();
    ctx.strokeStyle = bodyCol; ctx.lineWidth = 3.6; ctx.stroke();

    // Fungal / Clicker-like head ridge + glowing eyes
    ctx.beginPath(); ctx.arc(faceDir * 4, -17 + bob, isBoss ? 9.2 : 8.2, 0, Math.PI * 2);
    ctx.fillStyle = bodyCol; ctx.fill();
    ctx.strokeStyle = isBoss ? '#450a0a' : 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.6; ctx.stroke();

    ctx.fillStyle = sporeCol;
    ctx.beginPath(); ctx.arc(faceDir * 1.5, -23 + bob, isBoss ? 4.0 : 3.2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = isBoss ? '#fef08a' : z.kind === 2 ? '#fef08a' : '#f97316';
    ctx.beginPath(); ctx.arc(faceDir * 6.8, -18 + bob, isBoss ? 2.5 : 2.0, 0, Math.PI * 2); ctx.fill();

    if (z.hp < z.maxHp || z.kind >= 2) {
      const bw = isBoss ? 44 : z.kind === 2 ? 32 : 22;
      const ratio = Math.max(0, Math.min(1, z.hp / z.maxHp));
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(-bw / 2, -33 + bob, bw, 4);
      ctx.fillStyle = isBoss ? '#ef4444' : z.kind === 2 ? '#c084fc' : '#84cc16';
      ctx.fillRect(-bw / 2, -33 + bob, bw * ratio, 4);
      if (isBoss) {
        ctx.fillStyle = '#fecaca';
        ctx.font = '800 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', 0, -37 + bob);
      }
    }
    ctx.restore();
  }

  private drawPickups(ctx: CanvasRenderingContext2D) {
    const now = Date.now() * 0.006;
    for (const c of this.coins) {
      const pulse = 1 + Math.sin(now + c.x) * 0.1;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(pulse, pulse);
      const col =
        c.kind === 'medkit' || c.kind === 'repair' ? '#4ade80' :
        c.kind === 'shotgun' || c.kind === 'power' ? '#fbbf24' :
        c.kind === 'grenade' ? '#f97316' :
        c.kind === 'paintbomb' ? '#f472b6' :
        '#38bdf8';
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#09090b';
      roundRectPath(ctx, -12, -12, 24, 24, 6);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (c.kind === 'grenade') {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.arc(0, 2, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(-2.5, -6, 5, 3);
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(3.5, -6.5, 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = col;
        ctx.font = '800 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label =
          c.kind === 'medkit' ? '+' :
          c.kind === 'repair' ? '✚' :
          c.kind === 'shotgun' ? '3X' :
          c.kind === 'rapid' ? '⚡' :
          c.kind === 'power' || c.kind === 'paintbomb' ? '★' :
          '◈';
        ctx.fillText(label, 0, 0.5);
      }
      ctx.restore();
    }
  }

  private drawPillars(ctx: CanvasRenderingContext2D, accent: string, style: 'tomb' | 'cover' | 'dojo') {
    for (const pil of this.pillars) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      roundRectPath(ctx, pil.x + 4, pil.y + 6, pil.w, pil.h, 6);
      ctx.fill();

      if (style === 'dojo') {
        // Ornate Japanese crimson-lacquer wooden dojo column with gold hardware bands
        const pg = ctx.createLinearGradient(pil.x, pil.y, pil.x + pil.w, pil.y + pil.h);
        pg.addColorStop(0, '#7f1d1d');
        pg.addColorStop(0.5, '#450a0a');
        pg.addColorStop(1, '#1f0608');
        ctx.fillStyle = pg;
        roundRectPath(ctx, pil.x, pil.y, pil.w, pil.h, 7);
        ctx.fill();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gold ornamental inner square + center crest
        ctx.strokeStyle = 'rgba(253,224,71,0.45)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(pil.x + 6, pil.y + 6, pil.w - 12, pil.h - 12);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(pil.x + pil.w / 2, pil.y + pil.h / 2, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      const pg = ctx.createLinearGradient(pil.x, pil.y, pil.x, pil.y + pil.h);
      pg.addColorStop(0, '#3f3f46');
      pg.addColorStop(1, '#18181b');
      ctx.fillStyle = pg;
      roundRectPath(ctx, pil.x, pil.y, pil.w, pil.h, 6);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (style === 'tomb') {
        ctx.strokeStyle = 'rgba(74,222,128,0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pil.x + pil.w / 2, pil.y + 10);
        ctx.lineTo(pil.x + pil.w / 2, pil.y + pil.h - 10);
        ctx.moveTo(pil.x + 12, pil.y + pil.h * 0.42);
        ctx.lineTo(pil.x + pil.w - 12, pil.y + pil.h * 0.42);
        ctx.stroke();
      } else {
        ctx.fillStyle = accent;
        ctx.fillRect(pil.x + 4, pil.y + 4, pil.w - 8, 4);
      }
      ctx.restore();
    }
  }

  private drawZombieSky(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#090d0c');
    g.addColorStop(0.46, '#18211b');
    g.addColorStop(0.78, '#291c15');
    g.addColorStop(1, '#141110');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);

    // Smoky orange fire horizon haze
    const haze = ctx.createRadialGradient(cw * 0.5, ch * 0.72, 20, cw * 0.5, ch * 0.72, cw * 0.75);
    haze.addColorStop(0, 'rgba(249,115,22,0.16)');
    haze.addColorStop(0.55, 'rgba(180,83,9,0.08)');
    haze.addColorStop(1, 'transparent');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, cw, ch);
  }

  private drawZombieWorld(ctx: CanvasRenderingContext2D) {
    const gy = this.zGroundY;
    const nowT = this.miniTick * 0.08;

    // Layer 0 (Far ruined skyline) & Layer 1 (Near ruined & burning TLOU buildings)
    for (const layer of [0, 1] as const) {
      const parallax = layer === 0 ? 0.45 : 0.2;
      const shiftX = (this.zCamX - this.zWorldW * 0.5) * parallax;
      for (const b of this.zBuildings) {
        if (b.layer !== layer) continue;
        const bx = b.x + shiftX;
        const by = gy - b.h;
        ctx.save();
        ctx.fillStyle = layer === 0 ? '#111613' : '#1b201b';
        ctx.beginPath();
        ctx.moveTo(bx, gy);
        ctx.lineTo(bx, by + b.broken * 0.5);
        ctx.lineTo(bx + b.w * 0.32, by);
        ctx.lineTo(bx + b.w * 0.66, by + b.broken);
        ctx.lineTo(bx + b.w, by + 12);
        ctx.lineTo(bx + b.w, gy);
        ctx.closePath();
        ctx.fill();

        // Shattered windows & burning rooms
        const cols = Math.max(2, Math.floor((b.w - 20) / 26));
        const rows = Math.max(3, Math.floor((b.h - 32) / 34));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = bx + 12 + c * 26;
            const wy = by + 34 + r * 34;
            if (wy > gy - 26) continue;
            const winCode = (b.seed * 7 + r * 11 + c * 5) % 9;
            const burningWin = b.fire && ((r === 1 && c === 1) || (r === 2 && c === cols - 2) || winCode === 2);
            if (burningWin) {
              const flk = 0.72 + Math.sin(nowT * 2.2 + b.seed + r * 3 + c) * 0.28;
              ctx.fillStyle = `rgba(251,146,60,${0.7 * flk})`;
              ctx.fillRect(wx, wy, 14, 18);
              // Animated flame tongues
              ctx.fillStyle = `rgba(239,68,68,${0.88 * flk})`;
              ctx.beginPath();
              ctx.moveTo(wx + 1, wy + 18);
              ctx.lineTo(wx + 5, wy + 4 - flk * 6);
              ctx.lineTo(wx + 9, wy + 12);
              ctx.lineTo(wx + 13, wy + 3 - flk * 5);
              ctx.lineTo(wx + 14, wy + 18);
              ctx.fill();
              ctx.fillStyle = `rgba(253,224,71,${0.85 * flk})`;
              ctx.beginPath();
              ctx.arc(wx + 7, wy + 14, 4.5 * flk, 0, Math.PI * 2);
              ctx.fill();
            } else if (winCode > 2) {
              ctx.fillStyle = layer === 0 ? 'rgba(0,0,0,0.45)' : 'rgba(6,9,8,0.72)';
              ctx.fillRect(wx, wy, 14, 18);
            }
          }
        }

        // Rooftop fire & smoke glow on burning buildings
        if (b.fire && layer === 1) {
          const fx = bx + b.w * 0.5;
          const fy = by + b.broken * 0.55;
          const flk = 0.8 + Math.sin(nowT * 2.8 + b.seed) * 0.22;
          const fg = ctx.createRadialGradient(fx, fy, 4, fx, fy, 68 * flk);
          fg.addColorStop(0, 'rgba(251,146,60,0.42)');
          fg.addColorStop(0.6, 'rgba(239,68,68,0.16)');
          fg.addColorStop(1, 'transparent');
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(fx, fy, 68 * flk, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(fx - 18, fy + 8);
          ctx.lineTo(fx - 8, fy - 20 * flk);
          ctx.lineTo(fx, fy - 4);
          ctx.lineTo(fx + 10, fy - 26 * flk);
          ctx.lineTo(fx + 19, fy + 8);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.moveTo(fx - 9, fy + 8);
          ctx.lineTo(fx, fy - 14 * flk);
          ctx.lineTo(fx + 9, fy + 8);
          ctx.fill();
        }

        // TLOU Overgrown moss patches & hanging vines on building facades
        if (layer === 1) {
          ctx.fillStyle = 'rgba(77,124,15,0.42)';
          ctx.fillRect(bx, gy - 42 * b.moss, b.w * 0.48, 42 * b.moss);
          ctx.strokeStyle = 'rgba(101,163,13,0.45)';
          ctx.lineWidth = 2;
          for (let v = 0; v < 3; v++) {
            const vx = bx + 18 + v * (b.w * 0.3);
            const vyTop = by + 28 + v * 12;
            const sway = Math.sin(nowT * 0.6 + v + b.seed) * 4;
            ctx.beginPath();
            ctx.moveTo(vx, vyTop);
            ctx.quadraticCurveTo(vx + sway, vyTop + 34, vx + sway * 0.5, vyTop + 64);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    // Drifting fire embers & ash across the city
    for (const em of this.zEmbers) {
      ctx.fillStyle = `rgba(251,146,60,${em.a})`;
      ctx.beginPath();
      ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ruined Street Asphalt & Foundation
    const roadGrad = ctx.createLinearGradient(0, gy, 0, gy + 160);
    roadGrad.addColorStop(0, '#272a27');
    roadGrad.addColorStop(0.28, '#171917');
    roadGrad.addColorStop(1, '#090a09');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(-120, gy, this.zWorldW + 240, 320);

    // Mossy sidewalk curb + cracked road lane markings
    ctx.fillStyle = '#3f6212';
    ctx.fillRect(-120, gy, this.zWorldW + 240, 4);
    ctx.fillStyle = 'rgba(250,204,21,0.34)';
    for (let rx = 20; rx < this.zWorldW; rx += 92) {
      ctx.fillRect(rx, gy + 16, 46, 4);
    }

    // World edge barricades
    for (const ex of [0, this.zWorldW - 14]) {
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(ex, gy - 110, 14, 110);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(ex + 2, gy - 102, 10, 16);
      ctx.fillRect(ex + 2, gy - 68, 10, 16);
    }

    // Cars, Buses, Bridges & Supply Crates
    for (const zp of this.zPlats) {
      ctx.save();
      if (zp.kind === 'car') {
        // Rusted abandoned sedan/SUV
        ctx.fillStyle = zp.color || '#4d5d4e';
        roundRectPath(ctx, zp.x, zp.y + 16, zp.w, zp.h - 24, 5);
        ctx.fill();
        roundRectPath(ctx, zp.x + zp.w * 0.22, zp.y, zp.w * 0.52, 20, 5);
        ctx.fill();
        // Shattered dark windows
        ctx.fillStyle = '#0f172a';
        roundRectPath(ctx, zp.x + zp.w * 0.27, zp.y + 4, zp.w * 0.19, 12, 2);
        ctx.fill();
        roundRectPath(ctx, zp.x + zp.w * 0.5, zp.y + 4, zp.w * 0.19, 12, 2);
        ctx.fill();
        // Mossy roof tint & rust streak
        ctx.fillStyle = 'rgba(101,163,13,0.45)';
        ctx.fillRect(zp.x + zp.w * 0.26, zp.y, zp.w * 0.44, 3);
        // Flat wheels
        ctx.fillStyle = '#09090b';
        for (const wx of [zp.x + 24, zp.x + zp.w - 24]) {
          ctx.beginPath(); ctx.arc(wx, zp.y + zp.h - 9, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#52525b';
          ctx.beginPath(); ctx.arc(wx, zp.y + zp.h - 9, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#09090b';
        }
      } else if (zp.kind === 'bus') {
        // Abandoned weathered transit bus
        ctx.fillStyle = zp.color || '#85642d';
        roundRectPath(ctx, zp.x, zp.y, zp.w, zp.h - 12, 7);
        ctx.fill();
        ctx.fillStyle = '#18181b';
        for (let wx = zp.x + 16; wx < zp.x + zp.w - 24; wx += 30) {
          roundRectPath(ctx, wx, zp.y + 10, 22, 18, 3);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(101,163,13,0.48)';
        ctx.fillRect(zp.x + 8, zp.y, zp.w - 16, 4);
        ctx.fillStyle = '#09090b';
        for (const wx of [zp.x + 34, zp.x + zp.w - 34]) {
          ctx.beginPath(); ctx.arc(wx, zp.y + zp.h - 11, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#52525b';
          ctx.beginPath(); ctx.arc(wx, zp.y + zp.h - 11, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#09090b';
        }
      } else if (zp.kind === 'crate') {
        ctx.fillStyle = '#451a03';
        roundRectPath(ctx, zp.x, zp.y, zp.w, zp.h, 4);
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(zp.x + 4, zp.y + 4); ctx.lineTo(zp.x + zp.w - 4, zp.y + zp.h - 4);
        ctx.moveTo(zp.x + zp.w - 4, zp.y + 4); ctx.lineTo(zp.x + 4, zp.y + zp.h - 4);
        ctx.stroke();
      } else {
        // Broken concrete overpass / balcony slab with moss & hanging vines
        ctx.fillStyle = '#27272a';
        roundRectPath(ctx, zp.x, zp.y, zp.w, zp.h, 3);
        ctx.fill();
        ctx.fillStyle = '#4d7c0f';
        ctx.fillRect(zp.x + 2, zp.y, zp.w - 4, 4);
        ctx.strokeStyle = 'rgba(101,163,13,0.55)';
        ctx.lineWidth = 1.6;
        for (let vx = zp.x + 20; vx < zp.x + zp.w - 16; vx += 48) {
          ctx.beginPath();
          ctx.moveTo(vx, zp.y + zp.h);
          ctx.lineTo(vx + Math.sin(nowT + vx) * 3, zp.y + zp.h + 18 + (vx % 14));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    this.drawPickups(ctx);

    // Explosive Red Gasoline Barrels across the ruined street
    for (const br of this.zBarrels) {
      if (br.hp <= 0) continue;
      ctx.save();
      ctx.translate(br.x, br.y);
      const hw = 11;
      const hh = 16;
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath(); ctx.ellipse(0, hh + 1, hw + 2, 3.5, 0, 0, Math.PI * 2); ctx.fill();

      const bg = ctx.createLinearGradient(-hw, 0, hw, 0);
      bg.addColorStop(0, '#991b1b');
      bg.addColorStop(0.32, '#ef4444');
      bg.addColorStop(0.75, '#dc2626');
      bg.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = bg;
      roundRectPath(ctx, -hw, -hh, hw * 2, hh * 2, 3);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(-hw + 3, -hh + 2, 3.5, hh * 2 - 4);
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(-hw - 1, -hh + 5, hw * 2 + 2, 3);
      ctx.fillRect(-hw - 1, hh - 8, hw * 2 + 2, 3);

      // Hazard diamond
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5.5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-0.9, -2.6, 1.8, 3.2);
      ctx.fillRect(-0.9, 1.4, 1.8, 1.4);

      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 1.2;
      roundRectPath(ctx, -hw, -hh, hw * 2, hh * 2, 3);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawFactorySaw(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
    ctx.save();
    ctx.translate(x, y);

    // Warm golden ambient buzzsaw rim glow (matches factory Parkur aesthetic)
    const aura = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r + 15);
    aura.addColorStop(0, 'rgba(251,191,36,0.34)');
    aura.addColorStop(0.6, 'rgba(245,158,11,0.16)');
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, r + 15, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(rot);

    // Curved steel teeth
    const teeth = 18;
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    for (let t = 0; t < teeth; t++) {
      const a1 = (t / teeth) * Math.PI * 2;
      const aMid = ((t + 0.35) / teeth) * Math.PI * 2;
      const a2 = ((t + 0.65) / teeth) * Math.PI * 2;
      if (t === 0) ctx.moveTo(Math.cos(a1) * (r - 2), Math.sin(a1) * (r - 2));
      else ctx.lineTo(Math.cos(a1) * (r - 2), Math.sin(a1) * (r - 2));
      ctx.lineTo(Math.cos(aMid) * (r + 5.5), Math.sin(aMid) * (r + 5.5));
      ctx.lineTo(Math.cos(a2) * (r - 2), Math.sin(a2) * (r - 2));
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Brushed radial steel disc
    const disc = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 2, 0, 0, r - 1);
    disc.addColorStop(0, '#f1f5f9');
    disc.addColorStop(0.45, '#94a3b8');
    disc.addColorStop(0.85, '#334155');
    disc.addColorStop(1, '#1e293b');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2); ctx.fill();

    // Golden friction edge ring
    ctx.strokeStyle = 'rgba(251,191,36,0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2); ctx.stroke();

    // Inner bevel + dark bolted center hub
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.54, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#09090b';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  private drawMap(ctx: CanvasRenderingContext2D) {
    const cw = this.cw;
    const ch = this.ch;
    const nowT = Date.now() * 0.002;

    if (this.currentMinigame === 'zombie') {
      this.drawZombieSky(ctx, cw, ch);
    } else if (this.currentMinigame === 'samurai') {
      // Feudal Kyoto Shrine Courtyard & Crimson Blood Moon Dojo
      const g = ctx.createRadialGradient(cw / 2, ch * 0.46, 30, cw / 2, ch * 0.5, Math.max(cw, ch) * 0.72);
      g.addColorStop(0, '#2a131c');
      g.addColorStop(0.55, '#170c14');
      g.addColorStop(1, '#0a0508');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      // Large glowing Crimson Full Moon backdrop reflection
      const moonR = Math.min(cw, ch) * 0.19;
      const moonGlow = ctx.createRadialGradient(cw / 2, ch * 0.46, moonR * 0.25, cw / 2, ch * 0.46, moonR * 2.4);
      moonGlow.addColorStop(0, 'rgba(251,113,133,0.42)');
      moonGlow.addColorStop(0.42, 'rgba(225,29,72,0.16)');
      moonGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = moonGlow;
      ctx.beginPath(); ctx.arc(cw / 2, ch * 0.46, moonR * 2.4, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(253,164,175,0.22)';
      ctx.beginPath(); ctx.arc(cw / 2, ch * 0.46, moonR, 0, Math.PI * 2); ctx.fill();

      // Distant Japanese Torii gate silhouette & pagoda roofline at top courtyard wall
      ctx.fillStyle = 'rgba(9,6,10,0.68)';
      ctx.fillRect(cw * 0.5 - 78, 50, 156, 8);
      ctx.fillRect(cw * 0.5 - 64, 64, 128, 6);
      ctx.fillRect(cw * 0.5 - 50, 56, 10, 44);
      ctx.fillRect(cw * 0.5 + 40, 56, 10, 44);

      // Rich Dojo Tatami & Dark Cedar Wood Floor Grid
      ctx.strokeStyle = 'rgba(251,191,36,0.055)';
      ctx.lineWidth = 1;
      for (let py = 54; py < ch; py += 44) {
        ctx.beginPath(); ctx.moveTo(14, py); ctx.lineTo(cw - 14, py); ctx.stroke();
      }
      for (let px = 48; px < cw - 24; px += 76) {
        ctx.beginPath(); ctx.moveTo(px, 50); ctx.lineTo(px, ch - 12); ctx.stroke();
      }

      // Ornate Dojo Combat Circle Crest
      ctx.strokeStyle = 'rgba(251,191,36,0.22)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cw / 2, ch * 0.52, Math.min(cw, ch) * 0.24, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(251,113,133,0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cw / 2, ch * 0.52, Math.min(cw, ch) * 0.21, 0, Math.PI * 2); ctx.stroke();

      // Double Lacquered Dojo Frame Border
      ctx.strokeStyle = 'rgba(190,18,60,0.52)';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 48, cw - 20, ch - 58);
      ctx.strokeStyle = 'rgba(251,191,36,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, 54, cw - 32, ch - 70);

      // Swaying silhouetted bamboo clusters at edges
      ctx.strokeStyle = 'rgba(5,5,7,0.72)';
      ctx.lineWidth = 5;
      for (const bx of [26, 42, cw - 42, cw - 26]) {
        const sway = Math.sin(nowT + bx) * 4;
        ctx.beginPath();
        ctx.moveTo(bx, ch);
        ctx.quadraticCurveTo(bx + sway, ch * 0.5, bx + sway * 1.4, 48);
        ctx.stroke();
      }

      // 4 Ornate Glowing Stone Toro Courtyard Lanterns with warm floor light pools
      for (const [lx, ly] of [[38, 76], [cw - 38, 76], [38, ch - 32], [cw - 38, ch - 32]]) {
        const flick = 0.92 + Math.sin(nowT * 2.2 + lx) * 0.08;
        const lg = ctx.createRadialGradient(lx, ly, 4, lx, ly, 92 * flick);
        lg.addColorStop(0, 'rgba(251,146,60,0.42)');
        lg.addColorStop(0.5, 'rgba(244,63,94,0.14)');
        lg.addColorStop(1, 'transparent');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(lx, ly, 92 * flick, 0, Math.PI * 2); ctx.fill();

        // Stone lantern pedestal & sloped roof
        ctx.fillStyle = '#27272a';
        roundRectPath(ctx, lx - 10, ly - 10, 20, 20, 3);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.fillRect(lx - 5, ly - 5, 10, 10);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(lx - 2.5, ly - 2.5, 5, 5);
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.moveTo(lx - 14, ly - 9);
        ctx.lineTo(lx, ly - 17);
        ctx.lineTo(lx + 14, ly - 9);
        ctx.closePath();
        ctx.fill();
      }

      this.drawPillars(ctx, '#fbbf24', 'dojo');

      // Two-layer glowing drifting Sakura petals
      for (let i = 0; i < this.sakuraPetals.length; i++) {
        const sk = this.sakuraPetals[i];
        ctx.fillStyle = i % 3 === 0 ? 'rgba(251,113,133,0.72)' : 'rgba(251,207,232,0.68)';
        ctx.beginPath();
        ctx.ellipse(sk.x, sk.y, sk.r * 1.15, sk.r * 0.58, nowT + sk.x * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      this.drawMiniHeader(ctx, 'SAMURAY DUELLOSU');
    } else if (this.currentMinigame === 'sniper') {
      // Moody dark concrete warehouse backdrop
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, '#10141b');
      g.addColorStop(0.55, '#171c25');
      g.addColorStop(1, '#0b0e13');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      // Subtle concrete wall panels + vertical seams & overhead steel catwalk truss
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      for (let gx = 80; gx < cw; gx += 120) {
        ctx.beginPath(); ctx.moveTo(gx, 48); ctx.lineTo(gx, ch); ctx.stroke();
      }
      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(0, 44, cw, 16);
      ctx.strokeStyle = '#1f2630';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let tx = 0; tx < cw; tx += 44) {
        ctx.moveTo(tx, 46); ctx.lineTo(tx + 22, 62); ctx.lineTo(tx + 44, 46);
      }
      ctx.stroke();

      // Left-wall electrical conduits & junction box silhouette
      ctx.fillStyle = '#0d1118';
      ctx.fillRect(22, 56, 6, ch * 0.6);
      ctx.fillRect(36, 56, 4, ch * 0.48);
      ctx.fillRect(18, 128, 28, 38);

      // Soft angled warehouse dust/light beams from ceiling rafters
      for (const [lx, angle] of [[cw * 0.22, 0.35], [cw * 0.68, -0.32]]) {
        ctx.save();
        ctx.translate(lx, 46);
        ctx.rotate(angle);
        const beam = ctx.createLinearGradient(0, 0, 0, ch * 0.85);
        beam.addColorStop(0, 'rgba(203,213,225,0.08)');
        beam.addColorStop(1, 'transparent');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(28, 0);
        ctx.lineTo(130, ch * 0.85);
        ctx.lineTo(-130, ch * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Perimeter concrete lip
      ctx.strokeStyle = 'rgba(148,163,184,0.14)';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 48, cw - 20, ch - 58);

      // Textured concrete warehouse cover pillars (dark slate blocks with subtle weathering)
      for (const pil of this.pillars) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.58)';
        roundRectPath(ctx, pil.x + 5, pil.y + 7, pil.w, pil.h, 3);
        ctx.fill();

        const pg = ctx.createLinearGradient(pil.x, pil.y, pil.x + pil.w, pil.y + pil.h);
        pg.addColorStop(0, '#363b45');
        pg.addColorStop(0.5, '#242931');
        pg.addColorStop(1, '#13161b');
        ctx.fillStyle = pg;
        roundRectPath(ctx, pil.x, pil.y, pil.w, pil.h, 3);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(pil.x + 1, pil.y + 1, pil.w - 2, 3);
        ctx.strokeStyle = '#090b0e';
        ctx.lineWidth = 1.6;
        roundRectPath(ctx, pil.x, pil.y, pil.w, pil.h, 3);
        ctx.stroke();

        // Subtle surface fracture crack
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pil.x + pil.w * 0.25, pil.y + pil.h * 0.25);
        ctx.lineTo(pil.x + pil.w * 0.48, pil.y + pil.h * 0.42);
        ctx.lineTo(pil.x + pil.w * 0.36, pil.y + pil.h * 0.65);
        ctx.stroke();
        ctx.restore();
      }

      // Crisp Crimson Sniper Laser Sights + Bounce Impact Flares!
      for (const p of this.players) {
        if (!p.alive) continue;
        const startX = p.x + Math.cos(p.angle) * 22;
        const startY = p.y - 6 + Math.sin(p.angle) * 22;
        const pts = this.raycastBouncePath(startX, startY, p.angle, 920, 2);

        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(239,68,68,0.65)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        pts.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        pts.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();

        // Ricochet bounce spark flares on pillars/walls
        for (let i = 1; i < pts.length; i++) {
          const bpt = pts[i];
          const isFinal = i === pts.length - 1;
          const fg = ctx.createRadialGradient(bpt.x, bpt.y, 1, bpt.x, bpt.y, isFinal ? 8 : 13);
          fg.addColorStop(0, 'rgba(254,202,202,0.95)');
          fg.addColorStop(0.35, 'rgba(239,68,68,0.7)');
          fg.addColorStop(1, 'transparent');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(bpt.x, bpt.y, isFinal ? 8 : 13, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      this.drawMiniHeader(ctx, 'SNAYPER DUELLOSU');
    } else if (this.currentMinigame === 'blades') {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, 30, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
      g.addColorStop(0, '#231618');
      g.addColorStop(0.65, '#130e10');
      g.addColorStop(1, '#08080a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      // Rotating sub-floor industrial exhaust turbine + steel grating
      ctx.save();
      ctx.translate(cw / 2, (ch + 44) / 2);
      ctx.rotate(nowT * 0.8);
      ctx.fillStyle = 'rgba(245,158,11,0.06)';
      for (let b = 0; b < 6; b++) {
        ctx.rotate(Math.PI / 3);
        ctx.fillRect(-14, -Math.min(cw, ch) * 0.36, 28, Math.min(cw, ch) * 0.72);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let gx = 16; gx < cw - 16; gx += 32) {
        ctx.beginPath(); ctx.moveTo(gx, 48); ctx.lineTo(gx, ch - 10); ctx.stroke();
      }

      // Caution industrial border & steel cover pillars
      ctx.strokeStyle = 'rgba(245,158,11,0.34)';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 48, cw - 20, ch - 58);

      this.drawPillars(ctx, '#f59e0b', 'cover');
      this.drawPickups(ctx);

      // Spinning industrial factory buzzsaws
      for (const s of this.saws) {
        this.drawFactorySaw(ctx, s.x, s.y, s.r, s.rot);
      }
      this.drawMiniHeader(ctx, 'MİŞAR ARENASI');
    } else if (this.currentMinigame === 'sumo') {
      const cx = cw / 2;
      const cy = ch / 2;
      const maxR = Math.min(cw, ch) * 0.37;
      const r = maxR * this.ringScale;
      const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, Math.max(cw, ch) * 0.78);
      g.addColorStop(0, '#2a1d12');
      g.addColorStop(0.55, '#130f12');
      g.addColorStop(1, '#09090b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      // Slatted wooden dojo hall floor beneath dohyo platform
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let py = 48; py < ch; py += 28) {
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cw, py); ctx.stroke();
      }

      // Crimson silk corner banners + hanging warm lanterns
      for (const [lx, ly] of [[42, 54], [cw - 42, 54], [42, ch - 36], [cw - 42, ch - 36]]) {
        const lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 75);
        lg.addColorStop(0, 'rgba(251,146,60,0.34)');
        lg.addColorStop(1, 'transparent');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(lx, ly, 75, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(lx - 12, ly - 10, 24, 20);
        ctx.fillStyle = '#fb923c';
        ctx.beginPath(); ctx.arc(lx, ly, 5.5, 0, Math.PI * 2); ctx.fill();
      }

      if (this.ringScale < 0.99) {
        ctx.strokeStyle = 'rgba(239,68,68,0.22)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = '#1c1510';
      ctx.beginPath(); ctx.arc(cx, cy + 10, r + 16, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.shadowColor = this.ringScale < 0.7 ? '#ef4444' : '#f59e0b';
      ctx.shadowBlur = 30;
      const rg = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
      rg.addColorStop(0, '#78552f');
      rg.addColorStop(0.75, '#473019');
      rg.addColorStop(1, '#26180c');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.25, cy); ctx.lineTo(cx + r * 0.25, cy);
      ctx.moveTo(cx, cy - r * 0.25); ctx.lineTo(cx, cy + r * 0.25);
      ctx.stroke();

      ctx.strokeStyle = this.ringScale < 0.72 ? '#ef4444' : '#fbbf24';
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 9]);
      ctx.lineDashOffset = -nowT * 14;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (this.ringScale < 0.72) {
        ctx.strokeStyle = `rgba(239,68,68,${0.25 + 0.2 * Math.sin(nowT * 6)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r + 9, 0, Math.PI * 2); ctx.stroke();
      }
      this.drawPickups(ctx);
    } else if (this.currentMinigame === 'futbol') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, cw, ch);
      const g = ctx.createLinearGradient(0, 44, 0, ch);
      g.addColorStop(0, '#166534');
      g.addColorStop(0.5, '#15803d');
      g.addColorStop(1, '#0c4321');
      ctx.fillStyle = g;
      ctx.fillRect(0, 44, cw, ch - 44);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      for (let x = 0; x < cw; x += 80) ctx.fillRect(x, 44, 40, ch - 44);

      // Stadium floodlight glares in 4 corners
      for (const [fx, fy] of [[24, 54], [cw - 24, 54], [24, ch - 12], [cw - 24, ch - 12]]) {
        const fl = ctx.createRadialGradient(fx, fy, 4, fx, fy, 160);
        fl.addColorStop(0, 'rgba(255,255,255,0.16)');
        fl.addColorStop(1, 'transparent');
        ctx.fillStyle = fl;
        ctx.beginPath(); ctx.arc(fx, fy, 160, 0, Math.PI * 2); ctx.fill();
      }

      const vig = ctx.createRadialGradient(cw / 2, (ch + 44) / 2, cw * 0.15, cw / 2, (ch + 44) / 2, cw * 0.65);
      vig.addColorStop(0, 'rgba(255,255,255,0.06)');
      vig.addColorStop(1, 'rgba(0,0,0,0.44)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 44, cw, ch - 44);

      const top = 52;
      const bot = ch - 8;
      const midY = (top + bot) / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.48)';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, top, cw - 24, bot - top);
      ctx.beginPath(); ctx.moveTo(cw / 2, top); ctx.lineTo(cw / 2, bot); ctx.stroke();
      ctx.beginPath(); ctx.arc(cw / 2, midY, 58, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(cw / 2, midY, 4, 0, Math.PI * 2); ctx.fill();

      // Corner bumpers visual arcs + Midfield cyan speed pads
      ctx.fillStyle = 'rgba(251,191,36,0.22)';
      for (const [cx, cy] of [[18, 52], [cw - 18, 52], [18, ch - 10], [cw - 18, ch - 10]]) {
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
      }
      for (const [bx, by] of [[cw * 0.5, (ch + 44) * 0.28], [cw * 0.5, (ch + 44) * 0.76]]) {
        ctx.save();
        ctx.fillStyle = 'rgba(56,189,248,0.22)';
        ctx.beginPath(); ctx.arc(bx, by, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = '#bae6fd';
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', bx, by + 0.5);
        ctx.restore();
      }

      ctx.strokeRect(12, midY - (bot - top) * 0.28, 72, (bot - top) * 0.56);
      ctx.strokeRect(cw - 84, midY - (bot - top) * 0.28, 72, (bot - top) * 0.56);

      const goalH = ch * 0.34;
      const goalTop = (ch + 44) / 2 - goalH / 2;
      for (const side of [0, 1]) {
        const gx = side ? cw - 20 : 0;
        const col = side ? '#ef4444' : '#3b82f6';
        ctx.fillStyle = side ? 'rgba(239,68,68,0.28)' : 'rgba(59,130,246,0.28)';
        ctx.fillRect(gx, goalTop, 20, goalH);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        for (let ny = goalTop + 10; ny < goalTop + goalH; ny += 12) {
          ctx.beginPath(); ctx.moveTo(gx, ny); ctx.lineTo(gx + 20, ny); ctx.stroke();
        }
        ctx.strokeStyle = col;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(gx, goalTop, 20, goalH);
      }

      const s1 = this.players[0]?.score || 0;
      const s2 = this.players[1]?.score || 0;
      this.drawMiniHeader(ctx, `${s1}  :  ${s2}`);

      if (this.ball) {
        const b = this.ball;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(b.x, b.y + b.radius + 3, b.radius * 0.95, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#18181b'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.translate(b.x, b.y);
        ctx.rotate((b.x + b.y) * 0.05);
        ctx.fillStyle = '#18181b';
        ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.36, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 5; k++) {
          const a = (k * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * b.radius * 0.72, Math.sin(a) * b.radius * 0.72, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    } else if (this.currentMinigame === 'race') {
      // Industrial Steel Factory Parkur Chamber
      const bg = ctx.createLinearGradient(0, 0, 0, ch);
      bg.addColorStop(0, '#10141a');
      bg.addColorStop(0.55, '#191f28');
      bg.addColorStop(1, '#0b0e12');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cw, ch);

      // Parallax riveted steel bulkhead plates + vertical industrial pipes & warm amber LEDs
      const plateShift = (this.raceOffset * 0.24) % 220;
      for (let px = -plateShift; px < cw + 220; px += 220) {
        const idx = Math.abs(Math.round((px + this.raceOffset * 0.24) / 220));
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, 46, 218, ch - 60);

        // Rivets along plate seams
        ctx.fillStyle = 'rgba(148,163,184,0.16)';
        for (let ry = 58; ry < ch - 70; ry += 38) {
          ctx.beginPath(); ctx.arc(px + 8, ry, 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + 210, ry, 1.8, 0, Math.PI * 2); ctx.fill();
        }

        // Background factory machinery pipes + amber indicator lamps
        const pipeX = px + 68 + (idx % 2) * 32;
        ctx.fillStyle = '#11161d';
        ctx.fillRect(pipeX, 46, 22, ch - 60);
        ctx.fillRect(pipeX - 8, 92 + (idx % 3) * 34, 38, 12);

        // Industrial conduit machine housing with orange LED light
        const ledY = 128 + (idx % 3) * 38;
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(pipeX + 40, ledY, 44, 54);
        const ledGlow = ctx.createRadialGradient(pipeX + 62, ledY + 14, 1, pipeX + 62, ledY + 14, 24);
        ledGlow.addColorStop(0, 'rgba(245,158,11,0.55)');
        ledGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = ledGlow;
        ctx.beginPath(); ctx.arc(pipeX + 62, ledY + 14, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(pipeX + 59, ledY + 12, 6, 4);
      }

      // Lower hazard chasm grating + diagonal orange/black caution stripe along bottom
      const hazardY = ch - 22;
      ctx.fillStyle = '#090b0f';
      ctx.fillRect(0, hazardY, cw, 22);
      ctx.fillStyle = 'rgba(245,158,11,0.12)';
      ctx.fillRect(0, hazardY - 24, cw, 24);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, hazardY, cw, 10);
      ctx.clip();
      const stripeShift = this.raceOffset % 24;
      ctx.fillStyle = '#92400e';
      ctx.fillRect(0, hazardY, cw, 10);
      ctx.fillStyle = '#f59e0b';
      for (let sx = -stripeShift - 24; sx < cw + 24; sx += 24) {
        ctx.beginPath();
        ctx.moveTo(sx, hazardY + 10);
        ctx.lineTo(sx + 10, hazardY);
        ctx.lineTo(sx + 18, hazardY);
        ctx.lineTo(sx + 8, hazardY + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Buzzsaws drawn first so concrete floor edges sit cleanly beside saw mounts
      for (const obs of this.raceObstacles) {
        if (obs.kind !== 'saw') continue;
        const sx = obs.x - this.raceOffset;
        if (sx < -120 || sx > cw + 120) continue;
        const scx = sx + obs.w / 2;
        const scy = obs.y + obs.h / 2;
        // Vertical steel guide track for moving/chasm buzzsaw
        ctx.fillStyle = '#181d25';
        ctx.fillRect(scx - 4, scy, 8, Math.max(10, ch - scy));
        this.drawFactorySaw(ctx, scx, scy, obs.r ?? 24, this.miniTick * 0.16);
      }

      // Draw Parkur Concrete Floors, Elevated Ledges, Springs & Crates
      for (const obs of this.raceObstacles) {
        if (obs.kind === 'saw') continue;
        const sx = obs.x - this.raceOffset;
        if (sx < -obs.w - 40 || sx > cw + 80) continue;

        if (obs.kind === 'floor') {
          const fg = ctx.createLinearGradient(sx, obs.y, sx, obs.y + obs.h);
          fg.addColorStop(0, '#363c46');
          fg.addColorStop(0.22, '#22272f');
          fg.addColorStop(1, '#0e1116');
          ctx.fillStyle = fg;
          ctx.fillRect(sx, obs.y, obs.w, obs.h);

          // Concrete top lip & weathered edge trim
          ctx.fillStyle = '#525b69';
          ctx.fillRect(sx, obs.y, obs.w, 6);
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.fillRect(sx, obs.y, obs.w, 2);
          ctx.strokeStyle = '#090b0f';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx, obs.y, obs.w, obs.h);

          // Procedural concrete hairline cracks
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.lineWidth = 1.4;
          for (let cxOff = 28; cxOff < obs.w - 20; cxOff += 76) {
            ctx.beginPath();
            ctx.moveTo(sx + cxOff, obs.y + 6);
            ctx.lineTo(sx + cxOff + 7, obs.y + 18);
            ctx.lineTo(sx + cxOff - 2, obs.y + 28);
            ctx.stroke();
          }
          continue;
        }

        if (obs.kind === 'spring') {
          ctx.fillStyle = '#14532d';
          roundRectPath(ctx, sx, obs.y + 5, obs.w, obs.h - 5, 3);
          ctx.fill();
          ctx.fillStyle = '#4ade80';
          ctx.shadowColor = '#4ade80';
          ctx.shadowBlur = 10;
          roundRectPath(ctx, sx + 2, obs.y, obs.w - 4, 6, 3);
          ctx.fill();
          ctx.shadowBlur = 0;
          continue;
        }

        if (obs.kind === 'platform') {
          // Suspended reinforced concrete catwalk slab + diagonal side support brackets
          ctx.fillStyle = '#11151c';
          ctx.fillRect(sx + 8, obs.y + obs.h, 6, 10);
          ctx.fillRect(sx + obs.w - 14, obs.y + obs.h, 6, 10);

          const pg = ctx.createLinearGradient(sx, obs.y, sx, obs.y + obs.h);
          pg.addColorStop(0, '#474f5c');
          pg.addColorStop(1, '#1e232b');
          ctx.fillStyle = pg;
          roundRectPath(ctx, sx, obs.y, obs.w, obs.h, 3);
          ctx.fill();
          ctx.fillStyle = '#64748b';
          ctx.fillRect(sx + 2, obs.y + 1, obs.w - 4, 3);
          ctx.strokeStyle = '#090b0f';
          ctx.lineWidth = 1.5;
          roundRectPath(ctx, sx, obs.y, obs.w, obs.h, 3);
          ctx.stroke();
          continue;
        }

        // Steel-banded crate / block
        const cg = ctx.createLinearGradient(sx, obs.y, sx + obs.w, obs.y + obs.h);
        cg.addColorStop(0, '#3a404a');
        cg.addColorStop(1, '#181b21');
        ctx.fillStyle = cg;
        roundRectPath(ctx, sx, obs.y, obs.w, obs.h, 4);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sx + 3, obs.y + 3, obs.w - 6, 4);
        ctx.strokeStyle = 'rgba(245,158,11,0.55)';
        ctx.lineWidth = 1.5;
        roundRectPath(ctx, sx, obs.y, obs.w, obs.h, 4);
        ctx.stroke();
      }

      const fsx = this.raceFinishX - this.raceOffset;
      if (fsx > -40 && fsx < cw + 40) {
        const deckTop = ch - 78;
        ctx.fillStyle = 'rgba(74,222,128,0.12)';
        ctx.fillRect(fsx - 4, 48, 22, deckTop - 48);
        for (let y = 52; y < deckTop; y += 12) {
          const even = Math.floor((y - 52) / 12) % 2 === 0;
          ctx.fillStyle = even ? '#ffffff' : '#111116';
          ctx.fillRect(fsx, y, 7, 12);
          ctx.fillStyle = even ? '#111116' : '#ffffff';
          ctx.fillRect(fsx + 7, y, 7, 12);
        }
        ctx.fillStyle = '#4ade80';
        ctx.font = '800 20px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FİNİŞ', fsx + 7, 42);
      }

      for (const p of this.players) {
        if (!p.alive) continue;
        const prog = Math.max(0, Math.min(1, p.raceX / (this.raceFinishX || 1)));
        const y = 44 + p.index * 10;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        roundRectPath(ctx, 24, y, cw - 48, 5, 2.5);
        ctx.fill();
        ctx.fillStyle = p.color;
        roundRectPath(ctx, 24, y, Math.max(8, (cw - 48) * prog), 5, 2.5);
        ctx.fill();
      }
    } else if (this.currentMinigame === 'bomb') {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, 40, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
      g.addColorStop(0, '#2a1216');
      g.addColorStop(0.65, '#130c0e');
      g.addColorStop(1, '#08080a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      // Underground munitions bunker deck + overhead hazard conduits
      ctx.strokeStyle = 'rgba(249,115,22,0.06)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < cw; gx += 64) { ctx.beginPath(); ctx.moveTo(gx, 48); ctx.lineTo(gx, ch); ctx.stroke(); }
      for (let gy = 48; gy < ch; gy += 64) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke(); }

      ctx.strokeStyle = 'rgba(249,115,22,0.22)';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 48, cw - 24, ch - 60);
      this.drawPillars(ctx, '#f97316', 'cover');

      if (this.ball) {
        const b = this.ball;
        if (b.fuse < 120) {
          ctx.fillStyle = `rgba(239,68,68,${0.12 + 0.08 * Math.sin(nowT * 12)})`;
          ctx.fillRect(0, 0, cw, ch);
        }
        ctx.strokeStyle = 'rgba(239,68,68,0.22)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(b.x, b.y, 92, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);

        ctx.save();
        ctx.shadowColor = b.fuse < 120 ? '#ef4444' : '#f97316';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#18181b';
        ctx.beginPath(); ctx.arc(b.x, b.y, 13, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        const fuseRatio = Math.max(0, b.fuse / (b.maxFuse || 360));
        if (b.fuse < 120) {
          ctx.strokeStyle = `rgba(239,68,68,${0.35 + 0.35 * Math.abs(Math.sin(nowT * 10))})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 26 + Math.sin(nowT * 12) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = b.fuse < 120 ? '#ef4444' : '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 19, -Math.PI / 2, -Math.PI / 2 + fuseRatio * Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, Math.ceil(b.fuse / 60))}s`, b.x, b.y - 26);
      }
    } else if (this.currentMinigame === 'laser') {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, 30, cw / 2, ch / 2, cw * 0.65);
      g.addColorStop(0, '#0f1c2e');
      g.addColorStop(1, '#06080d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      // Cyber security vault floor plates + emitter nodes along walls
      ctx.strokeStyle = 'rgba(56,189,248,0.09)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < cw; gx += 48) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ch); ctx.stroke(); }
      for (let gy = 0; gy < ch; gy += 48) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke(); }
      ctx.fillStyle = 'rgba(56,189,248,0.25)';
      for (let nx = 42; nx < cw - 20; nx += 96) {
        ctx.fillRect(nx - 3, 46, 6, 4);
        ctx.fillRect(nx - 3, ch - 10, 6, 4);
      }

      this.drawPickups(ctx);

      for (const b of this.beams) {
        ctx.save();
        if (b.warn > 0) {
          const blink = b.warn < 18 ? (Math.floor(b.warn / 3) % 2 === 0 ? 0.85 : 0.25) : 0.45;
          ctx.strokeStyle = `rgba(251,191,36,${blink})`;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([10, 8]);
          ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 22;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.width * 1.45;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = b.width * 0.5;
          ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        }
        ctx.restore();
      }
      this.drawMiniHeader(ctx, `${Math.max(0, Math.ceil(this.gameTimer / 60))}s`, this.gameTimer / (this.gameTimerMax || 1));
    } else if (this.currentMinigame === 'lava') {
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, '#09070a');
      g.addColorStop(0.55, '#210d0c');
      g.addColorStop(1, '#4c130b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      ctx.save();
      ctx.translate(0, -this.lavaCamY);

      // Towering basalt volcano cavern walls + glowing magma cracks on left/right
      const topWallY = Math.floor((this.lavaCamY - 200) / 140) * 140;
      const botWallY = this.lavaCamY + ch + 180;
      for (let wy = topWallY; wy <= botWallY; wy += 140) {
        const jut = 16 + ((Math.abs(wy) * 7) % 14);
        ctx.fillStyle = '#181010';
        ctx.beginPath();
        ctx.moveTo(0, wy);
        ctx.lineTo(jut, wy + 70);
        ctx.lineTo(0, wy + 140);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cw, wy);
        ctx.lineTo(cw - jut, wy + 70);
        ctx.lineTo(cw, wy + 140);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(249,115,22,0.35)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(4, wy + 30);
        ctx.lineTo(jut - 4, wy + 70);
        ctx.stroke();
      }

      const startGrid = Math.floor((this.lavaCamY - 50) / 200) * 200;
      const endGrid = this.lavaCamY + ch + 50;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      for (let gy = startGrid; gy <= endGrid; gy += 200) {
        const meters = Math.round((ch - gy) / 10);
        if (meters <= 0) continue;
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke();
        ctx.fillText(`${meters}m`, 24, gy - 5);
      }

      for (const pl of this.plats) {
        const isCrumble = pl.kind === 'crumble';
        const crumbling = isCrumble && pl.crumbleT !== undefined && pl.crumbleT < 46;
        const jx = crumbling ? Math.sin(this.miniTick * 1.6) * 2.5 : 0;
        const px = pl.x + jx;
        ctx.fillStyle =
          pl.kind === 'spring' ? '#14532d' : isCrumble ? '#7c2d12' : '#27272a';
        roundRectPath(ctx, px, pl.y, pl.w, 13, 4);
        ctx.fill();
        ctx.fillStyle =
          pl.kind === 'spring' ? '#4ade80' : isCrumble ? '#fb923c' : pl.dx !== 0 ? '#f59e0b' : '#71717a';
        roundRectPath(ctx, px + 2, pl.y, pl.w - 4, 4, 2);
        ctx.fill();
        if (isCrumble) {
          ctx.strokeStyle = crumbling ? '#fed7aa' : 'rgba(254,215,170,0.45)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(px + pl.w * 0.25, pl.y + 3);
          ctx.lineTo(px + pl.w * 0.38, pl.y + 11);
          ctx.moveTo(px + pl.w * 0.64, pl.y + 3);
          ctx.lineTo(px + pl.w * 0.56, pl.y + 11);
          ctx.stroke();
        }
      }

      if (this.lavaY < this.lavaCamY + ch + 80) {
        const lg = ctx.createLinearGradient(0, this.lavaY - 6, 0, this.lavaY + ch);
        lg.addColorStop(0, '#fde047');
        lg.addColorStop(0.22, '#f97316');
        lg.addColorStop(1, '#7c2d12');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(0, this.lavaCamY + ch + 100);
        ctx.lineTo(0, this.lavaY);
        for (let lx = 0; lx <= cw; lx += 24) {
          ctx.lineTo(lx, this.lavaY + Math.sin(lx * 0.04 + nowT * 3) * 4);
        }
        ctx.lineTo(cw, this.lavaCamY + ch + 100);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      const climbM = Math.max(0, Math.round(-this.lavaCamY / 10));
      this.drawMiniHeader(ctx, `${climbM} m`);
    }
  }

  private updateMiniSprings(p: MiniPlayer, sideView: boolean) {
    const dvx = p.vx - (p.prevVx ?? p.vx);
    const dvy = p.vy - (p.prevVy ?? p.vy);
    p.prevVx = p.vx;
    p.prevVy = p.vy;
    if (p.sq > 0) p.sq--;

    const spd = Math.hypot(p.vx, p.vy);
    const moving = spd > 0.35;
    p.phase += (sideView ? Math.abs(p.vx) : spd) * 0.165;

    const air = sideView && !p.onGround;
    const targetLean = Math.max(-7.5, Math.min(7.5, p.vx * 1.15));
    p.leanVx = (p.leanVx + (targetLean - p.leanX) * 0.25 - dvx * 0.78) * 0.75;
    p.leanX = Math.max(-11, Math.min(11, p.leanX + p.leanVx));

    const targetHeadX = p.leanX * 1.18;
    p.headVx = (p.headVx + (targetHeadX - p.headX) * 0.21 - dvx * 0.95) * 0.73;
    p.headX = Math.max(-14, Math.min(14, p.headX + p.headVx));

    const targetHeadY = air
      ? Math.max(-4, Math.min(4.8, -p.vy * 0.32))
      : moving
      ? -Math.abs(Math.cos(p.phase)) * 2.8
      : 0;
    p.headVy = (p.headVy + (targetHeadY - p.headY) * 0.26 - dvy * 0.5) * 0.72;
    p.headY = Math.max(-8, Math.min(9, p.headY + p.headVy));

    const targetTilt = air
      ? Math.max(-0.42, Math.min(0.42, p.vx * 0.05))
      : Math.max(-0.22, Math.min(0.22, p.vx * 0.035));
    p.tiltV = (p.tiltV + (targetTilt - p.tilt) * 0.22 + dvx * 0.02) * 0.78;
    p.tilt = Math.max(-0.56, Math.min(0.56, p.tilt + p.tiltV));
  }

  private drawStickman(ctx: CanvasRenderingContext2D, p: MiniPlayer) {
    ctx.save();
    const hopOffset = 0;
    const shScale = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.44)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 22, 11 * shScale, 3.5 * shScale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (
      p.dashCooldown > 0 &&
      (this.currentMinigame === 'samurai' ||
        this.currentMinigame === 'blades' ||
        this.currentMinigame === 'sumo' ||
        this.currentMinigame === 'laser' ||
        this.currentMinigame === 'lava' ||
        this.currentMinigame === 'race' ||
        this.currentMinigame === 'futbol')
    ) {
      const maxCd =
        this.currentMinigame === 'race'
          ? 44
          : this.currentMinigame === 'laser' || this.currentMinigame === 'lava'
          ? 34
          : this.currentMinigame === 'blades'
          ? 30
          : this.currentMinigame === 'futbol'
          ? 28
          : 32;
      const cdRatio = Math.max(0, Math.min(1, 1 - p.dashCooldown / maxCd));
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 22 - hopOffset, 13, -Math.PI / 2, -Math.PI / 2 + cdRatio * Math.PI * 2);
      ctx.stroke();
    }

    if (this.currentMinigame === 'sumo' && p.shield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(251,191,36,0.75)';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y - hopOffset, 22 + Math.sin(this.miniTick * 0.2) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    let rig = this.rigs[p.index];
    const dir = Math.cos(p.angle) >= 0 ? 1 : -1;
    if (!rig) {
      rig = createRagdollRig(p.index, p.color, p.x, p.y - hopOffset, dir, 0.94);
      this.rigs[p.index] = rig;
    }
    rig.color = p.color;
    rig.dir = dir;

    if (p.trail.length > 0) {
      ctx.globalAlpha = 0.2;
      for (const tr of p.trail) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y - hopOffset, 8.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Subtle aim reticle dot
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 26, p.y - hopOffset + Math.sin(p.angle) * 26, 2.4, 0, Math.PI * 2);
    ctx.fill();

    const holdingBomb = this.currentMinigame === 'bomb' && this.ball?.holder === p.index;
    const hasWeapon =
      this.currentMinigame === 'zombie' ||
      this.currentMinigame === 'samurai' ||
      this.currentMinigame === 'sniper';

    drawRagdollStickman(ctx, rig, {
      color: p.color,
      shield: p.shield,
      weapon: 'none',
      twoHanded: holdingBomb || this.currentMinigame === 'sniper',
      time: this.miniTick,
    });

    if (hasWeapon || p.isAttacking) {
      ctx.save();
      ctx.translate(rig.rHand.x, rig.rHand.y);
      ctx.rotate(p.angle);
      if (this.currentMinigame === 'samurai') {
        ctx.fillStyle = '#e4e4e7';
        ctx.fillRect(0, -2, 24, 3.6);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-2, -5, 3, 10);
      } else if (this.currentMinigame === 'sniper') {
        // Sleek dark tactical sniper rifle with scope + crimson laser emitter
        ctx.fillStyle = '#090b0f';
        ctx.fillRect(-5, -2.5, 19, 4.5);
        ctx.fillStyle = '#272c35';
        ctx.fillRect(14, -1.6, 15, 2.6);
        ctx.fillStyle = '#181c23';
        ctx.fillRect(3, -5.8, 10, 2.8);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(29, -0.3, 1.8, 0, Math.PI * 2); ctx.fill();
      } else if (this.currentMinigame === 'zombie') {
        if (p.weap === 'grenade') {
          ctx.fillStyle = '#ea580c';
          ctx.beginPath(); ctx.arc(4, 0, 5.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#d4d4d8';
          ctx.fillRect(2, -7, 4, 3);
        } else {
          ctx.fillStyle = p.weap === 'shotgun' ? '#f59e0b' : p.weap === 'rapid' ? '#38bdf8' : '#71717a';
          ctx.fillRect(-2, -3.5, 16, 6);
        }
      }
      ctx.restore();
    }

    const look = PartyEconomy.look(p.index);
    const ext = PartyEconomy.headTop(look, 10);
    const barY = rig.head.y - ext - 12;
    if (p.hp <= 100) {
      const ratio = Math.max(0, Math.min(1, p.hp / 100));
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(rig.head.x - 16, barY, 32, 4);
      ctx.fillStyle = ratio > 0.4 ? '#4ade80' : '#f87171';
      ctx.fillRect(rig.head.x - 16, barY, 32 * ratio, 4);
    }
    ctx.fillStyle = '#f4f4f5';
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(PLAYER_NAMES[p.index] || `P${p.index + 1}`, rig.head.x, barY - 5);

    ctx.restore();
  }

  private draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const cw = this.cw;
    const ch = this.ch;
    const dpr = this.canvas.width / (cw || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);
    this.drawMap(ctx);

    if (this.currentMinigame === 'lava') {
      ctx.translate(0, -this.lavaCamY);
    } else if (this.currentMinigame === 'zombie') {
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(this.zCamZoom, this.zCamZoom);
      ctx.translate(-this.zCamX, -this.zCamY);
      this.drawZombieWorld(ctx);
    }

    // Expanding shockwave rings
    for (const r of this.rings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Samurai Katana Crescent Slashes
    for (const sl of this.slashes) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sl.life / sl.maxLife);
      ctx.translate(sl.x, sl.y);
      ctx.rotate(sl.angle);
      ctx.shadowColor = sl.color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, sl.radius, -1.0, 1.0); ctx.stroke();
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, sl.radius + 4, -0.95, 0.95); ctx.stroke();
      ctx.restore();
    }

    // Projectiles
    for (const pr of this.projectiles) {
      ctx.save();
      const col = pr.color || '#bae6fd';
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      if (pr.kind === 'grenade') {
        ctx.translate(pr.x, pr.y);
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(-2.5, -8.5, 5, 3);
        if (Math.floor(pr.life / 4) % 2 === 0) {
          ctx.fillStyle = '#fde047';
          ctx.beginPath(); ctx.arc(3.5, -9, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      } else if (pr.kind === 'sniper') {
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pr.x - pr.vx * 1.5, pr.y - pr.vy * 1.5);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius || 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, (pr.radius || 5) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Zombies
    if (this.currentMinigame === 'zombie') {
      for (const z of this.zombies) {
        this.drawZombie(ctx, z);
      }
    }

    // Limp dead ragdolls
    for (const entry of this.deadRagdolls) {
      drawRagdollStickman(ctx, entry.rig, {
        color: entry.rig.color,
        weapon: 'none',
        alpha: Math.min(1, entry.rig.deadLife / 40),
        time: this.miniTick,
      });
    }

    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) continue;
      this.drawStickman(ctx, p);
    }

    for (const pt of this.particles) {
      const a = pt.life / pt.maxLife;
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const pp of this.popups) {
      ctx.globalAlpha = Math.min(1, pp.life / 18);
      ctx.fillStyle = pp.color;
      ctx.font = '800 16px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pp.text, pp.x, pp.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.currentMinigame === 'zombie') {
      const hasBoss = this.zombies.some((z) => z.kind === 3);
      const hudTxt = hasBoss
        ? `DALĞA ${this.zombieWave}/${this.zMaxWaves} · ÖLDÜRÜLƏN: ${this.zombieKills} · ☠ BOSS`
        : `DALĞA ${this.zombieWave}/${this.zMaxWaves} · ÖLDÜRÜLƏN: ${this.zombieKills}`;
      this.drawMiniHeader(ctx, hudTxt, undefined, hasBoss ? 320 : 258);
    }

    ctx.fillStyle = 'rgba(244,244,245,0.55)';
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Raund ${this.currentRound}/${this.maxRounds}`, cw / 2, ch - 8);

    if (this.countdownActive) {
      const sec = Math.ceil(this.countdownTimer / 60);
      const text = sec > 0 ? String(sec) : 'BAŞLA!';
      ctx.fillStyle = 'rgba(9,9,11,0.38)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = sec > 0 ? '#ffffff' : '#4ade80';
      ctx.font = '800 78px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cw / 2, ch / 2);
      ctx.textBaseline = 'alphabetic';
    }

    if (this.gameState === 'roundEnd') {
      ctx.fillStyle = 'rgba(9,9,11,0.52)';
      ctx.fillRect(0, 0, cw, ch);
      const alive = this.players.filter((p) => p.alive);
      const winPlayer =
        alive.length === 1 && this.currentMinigame !== 'zombie'
          ? alive[0]
          : null;
      const winCol = winPlayer ? winPlayer.color : '#ffffff';
      const winName = winPlayer ? PLAYER_NAMES[winPlayer.index] || `P${winPlayer.index + 1}` : 'RAUND BİTDİ';

      const prog = Math.min(1, this.roundEndTicks / 24);
      const easeOutBack = 1 + 2.1 * Math.pow(prog - 1, 3) + 1.1 * Math.pow(prog - 1, 2);
      const bannerY = -70 + (ch * 0.24 + 70) * Math.min(1.06, Math.max(0, easeOutBack));

      ctx.save();
      ctx.translate(cw / 2, bannerY);
      ctx.globalAlpha = Math.min(1, prog * 2);

      if (winPlayer) {
        ctx.font = '800 54px "Barlow Condensed", sans-serif';
        const nameW = ctx.measureText(winName).width;
        ctx.font = '800 40px "Barlow Condensed", sans-serif';
        const tagW = ctx.measureText('QAZANDI!').width + 24;
        const totalW = Math.max(260, nameW + tagW + 64);

        ctx.fillStyle = 'rgba(9,9,11,0.92)';
        roundRectPath(ctx, -totalW / 2, -40, totalW, 80, 14);
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
        const endText =
          this.currentMinigame === 'zombie'
            ? this.zombieWon
              ? '20 DALĞA TAMAMLANDI!'
              : 'ZOMBİLƏR QALİB GƏLDİ!'
            : 'RAUND BİTDİ!';
        ctx.fillStyle = this.currentMinigame === 'zombie' && this.zombieWon ? '#4ade80' : '#ffffff';
        ctx.font = '800 52px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(endText, 0, 0);
      }
      ctx.restore();
    }
  }

  private loop = (now: number) => {
    if (!this.on || !this.canvas) return;
    this.raf = requestAnimationFrame(this.loop);

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = Math.max(1, this.canvas.clientWidth || 960);
    const cssH = Math.max(1, this.canvas.clientHeight || 540);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH || this.cw !== cssW || this.ch !== cssH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      this.cw = cssW;
      this.ch = cssH;
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
        this.step();
        this.acc -= STEP;
        n++;
      }
    } else {
      this.acc = 0;
      const side = this.currentMinigame === 'race' || this.currentMinigame === 'lava' || this.currentMinigame === 'zombie';
      this.miniTick++;
      if (this.currentMinigame === 'zombie') {
        this.stepZombieEmbers();
        this.updateZombieCamera();
      }
      for (const p of this.players) {
        if (p.alive) {
          this.updateMiniSprings(p, side);
          this.driveMiniRig(p);
        }
      }
      const sidePlats = this.getSidePlatforms();
      const isLava = this.currentMinigame === 'lava';
      const isZombie = this.currentMinigame === 'zombie';
      for (let i = this.deadRagdolls.length - 1; i >= 0; i--) {
        const entry = this.deadRagdolls[i];
        const plats = entry.floorY !== undefined ? [[0, entry.floorY, this.cw, 36] as [number, number, number, number]] : sidePlats;
        if (
          !stepDeadRagdoll(
            entry.rig,
            plats,
            entry.floorY !== undefined ? 0.24 : isLava || isZombie ? 0.42 : 0.36,
            isZombie ? this.zWorldW : this.cw,
            isLava ? this.lavaCamY + this.ch + 140 : isZombie ? this.zGroundY + 90 : this.ch,
            true,
            false
          )
        ) {
          this.deadRagdolls.splice(i, 1);
        }
      }
    }
    if (this.acc > STEP * 4) this.acc = 0;

    this.draw();
    if (this.netRole && this.callbacks?.onSendNet) {
      this.callbacks.onSendNet();
    }
  };
}

export const minigameEngine = new MinigameEngine();
