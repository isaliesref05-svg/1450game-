import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Swords } from 'lucide-react';
import { PartyEconomy } from '../game/economy';
import { inputPlayers, PLAYER_COLORS, PLAYER_NAMES } from '../game/types';

interface JoystickLayerProps {
  playerCount: number;
  onlineMode: boolean;
  playerColors: string[];
}

interface StickState {
  id: number | string | null;
  x: number;
  y: number;
  cx: number;
  cy: number;
  upHoldStart: number | null;
}

const MAX_DIST = 34;
const HOLD_UP_MS = 75;

export function JoystickLayer({ playerCount, onlineMode, playerColors }: JoystickLayerProps) {
  const [stickScale, setStickScale] = useState<'small' | 'normal' | 'large'>(() => PartyEconomy.joystickSize());
  const [onlineSplitButtons, setOnlineSplitButtons] = useState<boolean>(() => PartyEconomy.onlineSplitButtons());
  const [onlineControlsSwapped, setOnlineControlsSwapped] = useState<boolean>(() => PartyEconomy.onlineControlsSwapped());

  useEffect(() => {
    return PartyEconomy.subscribe(() => {
      setStickScale(PartyEconomy.joystickSize());
      setOnlineSplitButtons(PartyEconomy.onlineSplitButtons());
      setOnlineControlsSwapped(PartyEconomy.onlineControlsSwapped());
    });
  }, []);

  const splitOnline = onlineMode && onlineSplitButtons;

  const visibleIndices = onlineMode
    ? [0]
    : playerCount === 2
      ? [0, 1]
      : playerCount === 3
        ? [0, 1, 2]
        : [0, 1, 2, 3];

  const baseRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const knobRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const jumpIndRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const jumpBtnRefs = useRef<(HTMLButtonElement | null)[]>([null, null, null, null]);
  const attackBtnRefs = useRef<(HTMLButtonElement | null)[]>([null, null, null, null]);

  const statesRef = useRef<StickState[]>([
    { id: null, x: 0, y: 0, cx: 0, cy: 0, upHoldStart: null },
    { id: null, x: 0, y: 0, cx: 0, cy: 0, upHoldStart: null },
    { id: null, x: 0, y: 0, cx: 0, cy: 0, upHoldStart: null },
    { id: null, x: 0, y: 0, cx: 0, cy: 0, upHoldStart: null },
  ]);
  const jumpTouchIdsRef = useRef<(number | string | null)[]>([null, null, null, null]);
  const attackTouchIdsRef = useRef<(number | string | null)[]>([null, null, null, null]);
  const attackPressTimesRef = useRef<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    const syncStickJump = (idx: number, now: number) => {
      const s = statesRef.current[idx];
      const inp = inputPlayers[idx];
      const isJumpBtnDown = jumpTouchIdsRef.current[idx] !== null;
      const inUpZone = s.id !== null && s.y < -0.58 && Math.abs(s.x) < 0.72;

      if (inUpZone) {
        if (s.upHoldStart === null) s.upHoldStart = now;
      } else {
        s.upHoldStart = null;
      }

      const heldEnough = inUpZone && s.upHoldStart !== null && now - s.upHoldStart >= HOLD_UP_MS;
      inp.jump = isJumpBtnDown || heldEnough;

      const jumpInd = jumpIndRefs.current[idx];
      if (jumpInd) {
        if (heldEnough) {
          jumpInd.style.opacity = '1';
          jumpInd.style.transform = 'translateY(-3px) scale(1.22)';
          jumpInd.style.color = '#ffffff';
        } else if (inUpZone) {
          jumpInd.style.opacity = '0.72';
          jumpInd.style.transform = 'translateY(-1px) scale(1.08)';
          jumpInd.style.color = '#fde047';
        } else {
          jumpInd.style.opacity = '0.32';
          jumpInd.style.transform = 'translateY(0) scale(1)';
          jumpInd.style.color = '';
        }
      }
    };

    const setJumpState = (idx: number, active: boolean) => {
      const btn = jumpBtnRefs.current[idx];
      if (btn) {
        btn.style.transform = active ? 'scale(0.92)' : 'scale(1)';
        btn.style.borderColor = active ? '#ffffff' : '';
        btn.style.backgroundColor = active ? 'rgba(255,255,255,0.22)' : '';
      }
      syncStickJump(idx, performance.now());
    };

    const setAttackState = (idx: number, active: boolean, now: number) => {
      const btn = attackBtnRefs.current[idx];
      if (btn) {
        btn.style.transform = active ? 'scale(0.91)' : 'scale(1)';
        btn.style.borderColor = active ? '#ffffff' : '';
        btn.style.backgroundColor = active ? 'rgba(255,255,255,0.28)' : '';
      }
      const inp = inputPlayers[idx];
      if (active) {
        attackPressTimesRef.current[idx] = now;
        inp.action = true;
      } else {
        const heldMs = now - (attackPressTimesRef.current[idx] || now);
        inp.action = false;
        if (heldMs < 350) {
          inp.releaseAction = true;
        }
      }
    };

    const updateStick = (idx: number, clientX: number, clientY: number) => {
      const s = statesRef.current[idx];
      let dx = clientX - s.cx;
      let dy = clientY - s.cy;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_DIST) {
        dx = (dx / dist) * MAX_DIST;
        dy = (dy / dist) * MAX_DIST;
      }
      s.x = dx / MAX_DIST;
      s.y = dy / MAX_DIST;

      const knob = knobRefs.current[idx];
      if (knob) {
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      const inp = inputPlayers[idx];
      const mag = Math.hypot(s.x, s.y);
      // Touch joystick NEVER activates attack while moving/aiming;
      // attack comes either from dedicated Attack button (splitOnline) or stick release (classic).
      if (attackTouchIdsRef.current[idx] === null) {
        inp.action = false;
      }
      if (mag > 0.12) {
        inp.x = s.x;
        inp.y = s.y;
        inp.aimAngle = null;
        inp.auto = false;
        inp.releaseX = s.x;
        inp.releaseY = s.y;
      } else {
        inp.x = 0;
        inp.y = 0;
      }

      syncStickJump(idx, performance.now());
    };

    const releaseStick = (idx: number) => {
      const s = statesRef.current[idx];
      if (s.id === null) return;
      s.id = null;
      s.upHoldStart = null;

      const inp = inputPlayers[idx];
      const hadPull = Math.hypot(s.x, s.y) > 0.24;
      if (hadPull && !splitOnline) {
        inp.releaseAction = true;
        inp.releaseX = s.x;
        inp.releaseY = s.y;
      }
      s.x = 0;
      s.y = 0;
      inp.x = 0;
      inp.y = 0;
      if (attackTouchIdsRef.current[idx] === null) {
        inp.action = false;
      }

      const knob = knobRefs.current[idx];
      if (knob) knob.style.transform = 'translate(0px, 0px)';
      const base = baseRefs.current[idx];
      if (base) base.style.borderColor = '';

      syncStickJump(idx, performance.now());
    };

    const releaseJump = (idx: number) => {
      if (jumpTouchIdsRef.current[idx] === null) return;
      jumpTouchIdsRef.current[idx] = null;
      setJumpState(idx, false);
    };

    const releaseAttack = (idx: number) => {
      if (attackTouchIdsRef.current[idx] === null) return;
      attackTouchIdsRef.current[idx] = null;
      setAttackState(idx, false, performance.now());
    };

    // Keep evaluating held-UP timer even if finger stays completely stationary in the UP zone
    const holdInterval = setInterval(() => {
      const now = performance.now();
      for (let idx = 0; idx < 4; idx++) {
        if (statesRef.current[idx].upHoldStart !== null) {
          syncStickJump(idx, now);
        }
      }
    }, 32);

    const onTouchStart = (e: TouchEvent) => {
      for (let tIdx = 0; tIdx < e.changedTouches.length; tIdx++) {
        const touch = e.changedTouches[tIdx];
        const tEl = touch.target as HTMLElement | null;

        const attackEl = tEl?.closest('[data-attack-idx]') as HTMLElement | null;
        if (attackEl) {
          const aIdx = Number(attackEl.dataset.attackIdx);
          if (Number.isInteger(aIdx) && attackTouchIdsRef.current[aIdx] === null) {
            e.preventDefault();
            attackTouchIdsRef.current[aIdx] = touch.identifier;
            setAttackState(aIdx, true, performance.now());
          }
          continue;
        }

        const jumpEl = tEl?.closest('[data-jump-idx]') as HTMLElement | null;
        if (jumpEl) {
          const jIdx = Number(jumpEl.dataset.jumpIdx);
          if (Number.isInteger(jIdx) && jumpTouchIdsRef.current[jIdx] === null) {
            e.preventDefault();
            jumpTouchIdsRef.current[jIdx] = touch.identifier;
            setJumpState(jIdx, true);
          }
          continue;
        }

        if (tEl?.closest('button')) continue;

        const el = tEl?.closest('[data-stick-idx]') as HTMLElement | null;
        if (!el) continue;
        const idx = Number(el.dataset.stickIdx);
        if (!Number.isInteger(idx) || statesRef.current[idx].id !== null) continue;
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        statesRef.current[idx].id = touch.identifier;
        statesRef.current[idx].cx = rect.left + rect.width / 2;
        statesRef.current[idx].cy = rect.top + rect.height / 2;
        statesRef.current[idx].upHoldStart = null;
        el.style.borderColor = '#ffffff';
        updateStick(idx, touch.clientX, touch.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      let moved = false;
      for (let tIdx = 0; tIdx < e.changedTouches.length; tIdx++) {
        const touch = e.changedTouches[tIdx];
        for (let idx = 0; idx < 4; idx++) {
          if (statesRef.current[idx].id === touch.identifier) {
            moved = true;
            updateStick(idx, touch.clientX, touch.clientY);
          }
        }
      }
      if (moved) e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let tIdx = 0; tIdx < e.changedTouches.length; tIdx++) {
        const touch = e.changedTouches[tIdx];
        for (let idx = 0; idx < 4; idx++) {
          if (statesRef.current[idx].id === touch.identifier) {
            releaseStick(idx);
          }
          if (jumpTouchIdsRef.current[idx] === touch.identifier) {
            releaseJump(idx);
          }
          if (attackTouchIdsRef.current[idx] === touch.identifier) {
            releaseAttack(idx);
          }
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const attackEl = target?.closest('[data-attack-idx]') as HTMLElement | null;
      if (attackEl) {
        const aIdx = Number(attackEl.dataset.attackIdx);
        if (Number.isInteger(aIdx)) {
          e.preventDefault();
          attackTouchIdsRef.current[aIdx] = 'mouse';
          setAttackState(aIdx, true, performance.now());
        }
        return;
      }

      const jumpEl = target?.closest('[data-jump-idx]') as HTMLElement | null;
      if (jumpEl) {
        const jIdx = Number(jumpEl.dataset.jumpIdx);
        if (Number.isInteger(jIdx)) {
          e.preventDefault();
          jumpTouchIdsRef.current[jIdx] = 'mouse';
          setJumpState(jIdx, true);
        }
        return;
      }

      const el = target?.closest('[data-stick-idx]') as HTMLElement | null;
      if (!el) return;
      const idx = Number(el.dataset.stickIdx);
      if (!Number.isInteger(idx) || statesRef.current[idx].id !== null) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      statesRef.current[idx].id = 'mouse';
      statesRef.current[idx].cx = rect.left + rect.width / 2;
      statesRef.current[idx].cy = rect.top + rect.height / 2;
      statesRef.current[idx].upHoldStart = null;
      el.style.borderColor = '#ffffff';
      updateStick(idx, e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      for (let idx = 0; idx < 4; idx++) {
        if (statesRef.current[idx].id === 'mouse') {
          updateStick(idx, e.clientX, e.clientY);
        }
      }
    };

    const onMouseUp = () => {
      for (let idx = 0; idx < 4; idx++) {
        if (statesRef.current[idx].id === 'mouse') {
          releaseStick(idx);
        }
        if (jumpTouchIdsRef.current[idx] === 'mouse') {
          releaseJump(idx);
        }
        if (attackTouchIdsRef.current[idx] === 'mouse') {
          releaseAttack(idx);
        }
      }
    };

    const clearAll = () => {
      for (let idx = 0; idx < 4; idx++) {
        releaseStick(idx);
        releaseJump(idx);
        releaseAttack(idx);
        inputPlayers[idx].action = false;
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('touchcancel', onTouchEnd, { passive: false });
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', clearAll);

    return () => {
      clearInterval(holdInterval);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', clearAll);
      clearAll();
    };
  }, [playerCount, onlineMode, splitOnline]);

  const cornerClass = (idx: number) => {
    if (onlineMode) {
      return onlineControlsSwapped
        ? 'bottom-3 right-3 sm:bottom-5 sm:right-5'
        : 'bottom-3 left-3 sm:bottom-5 sm:left-5';
    }
    if (idx === 0) return 'bottom-2.5 left-2.5 sm:bottom-5 sm:left-5';
    if (idx === 1) return 'bottom-2.5 right-2.5 sm:bottom-5 sm:right-5';
    if (idx === 2) return 'top-12 left-2.5 sm:top-16 sm:left-5';
    return 'top-12 right-2.5 sm:top-16 sm:right-5';
  };

  const onlineActionCornerClass = onlineControlsSwapped
    ? 'bottom-3 left-3 sm:bottom-5 sm:left-5'
    : 'bottom-3 right-3 sm:bottom-5 sm:right-5';

  const isRightCorner = (idx: number) => idx === 1 || idx === 3;

  const stickSizeCls =
    stickScale === 'small'
      ? 'w-[72px] h-[72px] sm:w-[86px] sm:h-[86px] lg:w-[96px] lg:h-[96px]'
      : stickScale === 'large'
        ? 'w-[98px] h-[98px] sm:w-[114px] sm:h-[114px] lg:w-[126px] lg:h-[126px]'
        : 'w-[84px] h-[84px] sm:w-[98px] sm:h-[98px] lg:w-[110px] lg:h-[110px]';

  const jumpThumbCls =
    stickScale === 'small'
      ? 'w-[56px] h-[56px] sm:w-[64px] sm:h-[64px]'
      : stickScale === 'large'
        ? 'w-[72px] h-[72px] sm:w-[82px] sm:h-[82px]'
        : 'w-[62px] h-[62px] sm:w-[72px] sm:h-[72px]';

  const attackThumbCls =
    stickScale === 'small'
      ? 'w-[64px] h-[64px] sm:w-[74px] sm:h-[74px]'
      : stickScale === 'large'
        ? 'w-[82px] h-[82px] sm:w-[92px] sm:h-[92px]'
        : 'w-[72px] h-[72px] sm:w-[82px] sm:h-[82px]';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {visibleIndices.map((idx) => {
        const col = playerColors[idx] || PLAYER_COLORS[idx] || '#3b82f6';
        const rightSide = !onlineMode && isRightCorner(idx);
        return (
          <div
            key={idx}
            className={`pointer-events-auto fixed ${cornerClass(idx)} flex flex-col items-center gap-1 touch-none`}
          >
            <div className={`flex items-end gap-2 ${rightSide ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                ref={(el) => {
                  baseRefs.current[idx] = el;
                }}
                data-stick-idx={idx}
                className={`relative ${stickSizeCls} rounded-full bg-zinc-950/65 backdrop-blur-md border-2 border-zinc-500/45 shadow-[0_8px_28px_rgba(0,0,0,0.65)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing transition-colors`}
              >
                {/* Hold-UP jump zone hint */}
                <div
                  ref={(el) => {
                    jumpIndRefs.current[idx] = el;
                  }}
                  className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 text-white/80 transition-all duration-100"
                  style={{ opacity: 0.32 }}
                >
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.75]" />
                </div>

                {/* Subtle crosshairs */}
                <div className="pointer-events-none absolute inset-3.5 rounded-full border border-white/10" />

                {/* Inner Knob */}
                <div
                  ref={(el) => {
                    knobRefs.current[idx] = el;
                  }}
                  className="pointer-events-none w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-white/90 shadow-lg flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, #ffffff, ${col} 70%)`,
                    boxShadow: `0 0 18px ${col}66, inset 0 1px 2px rgba(255,255,255,0.6)`,
                  }}
                >
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-white drop-shadow">
                    {onlineMode ? 'SİZ' : `P${idx + 1}`}
                  </span>
                </div>
              </div>

              {/* Dedicated Attack + Jump buttons beside each local joystick (2P) or Jump button (3P/4P) */}
              {!onlineMode && (
                <div className={`flex items-end gap-1.5 ${rightSide ? 'flex-row-reverse' : 'flex-row'}`}>
                  <button
                    ref={(el) => {
                      jumpBtnRefs.current[idx] = el;
                    }}
                    type="button"
                    data-jump-idx={idx}
                    aria-label={`${PLAYER_NAMES[idx] || `P${idx + 1}`} Hoppan`}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-950/80 backdrop-blur-md border-2 border-zinc-400/60 shadow-[0_6px_20px_rgba(0,0,0,0.65)] text-white flex flex-col items-center justify-center touch-none transition-transform duration-75"
                  >
                    <ChevronUp className="w-5 h-5 stroke-[2.75]" />
                  </button>
                  {playerCount <= 2 && (
                    <button
                      ref={(el) => {
                        attackBtnRefs.current[idx] = el;
                      }}
                      type="button"
                      data-attack-idx={idx}
                      aria-label={`${PLAYER_NAMES[idx] || `P${idx + 1}`} Vur`}
                      className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-zinc-950/85 backdrop-blur-md border-2 border-white/75 shadow-[0_6px_22px_rgba(0,0,0,0.7)] text-white flex flex-col items-center justify-center touch-none transition-transform duration-75"
                    >
                      <Swords className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.4]" />
                      <span className="text-[7px] font-extrabold tracking-wider uppercase leading-none">Vur</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <span className="px-2 py-0.5 rounded bg-zinc-950/75 border border-zinc-800 text-[9px] sm:text-[10px] font-semibold text-zinc-300 tracking-wide">
              {onlineMode
                ? splitOnline
                  ? 'Hərəkət / Nişan'
                  : 'Yuxarı = Hoppan · Burax = Zərbə'
                : PLAYER_NAMES[idx] || `P${idx + 1}`}
            </span>
          </div>
        );
      })}

      {/* Dedicated Online Action Cluster (Opposite side from joystick) */}
      {onlineMode && (
        <div
          className={`pointer-events-auto fixed ${onlineActionCornerClass} flex items-end gap-2.5 sm:gap-3.5 touch-none ${
            onlineControlsSwapped ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {splitOnline && (
            <button
              ref={(el) => {
                attackBtnRefs.current[0] = el;
              }}
              type="button"
              data-attack-idx={0}
              aria-label="Vur"
              className={`${attackThumbCls} rounded-full bg-zinc-950/80 backdrop-blur-md border-2 border-white/75 shadow-[0_8px_28px_rgba(0,0,0,0.75)] text-white flex flex-col items-center justify-center gap-0.5 touch-none transition-transform`}
            >
              <Swords className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.3]" />
              <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider uppercase text-white">
                Vur
              </span>
            </button>
          )}

          <button
            ref={(el) => {
              jumpBtnRefs.current[0] = el;
            }}
            type="button"
            data-jump-idx={0}
            aria-label="Hoppan"
            className={`${jumpThumbCls} ${
              splitOnline ? '-translate-y-2 sm:-translate-y-3' : ''
            } rounded-full bg-zinc-950/75 backdrop-blur-md border-2 border-zinc-400/65 shadow-[0_8px_28px_rgba(0,0,0,0.7)] text-white flex flex-col items-center justify-center gap-0.5 touch-none transition-transform`}
          >
            <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.75]" />
            <span className="text-[8px] sm:text-[9px] font-bold tracking-wider uppercase text-zinc-200">
              Hoppan
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

