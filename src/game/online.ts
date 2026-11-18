import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import Peer, { DataConnection } from 'peerjs';
import { db, ensureOnlineAuthUid } from '../firebase';
import { PartyAudio } from './audio';
import { PartyEconomy } from './economy';
import { FightSerializedState } from './fightEngine';
import { MiniSerializedState } from './minigameEngine';
import { inputPlayers, MapId, MinigameId, PLAYER_NAMES, WeaponChoice } from './types';

export const MAX_ONLINE_SLOTS = 4;
const REG_ID = 'stickparty-registry-v1x';
const JOIN_TIMEOUT_MS = 12000;
const CREATE_TIMEOUT_MS = 12000;
const RECONNECT_DELAY_MS = 1400;
const MAX_RECONNECT_ATTEMPTS = 2;
const STALE_ROOM_TTL_MS = 16000;
const FS_ROOM_STALE_MS = 90000;
const FS_HEARTBEAT_MS = 20000;
const ANNOUNCE_INTERVAL_MS = 4000;

export const RTC_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  iceCandidatePoolSize: 8,
};

export const PEER_CONFIG: import('peerjs').PeerJSOption = {
  config: RTC_ICE_CONFIG,
};

export function normalizeRoomName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o');
}

export function roomPeerId(name: string): string {
  return (
    'stickparty-' +
    [...normalizeRoomName(name)]
      .map((c) => (/[a-z0-9]/.test(c) ? c : '_' + c.charCodeAt(0).toString(16)))
      .join('') +
    'x'
  );
}

export function firestoreRoomId(name: string): string {
  const slug = normalizeRoomName(name)
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const hex = [...normalizeRoomName(name)]
    .map((c) => c.charCodeAt(0).toString(16))
    .join('')
    .slice(0, 12);
  return `r_${(slug || 'room').slice(0, 32)}_${hex || '0'}`.slice(0, 60);
}

export interface LobbyConfig {
  mode: 'vs' | 'minigames';
  map: MapId;
  rounds: number;
  weapons: WeaponChoice[];
  loot: boolean;
  mini: MinigameId;
}

export interface DiscoveredRoom {
  id: string;
  name: string;
  lock: boolean;
  n: number;
  t: number;
}

export interface OnlineSnapshot {
  onlineMode: boolean;
  isHost: boolean;
  guestIndex: number;
  guestReady: boolean;
  roomName: string;
  lobbySlots: (string | null)[];
  lobbyReady: boolean[];
  cfg: LobbyConfig;
  discoveredRooms: DiscoveredRoom[];
  roomsLoading: boolean;
  creating: boolean;
  joining: boolean;
}

export interface OnlineHandlers {
  onToast: (msg: string, tone?: 'info' | 'error' | 'success') => void;
  onLobbyJoined: () => void;
  onStartGame: (cfg: LobbyConfig, playerCount: number) => void;
  onFightState: (s: FightSerializedState) => void;
  onMiniState: (s: MiniSerializedState) => void;
  onRematch: () => void;
  onDisconnectToHome: () => void;
}

interface NetLink {
  open: boolean;
  slot?: number;
  guestUid?: string;
  send: (data: unknown) => void;
  close: () => void;
}

interface FsSignalDoc {
  guestUid: string;
  guestName: string;
  password?: string;
  offer?: string;
  answer?: string;
  guestCandidates?: string[];
  hostCandidates?: string[];
  status?: 'pending' | 'answered' | 'rejected';
  updatedAt: number;
}

interface FsRoomDoc {
  id: string;
  name: string;
  hostUid: string;
  hostName: string;
  locked: boolean;
  playerCount: number;
  status: 'lobby' | 'playing';
  updatedAt: number;
}

class OnlineManager {
  // PeerJS fallback fields
  private peer: Peer | null = null;
  private peerGuestConn: DataConnection | null = null;
  private regPeer: Peer | null = null;
  private regPending = false;
  private regAttempted = false;
  private regRooms = new Map<string, DiscoveredRoom>();
  private annConn: DataConnection | null = null;
  private annTimer: ReturnType<typeof setInterval> | null = null;

  // Unified P2P links (both Firestore WebRTC DataChannels and PeerJS DataConnections)
  private guestLink: NetLink | null = null;
  private hostLinks: NetLink[] = [];

  // Firestore WebRTC signaling fields
  private fsRoomId: string | null = null;
  private fsUid: string | null = null;
  private fsHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private fsSignalsUnsub: (() => void) | null = null;
  private fsGuestSignalUnsub: (() => void) | null = null;
  private fsRoomsWatchUnsub: (() => void) | null = null;
  private fsPeerConns = new Map<string, RTCPeerConnection>();
  private fsAppliedCandCounts = new Map<string, number>();
  private fsRejectedUids = new Set<string>();
  private fsGuestPc: RTCPeerConnection | null = null;

  private isHostFlag = false;
  private onlineFlag = false;
  private guestIdx = 1;
  private guestReadyFlag = false;
  private roomName = '';
  private roomPassword = '';
  private lobbySlots: (string | null)[] = [null, null, null, null];
  private lobbyReady: boolean[] = [true, false, false, false];
  private cfg: LobbyConfig = {
    mode: 'vs',
    map: 'abandoned_city',
    rounds: 3,
    weapons: ['sword', 'sword', 'sword', 'sword'],
    loot: false,
    mini: 'sumo',
  };
  private netFrame = 0;
  private joinTimer: ReturnType<typeof setTimeout> | null = null;
  private createTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private reconnecting = false;
  private savedJoinPassword = '';
  private sessionSeq = 0;

  private discoveredRooms: DiscoveredRoom[] = [];
  private roomsLoading = false;
  private creating = false;
  private joining = false;

  private listeners = new Set<() => void>();
  private handlers: OnlineHandlers | null = null;
  private isGameActive: () => boolean = () => false;

  private snapshotCache: OnlineSnapshot = {
    onlineMode: false,
    isHost: false,
    guestIndex: 1,
    guestReady: false,
    roomName: '',
    lobbySlots: [null, null, null, null],
    lobbyReady: [true, false, false, false],
    cfg: { ...this.cfg, weapons: [...this.cfg.weapons] },
    discoveredRooms: [],
    roomsLoading: false,
    creating: false,
    joining: false,
  };

  setHandlers(handlers: OnlineHandlers, isGameActive: () => boolean) {
    this.handlers = handlers;
    this.isGameActive = isGameActive;
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getSnapshot = (): OnlineSnapshot => this.snapshotCache;

  private emit() {
    this.snapshotCache = {
      onlineMode: this.onlineFlag,
      isHost: this.isHostFlag,
      guestIndex: this.guestIdx,
      guestReady: this.guestReadyFlag,
      roomName: this.roomName,
      lobbySlots: [...this.lobbySlots],
      lobbyReady: [...this.lobbyReady],
      cfg: { ...this.cfg, weapons: [...this.cfg.weapons] },
      discoveredRooms: [...this.discoveredRooms],
      roomsLoading: this.roomsLoading,
      creating: this.creating,
      joining: this.joining,
    };
    this.listeners.forEach((cb) => cb());
  }

  isOnline = () => this.onlineFlag;
  isHost = () => this.isHostFlag;
  guestIndex = () => this.guestIdx;
  connectedCount = () =>
    this.isHostFlag
      ? Math.max(1, 1 + this.hostLinks.filter((c) => c.open).length)
      : Math.max(2, this.lobbySlots.filter(Boolean).length || 2);

  claimRegistry() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (this.regPeer || this.regPending || this.regAttempted) return;
    this.regPending = true;
    this.regAttempted = true;
    try {
      const p = new Peer(REG_ID, PEER_CONFIG);
      p.on('open', () => {
        this.regPending = false;
        this.regPeer = p;
      });
      p.on('error', () => {
        this.regPending = false;
        try {
          p.destroy();
        } catch {
          // ignore
        }
        if (this.regPeer === p) this.regPeer = null;
      });
      p.on('close', () => {
        if (this.regPeer === p) this.regPeer = null;
      });
      p.on('disconnected', () => {
        try {
          p.reconnect();
        } catch {
          // ignore
        }
      });
      p.on('connection', (c) => {
        c.on('data', (raw) => {
          const d = raw as Record<string, unknown> | null;
          if (!d) return;
          if (d.type === 'reg' && typeof d.id === 'string') {
            this.regRooms.set(d.id, {
              id: d.id,
              name: String(d.name || '').slice(0, 20),
              lock: !!d.lock,
              n: Number(d.n) || 1,
              t: Date.now(),
            });
          } else if (d.type === 'unreg' && typeof d.id === 'string') {
            this.regRooms.delete(d.id);
          } else if (d.type === 'list') {
            const now = Date.now();
            for (const [k, v] of this.regRooms) {
              if (now - v.t > STALE_ROOM_TTL_MS) this.regRooms.delete(k);
            }
            try {
              c.send({ type: 'rooms', rooms: [...this.regRooms.values()] });
            } catch {
              // ignore
            }
          }
        });
      });
    } catch {
      this.regPending = false;
    }
  }

  watchRooms(): () => void {
    this.stopWatchRooms();
    let stopped = false;

    void (async () => {
      const uid = await ensureOnlineAuthUid();
      if (stopped) return;
      if (uid) {
        this.roomsLoading = true;
        this.emit();
        this.fsRoomsWatchUnsub = onSnapshot(
          collection(db, 'rooms'),
          (snap) => {
            if (stopped) return;
            const now = Date.now();
            const list: DiscoveredRoom[] = [];
            snap.forEach((docSnap) => {
              const r = docSnap.data() as FsRoomDoc;
              if (
                r &&
                r.status === 'lobby' &&
                typeof r.updatedAt === 'number' &&
                now - r.updatedAt < FS_ROOM_STALE_MS
              ) {
                list.push({
                  id: r.id,
                  name: r.name,
                  lock: !!r.locked,
                  n: Number(r.playerCount) || 1,
                  t: r.updatedAt,
                });
              }
            });
            list.sort((a, b) => b.t - a.t);
            this.discoveredRooms = list;
            this.roomsLoading = false;
            this.emit();
          },
          () => {
            if (stopped) return;
            this.roomsLoading = false;
            this.refreshRoomsPeerJs();
          }
        );
      } else {
        this.refreshRoomsPeerJs();
      }
    })();

    return () => {
      stopped = true;
      this.stopWatchRooms();
    };
  }

  private stopWatchRooms() {
    if (this.fsRoomsWatchUnsub) {
      this.fsRoomsWatchUnsub();
      this.fsRoomsWatchUnsub = null;
    }
  }

  async refreshRooms() {
    this.roomsLoading = true;
    this.emit();
    const uid = await ensureOnlineAuthUid();
    if (uid) {
      try {
        const snap = await getDocs(collection(db, 'rooms'));
        const now = Date.now();
        const list: DiscoveredRoom[] = [];
        snap.forEach((docSnap) => {
          const r = docSnap.data() as FsRoomDoc;
          if (
            r &&
            r.status === 'lobby' &&
            typeof r.updatedAt === 'number' &&
            now - r.updatedAt < FS_ROOM_STALE_MS
          ) {
            list.push({
              id: r.id,
              name: r.name,
              lock: !!r.locked,
              n: Number(r.playerCount) || 1,
              t: r.updatedAt,
            });
          }
        });
        list.sort((a, b) => b.t - a.t);
        this.discoveredRooms = list;
        this.roomsLoading = false;
        this.emit();
        return;
      } catch {
        // Fallback to PeerJS registry if Firestore rooms rules not active yet
      }
    }
    this.refreshRoomsPeerJs();
  }

  private refreshRoomsPeerJs() {
    let done = false;
    let lp: Peer | null = null;
    const finish = (rooms: DiscoveredRoom[] | null) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      try {
        lp?.destroy();
      } catch {
        // ignore
      }
      this.roomsLoading = false;
      if (rooms) this.discoveredRooms = rooms;
      else this.claimRegistry();
      this.emit();
    };
    const timeout = setTimeout(() => finish(null), 4500);
    try {
      lp = new Peer(PEER_CONFIG);
      lp.on('error', () => finish(null));
      lp.on('open', () => {
        if (!lp) return;
        const c = lp.connect(REG_ID);
        c.on('open', () => c.send({ type: 'list' }));
        c.on('data', (raw) => {
          const d = raw as { type?: string; rooms?: DiscoveredRoom[] } | null;
          if (d && d.type === 'rooms') finish(d.rooms || []);
        });
        c.on('error', () => finish(null));
      });
    } catch {
      finish(null);
    }
  }

  private announceStart() {
    this.announceStop();
    const send = () => {
      if (!this.peer || !this.isHostFlag || !this.roomName) return;
      try {
        if (!this.annConn || !this.annConn.open) {
          if (this.annConn) return;
          const c = this.peer.connect(REG_ID);
          this.annConn = c;
          c.on('open', send);
          c.on('error', () => {
            this.annConn = null;
          });
          c.on('close', () => {
            this.annConn = null;
          });
          setTimeout(() => {
            if (this.annConn === c && !c.open) this.annConn = null;
          }, 5000);
          return;
        }
        this.annConn.send({
          type: 'reg',
          id: this.peer.id,
          name: this.roomName,
          lock: !!this.roomPassword,
          n: this.connectedCount(),
        });
      } catch {
        // ignore
      }
    };
    send();
    this.annTimer = setInterval(send, ANNOUNCE_INTERVAL_MS);
  }

  private announceStop() {
    if (this.annTimer) {
      clearInterval(this.annTimer);
      this.annTimer = null;
    }
    try {
      if (this.annConn && this.annConn.open && this.peer) {
        this.annConn.send({ type: 'unreg', id: this.peer.id });
      }
    } catch {
      // ignore
    }
    try {
      this.annConn?.close();
    } catch {
      // ignore
    }
    this.annConn = null;
  }

  private cleanupFirestoreResources() {
    if (this.fsHeartbeatTimer) {
      clearInterval(this.fsHeartbeatTimer);
      this.fsHeartbeatTimer = null;
    }
    if (this.fsSignalsUnsub) {
      this.fsSignalsUnsub();
      this.fsSignalsUnsub = null;
    }
    if (this.fsGuestSignalUnsub) {
      this.fsGuestSignalUnsub();
      this.fsGuestSignalUnsub = null;
    }
    for (const pc of this.fsPeerConns.values()) {
      try {
        pc.close();
      } catch {
        // ignore
      }
    }
    this.fsPeerConns.clear();
    this.fsAppliedCandCounts.clear();
    this.fsRejectedUids.clear();

    if (this.fsGuestPc) {
      try {
        this.fsGuestPc.close();
      } catch {
        // ignore
      }
      this.fsGuestPc = null;
    }

    const rId = this.fsRoomId;
    const uId = this.fsUid;
    const wasHost = this.isHostFlag;
    this.fsRoomId = null;
    this.fsUid = null;

    if (rId && uId) {
      if (wasHost) {
        void deleteDoc(doc(db, 'rooms', rId)).catch(() => {});
      } else {
        void deleteDoc(doc(db, 'rooms', rId, 'signals', uId)).catch(() => {});
      }
    }
  }

  cleanup() {
    this.sessionSeq++;
    this.announceStop();
    if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
    if (this.createTimer) { clearTimeout(this.createTimer); this.createTimer = null; }

    this.cleanupFirestoreResources();

    const cs = this.hostLinks.slice();
    const gl = this.guestLink;
    const gc = this.peerGuestConn;
    const p = this.peer;
    this.hostLinks = [];
    this.guestLink = null;
    this.peerGuestConn = null;
    this.peer = null;
    this.onlineFlag = false;
    this.isHostFlag = false;
    this.guestIdx = 1;
    this.guestReadyFlag = false;
    this.creating = false;
    this.joining = false;
    this.reconnecting = false;
    this.reconnectAttempts = 0;
    this.roomName = '';
    this.roomPassword = '';
    this.savedJoinPassword = '';
    this.lobbySlots = [null, null, null, null];
    this.lobbyReady = [true, false, false, false];
    PLAYER_NAMES[0] = PartyEconomy.name() || 'P1';
    PLAYER_NAMES[1] = 'P2';
    PLAYER_NAMES[2] = 'P3';
    PLAYER_NAMES[3] = 'P4';
    cs.forEach((x) => {
      try {
        x.close();
      } catch {
        // ignore
      }
    });
    try {
      gl?.close();
    } catch {
      // ignore
    }
    try {
      gc?.close();
    } catch {
      // ignore
    }
    try {
      p?.destroy();
    } catch {
      // ignore
    }
    this.emit();
  }

  private wrapPeerConn(c: DataConnection): NetLink {
    const link: NetLink = {
      get open() {
        return c.open;
      },
      send: (d: unknown) => {
        if (c.open) {
          try {
            c.send(d);
          } catch {
            // ignore
          }
        }
      },
      close: () => {
        try {
          c.close();
        } catch {
          // ignore
        }
      },
    };
    return link;
  }

  private wrapRtcChannel(dc: RTCDataChannel, pc: RTCPeerConnection, guestUid?: string): NetLink {
    return {
      get open() {
        return dc.readyState === 'open';
      },
      guestUid,
      send: (d: unknown) => {
        if (dc.readyState === 'open') {
          try {
            dc.send(JSON.stringify(d));
          } catch {
            // ignore
          }
        }
      },
      close: () => {
        try {
          dc.close();
        } catch {
          // ignore
        }
        try {
          pc.close();
        } catch {
          // ignore
        }
      },
    };
  }

  private attachHostLink(link: NetLink, incomingPayload: Record<string, unknown>) {
    if (this.hostLinks.filter((x) => x.open).length >= MAX_ONLINE_SLOTS - 1) {
      link.send({ type: 'full' });
      setTimeout(() => link.close(), 200);
      return;
    }
    if ((incomingPayload.password || '') !== this.roomPassword) {
      link.send({ type: 'authFail' });
      setTimeout(() => link.close(), 200);
      return;
    }
    let freeSlot = -1;
    for (let s = 1; s < MAX_ONLINE_SLOTS; s++) {
      if (!this.lobbySlots[s]) {
        freeSlot = s;
        break;
      }
    }
    if (freeSlot < 0) freeSlot = this.hostLinks.length + 1;
    const gName = String(incomingPayload.name || '').trim().slice(0, 14) || `P${freeSlot + 1}`;
    const normIncoming = gName.toLowerCase();
    const hasDup = this.lobbySlots.some(
      (existing) => existing !== null && existing.trim().toLowerCase() === normIncoming
    );
    if (hasDup) {
      link.send({ type: 'dupName' });
      setTimeout(() => link.close(), 200);
      return;
    }
    link.slot = freeSlot;
    this.hostLinks.push(link);
    this.lobbySlots[freeSlot] = gName;
    this.lobbyReady[freeSlot] = false;
    PLAYER_NAMES[freeSlot] = gName;
    link.send({
      type: 'authOk',
      slot: freeSlot,
      name: PartyEconomy.name() || 'Host',
      slots: this.lobbySlots,
      ready: this.lobbyReady,
      cfg: this.cfg,
    });
    this.broadcastLobby();
    this.updateFirestoreRoomMeta();
    this.announceStart();
  }

  private handleHostLinkClose(link: NetLink) {
    const idx = this.hostLinks.indexOf(link);
    if (idx < 0) return;
    this.hostLinks.splice(idx, 1);
    const slot = link.slot;
    if (slot && slot >= 1 && slot < MAX_ONLINE_SLOTS) {
      this.lobbySlots[slot] = null;
      this.lobbyReady[slot] = false;
      PLAYER_NAMES[slot] = `P${slot + 1}`;
    }
    if (link.guestUid && this.fsRoomId) {
      const pc = this.fsPeerConns.get(link.guestUid);
      if (pc) {
        try {
          pc.close();
        } catch {
          // ignore
        }
        this.fsPeerConns.delete(link.guestUid);
      }
      this.fsAppliedCandCounts.delete(link.guestUid);
      void deleteDoc(doc(db, 'rooms', this.fsRoomId, 'signals', link.guestUid)).catch(() => {});
    }
    this.broadcastLobby();
    this.updateFirestoreRoomMeta();
    this.announceStart();
    if (this.isGameActive() && this.hostLinks.length === 0) {
      this.handlers?.onToast('Rəqib oyundan ayrıldı', 'error');
      this.cleanup();
      this.handlers?.onDisconnectToHome();
    }
  }

  private updateFirestoreRoomMeta(statusOverride?: 'lobby' | 'playing') {
    if (!this.isHostFlag || !this.fsRoomId || !this.fsUid) return;
    const roomRef = doc(db, 'rooms', this.fsRoomId);
    void updateDoc(roomRef, {
      playerCount: Math.max(1, Math.min(4, this.connectedCount())),
      status: statusOverride || (this.isGameActive() ? 'playing' : 'lobby'),
      updatedAt: Date.now(),
    }).catch(() => {});
  }

  createRoom(name: string, password: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      this.handlers?.onToast('Otaq adı daxil edin', 'error');
      return;
    }
    this.cleanup();
    const seq = ++this.sessionSeq;
    this.isHostFlag = true;
    this.onlineFlag = true;
    this.creating = true;
    this.roomName = cleanName;
    this.roomPassword = password;
    this.emit();

    this.createTimer = setTimeout(() => {
      if (this.creating && this.sessionSeq === seq) {
        this.handlers?.onToast('Serverə qoşulmaq çox uzun çəkdi — yenidən cəhd edin', 'error');
        this.cleanup();
      }
    }, CREATE_TIMEOUT_MS);

    void this.tryFirestoreCreate(cleanName, password, seq);
  }

  private async tryFirestoreCreate(cleanName: string, password: string, seq: number) {
    const uid = await ensureOnlineAuthUid();
    if (!this.onlineFlag || this.sessionSeq !== seq) return;

    if (!uid) {
      this.createRoomPeerJs(cleanName, password, seq, 0);
      return;
    }

    const rId = firestoreRoomId(cleanName);
    const roomRef = doc(db, 'rooms', rId);
    const hostName = (PartyEconomy.name() || 'Host').trim().slice(0, 32) || 'Host';

    try {
      const existing = await getDoc(roomRef);
      if (!this.onlineFlag || this.sessionSeq !== seq) return;
      if (existing.exists()) {
        const data = existing.data() as FsRoomDoc;
        const fresh = typeof data?.updatedAt === 'number' && Date.now() - data.updatedAt < FS_ROOM_STALE_MS;
        if (fresh && data.hostUid !== uid) {
          if (this.createTimer) { clearTimeout(this.createTimer); this.createTimer = null; }
          this.creating = false;
          this.handlers?.onToast('Bu otaq adı artıq istifadədədir, başqa ad yazın', 'error');
          this.cleanup();
          return;
        }
      }

      const payload: FsRoomDoc = {
        id: rId,
        name: cleanName.slice(0, 24),
        hostUid: uid,
        hostName,
        locked: !!password,
        playerCount: 1,
        status: 'lobby',
        updatedAt: Date.now(),
      };
      await setDoc(roomRef, payload);
      if (!this.onlineFlag || this.sessionSeq !== seq) return;

      // Clear any leftover signal docs in this room if reusing a stale room slot
      try {
        const oldSignals = await getDocs(collection(db, 'rooms', rId, 'signals'));
        for (const sDoc of oldSignals.docs) {
          await deleteDoc(sDoc.ref).catch(() => {});
        }
      } catch {
        // ignore
      }
      if (!this.onlineFlag || this.sessionSeq !== seq) return;

      this.fsRoomId = rId;
      this.fsUid = uid;
      if (this.createTimer) { clearTimeout(this.createTimer); this.createTimer = null; }
      this.creating = false;
      this.lobbySlots = [hostName.slice(0, 14) || 'Host', null, null, null];
      this.lobbyReady = [true, false, false, false];
      PLAYER_NAMES[0] = this.lobbySlots[0] || 'Host';

      this.fsHeartbeatTimer = setInterval(() => {
        if (this.onlineFlag && this.isHostFlag && this.fsRoomId === rId) {
          this.updateFirestoreRoomMeta();
        }
      }, FS_HEARTBEAT_MS);

      this.fsSignalsUnsub = onSnapshot(collection(db, 'rooms', rId, 'signals'), (snap) => {
        if (!this.onlineFlag || this.sessionSeq !== seq) return;
        snap.forEach((docSnap) => {
          const sig = docSnap.data() as FsSignalDoc;
          if (!sig || !sig.guestUid || sig.status === 'rejected') return;
          void this.handleHostFirestoreSignal(rId, sig, seq);
        });
      });

      this.emit();
      this.handlers?.onLobbyJoined();
    } catch {
      if (!this.onlineFlag || this.sessionSeq !== seq) return;
      // Fallback transparently to PeerJS if Firestore /rooms rules aren't deployed yet
      this.createRoomPeerJs(cleanName, password, seq, 0);
    }
  }

  private async handleHostFirestoreSignal(roomId: string, sig: FsSignalDoc, seq: number) {
    const guestUid = sig.guestUid;
    if (this.fsRejectedUids.has(guestUid)) return;
    if (!sig.offer) return;

    let pc = this.fsPeerConns.get(guestUid);
    if (!pc) {
      if (this.hostLinks.filter((x) => x.open).length >= MAX_ONLINE_SLOTS - 1) {
        this.fsRejectedUids.add(guestUid);
        void updateDoc(doc(db, 'rooms', roomId, 'signals', guestUid), {
          status: 'rejected',
          answer: 'ROOM_FULL',
          updatedAt: Date.now(),
        }).catch(() => {});
        return;
      }
      if ((sig.password || '') !== this.roomPassword) {
        this.fsRejectedUids.add(guestUid);
        void updateDoc(doc(db, 'rooms', roomId, 'signals', guestUid), {
          status: 'rejected',
          answer: 'BAD_PASSWORD',
          updatedAt: Date.now(),
        }).catch(() => {});
        return;
      }

      pc = new RTCPeerConnection(RTC_ICE_CONFIG);
      this.fsPeerConns.set(guestUid, pc);
      this.fsAppliedCandCounts.set(guestUid, 0);

      const hostCandidates: string[] = [];
      let candFlushTimer: ReturnType<typeof setTimeout> | null = null;
      const flushHostCands = () => {
        if (candFlushTimer) return;
        candFlushTimer = setTimeout(() => {
          candFlushTimer = null;
          if (!this.onlineFlag || this.sessionSeq !== seq) return;
          void updateDoc(doc(db, 'rooms', roomId, 'signals', guestUid), {
            hostCandidates: hostCandidates.slice(0, 40),
            updatedAt: Date.now(),
          }).catch(() => {});
        }, 120);
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate && hostCandidates.length < 40) {
          hostCandidates.push(JSON.stringify(ev.candidate.toJSON()));
          flushHostCands();
        }
      };

      pc.ondatachannel = (ev) => {
        const dc = ev.channel;
        const link = this.wrapRtcChannel(dc, pc!, guestUid);
        let authed = false;

        dc.onmessage = (msgEv) => {
          let d: Record<string, unknown> | null = null;
          try {
            d = JSON.parse(String(msgEv.data)) as Record<string, unknown>;
          } catch {
            return;
          }
          if (!d || typeof d !== 'object') return;
          if (!authed && d.type === 'auth') {
            authed = true;
            this.attachHostLink(link, d);
          } else if (link.slot) {
            this.handleNetData(d, link.slot);
          }
        };

        dc.onclose = () => {
          this.handleHostLinkClose(link);
        };
        dc.onerror = () => {
          // handled by onclose
        };
      };

      pc.onconnectionstatechange = () => {
        if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected')) {
          const linked = this.hostLinks.find((l) => l.guestUid === guestUid);
          if (linked && pc.connectionState === 'failed') {
            this.handleHostLinkClose(linked);
          }
        }
      };

      try {
        const offerDesc = JSON.parse(sig.offer) as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(offerDesc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (!this.onlineFlag || this.sessionSeq !== seq) return;
        await updateDoc(doc(db, 'rooms', roomId, 'signals', guestUid), {
          answer: JSON.stringify(pc.localDescription),
          status: 'answered',
          updatedAt: Date.now(),
        });
      } catch {
        return;
      }
    }

    const cands = Array.isArray(sig.guestCandidates) ? sig.guestCandidates : [];
    const applied = this.fsAppliedCandCounts.get(guestUid) || 0;
    if (pc.remoteDescription && cands.length > applied) {
      for (let i = applied; i < cands.length; i++) {
        try {
          await pc.addIceCandidate(JSON.parse(cands[i]) as RTCIceCandidateInit);
        } catch {
          // ignore late/duplicate ICE candidate
        }
      }
      this.fsAppliedCandCounts.set(guestUid, cands.length);
    }
  }

  private createRoomPeerJs(cleanName: string, password: string, seq: number, retryCount: number) {
    if (!this.onlineFlag || this.sessionSeq !== seq) return;
    try {
      const p = new Peer(roomPeerId(cleanName), PEER_CONFIG);
      this.peer = p;

      p.on('open', () => {
        if (this.sessionSeq !== seq) return;
        if (this.createTimer) { clearTimeout(this.createTimer); this.createTimer = null; }
        this.creating = false;
        this.lobbySlots = [PartyEconomy.name() || 'Host', null, null, null];
        this.lobbyReady = [true, false, false, false];
        PLAYER_NAMES[0] = this.lobbySlots[0] || 'Host';
        this.emit();
        this.announceStart();
        this.handlers?.onLobbyJoined();
      });

      p.on('error', (err) => {
        if (this.sessionSeq !== seq) return;
        if (err.type === 'peer-unavailable') return;
        if ((err.type === 'network' || err.type === 'server-error') && retryCount < 1 && this.creating) {
          try {
            p.destroy();
          } catch {
            // ignore
          }
          if (this.peer === p) this.peer = null;
          setTimeout(() => {
            this.createRoomPeerJs(cleanName, password, seq, retryCount + 1);
          }, RECONNECT_DELAY_MS);
          return;
        }

        if (this.createTimer) { clearTimeout(this.createTimer); this.createTimer = null; }
        this.creating = false;
        let msg = `Bağlantı xətası: ${err.type}`;
        if (err.type === 'unavailable-id') {
          msg = 'Bu otaq adı artıq istifadədədir, başqa ad yazın';
        } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
          msg = 'Onlayn serverlə əlaqə qurulmadı. Gmail hesabına daxil olub yenidən cəhd edin.';
        }
        this.handlers?.onToast(msg, 'error');
        this.cleanup();
      });

      p.on('disconnected', () => {
        try {
          p.reconnect();
        } catch {
          // ignore
        }
      });

      p.on('connection', (c) => {
        const link = this.wrapPeerConn(c);
        const setupConn = () => {
          c.on('data', (raw) => {
            const d = raw as Record<string, unknown>;
            if (!d || typeof d !== 'object') return;
            if (d.type === 'auth') {
              this.attachHostLink(link, d);
            } else if (link.slot) {
              this.handleNetData(d, link.slot);
            }
          });
          c.on('close', () => this.handleHostLinkClose(link));
          c.on('error', () => {
            // handled on close
          });
        };
        if (c.open) setupConn();
        else c.on('open', setupConn);
      });
    } catch {
      if (this.createTimer) { clearTimeout(this.createTimer); this.createTimer = null; }
      this.creating = false;
      this.cleanup();
      this.handlers?.onToast('Onlayn serverə qoşulmaq mümkün olmadı', 'error');
    }
  }

  joinRoom(name: string, password: string) {
    const cleanName = name.trim();
    if (!cleanName) {
      this.handlers?.onToast('Otaq adı daxil edin', 'error');
      return;
    }
    this.cleanup();
    const seq = ++this.sessionSeq;
    this.onlineFlag = true;
    this.isHostFlag = false;
    this.joining = true;
    this.roomName = cleanName;
    this.savedJoinPassword = password;
    this.reconnectAttempts = 0;
    this.reconnecting = false;
    this.emit();

    if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
    this.joinTimer = setTimeout(() => {
      if (this.joining && this.sessionSeq === seq) {
        this.joining = false;
        this.handlers?.onToast(
          this.reconnecting
            ? 'Yenidən qoşulmaq mümkün olmadı'
            : 'Otağa qoşulmaq çox uzun çəkdi — otaq mövcud olmaya bilər',
          'error'
        );
        this.cleanup();
      }
    }, JOIN_TIMEOUT_MS);

    void this.tryFirestoreJoin(cleanName, password, seq);
  }

  private async tryFirestoreJoin(cleanName: string, password: string, seq: number) {
    const uid = await ensureOnlineAuthUid();
    if (!this.onlineFlag || this.sessionSeq !== seq) return;

    if (!uid) {
      this.attemptJoinPeerJs(cleanName, password, seq, 0);
      return;
    }

    const rId = firestoreRoomId(cleanName);
    const roomRef = doc(db, 'rooms', rId);

    try {
      const roomSnap = await getDoc(roomRef);
      if (!this.onlineFlag || this.sessionSeq !== seq) return;

      if (!roomSnap.exists()) {
        // Room might have been created on PeerJS fallback by an unauthenticated host
        this.attemptJoinPeerJs(cleanName, password, seq, 0);
        return;
      }

      const roomData = roomSnap.data() as FsRoomDoc;
      if (typeof roomData.updatedAt === 'number' && Date.now() - roomData.updatedAt >= FS_ROOM_STALE_MS) {
        if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
        this.joining = false;
        this.handlers?.onToast('Bu otaq artıq bağlanıb', 'error');
        this.cleanup();
        return;
      }

      if (roomData.playerCount >= MAX_ONLINE_SLOTS) {
        if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
        this.joining = false;
        this.handlers?.onToast('Otaq doludur (maksimum 4 oyunçu)', 'error');
        this.cleanup();
        return;
      }

      this.fsRoomId = rId;
      this.fsUid = uid;

      const pc = new RTCPeerConnection(RTC_ICE_CONFIG);
      this.fsGuestPc = pc;
      const dc = pc.createDataChannel('game', { ordered: true });
      const link = this.wrapRtcChannel(dc, pc);
      this.guestLink = link;

      const signalRef = doc(db, 'rooms', rId, 'signals', uid);
      const guestCandidates: string[] = [];
      let candTimer: ReturnType<typeof setTimeout> | null = null;
      const flushGuestCands = () => {
        if (candTimer) return;
        candTimer = setTimeout(() => {
          candTimer = null;
          if (!this.onlineFlag || this.sessionSeq !== seq) return;
          void updateDoc(signalRef, {
            guestCandidates: guestCandidates.slice(0, 40),
            updatedAt: Date.now(),
          }).catch(() => {});
        }, 120);
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate && guestCandidates.length < 40) {
          guestCandidates.push(JSON.stringify(ev.candidate.toJSON()));
          flushGuestCands();
        }
      };

      dc.onopen = () => {
        if (!this.onlineFlag || this.sessionSeq !== seq) return;
        link.send({ type: 'auth', password, name: PartyEconomy.name() || '' });
      };

      dc.onmessage = (msgEv) => {
        if (this.sessionSeq !== seq) return;
        let d: Record<string, unknown> | null = null;
        try {
          d = JSON.parse(String(msgEv.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        if (d && typeof d === 'object') {
          if (d.type === 'authOk' || d.type === 'authFail' || d.type === 'full' || d.type === 'dupName') {
            if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
            this.reconnecting = false;
            this.reconnectAttempts = 0;
          }
          this.handleNetData(d, 0);
        }
      };

      dc.onclose = () => {
        if (!this.onlineFlag || this.sessionSeq !== seq) return;
        this.handlers?.onToast('Host ilə bağlantı kəsildi', 'error');
        const wasPlaying = this.isGameActive();
        this.cleanup();
        if (wasPlaying) this.handlers?.onDisconnectToHome();
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (!this.onlineFlag || this.sessionSeq !== seq) return;

      const sigPayload: FsSignalDoc = {
        guestUid: uid,
        guestName: (PartyEconomy.name() || 'Oyuncu').trim().slice(0, 32) || 'Oyuncu',
        password: String(password || '').slice(0, 32),
        offer: JSON.stringify(pc.localDescription),
        guestCandidates: [],
        status: 'pending',
        updatedAt: Date.now(),
      };
      await setDoc(signalRef, sigPayload);
      if (!this.onlineFlag || this.sessionSeq !== seq) return;

      let appliedHostCands = 0;
      let answerSet = false;
      this.fsGuestSignalUnsub = onSnapshot(signalRef, async (snap) => {
        if (!this.onlineFlag || this.sessionSeq !== seq || !snap.exists()) return;
        const s = snap.data() as FsSignalDoc;
        if (s.status === 'rejected') {
          if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
          this.joining = false;
          const msg =
            s.answer === 'BAD_PASSWORD'
              ? 'Şifrə yanlışdır!'
              : s.answer === 'ROOM_FULL'
                ? 'Otaq doludur (maksimum 4 oyunçu)'
                : 'Otağa qoşulmaq rədd edildi';
          this.handlers?.onToast(msg, 'error');
          this.cleanup();
          return;
        }
        if (s.answer && !answerSet && s.answer.startsWith('{')) {
          answerSet = true;
          try {
            await pc.setRemoteDescription(JSON.parse(s.answer) as RTCSessionDescriptionInit);
          } catch {
            // ignore
          }
        }
        const hostCands = Array.isArray(s.hostCandidates) ? s.hostCandidates : [];
        if (pc.remoteDescription && hostCands.length > appliedHostCands) {
          for (let i = appliedHostCands; i < hostCands.length; i++) {
            try {
              await pc.addIceCandidate(JSON.parse(hostCands[i]) as RTCIceCandidateInit);
            } catch {
              // ignore
            }
          }
          appliedHostCands = hostCands.length;
        }
      });
    } catch {
      if (!this.onlineFlag || this.sessionSeq !== seq) return;
      this.attemptJoinPeerJs(cleanName, password, seq, 0);
    }
  }

  private attemptJoinPeerJs(cleanName: string, password: string, seq: number, retryCount: number) {
    if (!this.onlineFlag || this.sessionSeq !== seq) return;
    try {
      const p = new Peer(PEER_CONFIG);
      this.peer = p;

      p.on('error', (err) => {
        if (this.sessionSeq !== seq) return;

        if (err.type === 'peer-unavailable' && !this.reconnecting && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          this.reconnecting = true;
          this.handlers?.onToast(
            `Otaq axtarılır (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
            'info'
          );
          setTimeout(() => {
            if (this.onlineFlag && this.joining && this.sessionSeq === seq) {
              try {
                p.destroy();
              } catch {
                // ignore
              }
              if (this.peer === p) this.peer = null;
              this.attemptJoinPeerJs(cleanName, password, seq, retryCount);
            }
          }, RECONNECT_DELAY_MS);
          return;
        }

        if ((err.type === 'network' || err.type === 'server-error') && retryCount < 1 && this.joining) {
          try {
            p.destroy();
          } catch {
            // ignore
          }
          if (this.peer === p) this.peer = null;
          setTimeout(() => {
            this.attemptJoinPeerJs(cleanName, password, seq, retryCount + 1);
          }, RECONNECT_DELAY_MS);
          return;
        }

        if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
        this.joining = false;
        this.reconnecting = false;
        let msg = `Bağlantı xətası: ${err.type}`;
        if (err.type === 'peer-unavailable') {
          msg = 'Otaq tapılmadı — otaq adını dəqiq yazdığınızdan əmin olun';
        } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
          msg = 'Onlayn serverlə əlaqə qurulmadı. Gmail hesabına daxil olub yenidən cəhd edin.';
        }
        this.handlers?.onToast(msg, 'error');
        this.cleanup();
      });

      p.on('open', () => {
        if (this.sessionSeq !== seq) return;
        const c = p.connect(roomPeerId(cleanName), { reliable: true });
        this.peerGuestConn = c;
        const link = this.wrapPeerConn(c);
        this.guestLink = link;

        c.on('open', () => {
          link.send({ type: 'auth', password, name: PartyEconomy.name() || '' });
        });

        c.on('data', (raw) => {
          const d = raw as Record<string, unknown>;
          if (d && typeof d === 'object') {
            if (d.type === 'authOk' || d.type === 'authFail' || d.type === 'full' || d.type === 'dupName') {
              if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
              this.reconnecting = false;
              this.reconnectAttempts = 0;
            }
            this.handleNetData(d, 0);
          }
        });

        c.on('close', () => {
          if (!this.onlineFlag || this.sessionSeq !== seq) return;

          if (this.isGameActive() && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            this.handlers?.onToast(
              `Host ilə bağlantı kəsildi, yenidən qoşulur (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
              'info'
            );
            this.joining = true;
            this.emit();
            setTimeout(() => {
              if (this.onlineFlag && this.sessionSeq === seq) {
                try {
                  p.destroy();
                } catch {
                  // ignore
                }
                this.peer = null;
                this.peerGuestConn = null;
                this.guestLink = null;
                this.attemptJoinPeerJs(cleanName, this.savedJoinPassword, seq, 0);
              }
            }, RECONNECT_DELAY_MS);
            return;
          }

          this.handlers?.onToast('Host ilə bağlantı kəsildi', 'error');
          const wasPlaying = this.isGameActive();
          this.cleanup();
          if (wasPlaying) this.handlers?.onDisconnectToHome();
        });

        c.on('error', () => {
          // handled on close
        });
      });

      p.on('disconnected', () => {
        try {
          p.reconnect();
        } catch {
          // ignore
        }
      });
    } catch {
      if (this.joinTimer) { clearTimeout(this.joinTimer); this.joinTimer = null; }
      this.joining = false;
      this.reconnecting = false;
      this.cleanup();
      this.handlers?.onToast('Qoşulma xətası', 'error');
    }
  }

  updateConfig(partial: Partial<LobbyConfig>) {
    if (!this.isHostFlag) return;
    this.cfg = {
      ...this.cfg,
      ...partial,
      weapons: partial.weapons ? [...partial.weapons] : [...this.cfg.weapons],
    };
    this.broadcastLobby();
  }

  toggleGuestReady() {
    if (this.isHostFlag || !this.guestLink || !this.guestLink.open) return;
    this.guestReadyFlag = !this.guestReadyFlag;
    this.lobbyReady[this.guestIdx] = this.guestReadyFlag;
    this.guestLink.send({ type: 'ready_toggle', slot: this.guestIdx, ready: this.guestReadyFlag });
    PartyAudio.play(this.guestReadyFlag ? 'buy' : 'hit');
    this.emit();
  }

  startLobbyMatch() {
    if (!this.isHostFlag) return;
    const count = Math.max(2, this.connectedCount());
    const payload = {
      type: 'start',
      cfg: { ...this.cfg, players: count },
    };
    this.hostLinks.forEach((c) => {
      if (c.open) c.send(payload);
    });
    this.updateFirestoreRoomMeta('playing');
    this.announceStop();
    this.handlers?.onStartGame({ ...this.cfg }, count);
  }

  sendRematch() {
    if (this.isHostFlag) {
      this.handlers?.onRematch();
    } else if (this.guestLink && this.guestLink.open) {
      this.guestLink.send({ type: 'rematch' });
    }
  }

  sendNetTick(
    mode: 'vs' | 'minigames',
    paused: boolean,
    isPlaying: boolean,
    serializeFight: () => FightSerializedState,
    serializeMini: () => MiniSerializedState
  ) {
    if (!this.onlineFlag) return;
    if (!this.isHostFlag) {
      if (!this.guestLink || !this.guestLink.open) return;
      const i = inputPlayers[0];
      this.guestLink.send({
        type: 'input',
        x: i.x,
        y: i.y,
        action: i.action,
        jump: i.jump,
        auto: !!i.auto,
        releaseAction: i.releaseAction,
        releaseX: i.releaseX,
        releaseY: i.releaseY,
      });
      i.releaseAction = false;
      return;
    }
    const live = this.hostLinks.filter((c) => c.open);
    if (!live.length) return;
    this.netFrame++;
    const msg =
      mode === 'vs'
        ? { type: 'fstate', s: serializeFight() }
        : { type: 'state', s: serializeMini() };
    void paused;
    void isPlaying;
    live.forEach((c) => c.send(msg));
  }

  private broadcastLobby() {
    if (!this.isHostFlag) return;
    const msg = {
      type: 'lobby',
      slots: this.lobbySlots,
      ready: this.lobbyReady,
      cfg: this.cfg,
    };
    this.hostLinks.forEach((c) => {
      if (c.open) c.send(msg);
    });
    this.emit();
  }

  private handleNetData(d: Record<string, unknown>, slot: number) {
    switch (d.type) {
      case 'authFail':
        this.joining = false;
        this.handlers?.onToast('Şifrə yanlışdır!', 'error');
        this.cleanup();
        break;
      case 'full':
        this.joining = false;
        this.handlers?.onToast('Otaq doludur (maksimum 4 oyunçu)', 'error');
        this.cleanup();
        break;
      case 'dupName':
        this.joining = false;
        this.handlers?.onToast('Bu otaqda eyni adda oyunçu artıq var — yuxarıdan adınızı dəyişin!', 'error');
        this.cleanup();
        break;
      case 'authOk': {
        this.joining = false;
        this.guestIdx = Number(d.slot) || 1;
        this.guestReadyFlag = false;
        const incomingSlots = Array.isArray(d.slots) ? (d.slots as (string | null)[]) : [null, null, null, null];
        this.lobbySlots = incomingSlots.slice(0, 4);
        this.lobbyReady = Array.isArray(d.ready) ? (d.ready as boolean[]).slice(0, 4) : [true, false, false, false];
        this.lobbySlots[this.guestIdx] = PartyEconomy.name() || `P${this.guestIdx + 1}`;
        this.lobbySlots[0] = String(d.name || 'Host').slice(0, 14);
        for (let i = 0; i < MAX_ONLINE_SLOTS; i++) {
          PLAYER_NAMES[i] = this.lobbySlots[i] || (i === 0 ? 'Host' : `P${i + 1}`);
        }
        if (d.cfg && typeof d.cfg === 'object') {
          this.cfg = { ...this.cfg, ...(d.cfg as Partial<LobbyConfig>) };
        }
        this.emit();
        this.handlers?.onLobbyJoined();
        break;
      }
      case 'lobby': {
        if (Array.isArray(d.slots)) this.lobbySlots = (d.slots as (string | null)[]).slice(0, 4);
        if (Array.isArray(d.ready)) this.lobbyReady = (d.ready as boolean[]).slice(0, 4);
        if (d.cfg && typeof d.cfg === 'object') {
          this.cfg = { ...this.cfg, ...(d.cfg as Partial<LobbyConfig>) };
        }
        for (let i = 0; i < MAX_ONLINE_SLOTS; i++) {
          PLAYER_NAMES[i] = this.lobbySlots[i] || (i === 0 ? 'Host' : `P${i + 1}`);
        }
        this.emit();
        break;
      }
      case 'ready_toggle':
        if (this.isHostFlag && slot >= 1 && slot < MAX_ONLINE_SLOTS) {
          this.lobbyReady[slot] = !!d.ready;
          this.broadcastLobby();
        }
        break;
      case 'start': {
        const sc = d.cfg as LobbyConfig & { players?: number };
        if (sc) {
          this.cfg = { ...this.cfg, ...sc };
          this.emit();
          this.handlers?.onStartGame(this.cfg, sc.players || this.connectedCount());
        }
        break;
      }
      case 'fstate':
        if (d.s) this.handlers?.onFightState(d.s as FightSerializedState);
        break;
      case 'state':
        if (d.s) this.handlers?.onMiniState(d.s as MiniSerializedState);
        break;
      case 'input':
        if (this.isHostFlag && slot >= 1 && slot < MAX_ONLINE_SLOTS) {
          const i = inputPlayers[slot];
          const axis = (v: unknown) => {
            const num = Number(v);
            return Number.isFinite(num) ? Math.max(-1, Math.min(1, num)) : 0;
          };
          i.x = axis(d.x);
          i.y = axis(d.y);
          i.action = !!d.action;
          i.jump = !!d.jump;
          i.auto = !!d.auto;
          if (d.releaseAction && !this.isGameActive()) {
            // ignored outside play
          } else if (d.releaseAction) {
            i.releaseAction = true;
            i.releaseX = axis(d.releaseX);
            i.releaseY = axis(d.releaseY);
          }
        }
        break;
      case 'rematch':
        if (this.isHostFlag) this.handlers?.onRematch();
        break;
    }
  }
}

export const onlineManager = new OnlineManager();
