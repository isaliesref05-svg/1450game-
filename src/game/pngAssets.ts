import {
  ARENA_H,
  ARENA_MAPS,
  ARENA_W,
  buildMapBackground,
  drawArenaPillar,
  drawArenaPlatform,
  drawIceBlock,
  getPendulumBob,
  roundRectPath,
} from './maps';
import { MapId, MinigameId, WeaponChoice } from './types';
import miniZombieImg from '../assets/images/mini_zombie_survival_1794948848694.jpg';

function line(ctx: CanvasRenderingContext2D, a: number, b: number, c: number, d: number) {
  ctx.beginPath();
  ctx.moveTo(a, b);
  ctx.lineTo(c, d);
  ctx.stroke();
}

function lg(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, cols: string[]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  cols.forEach((c, i) => g.addColorStop(i / Math.max(1, cols.length - 1), c));
  return g;
}

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string | CanvasGradient) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawShuriken(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  rot: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const an = (k * Math.PI) / 4;
    const r = k % 2 ? R * 0.35 : R;
    if (k) ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
    else ctx.moveTo(Math.cos(an) * r, Math.sin(an) * r);
  }
  ctx.closePath();
  ctx.fillStyle = lg(ctx, -R, -R, R, R, ['#f4f7fa', '#8f9ba8', '#47525e']);
  ctx.fill();
  ctx.strokeStyle = '#2b323b';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#0b0f1a';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.2, 0, 6.3);
  ctx.fill();
  ctx.restore();
}

export function drawWeaponSprite(ctx: CanvasRenderingContext2D, w: WeaponChoice, T = Date.now()) {
  if (w === 'fist') return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (w === 'sword') {
    ctx.strokeStyle = '#4a2c12';
    ctx.lineWidth = 5;
    line(ctx, -6, 0, 6, 0);
    ctx.fillStyle = lg(ctx, 0, -4, 0, 4, ['#ffffff', '#b8c4d2', '#6c7889']);
    ctx.beginPath();
    ctx.moveTo(9, -3.4);
    ctx.lineTo(44, -2.4);
    ctx.lineTo(54, 0);
    ctx.lineTo(44, 2.4);
    ctx.lineTo(9, 3.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,95,130,.7)';
    ctx.lineWidth = 1;
    line(ctx, 12, 0, 46, 0);
    ctx.shadowColor = '#9cf';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(200,230,255,.9)';
    line(ctx, 10, -3.2, 44, -2.3);
    ctx.shadowBlur = 0;
    ctx.fillStyle = lg(ctx, 0, -10, 0, 10, ['#ffe38a', '#c8922a', '#8a5f16']);
    roundRectPath(ctx, 6, -10, 5, 20, 2);
    ctx.fill();
    ctx.fillStyle = '#e8b43c';
    ctx.beginPath();
    ctx.arc(-8, 0, 3.2, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(-8, 0, 1.3, 0, 6.3);
    ctx.fill();
  } else if (w === 'hammer') {
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 5.5;
    line(ctx, -6, 0, 36, 0);
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) line(ctx, 2 + k * 5, -3, 5 + k * 5, 3);
    poly(ctx, [[38, -9], [44, -18], [50, -9]], '#aeb7c1');
    poly(ctx, [[38, 9], [44, 18], [50, 9]], '#aeb7c1');
    ctx.fillStyle = lg(ctx, 0, -13, 0, 13, ['#eef2f6', '#9aa5b1', '#4d5763']);
    roundRectPath(ctx, 28, -13, 22, 26, 3);
    ctx.fill();
    ctx.fillStyle = '#2f3944';
    ctx.fillRect(31, -13, 2.5, 26);
    ctx.fillRect(44.5, -13, 2.5, 26);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(34, -11, 9, 2);
  } else if (w === 'axe') {
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 5;
    line(ctx, -8, 0, 42, 0);
    ctx.strokeStyle = '#2d1c0d';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) line(ctx, -4 + k * 4, -3, -2 + k * 4, 3);
    poly(ctx, [[30, 2], [25, 15], [41, 4]], '#7a8693');
    ctx.fillStyle = lg(ctx, 28, -26, 56, 0, ['#f4f7fa', '#8f9ba8', '#47525e']);
    ctx.beginPath();
    ctx.moveTo(30, -4);
    ctx.bezierCurveTo(28, -18, 38, -28, 54, -26);
    ctx.bezierCurveTo(60, -14, 55, -3, 44, 1);
    ctx.lineTo(30, 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = '#9ef';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(180,240,255,.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(54, -26);
    ctx.bezierCurveTo(60, -14, 55, -3, 44, 1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#caa23a';
    ctx.fillRect(27, -4, 5, 8);
  } else if (w === 'gun') {
    poly(ctx, [[3, 2], [13, 2], [11, 16], [1, 16]], '#3a2a1e');
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) line(ctx, 3 + k * 0.8, 6 + k * 3, 11 - k * 0.4, 6 + k * 3);
    ctx.strokeStyle = '#1c2128';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(16, 4, 4, 0, Math.PI);
    ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -7, 0, 3, ['#69747f', '#2b323b', '#171b21']);
    roundRectPath(ctx, 0, -7, 30, 10, 2.5);
    ctx.fill();
    ctx.fillStyle = '#0e1116';
    ctx.fillRect(30, -5, 5, 5);
    ctx.fillStyle = '#ff9a2e';
    ctx.fillRect(4, -5, 8, 2);
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(27, -9, 3, 2.2);
  } else if (w === 'shotgun') {
    poly(ctx, [[-16, -2], [-4, -3], [-1, 7], [-14, 10]], '#6b4423');
    ctx.fillStyle = lg(ctx, 0, -6, 0, 0, ['#9aa5b1', '#2b323b']);
    roundRectPath(ctx, 0, -6, 44, 5, 2);
    ctx.fill();
    ctx.fillStyle = lg(ctx, 0, 0, 0, 5, ['#7d8995', '#1d232a']);
    roundRectPath(ctx, 0, 0, 44, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#3b434d';
    roundRectPath(ctx, -2, -7, 14, 14, 2);
    ctx.fill();
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(2, -5, 6, 2);
    ctx.fillStyle = lg(ctx, 0, 2, 0, 9, ['#8a5a2e', '#4a2e14']);
    roundRectPath(ctx, 20, 3, 14, 6, 2);
    ctx.fill();
  } else if (w === 'smg') {
    ctx.fillStyle = lg(ctx, 0, 12, 0, 20, ['#6b7480', '#2b323b']);
    ctx.beginPath();
    ctx.arc(12, 12, 8, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -6, 0, 5, ['#69747f', '#2b323b', '#171b21']);
    roundRectPath(ctx, 0, -6, 26, 11, 3);
    ctx.fill();
    ctx.fillStyle = '#20262d';
    roundRectPath(ctx, 26, -4, 11, 7, 2);
    ctx.fill();
    poly(ctx, [[17, 4], [23, 4], [22, 12], [16, 12]], '#3a2a1e');
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(9, -9, 5, 3);
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(1, -4, 6, 2);
    ctx.fillStyle = '#20262d';
    ctx.fillRect(-10, -3, 10, 5);
  } else if (w === 'sniper') {
    poly(ctx, [[-14, -4], [2, -4], [4, 6], [-10, 8], [-14, 2]], '#6b4423');
    ctx.fillStyle = lg(ctx, 0, -4, 0, 4, ['#566170', '#1b2027']);
    roundRectPath(ctx, 2, -4, 38, 8, 2);
    ctx.fill();
    ctx.fillStyle = '#14181d';
    ctx.fillRect(40, -2.2, 20, 4.4);
    ctx.fillStyle = '#2d343d';
    ctx.fillRect(58, -3.2, 5, 6.4);
    ctx.fillStyle = '#2b323b';
    ctx.fillRect(12, -6, 3, 3);
    ctx.fillRect(25, -6, 3, 3);
    ctx.fillStyle = lg(ctx, 0, -14, 0, -6, ['#6a7584', '#1f252d']);
    roundRectPath(ctx, 8, -13, 24, 7, 3.5);
    ctx.fill();
    ctx.shadowColor = '#6df';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#8ff';
    ctx.fillRect(31, -12, 2.5, 5);
    ctx.fillRect(7, -12, 2.5, 5);
    ctx.shadowBlur = 0;
  } else if (w === 'rocket') {
    poly(ctx, [[-16, -9], [-8, -7], [-8, 7], [-16, 9]], '#2c3329');
    ctx.fillStyle = lg(ctx, 0, -9, 0, 9, ['#8a9a7a', '#4a5640', '#2b3326']);
    roundRectPath(ctx, -10, -8, 46, 16, 5);
    ctx.fill();
    ctx.fillStyle = '#ffcf33';
    ctx.fillRect(6, -8, 4, 16);
    ctx.fillStyle = '#1a1f17';
    ctx.fillRect(10, -8, 2, 16);
    ctx.fillStyle = '#ffcf33';
    ctx.fillRect(16, -8, 4, 16);
    ctx.fillStyle = '#1a1f17';
    roundRectPath(ctx, 34, -9, 5, 18, 2);
    ctx.fill();
    poly(ctx, [[38, -6], [53, 0], [38, 6]], '#d83a2a');
    poly(ctx, [[38, -6], [47, -3], [38, 0]], '#ff8a6a');
  } else if (w === 'flame') {
    ctx.fillStyle = lg(ctx, -20, 0, -2, 0, ['#e74c3c', '#8c1d18']);
    roundRectPath(ctx, -20, -2, 18, 15, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(-14, -2, 3, 15);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    ctx.quadraticCurveTo(0, 15, 8, 4);
    ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -5, 0, 4, ['#7d8995', '#2b323b']);
    roundRectPath(ctx, 2, -5, 24, 9, 3);
    ctx.fill();
    ctx.fillStyle = lg(ctx, 26, -8, 36, 4, ['#ffb347', '#c4541a']);
    ctx.beginPath();
    ctx.moveTo(26, -5);
    ctx.lineTo(36, -8);
    ctx.lineTo(36, 4);
    ctx.lineTo(26, 4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = '#ff9a2e';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.ellipse(39, -2, 4, 2.5, 0, 0, 6.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (w === 'bow') {
    ctx.strokeStyle = lg(ctx, 0, -20, 0, 20, ['#c58a4a', '#7a4a1f', '#c58a4a']);
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(6, 0, 20, -1.25, 1.25);
    ctx.stroke();
    const tx = 6 + 20 * Math.cos(1.25);
    const ty = 20 * Math.sin(1.25);
    ctx.fillStyle = '#e8b43c';
    ctx.beginPath();
    ctx.arc(tx, -ty, 2.6, 0, 6.3);
    ctx.arc(tx, ty, 2.6, 0, 6.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, -ty);
    ctx.lineTo(-3, 0);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = '#d9b27a';
    ctx.lineWidth = 2;
    line(ctx, -3, 0, 30, 0);
    poly(ctx, [[30, -3.5], [39, 0], [30, 3.5]], '#e6edf3');
  } else if (w === 'spear') {
    ctx.strokeStyle = lg(ctx, 0, -3, 0, 3, ['#c99a60', '#6b4423']);
    ctx.lineWidth = 4;
    line(ctx, -10, 0, 66, 0);
    ctx.fillStyle = '#d83a2a';
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(70, -6);
    ctx.lineTo(67, 0);
    ctx.lineTo(70, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9a43a';
    ctx.fillRect(63, -3.5, 5, 7);
    ctx.fillStyle = lg(ctx, 0, -8, 0, 8, ['#ffffff', '#b8c4d2', '#6c7889']);
    ctx.beginPath();
    ctx.moveTo(68, 0);
    ctx.quadraticCurveTo(74, -9, 94, 0);
    ctx.quadraticCurveTo(74, 9, 68, 0);
    ctx.fill();
  } else if (w === 'mine') {
    ctx.fillStyle = lg(ctx, 0, -3, 0, 10, ['#59626d', '#22272e']);
    ctx.beginPath();
    ctx.ellipse(8, 3, 11, 6, 0, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = '#39414b';
    ctx.beginPath();
    ctx.ellipse(8, 1, 7, 5, 0, Math.PI, 6.283);
    ctx.fill();
    ctx.strokeStyle = '#9aa4ae';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) line(ctx, 8 + (k - 2) * 4, -2, 8 + (k - 2) * 5, -6);
    ctx.shadowColor = '#f33';
    ctx.shadowBlur = 8;
    ctx.fillStyle = T % 600 < 300 ? '#ff3b3b' : '#7a1515';
    ctx.beginPath();
    ctx.arc(8, -1, 2.2, 0, 6.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (w === 'laser') {
    poly(ctx, [[3, 5], [12, 5], [10, 16], [2, 16]], '#2b3440');
    ctx.fillStyle = 'rgba(80,255,255,.85)';
    ctx.fillRect(3.5, 8, 2, 5);
    poly(ctx, [[4, -7], [10, -13], [17, -7]], '#aab6c2');
    ctx.fillStyle = lg(ctx, 0, -7, 0, 5, ['#ffffff', '#c9d3dd', '#7d8995']);
    roundRectPath(ctx, 0, -7, 28, 12, 5);
    ctx.fill();
    ctx.shadowColor = '#4ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#4ff';
    roundRectPath(ctx, 6, -3, 16, 3, 1.5);
    ctx.fill();
    ctx.fillStyle = '#2b3440';
    roundRectPath(ctx, 28, -5, 6, 8, 2);
    ctx.fill();
    ctx.fillStyle = '#bff';
    ctx.beginPath();
    ctx.arc(35, -1, 2.4, 0, 6.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (w === 'shuriken') {
    drawShuriken(ctx, 5, 7, 10, 0.3);
    drawShuriken(ctx, 12, -2, 13, T * 0.004);
  } else if (w === 'staff') {
    ctx.strokeStyle = lg(ctx, 0, -3, 0, 3, ['#a06a36', '#4a2e14']);
    ctx.lineWidth = 5;
    line(ctx, -12, 0, 50, 0);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 2;
    line(ctx, 8, -3.5, 8, 3.5);
    line(ctx, 30, -3.5, 30, 3.5);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 0);
    ctx.quadraticCurveTo(54, -12, 64, -10);
    ctx.moveTo(50, 0);
    ctx.quadraticCurveTo(54, 12, 64, 10);
    ctx.stroke();
    const pu = 1 + Math.sin(T * 0.008) * 0.15;
    ctx.shadowColor = '#c6f';
    ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(59, 0, 1, 60, 0, 9 * pu);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.5, '#d58bff');
    g.addColorStop(1, '#6a1fb0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(60, 0, 7.5 * pu, 0, 6.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (w === 'frost') {
    poly(ctx, [[3, 5], [11, 5], [9, 16], [1, 16]], '#2c5d8a');
    ctx.fillStyle = lg(ctx, 0, -7, 0, 6, ['#e8f9ff', '#8fd0f2', '#3a86c4']);
    roundRectPath(ctx, 0, -7, 24, 13, 5);
    ctx.fill();
    ctx.shadowColor = '#9df';
    ctx.shadowBlur = 10;
    poly(ctx, [[24, -6], [41, -2], [24, 0]], '#dff6ff');
    poly(ctx, [[24, 0], [43, 2], [24, 6]], '#b7e6ff');
    poly(ctx, [[20, -7], [29, -17], [30, -6]], '#e8fbff');
    ctx.shadowBlur = 0;
  } else if (w === 'tesla') {
    poly(ctx, [[3, 5], [11, 5], [9, 16], [1, 16]], '#2b323b');
    ctx.fillStyle = lg(ctx, 0, -6, 0, 6, ['#6b7480', '#2b323b', '#14181d']);
    roundRectPath(ctx, -2, -6, 18, 12, 3);
    ctx.fill();
    ctx.strokeStyle = '#d98a3a';
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(19 + k * 5, 0, 2.5, 7, 0, 0, 6.3);
      ctx.stroke();
    }
    ctx.strokeStyle = '#cfd6de';
    ctx.lineWidth = 2.5;
    line(ctx, 36, -4, 44, -9);
    line(ctx, 36, 4, 44, 9);
    ctx.shadowColor = '#8ff';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#dff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(44, -9);
    ctx.lineTo(41, -4);
    ctx.lineTo(46, -1);
    ctx.lineTo(42, 3);
    ctx.lineTo(44, 9);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (w === 'rifle') {
    poly(ctx, [[-14, -4], [0, -5], [2, 5], [-10, 8], [-15, 2]], '#3a2a1e');
    ctx.fillStyle = lg(ctx, 0, -7, 0, 4, ['#6b7480', '#2b323b', '#14181d']);
    roundRectPath(ctx, 0, -7, 30, 11, 2);
    ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -5, 0, 3, ['#9a7a44', '#4a3418']);
    roundRectPath(ctx, 28, -5, 16, 8, 2);
    ctx.fill();
    ctx.fillStyle = '#14181d';
    ctx.fillRect(44, -3, 12, 4);
    ctx.fillStyle = '#2b323b';
    ctx.fillRect(54, -4.5, 4, 7);
    ctx.fillStyle = lg(ctx, 0, 4, 0, 18, ['#59626d', '#22272e']);
    ctx.beginPath();
    ctx.moveTo(24, 4);
    ctx.lineTo(30, 4);
    ctx.quadraticCurveTo(33, 12, 29, 18);
    ctx.lineTo(23, 18);
    ctx.quadraticCurveTo(26, 11, 24, 4);
    ctx.fill();
  } else if (w === 'minigun') {
    const sp = T * 0.03;
    ctx.fillStyle = '#4a5640';
    roundRectPath(ctx, 8, -17, 16, 9, 2);
    ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -9, 0, 8, ['#7d8995', '#3b434d', '#1b2027']);
    roundRectPath(ctx, 6, -9, 24, 17, 4);
    ctx.fill();
    for (let k = 0; k < 6; k++) {
      const a = sp + k * 1.047;
      const yy = Math.sin(a) * 5;
      ctx.fillStyle = Math.cos(a) > 0 ? '#9aa5b1' : '#4d5763';
      ctx.fillRect(30, yy - 1.7, 28, 3.4);
    }
    ctx.fillStyle = '#2b323b';
    ctx.fillRect(34, -8, 3, 16);
    ctx.fillRect(52, -8, 3, 16);
  } else if (w === 'grenade') {
    ctx.fillStyle = lg(ctx, 0, -8, 0, 6, ['#8a9a7a', '#4a5640', '#2b3326']);
    roundRectPath(ctx, 0, -8, 36, 14, 4);
    ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -6, 0, 5, ['#7d8995', '#2b323b']);
    roundRectPath(ctx, 34, -6, 22, 11, 3);
    ctx.fill();
    ctx.fillStyle = '#ffcf33';
    ctx.fillRect(40, -10, 4, 3);
  } else if (w === 'chainsaw') {
    ctx.fillStyle = lg(ctx, 0, -8, 0, 7, ['#ffb04a', '#e8731a', '#a8430a']);
    roundRectPath(ctx, -8, -8, 26, 15, 4);
    ctx.fill();
    ctx.fillStyle = '#8f9ba8';
    roundRectPath(ctx, 18, -4.5, 32, 9, 4.5);
    ctx.fill();
    ctx.fillStyle = '#2b323b';
    roundRectPath(ctx, 20, -3, 28, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#e8eef5';
    const off = (T * 0.05) % 5;
    for (let x = 18 + off; x < 47; x += 5) {
      ctx.fillRect(x, -6.4, 2.2, 2.2);
      ctx.fillRect(x, 4.2, 2.2, 2.2);
    }
  } else if (w === 'boomerang') {
    ctx.strokeStyle = lg(ctx, 0, -16, 16, 16, ['#ffd27a', '#d8862a', '#8a4a12']);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(4, -16);
    ctx.lineTo(14, 0);
    ctx.lineTo(4, 16);
    ctx.stroke();
    ctx.strokeStyle = '#d83a2a';
    ctx.lineWidth = 2;
    line(ctx, 6, -9, 12, -6);
    line(ctx, 6, 9, 12, 6);
  } else if (w === 'katana') {
    ctx.strokeStyle = '#14181d';
    ctx.lineWidth = 4.5;
    line(ctx, -9, 0, 4, 0);
    ctx.fillStyle = '#c9a43a';
    ctx.beginPath();
    ctx.arc(-10, 0, 2.6, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -6, 0, 6, ['#ffe38a', '#c8922a']);
    ctx.beginPath();
    ctx.ellipse(6, 0, 2.6, 6.5, 0, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -4, 0, 3, ['#ffffff', '#b8c4d2', '#6c7889']);
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.quadraticCurveTo(38, -3, 64, -8);
    ctx.quadraticCurveTo(40, 2.2, 8, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = '#9cf';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(210,235,255,.95)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(9, -2);
    ctx.quadraticCurveTo(38, -3, 64, -8);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    // bomb
    const g = ctx.createRadialGradient(5, -3, 1, 8, 0, 11);
    g.addColorStop(0, '#6a727c');
    g.addColorStop(1, '#101216');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(8, 0, 9.5, 0, 6.3);
    ctx.fill();
    ctx.save();
    ctx.translate(8, 0);
    ctx.rotate(-0.8);
    ctx.fillStyle = '#9aa4ae';
    ctx.fillRect(-3, -12.5, 6, 4);
    ctx.restore();
    ctx.strokeStyle = '#d9b27a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(13, -7);
    ctx.quadraticCurveTo(18, -10, 17, -15);
    ctx.stroke();
    ctx.shadowColor = '#ffb02e';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(17, -16, 3.5, 0, 6.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

const weaponPngCache = new Map<string, string>();
export function getWeaponPng(w: WeaponChoice): string {
  const cached = weaponPngCache.get(w);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';

  const c = document.createElement('canvas');
  c.width = 112;
  c.height = 112;
  const g = c.getContext('2d')!;

  if (w === 'random') {
    g.save();
    g.translate(56, 56);
    g.rotate(-0.12);
    g.fillStyle = '#f4f4f5';
    roundRectPath(g, -28, -28, 56, 56, 12);
    g.fill();
    g.strokeStyle = '#a1a1aa';
    g.lineWidth = 2;
    g.stroke();
    const dots: [number, number, string][] = [
      [-13, -13, '#18181b'],
      [13, -13, '#ef4444'],
      [0, 0, '#18181b'],
      [-13, 13, '#18181b'],
      [13, 13, '#18181b'],
    ];
    for (const [dx, dy, col] of dots) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(dx, dy, 5, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    const url = c.toDataURL('image/png');
    weaponPngCache.set(w, url);
    return url;
  }

  if (w === 'fist') {
    g.save();
    g.translate(56, 56);
    g.fillStyle = '#e4e4e7';
    roundRectPath(g, -22, -20, 44, 34, 11);
    g.fill();
    g.strokeStyle = '#71717a';
    g.lineWidth = 2.5;
    line(g, -10, -10, -10, 2);
    line(g, 0, -12, 0, 4);
    line(g, 10, -10, 10, 2);
    g.fillStyle = '#18181b';
    roundRectPath(g, -16, 14, 32, 10, 4);
    g.fill();
    g.restore();
    const url = c.toDataURL('image/png');
    weaponPngCache.set(w, url);
    return url;
  }

  // Render sprite onto temp large canvas, crop tight bounds, then center in 112x112
  const tmp = document.createElement('canvas');
  tmp.width = 320;
  tmp.height = 220;
  const tg = tmp.getContext('2d')!;
  tg.setTransform(2, 0, 0, 2, 70, 110);
  tg.rotate(-0.22);
  drawWeaponSprite(tg, w, 120);

  const px = tg.getImageData(0, 0, tmp.width, tmp.height).data;
  let minX = tmp.width, minY = tmp.height, maxX = 0, maxY = 0;
  for (let y = 0; y < tmp.height; y++) {
    for (let x = 0; x < tmp.width; x++) {
      if (px[(y * tmp.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);
  const fit = Math.min(84 / bw, 84 / bh);
  const dw = bw * fit;
  const dh = bh * fit;
  g.drawImage(tmp, minX, minY, bw, bh, (112 - dw) / 2, (112 - dh) / 2, dw, dh);

  const url = c.toDataURL('image/png');
  weaponPngCache.set(w, url);
  return url;
}

const mapPngCache = new Map<string, string>();
export function getMapPng(mapId: MapId): string {
  const cached = mapPngCache.get(mapId);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';

  const w = 320;
  const h = 180;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;

  if (mapId === 'random') {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#18181b');
    gr.addColorStop(1, '#09090b');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let x = 0; x < w; x += 24) line(g, x, 0, x, h);
    for (let y = 0; y < h; y += 24) line(g, 0, y, w, y);
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(-0.14);
    g.fillStyle = '#f4f4f5';
    roundRectPath(g, -34, -34, 68, 68, 14);
    g.fill();
    g.fillStyle = '#09090b';
    for (const [dx, dy] of [[-15, -15], [15, -15], [0, 0], [-15, 15], [15, 15]]) {
      g.beginPath();
      g.arc(dx, dy, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    const url = c.toDataURL('image/png');
    mapPngCache.set(mapId, url);
    return url;
  }

  const def = ARENA_MAPS[mapId];
  const bg = buildMapBackground(def.style);
  g.drawImage(bg, 0, 0, w, h);
  g.save();
  g.scale(w / ARENA_W, h / ARENA_H);
  def.pl.forEach((p, idx) => drawArenaPlatform(g, p, def.style, def.plMeta?.[idx], 0));
  if (def.pillars) {
    def.pillars.forEach((pl) => drawArenaPillar(g, pl, def.style));
  }
  if (def.ice) {
    def.ice.forEach((ic) => drawIceBlock(g, ic.x, ic.y, ic.w, ic.h, 1, 0));
  }
  if (def.moving) {
    def.moving.forEach((m) => drawArenaPlatform(g, [m.x, m.y, m.w, m.h], def.style));
  }
  if (def.lifts) {
    def.lifts.forEach((lz) => {
      g.fillStyle = `${lz.color || '#38bdf8'}44`;
      g.fillRect(lz.x, lz.y, lz.w, lz.h);
    });
  }
  if (def.pads) {
    def.pads.forEach(([px, py, pw]) => {
      g.fillStyle = '#4ade80';
      roundRectPath(g, px - pw / 2, py - 8, pw, 8, 4);
      g.fill();
    });
  }
  if (def.bumpers) {
    def.bumpers.forEach((bp) => {
      g.fillStyle = bp.color;
      g.beginPath();
      g.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2);
      g.fill();
    });
  }
  if (def.portals) {
    def.portals.forEach((pt) => {
      g.strokeStyle = pt.color;
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(pt.ax, pt.ay, 20, 34, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.ellipse(pt.bx, pt.by, 20, 34, 0, 0, Math.PI * 2);
      g.stroke();
    });
  }
  if (def.pendulums) {
    def.pendulums.forEach((p) => {
      const [bx, by] = getPendulumBob(p, 20);
      g.strokeStyle = '#71717a';
      g.lineWidth = 5;
      line(g, p.px, p.py, bx, by);
      g.fillStyle = '#e4e4e7';
      g.beginPath();
      g.arc(bx, by, p.radius, 0, Math.PI * 2);
      g.fill();
    });
  }
  if (def.lasers) {
    def.lasers.forEach((ls) => {
      g.strokeStyle = '#ef4444';
      g.lineWidth = 8;
      line(g, ls.x1, ls.y1, ls.x2, ls.y2);
    });
  }
  if (def.lava) {
    const lg2 = g.createLinearGradient(0, 610, 0, ARENA_H);
    lg2.addColorStop(0, '#fde047');
    lg2.addColorStop(0.35, '#f97316');
    lg2.addColorStop(1, '#7c2d12');
    g.fillStyle = lg2;
    g.fillRect(0, 610, ARENA_W, 110);
  }
  g.restore();

  const url = c.toDataURL('image/png');
  mapPngCache.set(mapId, url);
  return url;
}

const miniPngCache = new Map<string, string>();
export function getMinigamePng(id: MinigameId): string {
  const cached = miniPngCache.get(id);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';

  const w = 640;
  const h = 400;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;

  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#18181b');
  bg.addColorStop(1, '#09090b');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  if (id === 'zombie') {
    const zg = g.createRadialGradient(320, 210, 30, 320, 210, 360);
    zg.addColorStop(0, '#132a17');
    zg.addColorStop(0.6, '#0b1610');
    zg.addColorStop(1, '#060807');
    g.fillStyle = zg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(74,222,128,0.09)';
    for (let x = 0; x < w; x += 48) line(g, x, 0, x, h);
    for (let y = 0; y < h; y += 48) line(g, 0, y, w, y);
    g.fillStyle = '#27272a';
    roundRectPath(g, 90, 110, 64, 88, 10); g.fill();
    roundRectPath(g, 480, 200, 64, 88, 10); g.fill();
    g.strokeStyle = '#3b82f6'; g.lineWidth = 9; g.lineCap = 'round';
    line(g, 190, 215, 190, 265);
    line(g, 190, 265, 170, 305); line(g, 190, 265, 210, 305);
    line(g, 190, 224, 236, 220);
    g.fillStyle = '#3b82f6'; g.beginPath(); g.arc(190, 186, 20, 0, Math.PI * 2); g.fill();
    g.shadowColor = '#38bdf8'; g.shadowBlur = 18;
    g.fillStyle = '#bae6fd'; roundRectPath(g, 250, 212, 40, 10, 5); g.fill();
    g.shadowBlur = 0;
    for (const [zx, zy, sc, col] of [[410, 195, 1.0, '#4ade80'], [510, 145, 1.18, '#a3e635']] as [number, number, number, string][]) {
      g.strokeStyle = col; g.lineWidth = 9 * sc;
      line(g, zx, zy, zx - 8 * sc, zy + 48 * sc);
      line(g, zx - 8 * sc, zy + 48 * sc, zx - 24 * sc, zy + 84 * sc);
      line(g, zx - 8 * sc, zy + 48 * sc, zx + 12 * sc, zy + 84 * sc);
      line(g, zx, zy + 10 * sc, zx - 36 * sc, zy + 4 * sc);
      g.fillStyle = col; g.beginPath(); g.arc(zx + 4 * sc, zy - 24 * sc, 18 * sc, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fef08a';
      g.beginPath(); g.arc(zx - 2 * sc, zy - 26 * sc, 4 * sc, 0, Math.PI * 2); g.fill();
    }
  } else if (id === 'meteor') {
    // Deep volcanic cosmic nebula + shattered planet + glowing magma bridge + diagonal meteors & geyser
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#070412');
    sky.addColorStop(0.45, '#1d0d2c');
    sky.addColorStop(0.82, '#5c1810');
    sky.addColorStop(1, '#1a0705');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    for (let i = 0; i < 48; i++) {
      const sx = (i * 97 + 23) % w;
      const sy = (i * 53 + 11) % 230;
      g.fillStyle = i % 3 === 0 ? 'rgba(253,224,71,0.78)' : 'rgba(226,232,240,0.62)';
      g.beginPath(); g.arc(sx, sy, (i % 2) + 1, 0, Math.PI * 2); g.fill();
    }

    // Shattered glowing exoplanet
    const px = 495;
    const py = 96;
    const pg = g.createRadialGradient(px - 16, py - 16, 6, px, py, 56);
    pg.addColorStop(0, '#fb923c');
    pg.addColorStop(0.55, '#9f1239');
    pg.addColorStop(1, '#1e1b4b');
    g.fillStyle = pg;
    g.beginPath(); g.arc(px, py, 50, 0, Math.PI * 2); g.fill();
    g.save();
    g.translate(px, py);
    g.rotate(-0.26);
    g.strokeStyle = 'rgba(253,186,116,0.5)';
    g.lineWidth = 6;
    g.beginPath(); g.ellipse(0, 0, 88, 19, 0, 0, Math.PI * 2); g.stroke();
    g.restore();

    // Jagged volcanic mountains with magma veins
    g.fillStyle = '#180c18';
    g.beginPath();
    g.moveTo(0, 325); g.lineTo(90, 212); g.lineTo(195, 276); g.lineTo(310, 195);
    g.lineTo(445, 268); g.lineTo(565, 214); g.lineTo(640, 280); g.lineTo(640, 400); g.lineTo(0, 400);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(249,115,22,0.55)'; g.lineWidth = 2.5;
    line(g, 90, 212, 112, 290);
    line(g, 310, 195, 290, 285);
    line(g, 565, 214, 540, 298);

    // Molten river abyss below bridge
    const lava = g.createLinearGradient(0, 340, 0, h);
    lava.addColorStop(0, '#7c2d12');
    lava.addColorStop(0.45, '#ea580c');
    lava.addColorStop(1, '#facc15');
    g.fillStyle = lava;
    g.fillRect(0, 340, w, 60);

    // Steel truss bridge deck
    g.fillStyle = '#334155';
    g.fillRect(0, 326, w, 18);
    g.fillStyle = '#f97316';
    g.fillRect(0, 325, w, 3.5);

    // Erupting magma geyser column on left
    const gey = g.createLinearGradient(0, 190, 0, 330);
    gey.addColorStop(0, 'rgba(253,224,71,0)');
    gey.addColorStop(0.4, 'rgba(249,115,22,0.8)');
    gey.addColorStop(1, 'rgba(254,240,138,0.95)');
    g.fillStyle = gey;
    roundRectPath(g, 82, 190, 34, 140, 16); g.fill();

    // Diagonal piercing meteors
    for (const [mx, my, mr] of [[240, 138, 30], [456, 126, 26], [358, 56, 17]] as [number, number, number][]) {
      g.save();
      const tail = g.createLinearGradient(mx - mr * 2.8, my - mr * 3.8, mx, my);
      tail.addColorStop(0, 'rgba(251,146,60,0)');
      tail.addColorStop(0.6, 'rgba(249,115,22,0.58)');
      tail.addColorStop(1, 'rgba(254,240,138,0.96)');
      g.fillStyle = tail;
      g.beginPath();
      g.moveTo(mx - mr * 2.8, my - mr * 3.8);
      g.lineTo(mx + mr * 0.72, my - mr * 0.65);
      g.lineTo(mx - mr * 0.72, my + mr * 0.65);
      g.closePath();
      g.fill();

      g.shadowColor = '#f97316'; g.shadowBlur = 22;
      const mg = g.createRadialGradient(mx - mr * 0.25, my - mr * 0.25, 3, mx, my, mr);
      mg.addColorStop(0, '#fef08a');
      mg.addColorStop(0.5, '#ea580c');
      mg.addColorStop(1, '#431407');
      g.fillStyle = mg;
      g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    // Stickman leaping across catwalk
    g.strokeStyle = '#38bdf8'; g.lineWidth = 8; g.lineCap = 'round';
    line(g, 330, 275, 336, 304);
    line(g, 336, 304, 316, 322); line(g, 336, 304, 356, 318);
    line(g, 330, 280, 310, 268); line(g, 330, 280, 352, 266);
    g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(328, 256, 13, 0, Math.PI * 2); g.fill();
  } else if (id === 'inferno') {
    // Rising Lava Steel Foundry Shaft: Giant gears, pouring molten metal chutes, catwalks & rising magma
    const bg2 = g.createLinearGradient(0, 0, 0, h);
    bg2.addColorStop(0, '#120705');
    bg2.addColorStop(0.55, '#290f08');
    bg2.addColorStop(1, '#581c0c');
    g.fillStyle = bg2; g.fillRect(0, 0, w, h);

    // Giant foundry gear silhouettes
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 14;
    for (const [gx, gy, gr] of [[155, 135, 86], [490, 175, 96]] as [number, number, number][]) {
      g.beginPath(); g.arc(gx, gy, gr, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(gx, gy, gr * 0.42, 0, Math.PI * 2); g.stroke();
    }

    // Glowing molten metal pouring chute in background
    const pour = g.createLinearGradient(300, 0, 340, 0);
    pour.addColorStop(0, 'rgba(249,115,22,0)');
    pour.addColorStop(0.5, 'rgba(253,224,71,0.85)');
    pour.addColorStop(1, 'rgba(249,115,22,0)');
    g.fillStyle = pour;
    g.fillRect(298, 0, 44, 330);

    // Industrial steel catwalks & green hydraulic bounce piston
    for (const [px, py, pw] of [[68, 128, 200], [360, 188, 210], [115, 256, 225]]) {
      g.fillStyle = '#27272a';
      roundRectPath(g, px, py, pw, 16, 4); g.fill();
      g.fillStyle = '#f97316';
      g.fillRect(px + 2, py, pw - 4, 4);
    }
    g.fillStyle = '#4ade80';
    roundRectPath(g, 280, 246, 52, 10, 4); g.fill();

    // Glowing Summit Escape Beacon at top
    const esc = g.createRadialGradient(168, 92, 4, 168, 92, 54);
    esc.addColorStop(0, 'rgba(74,222,128,0.85)');
    esc.addColorStop(1, 'transparent');
    g.fillStyle = esc; g.fillRect(100, 30, 140, 120);
    g.strokeStyle = '#4ade80'; g.lineWidth = 3;
    roundRectPath(g, 142, 74, 52, 52, 10); g.stroke();

    // Roiling molten lava rising from bottom
    const lava = g.createLinearGradient(0, 305, 0, h);
    lava.addColorStop(0, '#fef08a');
    lava.addColorStop(0.22, '#f97316');
    lava.addColorStop(0.7, '#dc2626');
    lava.addColorStop(1, '#7f1d1d');
    g.fillStyle = lava;
    g.beginPath();
    g.moveTo(0, 326);
    for (let lx = 0; lx <= w; lx += 32) {
      g.lineTo(lx, 320 + Math.sin(lx * 0.04) * 9);
    }
    g.lineTo(w, h); g.lineTo(0, h); g.closePath();
    g.fill();

    // Climbers racing upward
    for (const [cx, cy, col] of [[168, 224, '#3b82f6'], [450, 156, '#ef4444']] as [number, number, string][]) {
      g.strokeStyle = col; g.lineWidth = 8; g.lineCap = 'round';
      line(g, cx, cy - 12, cx, cy + 14);
      line(g, cx, cy + 14, cx - 12, cy + 32); line(g, cx, cy + 14, cx + 12, cy + 32);
      g.fillStyle = col; g.beginPath(); g.arc(cx, cy - 26, 12, 0, Math.PI * 2); g.fill();
    }
  } else if (id === 'storm') {
    // Midnight Storm Cargo Ship: Lightning fork, heavy rain, bridge cabin, stacked containers, giant sea waves
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#020611');
    sky.addColorStop(0.52, '#0b192e');
    sky.addColorStop(1, '#082538');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);

    // Jagged Lightning Bolt from storm cloud
    g.save();
    g.shadowColor = '#38bdf8'; g.shadowBlur = 26;
    g.strokeStyle = '#e0f2fe'; g.lineWidth = 5;
    g.beginPath();
    g.moveTo(452, 0); g.lineTo(426, 72); g.lineTo(462, 134); g.lineTo(424, 215); g.lineTo(446, 300);
    g.stroke();
    g.restore();

    // Diagonal rain streaks
    g.strokeStyle = 'rgba(186,230,253,0.28)'; g.lineWidth = 1.6;
    for (let i = 0; i < 40; i++) {
      const rx = (i * 53 + 17) % w;
      const ry = (i * 39 + 11) % 320;
      line(g, rx, ry, rx - 10, ry + 26);
    }

    // Ship Captain's Bridge & Mast
    g.fillStyle = '#1e293b';
    roundRectPath(g, 88, 178, 122, 138, 6); g.fill();
    g.fillStyle = '#fef08a';
    for (const wx of [106, 136, 166]) {
      g.fillRect(wx, 198, 20, 14);
    }
    g.strokeStyle = '#475569'; g.lineWidth = 6;
    line(g, 330, 70, 330, 315);
    g.lineWidth = 2;
    line(g, 330, 92, 190, 210);
    line(g, 330, 92, 510, 250);

    // Cargo containers on ship deck
    g.fillStyle = '#7f1d1d';
    roundRectPath(g, 355, 254, 132, 60, 5); g.fill();
    g.fillStyle = '#1e3a5f';
    roundRectPath(g, 240, 266, 102, 48, 5); g.fill();

    // Ship Steel Hull Deck
    g.fillStyle = '#0f172a';
    g.beginPath();
    g.moveTo(52, 314); g.lineTo(588, 314); g.lineTo(558, 366); g.lineTo(82, 366); g.closePath();
    g.fill();
    g.fillStyle = '#ef4444';
    g.fillRect(64, 314, 512, 5);

    // Raging Ocean Waves at bottom
    const sea = g.createLinearGradient(0, 334, 0, h);
    sea.addColorStop(0, '#0284c7');
    sea.addColorStop(0.4, '#0c4a6e');
    sea.addColorStop(1, '#021728');
    g.fillStyle = sea;
    g.beginPath();
    g.moveTo(0, 344);
    for (let sx = 0; sx <= w; sx += 32) {
      g.lineTo(sx, 342 + Math.sin(sx * 0.035) * 10);
    }
    g.lineTo(w, h); g.lineTo(0, h); g.closePath();
    g.fill();

    // Fighters on ship
    for (const [fx, fy, col] of [[290, 232, '#3b82f6'], [415, 220, '#10b981']] as [number, number, string][]) {
      g.strokeStyle = col; g.lineWidth = 8; g.lineCap = 'round';
      line(g, fx, fy - 10, fx, fy + 16);
      line(g, fx, fy + 16, fx - 12, fy + 34); line(g, fx, fy + 16, fx + 12, fy + 34);
      g.fillStyle = col; g.beginPath(); g.arc(fx, fy - 24, 12, 0, Math.PI * 2); g.fill();
    }
  } else if (id === 'avalanche') {
    // Snow Avalanche Canyon Descent: Winter dusk aurora, pine peaks, flat snow floors with open gaps & billowing avalanche wall
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#041224');
    sky.addColorStop(0.5, '#0b223d');
    sky.addColorStop(1, '#102a43');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);

    // Aurora glow
    const aur = g.createRadialGradient(w * 0.55, 85, 10, w * 0.55, 85, 280);
    aur.addColorStop(0, 'rgba(56,189,248,0.32)');
    aur.addColorStop(0.55, 'rgba(34,211,238,0.12)');
    aur.addColorStop(1, 'transparent');
    g.fillStyle = aur; g.fillRect(0, 0, w, h);

    // Alpine peaks & canyon walls
    g.fillStyle = '#07172a';
    g.beginPath();
    g.moveTo(0, h); g.lineTo(0, 180); g.lineTo(130, 95); g.lineTo(270, 175);
    g.lineTo(420, 88); g.lineTo(540, 165); g.lineTo(w, 120); g.lineTo(w, h);
    g.closePath(); g.fill();

    // Gorge side cliffs
    g.fillStyle = '#0c1c2e';
    g.fillRect(0, 0, 42, h);
    g.fillRect(w - 42, 0, 42, h);

    // Flat snow-capped canyon platforms with open drop gaps
    const floors: [number, number, number][] = [
      [42, 160, 180], [320, 160, 278],
      [42, 240, 340], [475, 240, 123],
      [42, 322, 195], [335, 322, 263],
    ];
    for (const [px, py, pw] of floors) {
      g.fillStyle = '#1e293b';
      roundRectPath(g, px, py, pw, 16, 4); g.fill();
      g.fillStyle = '#f1f5f9';
      roundRectPath(g, px + 2, py, pw - 4, 6, 3); g.fill();
    }

    // Glowing gap cues
    g.fillStyle = 'rgba(56,189,248,0.85)';
    g.font = '800 22px sans-serif';
    g.textAlign = 'center';
    g.fillText('▾', 272, 162);
    g.fillText('▾', 428, 242);
    g.fillText('▾', 286, 324);

    // Roaring Snow Avalanche Wall descending from the top
    const avaGrad = g.createLinearGradient(0, 0, 0, 128);
    avaGrad.addColorStop(0, '#ffffff');
    avaGrad.addColorStop(0.65, '#e0f2fe');
    avaGrad.addColorStop(1, '#7dd3fc');
    g.fillStyle = avaGrad;
    g.fillRect(0, 0, w, 92);
    for (let cx = 20; cx <= w - 20; cx += 52) {
      g.beginPath();
      g.arc(cx, 92 + ((cx * 7) % 16), 38 + ((cx * 3) % 14), 0, Math.PI * 2);
      g.fill();
    }

    // Drifting snowflakes
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 28; i++) {
      const sx = (i * 73 + 24) % w;
      const sy = (i * 47 + 115) % h;
      g.beginPath(); g.arc(sx, sy, 2 + (i % 2), 0, Math.PI * 2); g.fill();
    }

    // Stickmen racing down toward open gaps
    for (const [fx, fy, col] of [[248, 128, '#3b82f6'], [382, 208, '#ef4444']] as [number, number, string][]) {
      g.strokeStyle = col; g.lineWidth = 8; g.lineCap = 'round';
      line(g, fx, fy - 10, fx, fy + 16);
      line(g, fx, fy + 16, fx - 12, fy + 34); line(g, fx, fy + 16, fx + 12, fy + 34);
      g.fillStyle = col; g.beginPath(); g.arc(fx, fy - 24, 12, 0, Math.PI * 2); g.fill();
    }
  }

  const url = c.toDataURL('image/png');
  miniPngCache.set(id, url);
  return url;
}

export const MINIGAME_ARTWORK: Partial<Record<MinigameId, string>> = {
  zombie: miniZombieImg,
};

