import { PartyAudio } from './audio';
import { PartyEconomy } from './economy';
import { roundRectPath } from './maps';
import {
  applyRagdollImpulse,
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
  maxLife?: number;
  snow: boolean;
  color?: string;
  radius?: number;
  bounces?: number;
  dmg?: number;
  kind?: 'bolt' | 'shotgun' | 'grenade' | 'shell' | 'laser';
}

interface CoinItem {
  x: number;
  y: number;
  radius: number;
  life: number;
  diamond: boolean;
  kind?: 'shotgun' | 'rapid' | 'medkit' | 'shield' | 'grenade' | 'power' | 'repair';
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

interface RingFx {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  life: number;
  maxLife: number;
}

interface MeteorDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  warn: number;
  maxWarn: number;
  cluster: boolean;
  startX: number;
  targetX: number;
}

interface MeteorCrater {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
}

interface MeteorGeyser {
  x: number;
  warn: number;
  eruptT: number;
  h: number;
}

interface MeteorPlat {
  x: number;
  y: number;
  w: number;
  h: number;
  spring?: boolean;
  kind?: 'steel' | 'container' | 'bridge' | 'crate' | 'hatch' | 'summit' | 'snow';
  color?: string;
}

interface InfernoSlag {
  x: number;
  y: number;
  vy: number;
  r: number;
  warn: number;
}

interface StormBolt {
  x: number;
  warn: number;
  flash: number;
  r: number;
}

interface StormWave {
  side: -1 | 1;
  warn: number;
  active: number;
  x: number;
}

interface AvaGap {
  x: number;
  y: number;
  w: number;
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

export interface ZombieRevivePrompt {
  wave: number;
  maxWaves: number;
  kills: number;
  cost: number;
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
  coins: CoinItem[];
  zombies?: ZombieEntity[];
  rings?: RingFx[];
  wave?: number;
  zKills?: number;
  zPlats?: ZombiePlatform[];
  zBarrels?: ZombieBarrel[];
  zr?: ZombieRevivePrompt | null;
  meteors?: MeteorDrop[];
  craters?: MeteorCrater[];
  geysers?: MeteorGeyser[];
  mPlats?: MeteorPlat[];
  infLavaY?: number;
  infSlags?: InfernoSlag[];
  stormBolts?: StormBolt[];
  stormWave?: StormWave | null;
  stormFlash?: number;
  avaY?: number;
  avaGaps?: AvaGap[];
}

export interface MiniCallbacks {
  onHudUpdate: (values: (number | string)[], count: number, round: number, maxRounds: number) => void;
  onMatchEnd: (scores: number[], winnerIndices: number[]) => void;
  onZombieRevivePrompt?: (info: ZombieRevivePrompt | null) => void;
  onSendNet?: () => void;
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
  private coins: CoinItem[] = [];
  private zombies: ZombieEntity[] = [];
  private rings: RingFx[] = [];
  private zombieWave = 1;
  private readonly zMaxWaves = 100;
  private zombieWon = false;
  private zombieRevivePending = false;
  private zombieRevivePrompt: ZombieRevivePrompt | null = null;
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
  private meteors: MeteorDrop[] = [];
  private meteorCraters: MeteorCrater[] = [];
  private meteorGeysers: MeteorGeyser[] = [];
  private mPlats: MeteorPlat[] = [];
  private meteorSpawnTimer = 0;
  private geyserSpawnTimer = 0;
  private readonly infWorldH = 1480;
  private infLavaY = 1485;
  private infCamY = 1150;
  private infSlags: InfernoSlag[] = [];
  private infSlagTimer = 0;
  private stormBolts: StormBolt[] = [];
  private stormWave: StormWave | null = null;
  private stormBoltTimer = 0;
  private stormWaveTimer = 0;
  private stormFlash = 0;
  private stormRain: { x: number; y: number; len: number; sp: number }[] = [];
  private readonly avaWorldH = 2600;
  private avaY = -90;
  private avaCamY = 270;
  private avaGaps: AvaGap[] = [];
  private avaSnow: { x: number; y: number; r: number; sp: number }[] = [];
  private clouds: { x: number; y: number; r: number; sp: number }[] = [];
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
    this.zombieRevivePending = false;
    this.zombieRevivePrompt = null;
    this.callbacks?.onZombieRevivePrompt?.(null);

    this.clouds = Array.from({ length: 14 }, (_, idx) => ({
      x: (idx / 14) * cssW,
      y: 65 + (idx % 5) * (cssH * 0.17),
      r: 26 + (idx % 4) * 12,
      sp: 0.18 + (idx % 3) * 0.12,
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
    this.zombieRevivePending = false;
    this.zombieRevivePrompt = null;
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
    if (this.currentMinigame === 'inferno') {
      return { x: p.x, y: p.y - this.infCamY + this.ch / 2 };
    }
    if (this.currentMinigame === 'avalanche') {
      return { x: p.x, y: p.y - this.avaCamY + this.ch / 2 };
    }
    return { x: p.x, y: p.y };
  }

  restart() {
    if (this.roundTimerHandle) {
      clearTimeout(this.roundTimerHandle);
      this.roundTimerHandle = null;
    }
    this.zombieRevivePending = false;
    this.zombieRevivePrompt = null;
    this.callbacks?.onZombieRevivePrompt?.(null);
    PartyEconomy.beginMatch();
    this.currentRound = 1;
    this.players.forEach((p) => {
      p.score = 0;
      p.roundStart = 0;
    });
    this.startRound();
  }

  getZombieContinueCost(wave = this.zombieWave): number {
    const w = Math.max(1, Math.floor(wave));
    return Math.min(1000, 500 + (w - 1) * 10);
  }

  continueZombieAfterDeath() {
    if (!this.on || this.currentMinigame !== 'zombie' || !this.zombieRevivePending || this.netRole === 'guest') {
      return;
    }
    this.zombieRevivePending = false;
    this.zombieRevivePrompt = null;
    this.deadRagdolls = [];
    resetInputs();

    const gy = this.zGroundY;
    this.players.forEach((p, idx) => {
      const safeX = Math.max(84, Math.min(this.zWorldW - 84, Number.isFinite(p.x) ? p.x : this.zWorldW * 0.5 + idx * 44));
      p.x = safeX;
      p.y = gy - 22;
      p.vx = 0;
      p.vy = 0;
      p.onGround = true;
      p.jumpsLeft = 1;
      p.hp = 100;
      p.alive = true;
      p.invincible = 165;
      p.isAttacking = false;
      p.attackTimer = 0;
      this.rigs[p.index] = createRagdollRig(p.index, p.color, p.x, p.y, Math.cos(p.angle) >= 0 ? 1 : -1, 0.94);
    });

    // Push nearby zombies back to give revived players safe breathing room
    for (const z of this.zombies) {
      for (const p of this.players) {
        const dx = z.x - p.x;
        const dist = Math.abs(dx);
        if (dist < 260) {
          const dir = dx >= 0 ? 1 : -1;
          z.x = Math.max(36, Math.min(this.zWorldW - 36, p.x + dir * 270));
          z.vx = dir * 5.5;
          z.vy = -4.2;
        }
      }
    }

    const focus = this.players[0];
    if (focus) {
      this.spawnRing(focus.x, focus.y, 130, '#4ade80', 26);
      this.spawnParticle(focus.x, focus.y, '#4ade80', 28, 5.8, 30);
      this.addPopup(focus.x, focus.y - 46, 'QALDIĞIN YERDƏN DAVAM!', '#4ade80');
    }
    PartyAudio.play('portal');
    this.callbacks?.onZombieRevivePrompt?.(null);
    this.emitHud();
  }

  declineZombieContinue() {
    if (!this.on || this.currentMinigame !== 'zombie' || !this.zombieRevivePending || this.netRole === 'guest') {
      return;
    }
    this.zombieRevivePending = false;
    this.zombieRevivePrompt = null;
    this.callbacks?.onZombieRevivePrompt?.(null);
    const best = Math.max(...this.players.map((p) => p.coins), 0);
    for (const p of this.players) {
      if (p.coins === best) p.score++;
    }
    this.endRound();
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
        kingTicks: p.kingTicks,
        snowCd: p.snowCd,
        isAttacking: p.isAttacking,
        invincible: p.invincible,
        zHop: p.zHop,
        weap: p.weap,
        weapT: p.weapT,
        shield: p.shield,
        dashCooldown: p.dashCooldown,
      })),
      pr: this.projectiles,
      coins: this.coins,
      zombies: this.currentMinigame === 'zombie' ? this.zombies : undefined,
      rings: this.rings,
      wave: this.zombieWave,
      zKills: this.zombieKills,
      zPlats: this.currentMinigame === 'zombie' ? this.zPlats : undefined,
      zBarrels: this.currentMinigame === 'zombie' ? this.zBarrels : undefined,
      zr: this.zombieRevivePrompt,
      meteors: this.currentMinigame === 'meteor' ? this.meteors : undefined,
      craters: this.currentMinigame === 'meteor' ? this.meteorCraters : undefined,
      geysers: this.currentMinigame === 'meteor' ? this.meteorGeysers : undefined,
      mPlats: this.mPlats,
      infLavaY: this.currentMinigame === 'inferno' ? this.infLavaY : undefined,
      infSlags: this.currentMinigame === 'inferno' ? this.infSlags : undefined,
      stormBolts: this.currentMinigame === 'storm' ? this.stormBolts : undefined,
      stormWave: this.currentMinigame === 'storm' ? this.stormWave : undefined,
      stormFlash: this.currentMinigame === 'storm' ? this.stormFlash : undefined,
      avaY: this.currentMinigame === 'avalanche' ? this.avaY : undefined,
      avaGaps: this.currentMinigame === 'avalanche' ? this.avaGaps : undefined,
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
      if (d.mini === 'storm' && this.stormRain.length === 0) {
        this.initStormRain();
      }
      if (d.mini === 'avalanche' && this.avaSnow.length === 0) {
        this.initAvaSnow();
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
    this.coins = d.coins;
    if (d.zombies) this.zombies = d.zombies;
    if (d.rings) this.rings = d.rings;
    if (typeof d.wave === 'number') this.zombieWave = d.wave;
    if (typeof d.zKills === 'number') this.zombieKills = d.zKills;
    if (d.zPlats) this.zPlats = d.zPlats;
    if (d.zBarrels) this.zBarrels = d.zBarrels;
    if (d.meteors) this.meteors = d.meteors;
    if (d.craters) this.meteorCraters = d.craters;
    if (d.geysers) this.meteorGeysers = d.geysers;
    if (d.mPlats) this.mPlats = d.mPlats;
    if (typeof d.infLavaY === 'number') this.infLavaY = d.infLavaY;
    if (d.infSlags) this.infSlags = d.infSlags;
    if (d.stormBolts) this.stormBolts = d.stormBolts;
    if (d.stormWave !== undefined) this.stormWave = d.stormWave;
    if (typeof d.stormFlash === 'number') this.stormFlash = d.stormFlash;
    if (typeof d.avaY === 'number') this.avaY = d.avaY;
    if (d.avaGaps) this.avaGaps = d.avaGaps;
    this.zombieRevivePrompt = d.zr ?? null;
    this.zombieRevivePending = !!d.zr;
    this.callbacks?.onZombieRevivePrompt?.(this.zombieRevivePrompt);
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

  private initStormRain() {
    this.stormRain = Array.from({ length: 76 }, () => ({
      x: Math.random() * this.cw,
      y: Math.random() * this.ch,
      len: 14 + Math.random() * 14,
      sp: 11 + Math.random() * 6,
    }));
  }

  private initAvaSnow() {
    this.avaSnow = Array.from({ length: 82 }, () => ({
      x: Math.random() * this.cw,
      y: Math.random() * this.ch,
      r: 1.5 + Math.random() * 2.6,
      sp: 1.8 + Math.random() * 2.8,
    }));
  }

  private initMinigame() {
    this.projectiles = [];
    this.particles = [];
    this.popups = [];
    this.coins = [];
    this.zombies = [];
    this.zBarrels = [];
    this.rings = [];
    this.meteors = [];
    this.meteorCraters = [];
    this.meteorGeysers = [];
    this.mPlats = [];
    this.infSlags = [];
    this.stormBolts = [];
    this.stormWave = null;
    this.stormFlash = 0;
    this.avaGaps = [];
    this.avaY = -90;
    this.avaCamY = this.ch * 0.5;
    this.coinSpawnTimer = 0;
    this.meteorSpawnTimer = 32;
    this.geyserSpawnTimer = 95;
    this.infSlagTimer = 85;
    this.stormBoltTimer = 46;
    this.stormWaveTimer = 175;
    this.zombieSpawnTimer = 25;
    this.zombieWave = 1;

    const cw = this.cw;
    const ch = this.ch;

    switch (this.currentMinigame) {
      case 'zombie': {
        this.gameTimer = 0;
        this.gameTimerMax = 0;
        this.zombieKills = 0;
        this.zombieWave = 1;
        this.zombieWon = false;
        this.zombieRevivePending = false;
        this.zombieRevivePrompt = null;
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
      case 'meteor': {
        this.gameTimer = 45 * 60;
        this.gameTimerMax = this.gameTimer;
        this.meteorSpawnTimer = 30;
        this.geyserSpawnTimer = 95;
        const deckY = ch - 56;
        this.mPlats = [
          { x: cw * 0.14, y: deckY - 104, w: Math.max(120, cw * 0.17), h: 14, kind: 'bridge' },
          { x: cw * 0.5 - Math.max(70, cw * 0.095), y: deckY - 178, w: Math.max(140, cw * 0.19), h: 14, kind: 'steel' },
          { x: cw * 0.86 - Math.max(120, cw * 0.17), y: deckY - 104, w: Math.max(120, cw * 0.17), h: 14, kind: 'bridge' },
          { x: 42, y: deckY - 13, w: 54, h: 13, spring: true },
          { x: cw - 96, y: deckY - 13, w: 54, h: 13, spring: true },
        ];
        this.zEmbers = Array.from({ length: 40 }, () => ({
          x: Math.random() * cw,
          y: Math.random() * ch,
          vx: -0.25 + Math.random() * 0.5,
          vy: -0.5 - Math.random() * 0.8,
          r: 1.4 + Math.random() * 2.2,
          a: 0.35 + Math.random() * 0.5,
        }));
        this.players.forEach((p, idx) => {
          p.hp = 100;
          p.shield = false;
          p.x = cw * (0.24 + (idx / Math.max(1, this.playerCount - 1)) * 0.52);
          p.y = deckY - 22;
          p.vx = 0;
          p.vy = 0;
          p.onGround = true;
          p.angle = idx % 2 === 0 ? 0 : Math.PI;
        });
        break;
      }
      case 'inferno': {
        this.gameTimer = 0;
        this.gameTimerMax = 0;
        const fh = this.infWorldH;
        this.infLavaY = fh + 10;
        this.infCamY = fh - ch * 0.48;
        this.mPlats = [
          // Main factory forge base floor
          { x: 24, y: fh - 85, w: cw - 48, h: 24, kind: 'steel' },
          // Tier 1
          { x: cw * 0.08, y: fh - 190, w: cw * 0.28, h: 16, kind: 'bridge' },
          { x: cw * 0.64, y: fh - 190, w: cw * 0.28, h: 16, kind: 'bridge' },
          { x: cw * 0.44, y: fh - 100, w: 68, h: 14, spring: true },
          // Tier 2
          { x: cw * 0.33, y: fh - 305, w: cw * 0.34, h: 16, kind: 'steel' },
          { x: cw * 0.12, y: fh - 204, w: 58, h: 14, spring: true },
          { x: cw * 0.88 - 58, y: fh - 204, w: 58, h: 14, spring: true },
          // Tier 3
          { x: cw * 0.07, y: fh - 425, w: cw * 0.27, h: 16, kind: 'bridge' },
          { x: cw * 0.66, y: fh - 425, w: cw * 0.27, h: 16, kind: 'bridge' },
          // Tier 4
          { x: cw * 0.31, y: fh - 545, w: cw * 0.38, h: 16, kind: 'steel' },
          { x: cw * 0.48, y: fh - 440, w: 64, h: 14, spring: true },
          // Tier 5
          { x: cw * 0.08, y: fh - 670, w: cw * 0.26, h: 16, kind: 'bridge' },
          { x: cw * 0.66, y: fh - 670, w: cw * 0.26, h: 16, kind: 'bridge' },
          { x: cw * 0.14, y: fh - 684, w: 58, h: 14, spring: true },
          { x: cw * 0.86 - 58, y: fh - 684, w: 58, h: 14, spring: true },
          // Tier 6
          { x: cw * 0.34, y: fh - 800, w: cw * 0.32, h: 16, kind: 'steel' },
          // Tier 7
          { x: cw * 0.09, y: fh - 920, w: cw * 0.27, h: 16, kind: 'bridge' },
          { x: cw * 0.64, y: fh - 920, w: cw * 0.27, h: 16, kind: 'bridge' },
          // Tier 8
          { x: cw * 0.32, y: fh - 1045, w: cw * 0.36, h: 16, kind: 'steel' },
          { x: cw * 0.46, y: fh - 934, w: 66, h: 14, spring: true },
          // Tier 9
          { x: cw * 0.10, y: fh - 1170, w: cw * 0.25, h: 16, kind: 'bridge' },
          { x: cw * 0.65, y: fh - 1170, w: cw * 0.25, h: 16, kind: 'bridge' },
          // Summit Escape Beacon Platform
          { x: cw * 0.5 - 125, y: 185, w: 250, h: 20, kind: 'summit' },
        ];
        this.zEmbers = Array.from({ length: 48 }, () => ({
          x: 30 + Math.random() * (cw - 60),
          y: 120 + Math.random() * (fh - 180),
          vx: -0.3 + Math.random() * 0.6,
          vy: -0.6 - Math.random() * 1.1,
          r: 1.5 + Math.random() * 2.5,
          a: 0.4 + Math.random() * 0.5,
        }));
        this.players.forEach((p, idx) => {
          p.hp = 100;
          p.shield = false;
          p.x = cw * (0.28 + (idx / Math.max(1, this.playerCount - 1)) * 0.44);
          p.y = fh - 107;
          p.vx = 0;
          p.vy = 0;
          p.onGround = true;
          p.angle = idx % 2 === 0 ? 0 : Math.PI;
        });
        break;
      }
      case 'storm': {
        this.gameTimer = 45 * 60;
        this.gameTimerMax = this.gameTimer;
        this.initStormRain();
        const shipL = cw * 0.10;
        const shipW = cw * 0.80;
        const deckY = ch - 94;
        this.mPlats = [
          // Main steel ship hull deck (open ocean outside [shipL, shipL + shipW]!)
          { x: shipL, y: deckY, w: shipW, h: 24, kind: 'steel' },
          // Captain's Bridge upper catwalk (left)
          { x: shipL + 18, y: deckY - 122, w: Math.max(115, cw * 0.15), h: 16, kind: 'bridge' },
          // Stacked red & blue shipping containers
          { x: cw * 0.36, y: deckY - 62, w: Math.max(104, cw * 0.125), h: 62, kind: 'container', color: '#1e3a5f' },
          { x: cw * 0.56, y: deckY - 76, w: Math.max(122, cw * 0.15), h: 76, kind: 'container', color: '#7f1d1d' },
          // High Crane Boom Catwalk
          { x: cw * 0.41, y: deckY - 178, w: Math.max(145, cw * 0.21), h: 14, kind: 'bridge' },
          // Left & Right Edge Lifeboat Rescue Spring Pads
          { x: shipL + 14, y: deckY - 13, w: 50, h: 13, spring: true },
          { x: shipL + shipW - 64, y: deckY - 13, w: 50, h: 13, spring: true },
        ];
        this.players.forEach((p, idx) => {
          p.hp = 100;
          p.shield = false;
          p.x = cw * (0.28 + (idx / Math.max(1, this.playerCount - 1)) * 0.44);
          p.y = deckY - 22;
          p.vx = 0;
          p.vy = 0;
          p.onGround = true;
          p.angle = idx % 2 === 0 ? 0 : Math.PI;
        });
        break;
      }
      case 'avalanche': {
        this.gameTimer = 0;
        this.gameTimerMax = 0;
        this.avaY = -95;
        this.avaCamY = ch * 0.5;
        this.initAvaSnow();

        const leftX = 28;
        const rightX = cw - 28;
        const spanW = rightX - leftX;
        const gapW = Math.max(82, Math.min(112, Math.round(spanW * 0.115)));
        const floorCount = 20;
        const startY = 148;
        const tierStep = 112;

        let prevGaps: number[] = [];
        for (let tier = 0; tier < floorCount; tier++) {
          const fy = startY + tier * tierStep;
          const numGaps = tier % 3 === 1 && spanW > 520 ? 2 : 1;
          const gapsOnTier: number[] = [];

          for (let gIdx = 0; gIdx < numGaps; gIdx++) {
            let bestGx = leftX + 48 + Math.random() * Math.max(40, spanW - gapW - 96);
            for (let attempt = 0; attempt < 18; attempt++) {
              const cand =
                numGaps === 2
                  ? gIdx === 0
                    ? leftX + 36 + Math.random() * Math.max(30, spanW * 0.42 - gapW - 36)
                    : leftX + spanW * 0.54 + Math.random() * Math.max(30, spanW * 0.46 - gapW - 36)
                  : leftX + 42 + Math.random() * Math.max(40, spanW - gapW - 84);
              const farFromPrev = prevGaps.every((pg) => Math.abs(cand + gapW * 0.5 - (pg + gapW * 0.5)) > 110);
              const farFromSame = gapsOnTier.every((sg) => Math.abs(cand - sg) > gapW + 85);
              if (farFromPrev && farFromSame) {
                bestGx = cand;
                break;
              }
            }
            gapsOnTier.push(bestGx);
          }

          gapsOnTier.sort((a, b) => a - b);
          prevGaps = gapsOnTier;

          let curX = leftX;
          for (const gx of gapsOnTier) {
            const segW = gx - curX;
            if (segW > 22) {
              this.mPlats.push({ x: curX, y: fy, w: segW, h: 16, kind: 'snow' });
            }
            this.avaGaps.push({ x: gx, y: fy, w: gapW });
            curX = gx + gapW;
          }
          const tailW = rightX - curX;
          if (tailW > 22) {
            this.mPlats.push({ x: curX, y: fy, w: tailW, h: 16, kind: 'snow' });
          }
        }

        // Solid Alpine Rescue Camp finish floor at the bottom of the canyon
        this.mPlats.push({
          x: leftX,
          y: this.avaWorldH - 140,
          w: spanW,
          h: 24,
          kind: 'summit',
        });

        // Pick solid starting spots on floor 0 away from the first gap
        const topSegs = this.mPlats.filter((mp) => mp.y === startY && mp.w >= 48);
        this.players.forEach((p, idx) => {
          p.hp = 100;
          p.shield = false;
          const seg = topSegs[idx % Math.max(1, topSegs.length)];
          if (seg) {
            const frac = topSegs.length === 1 ? (idx + 1) / (this.playerCount + 1) : 0.35 + (idx % 2) * 0.3;
            p.x = Math.max(seg.x + 22, Math.min(seg.x + seg.w - 22, seg.x + seg.w * frac));
          } else {
            p.x = cw * (0.28 + (idx / Math.max(1, this.playerCount - 1)) * 0.44);
          }
          p.y = startY - 22;
          p.vx = 0;
          p.vy = 0;
          p.onGround = true;
          p.angle = idx % 2 === 0 ? 0 : Math.PI;
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
    this.zombieRevivePending = false;
    this.zombieRevivePrompt = null;
    this.callbacks?.onZombieRevivePrompt?.(null);
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
    if (this.currentMinigame === 'meteor') {
      const list: [number, number, number, number][] = [[0, this.ch - 56, this.cw, 70]];
      for (const mp of this.mPlats) {
        if (!mp.spring) list.push([mp.x, mp.y, mp.w, mp.h]);
      }
      return list;
    }
    if (this.currentMinigame === 'inferno' || this.currentMinigame === 'storm' || this.currentMinigame === 'avalanche') {
      const list: [number, number, number, number][] = [];
      for (const mp of this.mPlats) {
        if (!mp.spring) list.push([mp.x, mp.y, mp.w, mp.h]);
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
    this.deadRagdolls.push({
      rig: deadRig,
      floorY: undefined,
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

    const hasWeapon = this.currentMinigame === 'zombie';
    let handTarget1: [number, number] | undefined;
    let handTarget2: [number, number] | undefined;
    let twoHanded = false;
    if (hasWeapon || p.isAttacking) {
      handTarget1 = [rig.chest.x + Math.cos(p.angle) * 16, rig.chest.y + Math.sin(p.angle) * 16];
      if (this.currentMinigame === 'zombie' && p.weap !== 'blaster') {
        twoHanded = true;
        handTarget2 = [rig.chest.x + Math.cos(p.angle) * 23, rig.chest.y + Math.sin(p.angle) * 23];
      }
    }

    stepActiveRagdoll(rig, {
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      dir,
      aim: p.angle,
      ground: p.onGround,
      phase: p.phase,
      sq: p.sq,
      recoil: p.isAttacking ? 0.35 : 0,
      atkT: p.attackTimer,
      atkP: p.isAttacking ? 0.5 : 0,
      weapon: 'none',
      twoHanded,
      handTarget1,
      handTarget2,
      platforms: this.getSidePlatforms(),
      gravity: 0.44,
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
    this.hitStop = Math.max(this.hitStop, 3);
    this.spawnParticle(p.x, p.y, p.color, 26, 5.8, 42);
    this.spawnRing(p.x, p.y, 48, p.color, 20);
    this.triggerShake(7, 14);
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

    for (const cl of this.clouds) {
      cl.x += cl.sp;
      if (cl.x - cl.r > this.cw + 40) cl.x = -cl.r - 40;
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
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += (r.maxR - r.r) * 0.24;
      if (--r.life <= 0) this.rings.splice(i, 1);
    }
    for (const r of this.stormRain) {
      r.x -= 2.4;
      r.y += r.sp;
      if (r.y > this.ch + 20) {
        r.y = -20;
        r.x = Math.random() * (this.cw + 80);
      }
      if (r.x < -30) r.x += this.cw + 60;
    }

    const sidePlats = this.getSidePlatforms();
    const isZombie = this.currentMinigame === 'zombie';
    const isMeteor = this.currentMinigame === 'meteor';
    const isInferno = this.currentMinigame === 'inferno';
    const isStorm = this.currentMinigame === 'storm';
    const isAvalanche = this.currentMinigame === 'avalanche';

    if (isZombie || isMeteor || isInferno) {
      this.stepZombieEmbers();
    }
    if (isZombie) {
      this.updateZombieCamera();
    }
    if (isInferno) {
      this.updateInfernoCamera();
    }
    if (isAvalanche) {
      this.updateAvalancheCamera();
      for (const fl of this.avaSnow) {
        fl.x += Math.sin(this.miniTick * 0.03 + fl.y * 0.02) * 0.7;
        fl.y += fl.sp;
        if (fl.y > this.ch + 12) {
          fl.y = -12;
          fl.x = Math.random() * this.cw;
        }
      }
    }
    for (let i = this.deadRagdolls.length - 1; i >= 0; i--) {
      const entry = this.deadRagdolls[i];
      const keep = stepDeadRagdoll(
        entry.rig,
        sidePlats,
        0.42,
        isZombie ? this.zWorldW : this.cw,
        isZombie ? this.zGroundY + 90 : isInferno ? this.infWorldH + 90 : isAvalanche ? this.avaWorldH + 90 : this.ch + 40,
        true,
        false
      );
      if (!keep) {
        this.deadRagdolls.splice(i, 1);
      }
    }

    if (this.gameState === 'roundEnd') {
      this.roundEndTicks++;
    }

    if (this.gameState !== 'playing' || this.zombieRevivePending || (this.countdownActive && this.countdownTimer >= 0)) {
      for (const p of this.players) {
        if (p.alive) this.driveMiniRig(p);
      }
      return;
    }

    const mDeckY = this.ch - 56;
    for (const p of this.players) {
      if (!p.alive) continue;
      const inp = inputPlayers[p.index];

      if (isZombie) {
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
        // Unified crisp side-view platformer physics for Meteor, Inferno, Storm & Avalanche
        const cap = isAvalanche ? 5.5 : 5.35;
        const accel = p.onGround ? 1.12 : 0.78;
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

        const floorLimit = isMeteor ? mDeckY - 6 : isInferno ? this.infWorldH - 89 : 99999;
        const canDropThrough =
          p.onGround &&
          p.y + 22 < floorLimit &&
          (isMeteor || isInferno || (isStorm && p.y + 22 < this.ch - 100));

        if (inp.y > 0.68 && canDropThrough) {
          p.y += 7;
          p.vy = 1.6;
          p.onGround = false;
          p.coyoteT = 0;
        } else if (p.jumpBuf > 0 && (p.onGround || p.coyoteT > 0)) {
          p.vy = isInferno ? -12.6 : -12.0;
          p.onGround = false;
          p.coyoteT = 0;
          p.jumpBuf = 0;
          p.jumpsLeft = 0;
          p.jh = true;
          p.highJ = inp.y < -0.8;
          p.headVy += 2.8;
          this.spawnParticle(p.x, p.y + 20, '#94a3b8', 5, 2.2, 12);
          PartyAudio.play('jump');
        }
        if (inp.y >= -0.72) p.highJ = false;
        if (p.vy < -2.6 && !wantJ && !p.highJ) p.vy *= 0.87;

        const footHh = 22;
        const prevBottom = p.y + footHh;
        const prevOnGround = p.onGround;
        const preLandVy = p.vy;
        p.vy = Math.min(13.4, p.vy + 0.42 * (p.vy > 0 ? 1.14 : 1.0));
        p.vx *= p.onGround ? (Math.abs(inp.x) > 0.12 ? 0.87 : 0.77) : 0.96;
        p.x += p.vx;
        p.y += p.vy;

        p.onGround = false;
        for (const mp of this.mPlats) {
          if (mp.spring && p.x + p.radius * 0.6 > mp.x && p.x - p.radius * 0.6 < mp.x + mp.w && p.vy >= 0) {
            if (prevBottom <= mp.y + 12 && p.y + footHh >= mp.y) {
              p.y = mp.y - footHh;
              p.vy = isInferno ? -16.4 : -14.8;
              p.onGround = false;
              p.coyoteT = 0;
              p.headVy += 4;
              this.spawnParticle(p.x, mp.y, '#4ade80', 10, 3.6, 18);
              this.spawnRing(p.x, mp.y, 38, '#4ade80', 14);
              PartyAudio.play('jump');
              break;
            }
          }
        }
        if (isMeteor && p.y + footHh >= mDeckY) {
          p.y = mDeckY - footHh;
          p.vy = 0;
          p.onGround = true;
          p.coyoteT = 6;
          p.jumpsLeft = 1;
        } else if (p.vy >= 0) {
          for (const mp of this.mPlats) {
            if (mp.spring) continue;
            if (p.x + p.radius * 0.55 > mp.x && p.x - p.radius * 0.55 < mp.x + mp.w) {
              if (prevBottom <= mp.y + 12 && p.y + footHh >= mp.y) {
                p.y = mp.y - footHh;
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
        const edgePad = isInferno || isAvalanche ? 28 : 10;
        p.x = Math.max(p.radius + edgePad, Math.min(this.cw - p.radius - edgePad, p.x));
      }

      // Aim angle
      if (typeof inp.aimAngle === 'number' && !Number.isNaN(inp.aimAngle)) {
        p.angle = inp.aimAngle;
      } else {
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
      }

      if (Math.hypot(p.vx, p.vy) > 2.2) {
        p.trail.push({ x: p.x, y: p.y, life: 10 });
        if (p.trail.length > 8) p.trail.shift();
      }
      p.trail = p.trail.filter((tr) => --tr.life > 0);

      if (p.invincible > 0) p.invincible--;
      if (p.attackTimer > 0 && --p.attackTimer <= 0) p.isAttacking = false;
      if (p.dashCooldown > 0) p.dashCooldown--;
      if (p.snowCd > 0) p.snowCd--;
      if (p.weapT > 0 && --p.weapT <= 0) p.weap = 'blaster';

      this.updateMiniSprings(p, true);
    }

    // Dash / Shove mechanics (Meteor, Inferno, Storm, Avalanche)
    if (!isZombie) {
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (!p.alive) continue;
        const inp = inputPlayers[i];
        if ((inp.action || inp.releaseAction) && p.dashCooldown <= 0) {
          const dirX = Math.abs(inp.x) > 0.15 ? Math.sign(inp.x) : Math.cos(p.angle) >= 0 ? 1 : -1;
          p.vx += dirX * 11.8;
          p.vy -= 2.6;
          p.leanVx -= dirX * 4.5;
          p.dashCooldown = 34;
          p.isAttacking = true;
          p.attackTimer = 14;
          this.spawnRing(p.x, p.y, 40, p.color, 14);
          this.spawnParticle(p.x, p.y, isStorm || isAvalanche ? '#38bdf8' : '#fbbf24', 9, 3.8, 16);
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
            const mult = isStorm || isAvalanche ? 11.4 : 10.8;
            const f1 = p.isAttacking ? mult : 4.2;
            const f2 = o.isAttacking ? mult : 4.2;
            const ca = Math.cos(ang);
            o.vx += ca * f1;
            o.vy += -3.9;
            p.vx -= ca * f2;
            p.vy += -3.9;
            const rO = this.rigs[o.index];
            const rP = this.rigs[p.index];
            if (rO) applyRagdollImpulse(rO, ca * f1 * 0.78, -2.5, p.isAttacking ? 10 : 3);
            if (rP) applyRagdollImpulse(rP, -ca * f2 * 0.78, -2.5, o.isAttacking ? 10 : 3);
            if (p.isAttacking || o.isAttacking) {
              this.spawnParticle((p.x + o.x) / 2, (p.y + o.y) / 2, '#fbbf24', 10, 4, 16);
              this.triggerShake(5, 8);
            }
            PartyAudio.play('hit');
          }
        }
      }
    }

    // Projectiles (zombie blasters)
    if (isZombie) {
      this.updateProjectiles();
    }

    // Mode-specific simulation
    switch (this.currentMinigame) {
      case 'zombie': this.updateZombie(); break;
      case 'meteor': this.updateMeteor(); break;
      case 'inferno': this.updateInferno(); break;
      case 'storm': this.updateStorm(); break;
      case 'avalanche': this.updateAvalanche(); break;
    }

    if (this.currentMinigame !== 'zombie') {
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
        this.addPopup(this.zCamX, this.zCamY - 56, `${this.zMaxWaves} DALĞA TAMAMLANDI! QALİBİYYƏT!`, '#4ade80');
        for (const p of this.players) {
          if (p.alive) {
            p.score++;
            p.coins += 100;
          }
        }
        PartyAudio.play('portal');
        this.endRound();
        return;
      }

      this.zombieWave++;
      this.waveBossSpawned = false;
      this.nextBossAt = this.zombieKills + Math.min(22, 7 + Math.floor(this.zombieWave * 0.8));
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
    const maxW = this.zWorldW;
    const minY = -400;
    const maxY = this.zGroundY + 4;

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

      if (pr.life <= 0 || pr.x < 10 || pr.x > maxW - 10 || pr.y < minY || pr.y > maxY) {
        if (pr.y >= this.zGroundY) {
          this.spawnParticle(pr.x, this.zGroundY - 2, '#d4d4d8', 4, 2.2, 10);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit explosive red gasoline barrels
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

      // Hit Zombies in side-view Zombie mode
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
          this.projectiles.splice(i, 1);
          break;
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
    const isInf = this.currentMinigame === 'inferno';
    const isMet = this.currentMinigame === 'meteor';
    const maxW = isInf || isMet ? this.cw : this.zWorldW;
    const minY = isInf ? 40 : 30;
    const spawnY = isInf ? Math.min(this.infWorldH - 30, this.infLavaY - 12) : isMet ? this.ch - 32 : this.zGroundY - 10;
    for (const em of this.zEmbers) {
      em.x += em.vx + Math.sin(this.miniTick * 0.02 + em.y * 0.03) * 0.25;
      em.y += em.vy;
      if (em.y < minY || em.x < -30 || em.x > maxW + 30) {
        em.x = Math.random() * maxW;
        em.y = spawnY - Math.random() * (isInf ? 460 : 140);
      }
    }
  }

  private updateInfernoCamera() {
    const alive = this.players.filter((p) => p.alive);
    const group = alive.length > 0 ? alive : this.players;
    if (group.length === 0) return;

    let minY = Infinity;
    let sumY = 0;
    for (const p of group) {
      if (p.y < minY) minY = p.y;
      sumY += p.y;
    }
    const avgY = sumY / group.length;
    const focusY = Math.min(avgY, minY + this.ch * 0.34);
    const minCam = this.ch * 0.5;
    const maxCam = Math.max(minCam, this.infWorldH - this.ch * 0.5);
    const targetY = Math.max(minCam, Math.min(maxCam, focusY - 24));
    this.infCamY += (targetY - this.infCamY) * 0.11;
  }

  private updateAvalancheCamera() {
    const alive = this.players.filter((p) => p.alive);
    const group = alive.length > 0 ? alive : this.players;
    if (group.length === 0) return;

    let maxY = -Infinity;
    let sumY = 0;
    for (const p of group) {
      if (p.y > maxY) maxY = p.y;
      sumY += p.y;
    }
    const avgY = sumY / group.length;
    const focusY = Math.max(avgY, maxY - this.ch * 0.32);
    const minCam = this.ch * 0.5;
    const maxCam = Math.max(minCam, this.avaWorldH - this.ch * 0.5);
    const targetY = Math.max(minCam, Math.min(maxCam, focusY + 76));
    this.avaCamY += (targetY - this.avaCamY) * 0.12;
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
        ? (this.zombieWave >= this.zMaxWaves ? 14500 : 340 + this.zombieWave * 115)
        : kind === 2
          ? 140 + this.zombieWave * 12
          : kind === 1
            ? 36 + Math.floor(this.zombieWave * 3)
            : 60 + this.zombieWave * 5;
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

    const spawnEvery = Math.max(18, 76 - Math.min(12, this.zombieWave) * 5);
    const maxZombies = Math.min(32, 15 + this.zombieWave * 2);
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

      const speedWave = Math.min(34, this.zombieWave);
      const sp =
        z.kind === 3
          ? 0.72 + speedWave * 0.03
          : z.kind === 1
            ? 1.24 + speedWave * 0.04
            : z.kind === 2
              ? 0.62 + speedWave * 0.025
              : 0.78 + speedWave * 0.032;

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

    if (alivePlayers.length === 0 && !this.zombieWon && !this.zombieRevivePending) {
      if (this.netRole === 'guest') return;
      this.zombieRevivePending = true;
      const promptInfo: ZombieRevivePrompt = {
        wave: this.zombieWave,
        maxWaves: this.zMaxWaves,
        kills: this.zombieKills,
        cost: this.getZombieContinueCost(),
      };
      this.zombieRevivePrompt = promptInfo;
      resetInputs();
      this.callbacks?.onZombieRevivePrompt?.(promptInfo);
    }
  }

  private updateMeteor() {
    if (this.gameTimer > 0) this.gameTimer--;
    if (this.gameTimer <= 0) {
      for (const p of this.players) {
        if (p.alive) p.score++;
      }
      this.endRound();
      return;
    }

    const deckY = this.ch - 56;
    const elapsed = 1 - this.gameTimer / (this.gameTimerMax || 2700);

    // Spawn angled sky-piercing meteors (ignore mid-air platforms & blast all the way to deckY)
    if (--this.meteorSpawnTimer <= 0) {
      this.meteorSpawnTimer = Math.max(15, Math.round(40 - elapsed * 22));
      const alive = this.players.filter((p) => p.alive);
      let targetX = 56 + Math.random() * (this.cw - 112);
      if (alive.length > 0 && Math.random() < 0.62) {
        const tgt = alive[Math.floor(Math.random() * alive.length)];
        targetX = Math.max(46, Math.min(this.cw - 46, tgt.x + (Math.random() - 0.5) * 76));
      }
      const startX = Math.max(36, Math.min(this.cw - 36, targetX + (Math.random() - 0.5) * 140));
      const isCluster = elapsed > 0.22 && Math.random() < 0.26;
      const warnTicks = Math.max(26, Math.round(48 - elapsed * 16));
      this.meteors.push({
        x: startX,
        y: -36,
        vx: 0,
        vy: 0,
        r: isCluster ? 28 : 20 + Math.random() * 10,
        warn: warnTicks,
        maxWarn: warnTicks,
        cluster: isCluster,
        startX,
        targetX,
      });
    }

    // Spawn volcanic magma geysers erupting up through bridge cracks (anti-camping under platforms!)
    if (--this.geyserSpawnTimer <= 0) {
      this.geyserSpawnTimer = Math.max(46, Math.round(105 - elapsed * 48));
      const alive = this.players.filter((p) => p.alive);
      const count = elapsed > 0.45 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        let gx = 72 + Math.random() * (this.cw - 144);
        if (alive.length > 0 && k === 0 && Math.random() < 0.72) {
          const tgt = alive[Math.floor(Math.random() * alive.length)];
          gx = Math.max(58, Math.min(this.cw - 58, tgt.x + (Math.random() - 0.5) * 44));
        }
        this.meteorGeysers.push({
          x: gx,
          warn: 48,
          eruptT: 36,
          h: 215,
        });
      }
    }

    // Step volcanic geysers
    for (let i = this.meteorGeysers.length - 1; i >= 0; i--) {
      const g = this.meteorGeysers[i];
      if (g.warn > 0) {
        g.warn--;
        if (g.warn % 6 === 0) {
          this.spawnParticle(g.x + (Math.random() - 0.5) * 20, deckY - 3, '#fb923c', 2, 2.2, 12);
        }
        if (g.warn === 0) {
          this.triggerShake(6, 9);
          this.spawnParticle(g.x, deckY - 8, '#fde047', 14, 5.2, 18);
          PartyAudio.play('boom');
        }
        continue;
      }
      g.eruptT--;
      if (this.miniTick % 2 === 0) {
        this.spawnParticle(g.x + (Math.random() - 0.5) * 18, deckY - 16 - Math.random() * (g.h * 0.75), '#f97316', 2, 2.6, 14);
      }
      for (const p of this.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (Math.abs(p.x - g.x) < 25 + p.radius * 0.35 && p.y > deckY - g.h && p.y < deckY + 12) {
          const pushDir = p.x >= g.x ? 1 : -1;
          if (p.shield) {
            p.shield = false;
            p.invincible = 30;
            p.vx += pushDir * 6.5;
            p.vy = -10.5;
            this.spawnRing(p.x, p.y, 44, '#38bdf8', 18);
            this.addPopup(p.x, p.y - 30, 'QALXAN QORUDU!', '#38bdf8');
            PartyAudio.play('iceCrack');
          } else {
            p.hp -= 24;
            p.invincible = 28;
            p.vx += pushDir * 7.8;
            p.vy = -11.4;
            const rPl = this.rigs[p.index];
            if (rPl) applyRagdollImpulse(rPl, pushDir * 8, -8.5, 10);
            this.addPopup(p.x, p.y - 28, '-24 GEYZER!', '#fb923c');
            PartyAudio.play('hit');
            if (p.hp <= 0) this.killPlayer(p);
          }
        }
      }
      if (g.eruptT <= 0) {
        this.meteorGeysers.splice(i, 1);
      }
    }

    // Shield & Medkit pickups
    if (++this.coinSpawnTimer >= 245 && this.coins.length < 2) {
      this.coinSpawnTimer = 0;
      const kind = Math.random() < 0.5 ? 'shield' : 'medkit';
      const solidPlats = this.mPlats.filter((mp) => !mp.spring);
      const usePlat = solidPlats.length > 0 && Math.random() < 0.52;
      const chosen = usePlat ? solidPlats[Math.floor(Math.random() * solidPlats.length)] : null;
      const px = chosen ? chosen.x + 24 + Math.random() * Math.max(12, chosen.w - 48) : 110 + Math.random() * (this.cw - 220);
      const py = chosen ? chosen.y : deckY;
      this.coins.push({
        x: Math.max(60, Math.min(this.cw - 60, px)),
        y: py - 16,
        radius: 13,
        life: 540,
        diamond: kind === 'shield',
        kind,
      });
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (--c.life <= 0) { this.coins.splice(i, 1); continue; }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.radius + c.radius + 5) {
          if (c.kind === 'shield') {
            p.shield = true;
            this.addPopup(p.x, p.y - 28, 'ENERJİ QALXANI!', '#38bdf8');
          } else {
            p.hp = Math.min(100, p.hp + 35);
            this.addPopup(p.x, p.y - 28, '+35 CAN', '#4ade80');
          }
          this.spawnParticle(c.x, c.y, c.kind === 'shield' ? '#38bdf8' : '#4ade80', 14, 4, 20);
          PartyAudio.play('coin');
          this.coins.splice(i, 1);
          break;
        }
      }
    }

    // Step active meteors (piercing through elevated catwalks down to deckY!)
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      if (m.warn > 0) {
        m.warn--;
        if (m.warn === 0) {
          const dy = deckY + 32;
          const dx = m.targetX - m.startX;
          const dist = Math.hypot(dx, dy) || 1;
          const spd = 17.5 + elapsed * 4.5;
          m.x = m.startX;
          m.y = -32;
          m.vx = (dx / dist) * spd;
          m.vy = (dy / dist) * spd;
        }
        continue;
      }

      m.x += m.vx;
      m.y += m.vy;
      if (m.vy > 0) m.vy = Math.min(25, m.vy + 0.35);
      else m.vy = Math.min(22, m.vy + 0.58);

      if (this.miniTick % 2 === 0) {
        this.spawnParticle(m.x, m.y - m.r * 0.35, m.cluster ? '#fb923c' : '#fde047', 2, 1.8, 12);
      }

      // Direct mid-air / platform-perch meteor collision so elevated roofs offer ZERO free shelter!
      for (const p of this.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (Math.hypot(p.x - m.x, p.y - m.y) < m.r * 0.92 + p.radius * 0.65) {
          const ang = Math.atan2(p.y - m.y - 8, p.x - m.x);
          if (p.shield) {
            p.shield = false;
            p.invincible = 32;
            p.vx += Math.cos(ang) * 8;
            p.vy = -5.5;
            this.spawnRing(p.x, p.y, 44, '#38bdf8', 18);
            this.addPopup(p.x, p.y - 30, 'QALXAN QORUDU!', '#38bdf8');
            PartyAudio.play('iceCrack');
          } else {
            const dmg = m.r >= 25 ? 42 : 30;
            p.hp -= dmg;
            p.invincible = 28;
            p.vx += Math.cos(ang) * 9.5;
            p.vy = Math.min(p.vy, -6.2);
            const rPl = this.rigs[p.index];
            if (rPl) applyRagdollImpulse(rPl, Math.cos(ang) * 9.5, -5.5, 11);
            this.spawnParticle(p.x, p.y, '#fb923c', 12, 4.5, 18);
            this.addPopup(p.x, p.y - 28, `-${dmg}`, '#ef4444');
            PartyAudio.play('hit');
            if (p.hp <= 0) this.killPlayer(p);
          }
        }
      }

      // Main bridge deck impact
      if (m.y + m.r * 0.45 >= deckY) {
        const impactX = Math.max(24, Math.min(this.cw - 24, m.x));
        const blastR = m.r * 2.35;
        this.spawnRing(impactX, deckY, blastR * 1.15, m.cluster ? '#f97316' : '#fbbf24', 22);
        this.spawnParticle(impactX, deckY - 6, '#f97316', 24, 6.2, 26);
        this.spawnParticle(impactX, deckY - 6, '#fde047', 14, 4.4, 20);
        this.triggerShake(m.cluster ? 11 : 7, 12);
        PartyAudio.play('boom');

        this.meteorCraters.push({ x: impactX, y: deckY, r: m.r * 1.2, life: 210, maxLife: 210 });

        if (m.cluster) {
          for (const dir of [-1, 1]) {
            this.meteors.push({
              x: impactX + dir * 16,
              y: deckY - 18,
              vx: dir * (4.4 + Math.random() * 1.8),
              vy: -8.2,
              r: 13,
              warn: 0,
              maxWarn: 1,
              cluster: false,
              startX: impactX,
              targetX: impactX + dir * 95,
            });
          }
        }

        for (const p of this.players) {
          if (!p.alive || p.invincible > 0) continue;
          const dist = Math.hypot(p.x - impactX, p.y - deckY);
          if (dist < blastR + p.radius * 0.45) {
            const ang = Math.atan2(p.y - deckY - 12, p.x - impactX);
            if (p.shield) {
              p.shield = false;
              p.invincible = 32;
              p.vx += Math.cos(ang) * 7.5;
              p.vy = -5.5;
              this.spawnRing(p.x, p.y, 44, '#38bdf8', 18);
              this.addPopup(p.x, p.y - 30, 'QALXAN QORUDU!', '#38bdf8');
              PartyAudio.play('iceCrack');
            } else {
              const dmg = m.r >= 25 ? 46 : m.r <= 15 ? 24 : 34;
              p.hp -= dmg;
              p.invincible = 28;
              p.vx += Math.cos(ang) * 9.5;
              p.vy = Math.min(p.vy, -6.4);
              const rPl = this.rigs[p.index];
              if (rPl) applyRagdollImpulse(rPl, Math.cos(ang) * 9.5, -5.5, 11);
              this.addPopup(p.x, p.y - 28, `-${dmg}`, '#ef4444');
              if (p.hp <= 0) this.killPlayer(p);
            }
          }
        }
        this.meteors.splice(i, 1);
      }
    }

    for (let i = this.meteorCraters.length - 1; i >= 0; i--) {
      if (--this.meteorCraters[i].life <= 0) this.meteorCraters.splice(i, 1);
    }
  }

  private updateInferno() {
    this.gameTimer++;

    // Rising molten lava floor after brief 2s grace
    if (this.gameTimer > 120 && this.infLavaY > 250) {
      const riseSpeed = Math.min(0.68, 0.40 + (this.gameTimer / 3600) * 0.25);
      this.infLavaY -= riseSpeed;
    }

    // Falling molten metal slag droplets from ceiling chutes
    if (--this.infSlagTimer <= 0) {
      this.infSlagTimer = Math.max(28, Math.round(72 - Math.min(40, this.gameTimer / 45)));
      const alive = this.players.filter((p) => p.alive);
      let sx = 64 + Math.random() * (this.cw - 128);
      if (alive.length > 0 && Math.random() < 0.55) {
        const tgt = alive[Math.floor(Math.random() * alive.length)];
        sx = Math.max(52, Math.min(this.cw - 52, tgt.x + (Math.random() - 0.5) * 90));
      }
      const sy = Math.max(48, this.infCamY - this.ch * 0.48);
      this.infSlags.push({ x: sx, y: sy, vy: 0, r: 10 + Math.random() * 4, warn: 36 });
    }

    for (let i = this.infSlags.length - 1; i >= 0; i--) {
      const s = this.infSlags[i];
      if (s.warn > 0) {
        s.warn--;
        continue;
      }
      s.vy = Math.min(11.5, s.vy + 0.34);
      s.y += s.vy;
      if (this.miniTick % 3 === 0) {
        this.spawnParticle(s.x, s.y - 4, '#fb923c', 1, 1.4, 10);
      }
      let hit = false;
      for (const p of this.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (Math.hypot(p.x - s.x, p.y - s.y) < s.r + p.radius * 0.75) {
          if (p.shield) {
            p.shield = false;
            p.invincible = 30;
            this.spawnRing(p.x, p.y, 40, '#38bdf8', 16);
            this.addPopup(p.x, p.y - 28, 'QALXAN QORUDU!', '#38bdf8');
            PartyAudio.play('iceCrack');
          } else {
            p.hp -= 22;
            p.invincible = 26;
            p.vy = -4.2;
            this.addPopup(p.x, p.y - 26, '-22', '#f97316');
            PartyAudio.play('hit');
            if (p.hp <= 0) this.killPlayer(p);
          }
          hit = true;
          break;
        }
      }
      if (hit || s.y >= this.infLavaY) {
        this.spawnParticle(s.x, Math.min(s.y, this.infLavaY), '#fde047', 6, 3, 14);
        this.infSlags.splice(i, 1);
      }
    }

    // Pickups on foundry catwalks
    if (++this.coinSpawnTimer >= 260 && this.coins.length < 3) {
      this.coinSpawnTimer = 0;
      const validPlats = this.mPlats.filter((mp) => !mp.spring && mp.y < this.infLavaY - 90 && mp.y > 210);
      if (validPlats.length > 0) {
        const chosen = validPlats[Math.floor(Math.random() * validPlats.length)];
        const kind = Math.random() < 0.55 ? 'shield' : 'medkit';
        this.coins.push({
          x: chosen.x + 22 + Math.random() * Math.max(12, chosen.w - 44),
          y: chosen.y - 16,
          radius: 13,
          life: 620,
          diamond: kind === 'shield',
          kind,
        });
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (--c.life <= 0 || c.y > this.infLavaY) { this.coins.splice(i, 1); continue; }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.radius + c.radius + 5) {
          if (c.kind === 'shield') {
            p.shield = true;
            this.addPopup(p.x, p.y - 28, 'ENERJİ QALXANI!', '#38bdf8');
          } else {
            p.hp = Math.min(100, p.hp + 35);
            this.addPopup(p.x, p.y - 28, '+35 CAN', '#4ade80');
          }
          this.spawnParticle(c.x, c.y, c.kind === 'shield' ? '#38bdf8' : '#4ade80', 14, 4, 20);
          PartyAudio.play('coin');
          this.coins.splice(i, 1);
          break;
        }
      }
    }

    // Lava collision & Summit Escape check
    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.onGround && p.y <= 185 && Math.abs(p.x - this.cw * 0.5) <= 130) {
        p.score++;
        this.spawnRing(p.x, p.y, 110, '#4ade80', 26);
        this.spawnParticle(p.x, p.y, '#fde047', 28, 6.2, 30);
        this.addPopup(p.x, p.y - 38, 'ZİRVƏYƏ ÇATDI!', '#4ade80');
        PartyAudio.play('portal');
        this.endRound();
        return;
      }
      if (p.y + 18 >= this.infLavaY) {
        if (p.shield) {
          p.shield = false;
          p.invincible = 42;
          p.y = this.infLavaY - 24;
          p.vy = -16.8;
          this.spawnRing(p.x, p.y, 56, '#38bdf8', 20);
          this.spawnParticle(p.x, p.y, '#38bdf8', 16, 4.5, 22);
          this.addPopup(p.x, p.y - 30, 'QALXAN XİLAS ETDİ!', '#38bdf8');
          PartyAudio.play('jump');
        } else {
          this.spawnRing(p.x, this.infLavaY, 64, '#f97316', 22);
          this.spawnParticle(p.x, this.infLavaY, '#fde047', 24, 5.8, 28);
          this.addPopup(p.x, this.infLavaY - 28, 'LAVADA YANDI!', '#ef4444');
          PartyAudio.play('boom');
          this.killPlayer(p);
        }
      }
    }
  }

  private updateStorm() {
    if (this.gameTimer > 0) this.gameTimer--;
    if (this.gameTimer <= 0) {
      for (const p of this.players) {
        if (p.alive) p.score++;
      }
      this.endRound();
      return;
    }

    if (this.stormFlash > 0) this.stormFlash--;

    const cw = this.cw;
    const ch = this.ch;
    const shipL = cw * 0.10;
    const shipW = cw * 0.80;
    const deckY = ch - 94;
    const elapsed = 1 - this.gameTimer / (this.gameTimerMax || 2700);

    // Sky-to-sea Thunderbolts
    if (--this.stormBoltTimer <= 0) {
      this.stormBoltTimer = Math.max(24, Math.round(52 - elapsed * 24));
      const alive = this.players.filter((p) => p.alive);
      let bx = shipL + 36 + Math.random() * (shipW - 72);
      if (alive.length > 0 && Math.random() < 0.6) {
        const tgt = alive[Math.floor(Math.random() * alive.length)];
        bx = Math.max(shipL + 24, Math.min(shipL + shipW - 24, tgt.x + (Math.random() - 0.5) * 60));
      }
      this.stormBolts.push({ x: bx, warn: Math.max(28, Math.round(46 - elapsed * 14)), flash: 18, r: 28 });
    }

    for (let i = this.stormBolts.length - 1; i >= 0; i--) {
      const b = this.stormBolts[i];
      if (b.warn > 0) {
        b.warn--;
        if (b.warn === 0) {
          this.stormFlash = Math.max(this.stormFlash, 10);
          this.triggerShake(8, 10);
          this.spawnRing(b.x, deckY, 64, '#38bdf8', 18);
          this.spawnParticle(b.x, deckY - 8, '#e0f2fe', 18, 5.5, 22);
          PartyAudio.play('boom');
          for (const p of this.players) {
            if (!p.alive || p.invincible > 0) continue;
            if (Math.abs(p.x - b.x) < b.r + p.radius * 0.5) {
              const pushDir = p.x >= b.x ? 1 : -1;
              if (p.shield) {
                p.shield = false;
                p.invincible = 30;
                p.vx += pushDir * 7;
                p.vy = -5.5;
                this.spawnRing(p.x, p.y, 44, '#38bdf8', 18);
                this.addPopup(p.x, p.y - 30, 'QALXAN QORUDU!', '#38bdf8');
                PartyAudio.play('iceCrack');
              } else {
                p.hp -= 34;
                p.invincible = 28;
                p.vx += pushDir * 9.5;
                p.vy = Math.min(p.vy, -6.5);
                const rPl = this.rigs[p.index];
                if (rPl) applyRagdollImpulse(rPl, pushDir * 9, -6, 11);
                this.addPopup(p.x, p.y - 28, '-34 ŞİMŞƏK!', '#38bdf8');
                if (p.hp <= 0) this.killPlayer(p);
              }
            }
          }
        }
        continue;
      }
      if (--b.flash <= 0) this.stormBolts.splice(i, 1);
    }

    // Rogue Ocean Waves sweeping across the ship deck
    if (!this.stormWave) {
      if (--this.stormWaveTimer <= 0) {
        this.stormWaveTimer = Math.max(150, Math.round(235 - elapsed * 65));
        const side: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
        this.stormWave = {
          side,
          warn: 56,
          active: 58,
          x: side === -1 ? -40 : cw + 40,
        };
      }
    } else {
      const wv = this.stormWave;
      if (wv.warn > 0) {
        wv.warn--;
      } else if (wv.active > 0) {
        wv.active--;
        wv.x += (wv.side === -1 ? 1 : -1) * (cw / 52);
        if (this.miniTick % 2 === 0) {
          this.spawnParticle(wv.x, deckY - 12 - Math.random() * 48, '#bae6fd', 3, 3.6, 16);
        }
        for (const p of this.players) {
          if (!p.alive) continue;
          if (Math.abs(p.x - wv.x) < 48 && p.y > deckY - 78 && p.y < deckY + 12) {
            const push = wv.side === -1 ? 1 : -1;
            p.vx += push * 1.45;
            p.vy = Math.min(p.vy, -3.6);
            if (p.invincible <= 0 && !p.shield) {
              p.hp -= 12;
              p.invincible = 24;
              this.addPopup(p.x, p.y - 26, 'DALĞA!', '#38bdf8');
              if (p.hp <= 0) this.killPlayer(p);
            }
          }
        }
      } else {
        this.stormWave = null;
      }
    }

    // Shield & Medkit drops on ship
    if (++this.coinSpawnTimer >= 250 && this.coins.length < 2) {
      this.coinSpawnTimer = 0;
      const solidPlats = this.mPlats.filter((mp) => !mp.spring);
      const chosen = solidPlats[Math.floor(Math.random() * solidPlats.length)];
      if (chosen) {
        const kind = Math.random() < 0.5 ? 'shield' : 'medkit';
        this.coins.push({
          x: chosen.x + 28 + Math.random() * Math.max(12, chosen.w - 56),
          y: chosen.y - 16,
          radius: 13,
          life: 540,
          diamond: kind === 'shield',
          kind,
        });
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (--c.life <= 0) { this.coins.splice(i, 1); continue; }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.radius + c.radius + 5) {
          if (c.kind === 'shield') {
            p.shield = true;
            this.addPopup(p.x, p.y - 28, 'ENERJİ QALXANI!', '#38bdf8');
          } else {
            p.hp = Math.min(100, p.hp + 35);
            this.addPopup(p.x, p.y - 28, '+35 CAN', '#4ade80');
          }
          this.spawnParticle(c.x, c.y, c.kind === 'shield' ? '#38bdf8' : '#4ade80', 14, 4, 20);
          PartyAudio.play('coin');
          this.coins.splice(i, 1);
          break;
        }
      }
    }

    // Ocean fall check outside ship deck
    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.y > ch - 34) {
        this.spawnRing(p.x, ch - 30, 56, '#38bdf8', 20);
        this.spawnParticle(p.x, ch - 30, '#bae6fd', 22, 4.8, 26);
        this.addPopup(p.x, ch - 46, 'OKEANA DÜŞDÜ!', '#38bdf8');
        PartyAudio.play('boom');
        this.killPlayer(p);
      }
    }
  }

  private updateAvalanche() {
    this.gameTimer++;
    const alive = this.players.filter((p) => p.alive);

    // Wait briefly at start so players read the first gap, then descend smoothly from top to bottom
    if (this.gameTimer > 70) {
      let avaSpeed = Math.min(1.62, 1.05 + this.gameTimer * 0.00038);
      if (alive.length > 0) {
        const highestPlayerY = Math.min(...alive.map((p) => p.y));
        const gapDist = highestPlayerY - this.avaY;
        if (gapDist > 360) {
          avaSpeed = Math.max(avaSpeed, Math.min(2.45, (gapDist - 360) * 0.032));
        }
      }
      this.avaY = Math.min(this.avaWorldH - 135, this.avaY + avaSpeed);
    }

    // Subtle icy tremor + falling snow puffs ahead of the avalanche wall
    if (this.gameTimer > 70 && this.miniTick % 4 === 0) {
      this.spawnParticle(
        34 + Math.random() * (this.cw - 68),
        this.avaY + 4 + Math.random() * 14,
        Math.random() < 0.5 ? '#ffffff' : '#bae6fd',
        1,
        2.4,
        22
      );
    }

    // Spawn energy shields on snow floors ahead of the avalanche
    if (++this.coinSpawnTimer >= 220 && this.coins.length < 3) {
      this.coinSpawnTimer = 0;
      const validPlats = this.mPlats.filter(
        (mp) => mp.kind === 'snow' && mp.w >= 72 && mp.y > this.avaY + 130 && mp.y < this.avaWorldH - 190
      );
      if (validPlats.length > 0) {
        const chosen = validPlats[Math.floor(Math.random() * validPlats.length)];
        const kind = Math.random() < 0.72 ? 'shield' : 'medkit';
        this.coins.push({
          x: chosen.x + 24 + Math.random() * Math.max(12, chosen.w - 48),
          y: chosen.y - 16,
          radius: 13,
          life: 640,
          diamond: kind === 'shield',
          kind,
        });
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (--c.life <= 0 || c.y <= this.avaY) {
        this.coins.splice(i, 1);
        continue;
      }
      for (const p of this.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.radius + c.radius + 5) {
          if (c.kind === 'shield') {
            p.shield = true;
            this.addPopup(p.x, p.y - 28, 'BUZ QALXANI!', '#38bdf8');
          } else {
            p.hp = Math.min(100, p.hp + 35);
            this.addPopup(p.x, p.y - 28, '+35 CAN', '#4ade80');
          }
          this.spawnParticle(c.x, c.y, c.kind === 'shield' ? '#38bdf8' : '#4ade80', 14, 4, 20);
          PartyAudio.play('coin');
          this.coins.splice(i, 1);
          break;
        }
      }
    }

    // Rescue Base arrival & Avalanche engulf check
    const campSurfaceY = this.avaWorldH - 140;
    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.onGround && p.y >= campSurfaceY - 26) {
        p.score++;
        this.spawnRing(p.x, p.y, 120, '#4ade80', 26);
        this.spawnParticle(p.x, p.y, '#fde047', 30, 6.4, 30);
        this.addPopup(p.x, p.y - 38, 'XİLAS OLDU!', '#4ade80');
        PartyAudio.play('portal');
        this.endRound();
        return;
      }
      if (this.gameTimer > 60 && p.y - 10 <= this.avaY) {
        if (p.shield) {
          p.shield = false;
          p.invincible = 40;
          p.y = Math.min(campSurfaceY - 30, this.avaY + 42);
          p.vy = 7.4;
          this.spawnRing(p.x, p.y, 56, '#38bdf8', 20);
          this.spawnParticle(p.x, p.y, '#e0f2fe', 18, 4.6, 22);
          this.addPopup(p.x, p.y + 28, 'QALXAN QORUDU!', '#38bdf8');
          PartyAudio.play('iceCrack');
        } else {
          this.spawnRing(p.x, this.avaY + 8, 64, '#bae6fd', 22);
          this.spawnParticle(p.x, this.avaY + 8, '#ffffff', 26, 5.8, 28);
          this.addPopup(p.x, this.avaY + 34, 'QAR ÇIĞINDA QALDI!', '#38bdf8');
          PartyAudio.play('boom');
          this.killPlayer(p);
        }
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
          c.kind === 'power' ? '★' :
          '◈';
        ctx.fillText(label, 0, 0.5);
      }
      ctx.restore();
    }
  }

  private drawStyledSidePlats(ctx: CanvasRenderingContext2D, accent: string) {
    for (const mp of this.mPlats) {
      ctx.save();
      if (mp.spring) {
        ctx.fillStyle = '#14532d';
        roundRectPath(ctx, mp.x, mp.y + 4, mp.w, mp.h - 4, 3);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        roundRectPath(ctx, mp.x + 2, mp.y, mp.w - 4, 6, 3);
        ctx.fill();
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(mp.x + 12, mp.y + mp.h - 2);
        ctx.lineTo(mp.x + mp.w * 0.5, mp.y + 6);
        ctx.lineTo(mp.x + mp.w - 12, mp.y + mp.h - 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (mp.kind === 'container') {
        const col = mp.color || '#1e3a5f';
        ctx.fillStyle = col;
        roundRectPath(ctx, mp.x, mp.y, mp.w, mp.h, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        for (let rx = mp.x + 10; rx < mp.x + mp.w - 8; rx += 14) {
          ctx.fillRect(rx, mp.y + 6, 5, mp.h - 12);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(mp.x + 1, mp.y + 1, mp.w - 2, mp.h - 2);
        ctx.fillStyle = accent;
        ctx.fillRect(mp.x + 2, mp.y, mp.w - 4, 4);
      } else if (mp.kind === 'summit') {
        const pulse = 0.72 + Math.sin(this.miniTick * 0.14) * 0.25;
        const glow = ctx.createRadialGradient(mp.x + mp.w / 2, mp.y, 8, mp.x + mp.w / 2, mp.y - 24, 150);
        glow.addColorStop(0, `rgba(74,222,128,${0.36 * pulse})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(mp.x - 40, mp.y - 160, mp.w + 80, 175);

        ctx.fillStyle = '#064e3b';
        roundRectPath(ctx, mp.x, mp.y, mp.w, mp.h, 5);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        roundRectPath(ctx, mp.x + 2, mp.y, mp.w - 4, 5, 2.5);
        ctx.fill();

        // Escape portal arch
        const cx = mp.x + mp.w / 2;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, mp.y - 2, 34, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.currentMinigame === 'avalanche' ? '★ XİLAS DÜŞƏRGƏSİ ★' : '▲ ZİRVƏ ÇIXIŞI ▲', cx, mp.y - 44);
      } else if (mp.kind === 'snow') {
        // Flat frozen slate ledge with crisp white snow cap & small icicles
        const rock = ctx.createLinearGradient(0, mp.y, 0, mp.y + mp.h);
        rock.addColorStop(0, '#334155');
        rock.addColorStop(1, '#0f172a');
        ctx.fillStyle = rock;
        roundRectPath(ctx, mp.x, mp.y + 3, mp.w, mp.h - 3, 4);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        roundRectPath(ctx, mp.x, mp.y, mp.w, 6, 3);
        ctx.fill();
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(mp.x + 2, mp.y + 5, mp.w - 4, 2);
        // Subtle icicle teeth along underside
        ctx.fillStyle = 'rgba(186,230,253,0.45)';
        for (let ix = mp.x + 16; ix < mp.x + mp.w - 14; ix += 34) {
          ctx.beginPath();
          ctx.moveTo(ix - 3, mp.y + mp.h);
          ctx.lineTo(ix + 3, mp.y + mp.h);
          ctx.lineTo(ix, mp.y + mp.h + 6);
          ctx.closePath();
          ctx.fill();
        }
      } else if (mp.kind === 'bridge' || mp.kind === 'hatch') {
        ctx.fillStyle = '#1e293b';
        roundRectPath(ctx, mp.x, mp.y, mp.w, mp.h, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.4;
        for (let tx = mp.x + 10; tx < mp.x + mp.w - 14; tx += 18) {
          ctx.beginPath();
          ctx.moveTo(tx, mp.y + 4);
          ctx.lineTo(tx + 9, mp.y + mp.h - 3);
          ctx.stroke();
        }
        ctx.fillStyle = accent;
        roundRectPath(ctx, mp.x + 2, mp.y, mp.w - 4, 3.5, 2);
        ctx.fill();
      } else {
        const sg = ctx.createLinearGradient(0, mp.y, 0, mp.y + mp.h);
        sg.addColorStop(0, '#334155');
        sg.addColorStop(1, '#0f172a');
        ctx.fillStyle = sg;
        roundRectPath(ctx, mp.x, mp.y, mp.w, mp.h, 4);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(mp.x + 2, mp.y, mp.w - 4, 3.5);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        for (let rx = mp.x + 12; rx < mp.x + mp.w - 8; rx += 22) {
          ctx.beginPath(); ctx.arc(rx, mp.y + 8, 1.6, 0, Math.PI * 2); ctx.fill();
        }
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

  private drawInfernoWorld(ctx: CanvasRenderingContext2D) {
    const cw = this.cw;
    const fh = this.infWorldH;
    const t = this.miniTick * 0.04;

    // Foundry shaft side brick/steel columns
    ctx.fillStyle = '#18100d';
    ctx.fillRect(0, 0, 26, fh);
    ctx.fillRect(cw - 26, 0, 26, fh);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(24, 0, 4, fh);
    ctx.fillRect(cw - 28, 0, 4, fh);

    // Wall sconces & industrial vertical steel I-beams
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(cw * 0.24, 0, 14, fh);
    ctx.fillRect(cw * 0.76 - 14, 0, 14, fh);

    for (let wy = 160; wy < fh - 120; wy += 240) {
      for (const lx of [34, cw - 34]) {
        const glow = ctx.createRadialGradient(lx, wy, 2, lx, wy, 56);
        glow.addColorStop(0, 'rgba(251,146,60,0.42)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(lx, wy, 56, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.beginPath(); ctx.arc(lx, wy, 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Giant rotating background iron cogs
    const cogs: [number, number, number, number][] = [
      [cw * 0.2, fh - 260, 62, 1],
      [cw * 0.78, fh - 490, 74, -1],
      [cw * 0.22, fh - 770, 68, 1],
      [cw * 0.80, fh - 1030, 66, -1],
      [cw * 0.50, 320, 82, 1],
    ];
    for (const [cx, cy, r, dir] of cogs) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.25 * dir);
      ctx.fillStyle = 'rgba(41,28,24,0.85)';
      ctx.strokeStyle = 'rgba(180,83,9,0.32)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let k = 0; k < 10; k++) {
        ctx.save();
        ctx.rotate((k / 10) * Math.PI * 2);
        ctx.fillRect(-7, -r * 0.92, 14, r * 0.24);
        ctx.restore();
      }
      ctx.fillStyle = '#0f0907';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Pouring molten steel streams behind catwalks
    for (const fx of [cw * 0.16, cw * 0.5, cw * 0.84]) {
      const sg = ctx.createLinearGradient(fx - 7, 0, fx + 7, 0);
      sg.addColorStop(0, 'rgba(234,88,12,0.18)');
      sg.addColorStop(0.5, 'rgba(253,224,71,0.34)');
      sg.addColorStop(1, 'rgba(234,88,12,0.18)');
      ctx.fillStyle = sg;
      ctx.fillRect(fx - 5, 110, 10, this.infLavaY - 110);
    }

    // Drifting foundry embers
    for (const em of this.zEmbers) {
      ctx.fillStyle = `rgba(251,146,60,${em.a})`;
      ctx.beginPath(); ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2); ctx.fill();
    }

    // Foundry catwalks, springs & summit pad
    this.drawStyledSidePlats(ctx, '#f97316');
    this.drawPickups(ctx);

    // Falling molten slag droplets
    for (const s of this.infSlags) {
      if (s.warn > 0) {
        const pulse = 0.55 + Math.sin(this.miniTick * 0.4) * 0.35;
        ctx.strokeStyle = `rgba(253,224,71,${pulse * 0.55})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 6]);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, Math.min(this.infLavaY, s.y + 340)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fb923c';
        ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.save();
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.moveTo(s.x - s.r * 0.7, s.y); ctx.lineTo(s.x, s.y - s.r * 2.2); ctx.lineTo(s.x + s.r * 0.7, s.y); ctx.fill();
        ctx.restore();
      }
    }

    // Rising Molten Lava Ocean
    const ly = this.infLavaY;
    const lavaGlow = ctx.createLinearGradient(0, ly - 95, 0, ly);
    lavaGlow.addColorStop(0, 'transparent');
    lavaGlow.addColorStop(1, 'rgba(249,115,22,0.48)');
    ctx.fillStyle = lavaGlow;
    ctx.fillRect(0, ly - 95, cw, 95);

    const lavaBody = ctx.createLinearGradient(0, ly, 0, ly + 420);
    lavaBody.addColorStop(0, '#fde047');
    lavaBody.addColorStop(0.14, '#f97316');
    lavaBody.addColorStop(0.55, '#dc2626');
    lavaBody.addColorStop(1, '#450a0a');
    ctx.fillStyle = lavaBody;
    ctx.beginPath();
    ctx.moveTo(0, ly + 420);
    for (let lx = 0; lx <= cw; lx += 24) {
      ctx.lineTo(lx, ly + Math.sin(lx * 0.035 + t * 2.4) * 5);
    }
    ctx.lineTo(cw, ly + 420);
    ctx.closePath();
    ctx.fill();
  }

  private drawAvalancheWorld(ctx: CanvasRenderingContext2D) {
    const cw = this.cw;
    const wh = this.avaWorldH;
    const t = this.miniTick * 0.05;

    // Vertical alpine gorge cliff walls
    ctx.fillStyle = '#091526';
    ctx.fillRect(0, 0, 28, wh);
    ctx.fillRect(cw - 28, 0, 28, wh);
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(26, 0, 3, wh);
    ctx.fillRect(cw - 29, 0, 3, wh);

    // Warm alpine trail lanterns spaced down the gorge walls
    for (let wy = 130; wy < wh - 160; wy += 224) {
      for (const lx of [34, cw - 34]) {
        const glow = ctx.createRadialGradient(lx, wy, 2, lx, wy, 52);
        glow.addColorStop(0, 'rgba(56,189,248,0.34)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(lx, wy, 52, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath(); ctx.arc(lx, wy, 3.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Crisp glowing gap drop cues on every tier so openings are immediately readable
    const bob = Math.sin(t * 2.2) * 3;
    for (const gp of this.avaGaps) {
      const gx = gp.x + gp.w * 0.5;
      const shaft = ctx.createLinearGradient(0, gp.y - 22, 0, gp.y + 38);
      shaft.addColorStop(0, 'rgba(56,189,248,0)');
      shaft.addColorStop(0.5, 'rgba(56,189,248,0.16)');
      shaft.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = shaft;
      ctx.fillRect(gp.x + 6, gp.y - 22, gp.w - 12, 60);

      ctx.fillStyle = 'rgba(125,211,252,0.82)';
      ctx.font = '800 18px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▾', gx, gp.y + 8 + bob);
    }

    // Flat snow platforms, rescue base & pickups
    this.drawStyledSidePlats(ctx, '#38bdf8');
    this.drawPickups(ctx);

    // Roaring Snow Avalanche Wave descending from the top
    const ay = this.avaY;
    const haze = ctx.createLinearGradient(0, ay, 0, ay + 92);
    haze.addColorStop(0, 'rgba(224,242,254,0.48)');
    haze.addColorStop(1, 'transparent');
    ctx.fillStyle = haze;
    ctx.fillRect(0, ay, cw, 92);

    const wallGrad = ctx.createLinearGradient(0, ay - 460, 0, ay);
    wallGrad.addColorStop(0, '#0f172a');
    wallGrad.addColorStop(0.42, '#94a3b8');
    wallGrad.addColorStop(0.78, '#e0f2fe');
    wallGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, ay - 620, cw, 620);

    // Swirling billowing snow puffs along the avalanche crest
    const puffStep = 44;
    for (let px = -16; px <= cw + 24; px += puffStep) {
      const waveOff = Math.sin(px * 0.045 + t * 2.4) * 10 + Math.cos(px * 0.09 - t * 1.9) * 6;
      const rad = 26 + ((Math.abs(Math.round(px)) * 7) % 14);
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(px, ay - 8 + waveOff, rad * 1.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px + 8, ay - 2 + waveOff * 0.8, rad * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    // Danger line indicator at avalanche front
    ctx.strokeStyle = 'rgba(56,189,248,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= cw; px += 22) {
      const py = ay + 14 + Math.sin(px * 0.05 + t * 2.6) * 5;
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  private drawMap(ctx: CanvasRenderingContext2D) {
    const cw = this.cw;
    const ch = this.ch;
    const nowT = Date.now() * 0.002;

    if (this.currentMinigame === 'zombie') {
      this.drawZombieSky(ctx, cw, ch);
    } else if (this.currentMinigame === 'meteor') {
      const deckY = ch - 56;

      // Deep volcanic cosmic sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      sky.addColorStop(0, '#070312');
      sky.addColorStop(0.45, '#1e0b2e');
      sky.addColorStop(0.80, '#5a1808');
      sky.addColorStop(1, '#1c0703');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cw, ch);

      // Twinkling starfield
      for (let i = 0; i < 54; i++) {
        const sx = ((i * 197 + 41) % Math.max(100, Math.floor(cw)));
        const sy = ((i * 89 + 19) % Math.max(80, Math.floor(ch * 0.54)));
        const a = 0.25 + 0.6 * Math.abs(Math.sin(nowT * 1.4 + i));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(sx, sy, i % 4 === 0 ? 2.2 : 1.5, i % 4 === 0 ? 2.2 : 1.5);
      }

      // Giant ringed exoplanet with nebula glow
      const px = cw * 0.78;
      const py = ch * 0.22;
      const pHalo = ctx.createRadialGradient(px, py, 20, px, py, 96);
      pHalo.addColorStop(0, 'rgba(244,114,182,0.28)');
      pHalo.addColorStop(1, 'transparent');
      ctx.fillStyle = pHalo;
      ctx.beginPath(); ctx.arc(px, py, 96, 0, Math.PI * 2); ctx.fill();

      const pGrad = ctx.createRadialGradient(px - 14, py - 14, 8, px, py, 44);
      pGrad.addColorStop(0, '#f472b6');
      pGrad.addColorStop(0.55, '#7e22ce');
      pGrad.addColorStop(1, '#2e1065');
      ctx.fillStyle = pGrad;
      ctx.beginPath(); ctx.arc(px, py, 42, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.24);
      ctx.strokeStyle = 'rgba(253,186,116,0.5)';
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 76, 15, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      // Far volcanic ridge + erupting volcano glow cone
      ctx.fillStyle = '#180c24';
      ctx.beginPath();
      ctx.moveTo(0, deckY);
      ctx.lineTo(cw * 0.14, deckY - 125);
      ctx.lineTo(cw * 0.28, deckY - 62);
      ctx.lineTo(cw * 0.48, deckY - 165);
      ctx.lineTo(cw * 0.54, deckY - 165);
      ctx.lineTo(cw * 0.68, deckY - 76);
      ctx.lineTo(cw * 0.84, deckY - 138);
      ctx.lineTo(cw, deckY - 52);
      ctx.lineTo(cw, deckY);
      ctx.closePath();
      ctx.fill();

      // Volcano crater glow & magma fissures on distant mountains
      const vGlow = ctx.createRadialGradient(cw * 0.51, deckY - 165, 4, cw * 0.51, deckY - 165, 72);
      vGlow.addColorStop(0, 'rgba(251,146,60,0.48)');
      vGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = vGlow;
      ctx.beginPath(); ctx.arc(cw * 0.51, deckY - 165, 72, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = 'rgba(249,115,22,0.38)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cw * 0.50, deckY - 160);
      ctx.lineTo(cw * 0.47, deckY - 110);
      ctx.lineTo(cw * 0.51, deckY - 74);
      ctx.stroke();

      // Drifting volcanic embers
      for (const em of this.zEmbers) {
        ctx.fillStyle = `rgba(251,146,60,${em.a})`;
        ctx.beginPath(); ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2); ctx.fill();
      }

      // Bubbling molten magma river beneath suspension bridge
      const chasm = ctx.createLinearGradient(0, deckY, 0, ch);
      chasm.addColorStop(0, '#450a0a');
      chasm.addColorStop(0.55, '#dc2626');
      chasm.addColorStop(1, '#fb923c');
      ctx.fillStyle = chasm;
      ctx.fillRect(0, deckY, cw, ch - deckY);

      ctx.fillStyle = 'rgba(253,224,71,0.34)';
      for (let bx = 28; bx < cw; bx += 78) {
        const waveY = deckY + 26 + Math.sin(nowT * 2.2 + bx) * 4;
        ctx.beginPath(); ctx.ellipse(bx, waveY, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Suspension bridge towers & cables
      ctx.strokeStyle = 'rgba(148,163,184,0.38)';
      ctx.lineWidth = 2;
      for (const tx of [cw * 0.16, cw * 0.84]) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(tx - 6, deckY - 150, 12, 150);
        ctx.fillStyle = '#f97316';
        ctx.beginPath(); ctx.arc(tx, deckY - 152, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, deckY - 30);
        ctx.quadraticCurveTo(tx * 0.5, deckY - 62, tx, deckY - 146);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cw * 0.16, deckY - 146);
      ctx.quadraticCurveTo(cw * 0.5, deckY - 54, cw * 0.84, deckY - 146);
      ctx.stroke();

      // Main reinforced steel bridge deck
      const dg = ctx.createLinearGradient(0, deckY, 0, deckY + 20);
      dg.addColorStop(0, '#475569');
      dg.addColorStop(1, '#0f172a');
      ctx.fillStyle = dg;
      ctx.fillRect(0, deckY, cw, 22);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(0, deckY, cw, 3.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.5;
      for (let rx = 18; rx < cw; rx += 36) {
        ctx.beginPath(); ctx.moveTo(rx, deckY + 4); ctx.lineTo(rx + 18, deckY + 20); ctx.stroke();
      }

      // Catwalks & launch springs
      this.drawStyledSidePlats(ctx, '#f59e0b');

      // Molten impact craters
      for (const cr of this.meteorCraters) {
        const a = Math.min(1, cr.life / 45);
        ctx.save();
        ctx.globalAlpha = a;
        const cg = ctx.createRadialGradient(cr.x, cr.y, 2, cr.x, cr.y, cr.r);
        cg.addColorStop(0, 'rgba(253,224,71,0.78)');
        cg.addColorStop(0.55, 'rgba(249,115,22,0.48)');
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.ellipse(cr.x, cr.y + 1, cr.r, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Erupting Volcanic Magma Geysers (anti-camping!)
      for (const g of this.meteorGeysers) {
        ctx.save();
        if (g.warn > 0) {
          const prog = 1 - g.warn / 48;
          ctx.fillStyle = `rgba(251,146,60,${0.35 + prog * 0.45})`;
          ctx.beginPath(); ctx.ellipse(g.x, deckY, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(g.x, deckY); ctx.lineTo(g.x, deckY - g.h * prog); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const fade = Math.min(1, g.eruptT / 10);
          ctx.globalAlpha = fade;
          const gg = ctx.createLinearGradient(g.x - 24, 0, g.x + 24, 0);
          gg.addColorStop(0, 'rgba(234,88,12,0.12)');
          gg.addColorStop(0.3, 'rgba(249,115,22,0.78)');
          gg.addColorStop(0.5, 'rgba(254,240,138,0.95)');
          gg.addColorStop(0.7, 'rgba(249,115,22,0.78)');
          gg.addColorStop(1, 'rgba(234,88,12,0.12)');
          ctx.fillStyle = gg;
          roundRectPath(ctx, g.x - 22, deckY - g.h, 44, g.h + 4, 18);
          ctx.fill();
        }
        ctx.restore();
      }

      this.drawPickups(ctx);

      // Angled sky-piercing telegraph laser beams & meteors
      for (const m of this.meteors) {
        if (m.warn > 0) {
          const prog = 1 - m.warn / (m.maxWarn || 40);
          const blink = m.warn < 14 && Math.floor(m.warn / 3) % 2 === 0 ? 0.92 : 0.48;
          ctx.save();
          ctx.strokeStyle = m.cluster ? `rgba(249,115,22,${0.26 + prog * 0.32})` : `rgba(239,68,68,${0.22 + prog * 0.28})`;
          ctx.lineWidth = m.r * 1.1;
          ctx.beginPath(); ctx.moveTo(m.startX, 42); ctx.lineTo(m.targetX, deckY); ctx.stroke();

          ctx.strokeStyle = `rgba(253,224,71,${blink})`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([7, 7]);
          ctx.beginPath(); ctx.moveTo(m.startX, 42); ctx.lineTo(m.targetX, deckY); ctx.stroke();
          ctx.setLineDash([]);

          ctx.strokeStyle = m.cluster ? '#fb923c' : '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(m.targetX, deckY, Math.max(10, m.r * (1.25 - prog * 0.5)), 6.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          const tailAng = Math.atan2(-m.vy, -m.vx);
          ctx.translate(m.x, m.y);
          ctx.save();
          ctx.rotate(tailAng);
          const flame = ctx.createLinearGradient(0, 0, m.r * 3.3, 0);
          flame.addColorStop(0, 'rgba(253,224,71,0.95)');
          flame.addColorStop(0.45, 'rgba(249,115,22,0.6)');
          flame.addColorStop(1, 'transparent');
          ctx.fillStyle = flame;
          ctx.beginPath();
          ctx.moveTo(0, -m.r * 0.9);
          ctx.lineTo(m.r * 3.3, 0);
          ctx.lineTo(0, m.r * 0.9);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          ctx.shadowColor = m.cluster ? '#f97316' : '#fbbf24';
          ctx.shadowBlur = 18;
          const rock = ctx.createRadialGradient(-m.r * 0.25, -m.r * 0.25, 2, 0, 0, m.r);
          rock.addColorStop(0, '#fde047');
          rock.addColorStop(0.55, m.cluster ? '#ea580c' : '#7c2d12');
          rock.addColorStop(1, '#27120c');
          ctx.fillStyle = rock;
          ctx.beginPath(); ctx.arc(0, 0, m.r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      this.drawMiniHeader(ctx, `METEOR YAĞIŞI · ${Math.max(0, Math.ceil(this.gameTimer / 60))}s`, this.gameTimer / (this.gameTimerMax || 1), 220);
    } else if (this.currentMinigame === 'inferno') {
      // Backdrop gradient for Foundry Tower (world elements render inside drawInfernoWorld with camera!)
      const bg = ctx.createLinearGradient(0, 0, 0, ch);
      bg.addColorStop(0, '#0f0706');
      bg.addColorStop(0.55, '#1f0d08');
      bg.addColorStop(1, '#3b1206');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cw, ch);
    } else if (this.currentMinigame === 'storm') {
      const shipL = cw * 0.10;
      const shipW = cw * 0.80;
      const deckY = ch - 94;

      // Hurricane Midnight Sky + Lightning Sheet Flash
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      if (this.stormFlash > 0) {
        sky.addColorStop(0, '#1e3a5f');
        sky.addColorStop(0.6, '#334155');
        sky.addColorStop(1, '#0f172a');
      } else {
        sky.addColorStop(0, '#020617');
        sky.addColorStop(0.55, '#0b1528');
        sky.addColorStop(1, '#09111f');
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cw, ch);

      // Swirling Storm Clouds
      for (const cl of this.clouds) {
        ctx.fillStyle = this.stormFlash > 0 ? 'rgba(148,163,184,0.22)' : 'rgba(30,41,59,0.52)';
        ctx.beginPath(); ctx.arc(cl.x, cl.y * 0.45, cl.r * 1.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cl.x + cl.r * 0.8, cl.y * 0.45 + 6, cl.r, 0, Math.PI * 2); ctx.fill();
      }

      // Far Ocean Horizon Waves
      ctx.fillStyle = '#082f49';
      ctx.beginPath();
      ctx.moveTo(0, ch);
      for (let wx = 0; wx <= cw; wx += 32) {
        ctx.lineTo(wx, ch - 62 + Math.sin(wx * 0.025 + nowT * 2.1) * 9);
      }
      ctx.lineTo(cw, ch);
      ctx.closePath();
      ctx.fill();

      // Cargo Ship Silhouette: Mast, Rigging & Captain's Bridge Cabin
      ctx.save();
      const mastX = shipL + shipW * 0.52;
      ctx.strokeStyle = 'rgba(148,163,184,0.34)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(shipL + 34, deckY);
      ctx.lineTo(mastX, deckY - 245);
      ctx.lineTo(shipL + shipW - 28, deckY);
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(mastX - 5, deckY - 250, 10, 250);
      ctx.fillRect(mastX - 42, deckY - 205, 84, 5);
      // Blinking Storm Mast Beacon
      ctx.fillStyle = this.miniTick % 40 < 20 ? '#ef4444' : '#7f1d1d';
      ctx.beginPath(); ctx.arc(mastX, deckY - 254, 4.5, 0, Math.PI * 2); ctx.fill();

      // Captain's Bridge Cabin (behind left catwalk)
      const cabW = Math.max(106, cw * 0.14);
      ctx.fillStyle = '#1e293b';
      roundRectPath(ctx, shipL + 20, deckY - 120, cabW, 120, 6);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(shipL + 16, deckY - 122, cabW + 8, 12);
      // Warm glowing yellow cabin windows
      ctx.fillStyle = '#fde047';
      for (let wx = shipL + 30; wx < shipL + 20 + cabW - 22; wx += 24) {
        roundRectPath(ctx, wx, deckY - 102, 14, 16, 2);
        ctx.fill();
        roundRectPath(ctx, wx, deckY - 62, 12, 12, 6);
        ctx.fill();
      }

      // Main Steel Cargo Ship Hull (below deckY)
      const hullG = ctx.createLinearGradient(0, deckY, 0, ch - 18);
      hullG.addColorStop(0, '#334155');
      hullG.addColorStop(0.45, '#1e293b');
      hullG.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = hullG;
      ctx.beginPath();
      ctx.moveTo(shipL - 12, deckY - 4);
      ctx.lineTo(shipL + shipW + 18, deckY - 8);
      ctx.lineTo(shipL + shipW - 14, ch - 22);
      ctx.lineTo(shipL + 14, ch - 22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Ship Deck, Shipping Containers & Catwalks
      this.drawStyledSidePlats(ctx, '#38bdf8');
      this.drawPickups(ctx);

      // Sky-to-Sea Thunderbolts
      for (const b of this.stormBolts) {
        ctx.save();
        if (b.warn > 0) {
          const prog = 1 - b.warn / 46;
          ctx.fillStyle = `rgba(56,189,248,${0.14 + prog * 0.2})`;
          ctx.fillRect(b.x - b.r * 0.7, 40, b.r * 1.4, deckY - 40);
          ctx.strokeStyle = 'rgba(186,230,253,0.75)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath(); ctx.moveTo(b.x, 40); ctx.lineTo(b.x, deckY); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.globalAlpha = Math.max(0, b.flash / 18);
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 22;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(b.x, 0);
          let curX = b.x;
          for (let sy = 40; sy <= deckY; sy += 46) {
            curX = b.x + Math.sin(sy * 0.17 + this.miniTick) * 16;
            ctx.lineTo(curX, sy);
          }
          ctx.lineTo(b.x, deckY);
          ctx.stroke();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 10;
          ctx.globalAlpha *= 0.4;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Rogue Ocean Wave sweeping the deck
      if (this.stormWave) {
        const wv = this.stormWave;
        ctx.save();
        if (wv.warn > 0) {
          const wx = wv.side === -1 ? 26 : cw - 26;
          const pulse = 0.55 + Math.sin(this.miniTick * 0.35) * 0.38;
          ctx.fillStyle = `rgba(56,189,248,${pulse})`;
          ctx.font = '800 18px "Barlow Condensed", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(wv.side === -1 ? '🌊 DALĞA →' : '← DALĞA 🌊', wx + (wv.side === -1 ? 36 : -36), deckY - 38);
        } else {
          const wg = ctx.createLinearGradient(wv.x - 42, 0, wv.x + 42, 0);
          wg.addColorStop(0, 'rgba(14,165,233,0.18)');
          wg.addColorStop(0.5, 'rgba(186,230,253,0.82)');
          wg.addColorStop(1, 'rgba(14,165,233,0.18)');
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.ellipse(wv.x, deckY - 34, 40, 48, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Foreground Rolling Ocean Swell
      const seaGrad = ctx.createLinearGradient(0, ch - 46, 0, ch);
      seaGrad.addColorStop(0, '#0284c7');
      seaGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = seaGrad;
      ctx.beginPath();
      ctx.moveTo(0, ch);
      for (let wx = 0; wx <= cw; wx += 26) {
        ctx.lineTo(wx, ch - 32 + Math.sin(wx * 0.032 - nowT * 3.1) * 7);
      }
      ctx.lineTo(cw, ch);
      ctx.closePath();
      ctx.fill();

      // Diagonal Hurricane Rain
      ctx.strokeStyle = 'rgba(186,230,253,0.34)';
      ctx.lineWidth = 1.4;
      for (const r of this.stormRain) {
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 4, r.y + r.len);
        ctx.stroke();
      }

      this.drawMiniHeader(ctx, `FIRTINA GƏMİSİ · ${Math.max(0, Math.ceil(this.gameTimer / 60))}s`, this.gameTimer / (this.gameTimerMax || 1), 230);
    } else if (this.currentMinigame === 'avalanche') {
      // Winter Dusk Alpine Gorge Sky + Aurora (world geometry renders inside drawAvalancheWorld with camera!)
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      sky.addColorStop(0, '#041224');
      sky.addColorStop(0.55, '#0b223d');
      sky.addColorStop(1, '#102a43');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cw, ch);

      // Northern Aurora band
      const aur = ctx.createRadialGradient(cw * 0.55, ch * 0.2, 20, cw * 0.55, ch * 0.2, cw * 0.55);
      aur.addColorStop(0, 'rgba(56,189,248,0.22)');
      aur.addColorStop(0.55, 'rgba(34,211,238,0.08)');
      aur.addColorStop(1, 'transparent');
      ctx.fillStyle = aur;
      ctx.fillRect(0, 0, cw, ch);

      // Distant parallax snow mountain silhouettes
      const camRatio = Math.max(0, Math.min(1, this.avaCamY / this.avaWorldH));
      const mShift = camRatio * 48;
      ctx.fillStyle = '#07172a';
      ctx.beginPath();
      ctx.moveTo(0, ch);
      ctx.lineTo(0, ch * 0.52 - mShift);
      ctx.lineTo(cw * 0.18, ch * 0.28 - mShift);
      ctx.lineTo(cw * 0.36, ch * 0.48 - mShift);
      ctx.lineTo(cw * 0.56, ch * 0.22 - mShift);
      ctx.lineTo(cw * 0.78, ch * 0.46 - mShift);
      ctx.lineTo(cw, ch * 0.32 - mShift);
      ctx.lineTo(cw, ch);
      ctx.closePath();
      ctx.fill();

      // Screen-space falling snowflakes
      ctx.fillStyle = 'rgba(241,245,249,0.72)';
      for (const fl of this.avaSnow) {
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.fill();
      }
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

    if (p.dashCooldown > 0 && this.currentMinigame !== 'zombie') {
      const cdRatio = Math.max(0, Math.min(1, 1 - p.dashCooldown / 34));
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 22 - hopOffset, 13, -Math.PI / 2, -Math.PI / 2 + cdRatio * Math.PI * 2);
      ctx.stroke();
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

    const hasWeapon = this.currentMinigame === 'zombie';

    ctx.save();
    drawRagdollStickman(ctx, rig, {
      color: p.color,
      shield: p.shield,
      weapon: 'none',
      twoHanded: false,
      time: this.miniTick,
    });

    if (hasWeapon) {
      ctx.save();
      ctx.translate(rig.rHand.x, rig.rHand.y);
      ctx.rotate(p.angle);
      if (p.weap === 'grenade') {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.arc(4, 0, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(2, -7, 4, 3);
      } else {
        ctx.fillStyle = p.weap === 'shotgun' ? '#f59e0b' : p.weap === 'rapid' ? '#38bdf8' : '#71717a';
        ctx.fillRect(-2, -3.5, 16, 6);
      }
      ctx.restore();
    }
    ctx.restore();

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

    if (this.currentMinigame === 'zombie') {
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(this.zCamZoom, this.zCamZoom);
      ctx.translate(-this.zCamX, -this.zCamY);
      this.drawZombieWorld(ctx);
    } else if (this.currentMinigame === 'inferno') {
      ctx.translate(0, -this.infCamY + ch / 2);
      this.drawInfernoWorld(ctx);
    } else if (this.currentMinigame === 'avalanche') {
      ctx.translate(0, -this.avaCamY + ch / 2);
      this.drawAvalancheWorld(ctx);
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
      } else if (pr.kind === 'laser') {
        ctx.strokeStyle = col;
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pr.x - pr.vx * 1.4, pr.y - pr.vy * 1.4);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.2, 0, Math.PI * 2); ctx.fill();
      } else if (pr.kind === 'shell') {
        ctx.strokeStyle = col;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pr.x - pr.vx * 1.1, pr.y - pr.vy * 1.1);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.radius || 5, 0, Math.PI * 2); ctx.fill();
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
    } else if (this.currentMinigame === 'inferno') {
      const alive = this.players.filter((p) => p.alive);
      const topY = alive.length > 0 ? Math.min(...alive.map((p) => p.y)) : this.infWorldH - 107;
      const pct = Math.max(0, Math.min(100, Math.round(((this.infWorldH - 107 - topY) / (this.infWorldH - 107 - 163)) * 100)));
      this.drawMiniHeader(ctx, `VULKAN QÜLLƏSİ · ZİRVƏ ${pct}%`, pct / 100, 238);
    } else if (this.currentMinigame === 'avalanche') {
      const alive = this.players.filter((p) => p.alive);
      const startFootY = 126;
      const goalFootY = this.avaWorldH - 162;
      const botY = alive.length > 0 ? Math.max(...alive.map((p) => p.y)) : startFootY;
      const pct = Math.max(0, Math.min(100, Math.round(((botY - startFootY) / (goalFootY - startFootY)) * 100)));
      this.drawMiniHeader(ctx, `QAR ÇIĞINDAN QAÇIŞ · ENİŞ ${pct}%`, pct / 100, 252);
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
              ? `${this.zMaxWaves} DALĞA TAMAMLANDI!`
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
      const isZombie = this.currentMinigame === 'zombie';
      const isInferno = this.currentMinigame === 'inferno';
      const isAvalanche = this.currentMinigame === 'avalanche';
      this.miniTick++;
      if (isZombie || this.currentMinigame === 'meteor' || isInferno) {
        this.stepZombieEmbers();
      }
      if (isZombie) {
        this.updateZombieCamera();
      }
      if (isInferno) {
        this.updateInfernoCamera();
      }
      if (isAvalanche) {
        this.updateAvalancheCamera();
        for (const fl of this.avaSnow) {
          fl.x += Math.sin(this.miniTick * 0.03 + fl.y * 0.02) * 0.7;
          fl.y += fl.sp;
          if (fl.y > this.ch + 12) {
            fl.y = -12;
            fl.x = Math.random() * this.cw;
          }
        }
      }
      for (const r of this.stormRain) {
        r.x -= 2.4;
        r.y += r.sp;
        if (r.y > this.ch + 20) {
          r.y = -20;
          r.x = Math.random() * (this.cw + 80);
        }
        if (r.x < -30) r.x += this.cw + 60;
      }
      for (const p of this.players) {
        if (p.alive) {
          this.updateMiniSprings(p, true);
          this.driveMiniRig(p);
        }
      }
      const sidePlats = this.getSidePlatforms();
      for (let i = this.deadRagdolls.length - 1; i >= 0; i--) {
        const entry = this.deadRagdolls[i];
        if (
          !stepDeadRagdoll(
            entry.rig,
            sidePlats,
            0.42,
            isZombie ? this.zWorldW : this.cw,
            isZombie ? this.zGroundY + 90 : isInferno ? this.infWorldH + 90 : isAvalanche ? this.avaWorldH + 90 : this.ch + 40,
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
