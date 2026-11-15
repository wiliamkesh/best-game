// The renderer: paints the world on a canvas. The playfield is a fixed 1280x720 logical
// area scaled to the window, so a screenshot always shows the same layout.

import { FIELD, FONT, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function drawStarShape(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawShip(ctx, x, y, color, glow) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x + 13, y + 12);
  ctx.lineTo(x + 5, y + 7);
  ctx.lineTo(x, y + 11);
  ctx.lineTo(x - 5, y + 7);
  ctx.lineTo(x - 13, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y - 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMeteor(ctx, t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.rot);
  ctx.shadowColor = t.sub === 'big' ? '#ff8a3d' : '#ff5a4e';
  ctx.shadowBlur = 12;
  ctx.fillStyle = t.sub === 'big' ? '#ff8a3d' : '#ff5a4e';
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const r = t.radius * (0.82 + 0.18 * Math.sin(i * 2.7 + 1));
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.arc(-t.radius * 0.3, -t.radius * 0.2, t.radius * 0.22, 0, Math.PI * 2);
  ctx.arc(t.radius * 0.35, t.radius * 0.3, t.radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const POWER_LABEL = { shield: 'S', magnet: 'M', slow: 'T', double: '2x' };
const POWER_COLOR = {
  shield: PALETTE.shield,
  magnet: PALETTE.magnet,
  slow: PALETTE.slow,
  double: PALETTE.double,
};

export function createRenderer(canvas, backdropStars) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }

  function applyTransform() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    return { scale, ox, oy };
  }

  function drawBackground(time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#ffffff';
    for (const s of backdropStars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = tw * s.alpha;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 2);
  }

  function drawHud(s, best) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(14, 12, 300, 64, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`SCORE ${s.score}`, 28, 40);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText(`BEST ${Math.max(best, s.score)}`, 28, 62);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${s.level}`, FIELD.width / 2, 40);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 13px ${FONT}`;
    ctx.fillText(`${s.caught} stars  ·  ${s.dodged} dodged`, FIELD.width / 2, 62);
    ctx.textAlign = 'right';
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = '#ff6b81';
    let hearts = '';
    for (let i = 0; i < 3; i += 1) hearts += i < s.lives ? '♥ ' : '♡ ';
    ctx.fillText(hearts.trim(), FIELD.width - 28, 40);
    if (s.combo >= 2) {
      ctx.fillStyle = PALETTE.star;
      ctx.font = `800 20px ${FONT}`;
      ctx.fillText(`COMBO x${s.combo}`, FIELD.width - 28, 64);
    }
    ctx.textAlign = 'left';
    let ty = 96;
    ctx.font = `700 14px ${FONT}`;
    const timers = [];
    if (s.player.shield) timers.push(['SHIELD', PALETTE.shield]);
    if (s.time < s.magnetUntil) timers.push(['MAGNET', PALETTE.magnet]);
    if (s.time < s.slowUntil) timers.push(['SLOW', PALETTE.slow]);
    if (s.time < s.doubleUntil) timers.push(['DOUBLE', PALETTE.double]);
    for (const [label, color] of timers) {
      ctx.fillStyle = color;
      ctx.fillText(`● ${label}`, FIELD.width - 28 - ctx.measureText(`● ${label}`).width + 120, ty);
      ty += 20;
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(77,232,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawTitle(s, best) {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(340, 150, 600, 400);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText('STARFALL', FIELD.width / 2, 240);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText('Dodge the meteors. Catch the stars.', FIELD.width / 2, 282);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 16px ${FONT}`;
    ctx.fillText('Move: mouse, arrow keys or WASD  ·  Pause: P', FIELD.width / 2, 330);
    ctx.fillText('Catch stars in a row to raise your combo.', FIELD.width / 2, 356);
    ctx.fillText('Grab power-ups: shield, magnet, slow, double points.', FIELD.width / 2, 382);
    ctx.fillStyle = PALETTE.star;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(`BEST SCORE  ${best}`, FIELD.width / 2, 432);
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `700 22px ${FONT}`;
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
    ctx.globalAlpha = pulse;
    ctx.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 492);
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(440, 260, 400, 160);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText('Press P or click to resume', FIELD.width / 2, 370);
  }

  function drawOver(s, best, isBest) {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(360, 150, 560, 400);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b81';
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText('GAME OVER', FIELD.width / 2, 235);
    if (isBest) {
      ctx.fillStyle = PALETTE.star;
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText('★ NEW BEST SCORE ★', FIELD.width / 2, 278);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(`SCORE  ${s.score}`, FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText(`Best ${best}   ·   ${s.caught} stars caught   ·   Best combo x${s.bestCombo}`, FIELD.width / 2, 368);
    ctx.fillText(`Level ${s.level}   ·   ${s.dodged} meteors dodged`, FIELD.width / 2, 396);
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `700 21px ${FONT}`;
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 470);
    ctx.globalAlpha = 1;
  }

  function draw(s, screen, best, isBest) {
    resize();
    const { ox, oy } = applyTransform();
    ctx.save();
    if (s.shake > 0) {
      const mag = Math.min(10, s.shake * 18);
      ctx.translate(ox + (Math.random() - 0.5) * mag, oy + (Math.random() - 0.5) * mag);
    }
    drawBackground(s.time);
    if (screen === SCREEN_TITLE) {
      drawTitle(s, best);
      ctx.restore();
      return;
    }
    // Player trail.
    const p = s.player;
    ctx.save();
    for (let i = p.trail.length - 1; i >= 0; i -= 1) {
      const t = p.trail[i];
      ctx.globalAlpha = (1 - i / p.trail.length) * 0.35;
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5 + i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Falling things.
    for (const t of s.things) {
      if (t.kind === 'meteor') drawMeteor(ctx, t);
      if (t.kind === 'star') {
        const pulse = 1 + 0.12 * Math.sin(s.time * 6 + t.phase);
        ctx.save();
        ctx.shadowColor = PALETTE.star;
        ctx.shadowBlur = 14;
        ctx.fillStyle = PALETTE.star;
        drawStarShape(ctx, t.x, t.y, t.radius * pulse, t.phase);
        ctx.fill();
        ctx.restore();
      }
      if (t.kind === 'powerup') {
        const color = POWER_COLOR[t.power];
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0b1026';
        ctx.font = `800 15px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(POWER_LABEL[t.power], t.x, t.y + 1);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
      }
    }
    // Particles.
    for (const pt of s.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Floating score text.
    ctx.font = `800 17px ${FONT}`;
    ctx.textAlign = 'center';
    for (const f of s.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    // Player (blink while invulnerable).
    if (!(p.invulnerable > 0 && Math.floor(s.time * 14) % 2 === 0)) {
      drawShip(ctx, p.x, p.y, PALETTE.player, PALETTE.playerGlow);
      if (p.shield) {
        ctx.save();
        ctx.strokeStyle = PALETTE.shield;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 26 + 3 * Math.sin(s.time * 5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    drawHud(s, best);
    if (s.bannerTimer > 0 && s.banner) {
      ctx.globalAlpha = Math.min(1, s.bannerTimer);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 44px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(s.banner, FIELD.width / 2, 300);
      ctx.globalAlpha = 1;
    }
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${s.flash * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawOver(s, best, isBest);
    ctx.restore();
  }

  return { draw, resize };
}
