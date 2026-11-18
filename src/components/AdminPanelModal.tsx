import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Swords,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  adminSetUserCoins,
  CloudUserDoc,
  isAdminEmail,
  subscribeAllUsersForAdmin,
} from '../firebase';
import { PartyAudio } from '../game/audio';
import { PartyEconomy } from '../game/economy';

interface AdminPanelModalProps {
  open: boolean;
  currentUid: string | null;
  currentEmail: string | null;
  onClose: () => void;
}

type StatusFilter = 'all' | 'online' | 'offline';
type SortMode = 'recent' | 'coins' | 'matches';

const ACTIVE_TTL_MS = 150_000; // 2.5 min (heartbeat runs every 60s)

function getTimestampMs(u: CloudUserDoc): number {
  const last = u.lastSeenAt as { toMillis?: () => number } | undefined;
  if (last && typeof last.toMillis === 'function') return last.toMillis();
  const upd = u.updatedAt as { toMillis?: () => number } | undefined;
  if (upd && typeof upd.toMillis === 'function') return upd.toMillis();
  const cre = u.createdAt as { toMillis?: () => number } | undefined;
  if (cre && typeof cre.toMillis === 'function') return cre.toMillis();
  return 0;
}

function isUserActive(u: CloudUserDoc, nowMs: number): boolean {
  if (!u.isOnline) return false;
  const ts = getTimestampMs(u);
  if (!ts) return false;
  return nowMs - ts < ACTIVE_TTL_MS;
}

function formatRelativeAz(tsMs: number, nowMs: number): string {
  if (!tsMs) return 'Məlum deyil';
  const diffSec = Math.max(0, Math.floor((nowMs - tsMs) / 1000));
  if (diffSec < 45) return 'İndi';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} dəq əvvəl`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün əvvəl`;
  const months = Math.floor(days / 30);
  return `${months} ay əvvəl`;
}

function formatExactDate(tsMs: number): string {
  if (!tsMs) return '—';
  const d = new Date(tsMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminPanelModal({
  open,
  currentUid,
  currentEmail,
  onClose,
}: AdminPanelModalProps) {
  const [users, setUsers] = useState<CloudUserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [coinTargetUid, setCoinTargetUid] = useState<string | null>(null);
  const [coinInput, setCoinInput] = useState('500');
  const [coinBusyUid, setCoinBusyUid] = useState<string | null>(null);
  const [coinNotice, setCoinNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const authorized = open && isAdminEmail(currentEmail);

  useEffect(() => {
    if (!authorized) {
      setCoinTargetUid(null);
      setCoinNotice(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');

    const unsub = subscribeAllUsersForAdmin(
      (list) => {
        setUsers(list);
        setLoading(false);
        setNowMs(Date.now());
      },
      (err) => {
        setLoading(false);
        const msg = err.message || '';
        if (msg.includes('Quota exceeded')) {
          setErrorMsg('Firestore gündəlik oxuma kvotası dolub.');
        } else if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
          setErrorMsg('Bu hesab üçün admin icazəsi təsdiqlənmədi.');
        } else {
          setErrorMsg('Oyunçu siyahısı yüklənə bilmədi.');
        }
      }
    );

    const timer = window.setInterval(() => setNowMs(Date.now()), 10_000);
    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, [authorized]);

  const coinTargetUser = useMemo(
    () => (coinTargetUid ? users.find((u) => u.uid === coinTargetUid) || null : null),
    [users, coinTargetUid]
  );

  const applyCoinEdit = async (target: CloudUserDoc, mode: 'delta' | 'exact', value: number) => {
    if (coinBusyUid) return;
    const amt = Math.trunc(Number(value));
    if (!Number.isFinite(amt) || (mode === 'exact' && amt < 0) || (mode === 'delta' && amt === 0)) {
      PartyAudio.play('error');
      setCoinNotice({ tone: 'err', text: 'Düzgün məbləğ daxil edin.' });
      return;
    }

    setCoinBusyUid(target.uid);
    setCoinNotice(null);
    try {
      const next = await adminSetUserCoins(target.uid, mode, amt);
      if (currentUid && target.uid === currentUid) {
        PartyEconomy.setCoinsFromCloud(next);
      }
      PartyAudio.play('coin');
      setCoinNotice({
        tone: 'ok',
        text: `${target.name || target.email || 'Oyunçu'} balansı: ${next.toLocaleString('en-US')} Coin`,
      });
    } catch (err) {
      PartyAudio.play('error');
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('PERMISSION_DENIED') || msg.includes('permission') || msg.includes('Missing or insufficient')) {
        setCoinNotice({
          tone: 'err',
          text: 'Firestore qaydaları yenilənməyib — Firebase Console-da firestore.rules faylını Publish edin.',
        });
      } else {
        setCoinNotice({ tone: 'err', text: 'Balans yenilənərkən xəta baş verdi.' });
      }
    } finally {
      setCoinBusyUid(null);
    }
  };

  const stats = useMemo(() => {
    let onlineCount = 0;
    let totalCoins = 0;
    let totalMatches = 0;
    for (const u of users) {
      if (isUserActive(u, nowMs)) onlineCount++;
      totalCoins += Number(u.coins) || 0;
      totalMatches += Number(u.matches) || 0;
    }
    return {
      total: users.length,
      onlineCount,
      offlineCount: Math.max(0, users.length - onlineCount),
      totalCoins,
      totalMatches,
    };
  }, [users, nowMs]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => {
      const active = isUserActive(u, nowMs);
      if (statusFilter === 'online' && !active) return false;
      if (statusFilter === 'offline' && active) return false;
      if (!q) return true;
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    list.sort((a, b) => {
      if (sortMode === 'coins') return (b.coins || 0) - (a.coins || 0);
      if (sortMode === 'matches') return (b.matches || 0) - (a.matches || 0);
      const activeA = isUserActive(a, nowMs) ? 1 : 0;
      const activeB = isUserActive(b, nowMs) ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      return getTimestampMs(b) - getTimestampMs(a);
    });

    return list;
  }, [users, search, statusFilter, sortMode, nowMs]);

  if (!authorized) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-2xl bg-[#111216] border border-zinc-700 flex flex-col overflow-hidden shadow-2xl relative">
        {/* Pinned Header */}
        <div className="shrink-0 px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-zinc-800 bg-[#0d0e11] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white text-zinc-950 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-wide truncate">
                  ADMİN PANELİ
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CANLI</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-mono text-zinc-400 truncate">
                {currentEmail}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice Toast Strip */}
        {coinNotice && (
          <div
            className={`shrink-0 px-3.5 sm:px-5 py-2 border-b text-xs font-semibold flex items-center justify-between gap-2 ${
              coinNotice.tone === 'ok'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/60 border-red-500/40 text-red-200'
            }`}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              {coinNotice.tone === 'ok' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{coinNotice.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setCoinNotice(null)}
              className="text-current/70 hover:text-current shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Summary KPI Strip */}
        <div className="shrink-0 px-3 sm:px-5 py-2.5 bg-[#0b0c10] border-b border-zinc-800/80 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-2.5 py-2 flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-zinc-500 truncate">
                Gmail Oyunçuları
              </div>
              <div className="font-mono text-sm sm:text-lg font-extrabold text-white">
                {stats.total}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-2.5 py-2 flex items-center gap-2 min-w-0">
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-zinc-500 truncate">
                Canlı Aktiv
              </div>
              <div className="font-mono text-sm sm:text-lg font-extrabold text-emerald-400 flex items-center gap-1.5">
                <span>{stats.onlineCount}</span>
                <span className="text-[10px] font-normal text-zinc-500">/ {stats.offlineCount} oflayn</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-2.5 py-2 flex items-center gap-2 min-w-0">
            <Coins className="w-4 h-4 text-zinc-300 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-zinc-500 truncate">
                Cəmi Coin · Matç
              </div>
              <div className="font-mono text-xs sm:text-base font-extrabold text-white truncate">
                {stats.totalCoins.toLocaleString('en-US')} · {stats.totalMatches}
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="shrink-0 px-3 sm:px-5 py-2 bg-[#0d0e11] border-b border-zinc-800/80 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[170px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad və ya email axtar..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-white outline-none text-xs text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { id: 'all', label: 'Hamısı' },
                { id: 'online', label: 'Aktiv' },
                { id: 'offline', label: 'Oflayn' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold transition ${
                  statusFilter === f.id
                    ? 'bg-white text-zinc-950 border-white'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { id: 'recent', label: 'Son görülmə' },
                { id: 'coins', label: 'Coin' },
                { id: 'matches', label: 'Matç' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortMode(s.id)}
                className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold transition ${
                  sortMode === s.id
                    ? 'bg-zinc-800 text-white border-zinc-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Player List / Table */}
        <div className="flex-1 min-h-0 overflow-y-auto mono-scroll p-2.5 sm:p-4">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-400">
              Gmail oyunçuları yüklənir...
            </div>
          ) : errorMsg ? (
            <div className="py-10 text-center text-xs font-semibold text-red-400">
              {errorMsg}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              Axtarışa uyğun oyunçu tapılmadı.
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#0d0e11] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      <th className="py-2.5 px-3">Oyunçu</th>
                      <th className="py-2.5 px-3">Gmail</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Coin</th>
                      <th className="py-2.5 px-3 text-right">Pul İdarə</th>
                      <th className="py-2.5 px-3 text-right">Matç</th>
                      <th className="py-2.5 px-3 text-right">Son görülmə</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70 text-xs">
                    {filteredUsers.map((u) => {
                      const active = isUserActive(u, nowMs);
                      const tsMs = getTimestampMs(u);
                      const isSelf = currentUid && u.uid === currentUid;
                      const busy = coinBusyUid === u.uid;
                      return (
                        <tr key={u.uid} className="hover:bg-zinc-900/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {u.photoURL ? (
                                <img
                                  src={u.photoURL}
                                  alt={u.name || 'Avatar'}
                                  referrerPolicy="no-referrer"
                                  className="w-7 h-7 rounded-full object-cover border border-zinc-700 shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-white flex items-center justify-center shrink-0">
                                  {(u.name || u.email || '?').slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-white flex items-center gap-1.5 truncate">
                                  <span className="truncate">{u.name || 'Adsız'}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-mono text-zinc-300">
                                      SİZ
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  {u.owned?.length || 1} əşya
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300 max-w-[180px] truncate">
                            {u.email || '—'}
                          </td>

                          <td className="py-2.5 px-3">
                            {active ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Aktiv</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-400">
                                <WifiOff className="w-3 h-3 text-zinc-500" />
                                <span>Oflayn</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                            <span className="inline-flex items-center justify-end gap-1">
                              <Coins className="w-3 h-3 text-amber-400" />
                              <span>{(u.coins || 0).toLocaleString('en-US')}</span>
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => applyCoinEdit(u, 'delta', -100)}
                                title="100 Coin azalt"
                                className="h-7 px-2 rounded-md bg-zinc-900 hover:bg-red-950/80 border border-zinc-700 hover:border-red-500/50 text-[11px] font-mono font-bold text-red-300 disabled:opacity-40 transition"
                              >
                                -100
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => applyCoinEdit(u, 'delta', 100)}
                                title="100 Coin artır"
                                className="h-7 px-2 rounded-md bg-zinc-900 hover:bg-emerald-950/80 border border-zinc-700 hover:border-emerald-500/50 text-[11px] font-mono font-bold text-emerald-300 disabled:opacity-40 transition"
                              >
                                +100
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setCoinTargetUid(u.uid);
                                  setCoinInput(String(u.coins || 0));
                                  PartyAudio.play('hit');
                                }}
                                className="h-7 px-2.5 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-40 transition"
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                                <span>İdarə et</span>
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-200">
                            {u.matches || 0}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="text-[11px] font-semibold text-zinc-200">
                              {active ? 'Hazırda oyunda' : formatRelativeAz(tsMs, nowMs)}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              {formatExactDate(tsMs)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Landscape APK Cards */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredUsers.map((u) => {
                  const active = isUserActive(u, nowMs);
                  const tsMs = getTimestampMs(u);
                  const isSelf = currentUid && u.uid === currentUid;
                  const busy = coinBusyUid === u.uid;
                  return (
                    <div
                      key={u.uid}
                      className="rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.name || 'Avatar'}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-white flex items-center justify-center shrink-0">
                              {(u.name || u.email || '?').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{u.name || 'Adsız'}</span>
                              {isSelf && (
                                <span className="px-1 py-0.5 rounded bg-zinc-800 text-[9px] font-mono text-zinc-300">
                                  SİZ
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 truncate">
                              {u.email || '—'}
                            </div>
                          </div>
                        </div>

                        {active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Aktiv</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-400 shrink-0">
                            <span>Oflayn</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-zinc-800/80 text-[10px] font-mono">
                        <div className="flex items-center gap-1 text-amber-300 font-bold">
                          <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{(u.coins || 0).toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-300 justify-center">
                          <Swords className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{u.matches || 0} matç</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-400 justify-end truncate">
                          <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span className="truncate">
                            {active ? 'İndi' : formatRelativeAz(tsMs, nowMs)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/70">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => applyCoinEdit(u, 'delta', -100)}
                          className="h-7 px-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-mono font-bold text-red-300 disabled:opacity-40"
                        >
                          -100
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => applyCoinEdit(u, 'delta', 100)}
                          className="h-7 px-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-mono font-bold text-emerald-300 disabled:opacity-40"
                        >
                          +100
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setCoinTargetUid(u.uid);
                            setCoinInput(String(u.coins || 0));
                            PartyAudio.play('hit');
                          }}
                          className="flex-1 h-7 px-2.5 rounded-lg bg-white text-zinc-950 text-[11px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-40"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Pul İdarə Et</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Custom Coin Editor Modal Overlay */}
        {coinTargetUser && (
          <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md rounded-2xl bg-[#111216] border border-zinc-700 p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {coinTargetUser.photoURL ? (
                    <img
                      src={coinTargetUser.photoURL}
                      alt={coinTargetUser.name || 'Avatar'}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-white flex items-center justify-center shrink-0">
                      {(coinTargetUser.name || coinTargetUser.email || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 leading-tight">
                    <div className="text-sm font-extrabold text-white truncate">
                      {coinTargetUser.name || 'Adsız'}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 truncate">
                      {coinTargetUser.email || '—'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCoinTargetUid(null)}
                  aria-label="Bağla"
                  className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Cari Balans</span>
                <span className="font-mono text-lg font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>{(coinTargetUser.coins || 0).toLocaleString('en-US')}</span>
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Məbləğ (Coin)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000000}
                  value={coinInput}
                  onChange={(e) => setCoinInput(e.target.value)}
                  className="h-11 px-3.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-white outline-none font-mono text-base font-bold text-white"
                />
                <div className="grid grid-cols-6 gap-1 pt-0.5">
                  {[-500, -100, 100, 500, 1000, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={coinBusyUid === coinTargetUser.uid}
                      onClick={() => applyCoinEdit(coinTargetUser, 'delta', preset)}
                      className={`h-7 rounded-lg border text-[10px] font-mono font-bold transition disabled:opacity-40 ${
                        preset < 0
                          ? 'bg-zinc-900 border-zinc-800 text-red-300 hover:border-red-500/60'
                          : 'bg-zinc-900 border-zinc-800 text-emerald-300 hover:border-emerald-500/60'
                      }`}
                    >
                      {preset > 0 ? `+${preset}` : preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  disabled={coinBusyUid === coinTargetUser.uid}
                  onClick={() => {
                    const n = Math.abs(Math.trunc(Number(coinInput) || 0));
                    applyCoinEdit(coinTargetUser, 'delta', -n);
                  }}
                  className="h-10 rounded-xl bg-red-950/70 hover:bg-red-900/80 border border-red-500/40 text-red-200 text-xs font-extrabold flex items-center justify-center gap-1 disabled:opacity-40 transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Azalt</span>
                </button>

                <button
                  type="button"
                  disabled={coinBusyUid === coinTargetUser.uid}
                  onClick={() => {
                    const n = Math.abs(Math.trunc(Number(coinInput) || 0));
                    applyCoinEdit(coinTargetUser, 'delta', n);
                  }}
                  className="h-10 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-xs font-extrabold flex items-center justify-center gap-1 disabled:opacity-40 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Artır</span>
                </button>

                <button
                  type="button"
                  disabled={coinBusyUid === coinTargetUser.uid}
                  onClick={() => {
                    const n = Math.max(0, Math.trunc(Number(coinInput) || 0));
                    applyCoinEdit(coinTargetUser, 'exact', n);
                  }}
                  className="h-10 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-extrabold flex items-center justify-center gap-1 disabled:opacity-40 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Təyin et</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

