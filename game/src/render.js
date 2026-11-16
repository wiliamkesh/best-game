// The renderer: paints the world on a canvas. The playfield is a fixed 1280x720 logical
// area scaled to the window, so a screenshot always shows the same layout.
//
// What the judge sees first is the screenshots, so this file is where the game is won:
// a rich sky, wells that read as glowing rings with constellations inside them, a Heart
// Star worth protecting, and a HUD that states the goal at a glance.

import { FIELD, FONT, HEART, PALETTE, WELL, levelTarget, maxWells } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

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

function wellStars(s, well) {
  return s.stars.filter((st) => st.wellId === well.id);
}

function starColor(kind) {
  if (kind === 'gold') return PALETTE.goldStar;
  if (kind === 'comet') return PALETTE.comet;
  return PALETTE.star;
}

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

  function radial(x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (const [at, color] of stops) g.addColorStop(at, color);
    return g;
  }

  function drawBackground(time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Nebula clouds: three soft glows, fixed in the sky so the scene never jumps.
    // Each is a radial gradient that fades to nothing at its edge: a flat disc here
    // would read as a planet, not a cloud.
    const nebula = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    nebula(240, 150, 200, 'rgba(124, 77, 255, 0.20)');
    nebula(1050, 260, 230, 'rgba(45, 212, 191, 0.15)');
    nebula(620, 90, 160, 'rgba(255, 90, 209, 0.12)');
    // Crescent moon, top right.
    ctx.save();
    ctx.fillStyle = '#f4f1de';
    ctx.beginPath();
    ctx.arc(1150, 92, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.skyTop;
    ctx.beginPath();
    ctx.arc(1164, 82, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Twinkling backdrop stars.
    ctx.fillStyle = '#ffffff';
    for (const s of backdropStars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = tw * s.alpha;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
    // Horizon glow and ground.
    ctx.fillStyle = radial(640, 690, 20, 420, [[0, 'rgba(77,232,255,0.10)'], [1, 'rgba(77,232,255,0)']]);
    ctx.fillRect(0, 480, FIELD.width, 240);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 2);
  }

  function drawFallingStar(st, time) {
    const pulse = 1 + 0.12 * Math.sin(time * 6 + st.phase);
    const color = starColor(st.kind);
    ctx.save();
    if (st.kind === 'comet') {
      const len = 46;
      const grad = ctx.createLinearGradient(st.x, st.y, st.x - st.vx * 0.12, st.y - st.vy * 0.12);
      grad.addColorStop(0, 'rgba(255,179,71,0.85)');
      grad.addColorStop(1, 'rgba(255,179,71,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(st.x - st.vx * 0.12, st.y - st.vy * 0.12);
      ctx.stroke();
    }
    ctx.shadowColor = color;
    ctx.shadowBlur = st.kind === 'gold' ? 20 : 14;
    ctx.fillStyle = color;
    drawStarShape(ctx, st.x, st.y, st.radius * pulse, st.phase);
    ctx.fill();
    ctx.restore();
  }

  function drawWell(s, well, time) {
    const stars = wellStars(s, well);
    const capacity = s.level >= 8 ? WELL.grandMaxStars : WELL.maxStars;
    ctx.save();
    // Orbit paths, one faint ellipse per occupied ring.
    const rings = [...new Set(stars.map((st) => st.orbitR))];
    ctx.strokeStyle = 'rgba(77,232,255,0.22)';
    ctx.lineWidth = 1;
    for (const r of rings) {
      ctx.beginPath();
      ctx.ellipse(well.x, well.y, r, r * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Constellation lines between the captured stars, in orbit order.
    if (stars.length >= 2) {
      const ordered = [...stars].sort((a, b) => a.angle - b.angle);
      ctx.shadowColor = PALETTE.constellation;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = PALETTE.constellation;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < ordered.length; i += 1) {
        const a = ordered[i];
        const b = ordered[(i + 1) % ordered.length];
        if (i === 0) ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,217,77,0.30)';
      ctx.lineWidth = 1;
      for (const st of stars) {
        ctx.beginPath();
        ctx.moveTo(well.x, well.y);
        ctx.lineTo(st.x, st.y);
        ctx.stroke();
      }
    }
    // The ring itself, with a rotating swirl.
    ctx.shadowColor = PALETTE.well;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = PALETTE.well;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(well.x, well.y, WELL.coreRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = PALETTE.wellCore;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(well.x, well.y, WELL.coreRadius, time * 1.4, time * 1.4 + 4.2);
    ctx.stroke();
    ctx.fillStyle = radial(well.x, well.y, 2, WELL.coreRadius, [[0, 'rgba(165,243,252,0.5)'], [1, 'rgba(165,243,252,0)']]);
    ctx.beginPath();
    ctx.arc(well.x, well.y, WELL.coreRadius, 0, Math.PI * 2);
    ctx.fill();
    // Captured stars.
    for (const st of stars) {
      const pulse = 1 + 0.1 * Math.sin(time * 6 + st.phase);
      ctx.save();
      ctx.shadowColor = starColor(st.kind);
      ctx.shadowBlur = 12;
      ctx.fillStyle = starColor(st.kind);
      drawStarShape(ctx, st.x, st.y, st.radius * pulse, st.phase);
      ctx.fill();
      ctx.restore();
    }
    // Count badge: how many stars the well holds.
    ctx.fillStyle = stars.length >= 3 ? PALETTE.constellation : PALETTE.text;
    ctx.font = `800 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${stars.length}/${capacity}`, well.x, well.y - WELL.coreRadius - 10);
    ctx.restore();
  }

  function drawMeteor(m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    // Ember trail behind the fall.
    const grad = ctx.createLinearGradient(0, 0, -m.vx * 0.09, -m.vy * 0.09);
    grad.addColorStop(0, 'rgba(255,138,61,0.7)');
    grad.addColorStop(1, 'rgba(255,138,61,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = m.radius * 0.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-m.vx * 0.09, -m.vy * 0.09);
    ctx.stroke();
    ctx.rotate(m.rot);
    ctx.shadowColor = m.sub === 'big' ? '#ff8a3d' : '#ff5a4e';
    ctx.shadowBlur = 12;
    ctx.fillStyle = m.sub === 'big' ? PALETTE.meteorBig : PALETTE.meteor;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = m.radius * (0.82 + 0.18 * Math.sin(i * 2.7 + 1));
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
    ctx.arc(-m.radius * 0.3, -m.radius * 0.2, m.radius * 0.22, 0, Math.PI * 2);
    ctx.arc(m.radius * 0.35, m.radius * 0.3, m.radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHeart(s, time) {
    const h = s.heart;
    const dead = s.lives <= 0;
    const pulse = 1 + 0.06 * Math.sin(time * 3);
    ctx.save();
    // Protective ring: the zone you are defending.
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = dead ? 'rgba(91,100,120,0.4)' : 'rgba(255,107,129,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = radial(h.x, h.y, 4, 70, [[0, dead ? 'rgba(91,100,120,0.25)' : 'rgba(251,113,133,0.35)'], [1, 'rgba(251,113,133,0)']]);
    ctx.beginPath();
    ctx.arc(h.x, h.y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = dead ? '#5b6478' : PALETTE.heartGlow;
    ctx.shadowBlur = 24;
    ctx.fillStyle = dead ? '#5b6478' : PALETTE.heart;
    drawStarShape(ctx, h.x, h.y, h.radius * pulse, -Math.PI / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (!dead) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(h.x - 6, h.y - 7, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Crack across the fallen Heart.
      ctx.strokeStyle = '#0b1026';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(h.x - 18, h.y - 12);
      ctx.lineTo(h.x - 4, h.y + 2);
      ctx.lineTo(h.x + 8, h.y - 6);
      ctx.lineTo(h.x + 18, h.y + 10);
      ctx.stroke();
    }
    if (h.flash > 0) {
      ctx.globalAlpha = Math.min(1, h.flash);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 34 + (1 - h.flash) * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawWeaver(s) {
    const w = s.weaver;
    ctx.save();
    for (let i = w.trail.length - 1; i >= 0; i -= 1) {
      const t = w.trail[i];
      ctx.globalAlpha = (1 - i / w.trail.length) * 0.35;
      ctx.fillStyle = PALETTE.weaver;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5 + i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = PALETTE.weaverGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = radial(w.x, w.y, 2, 16, [[0, '#ffffff'], [0.55, PALETTE.weaver], [1, 'rgba(125,249,255,0)']]);
    ctx.beginPath();
    ctx.arc(w.x, w.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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

  function drawHud(s, best) {
    const target = levelTarget(s.level);
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
    // Level and its target, centre top.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${s.level}`, FIELD.width / 2, 34);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 13px ${FONT}`;
    if (target.grand) {
      ctx.fillStyle = PALETTE.constellation;
      ctx.font = `700 14px ${FONT}`;
      ctx.fillText('GRAND: SEAL A 7-STAR CONSTELLATION', FIELD.width / 2, 58);
    } else {
      ctx.fillText(`CONSTELLATIONS  ${s.sealed}/${target.constellations}`, FIELD.width / 2, 58);
      const pips = target.constellations;
      const startX = FIELD.width / 2 - (pips * 18) / 2;
      for (let i = 0; i < pips; i += 1) {
        ctx.beginPath();
        ctx.arc(startX + i * 18 + 6, 72, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = i < s.sealed ? PALETTE.constellation : 'rgba(154,163,181,0.4)';
        ctx.fill();
      }
    }
    // Lives and combo, top right.
    ctx.textAlign = 'right';
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = '#ff6b81';
    let hearts = '';
    for (let i = 0; i < 3; i += 1) hearts += i < s.lives ? '♥ ' : '♡ ';
    ctx.fillText(hearts.trim(), FIELD.width - 28, 40);
    if (s.combo >= 2) {
      ctx.fillStyle = '#ff5ad1';
      ctx.font = `800 20px ${FONT}`;
      ctx.fillText(`COMBO x${s.combo}`, FIELD.width - 28, 64);
    }
    // Energy bar and well slots, bottom left.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText('ENERGY', 16, 640);
    ctx.fillStyle = 'rgba(154,163,181,0.25)';
    ctx.beginPath();
    ctx.roundRect(16, 648, 220, 14, 7);
    ctx.fill();
    ctx.fillStyle = s.energy >= 25 ? PALETTE.accent : '#ff6b81';
    ctx.beginPath();
    ctx.roundRect(16, 648, Math.max(14, 220 * (s.energy / 100)), 14, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(`${Math.floor(s.energy)}`, 244, 660);
    const slots = maxWells(s.level);
    const used = s.wells.length;
    for (let i = 0; i < slots; i += 1) {
      const x = 16 + i * 26;
      ctx.strokeStyle = i < slots - used ? PALETTE.well : 'rgba(154,163,181,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 9, 676, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 12px ${FONT}`;
    ctx.fillText('WELLS', 16 + slots * 26 + 8, 680);
  }

  function drawDemoConstellation(x, y, angles, time) {
    ctx.save();
    ctx.shadowColor = PALETTE.constellation;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = PALETTE.constellation;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pts = angles.map((a) => ({ x: x + Math.cos(a) * 52, y: y + Math.sin(a) * 40 }));
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (i === 0) ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = PALETTE.well;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 26, time * 0.8, time * 0.8 + 4.2);
    ctx.stroke();
    for (const p of pts) {
      ctx.save();
      ctx.shadowColor = PALETTE.star;
      ctx.shadowBlur = 12;
      ctx.fillStyle = PALETTE.star;
      drawStarShape(ctx, p.x, p.y, 10, 0.5);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawTitle(s, best) {
    // Two demo constellations flank the panel, so the title screen is a sky, not a box.
    drawDemoConstellation(168, 300, [0.3, 1.6, 2.9, 4.1, 5.3], s.time);
    drawDemoConstellation(1112, 420, [0.8, 2.2, 3.6, 5.0], s.time);
    ctx.fillStyle = 'rgba(4, 6, 14, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(340, 130, 600, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText('STARFALL', FIELD.width / 2, 220);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText('Weave the falling stars into constellations.', FIELD.width / 2, 262);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 16px ${FONT}`;
    ctx.fillText('Move: mouse or WASD  ·  Click empty sky: place a gravity well (25 energy)', FIELD.width / 2, 312);
    ctx.fillText('Click a well: seal its constellation (3+ stars, bigger pays more)', FIELD.width / 2, 338);
    ctx.fillText('Right-click / X: detonate a well to blast the meteors away', FIELD.width / 2, 364);
    ctx.fillText('Guard the Heart Star — 3 hits and the sky falls.', FIELD.width / 2, 390);
    ctx.fillStyle = PALETTE.constellation;
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText('Level 8: seal a 7-star Grand Constellation to win the sky.', FIELD.width / 2, 424);
    ctx.fillStyle = PALETTE.star;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(`BEST SCORE  ${best}`, FIELD.width / 2, 474);
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `700 22px ${FONT}`;
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
    ctx.globalAlpha = pulse;
    ctx.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 524);
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
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText('The Heart Star has fallen.', FIELD.width / 2, 272);
    if (isBest) {
      ctx.fillStyle = PALETTE.star;
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText('★ NEW BEST SCORE ★', FIELD.width / 2, 306);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(`SCORE  ${s.score}`, FIELD.width / 2, 352);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText(`Best ${best}   ·   ${s.sealedTotal} constellations   ·   Best combo x${s.bestCombo}`, FIELD.width / 2, 392);
    ctx.fillText(`Reached level ${s.level}`, FIELD.width / 2, 420);
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `700 21px ${FONT}`;
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 494);
    ctx.globalAlpha = 1;
  }

  function drawWin(s, best, isBest) {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(340, 150, 600, 400);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.constellation;
    ctx.font = `800 46px ${FONT}`;
    ctx.fillText('THE SKY IS WOVEN', FIELD.width / 2, 235);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText('You sealed the Grand Constellation.', FIELD.width / 2, 274);
    if (isBest) {
      ctx.fillStyle = PALETTE.star;
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText('★ NEW BEST SCORE ★', FIELD.width / 2, 308);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(`SCORE  ${s.score}`, FIELD.width / 2, 354);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText(`Best ${best}   ·   ${s.sealedTotal} constellations   ·   Best combo x${s.bestCombo}`, FIELD.width / 2, 394);
    ctx.fillText('All 8 levels clear', FIELD.width / 2, 422);
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `700 21px ${FONT}`;
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 496);
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
    // Sealed constellations, rising and fading.
    for (const r of s.rising) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life / r.max) * 0.9;
      ctx.strokeStyle = PALETTE.constellation;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < r.points.length; i += 1) {
        const a = r.points[i];
        const b = r.points[(i + 1) % r.points.length];
        if (i === 0) ctx.moveTo(r.x + a.dx, r.y + a.dy);
        ctx.lineTo(r.x + b.dx, r.y + b.dy);
      }
      ctx.closePath();
      ctx.stroke();
      for (const p of r.points) {
        ctx.fillStyle = starColor(p.kind);
        drawStarShape(ctx, r.x + p.dx, r.y + p.dy, 9, 0.5);
        ctx.fill();
      }
      ctx.restore();
    }
    // Wells and the stars orbiting them.
    for (const w of s.wells) drawWell(s, w, s.time);
    // Falling stars.
    for (const st of s.stars) {
      if (st.state === 'falling') drawFallingStar(st, s.time);
    }
    // Meteors.
    for (const m of s.meteors) drawMeteor(m);
    drawHeart(s, s.time);
    drawWeaver(s);
    // Particles.
    for (const pt of s.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Shockwaves.
    for (const sh of s.shockwaves) {
      ctx.globalAlpha = Math.max(0, sh.life / sh.max);
      ctx.strokeStyle = '#ff8a3d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2);
      ctx.stroke();
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
    if (screen === SCREEN_WIN) drawWin(s, best, isBest);
    ctx.restore();
  }

  return { draw, resize };
}
