// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, game over and win.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|win|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSound } from './audio.js';
import {
  createWorld,
  EVENT_CAPTURE, EVENT_DENIED, EVENT_DETONATE, EVENT_HEART, EVENT_LEVEL,
  EVENT_OVER, EVENT_PLACE, EVENT_SEAL, EVENT_SHATTER, EVENT_WELL_LOST, EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_PLACE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sound = createSound();

// The backdrop stars are fixed per page load, so the sky never jumps between frames.
const backdropRandom = createRandom(1337);
const backdropStars = [];
for (let i = 0; i < 110; i += 1) {
  backdropStars.push({
    x: backdropRandom.range(0, 1280),
    y: backdropRandom.range(0, 690),
    size: backdropRandom.range(1, 2.6),
    alpha: backdropRandom.range(0.3, 0.9),
    speed: backdropRandom.range(0.4, 1.4),
    phase: backdropRandom.range(0, Math.PI * 2),
  });
}

const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, backdropStars);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(text) {
  status.textContent = text;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, scene.isBest);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let isBest = false;
  let accumulator = 0;
  let last = performance.now();

  function handleEvents(events) {
    for (const e of events) {
      if (e.type === EVENT_PLACE) sound.place();
      if (e.type === EVENT_CAPTURE) sound.capture(e.count);
      if (e.type === EVENT_SEAL) sound.seal(e.size, e.combo);
      if (e.type === EVENT_DETONATE) sound.detonate();
      if (e.type === EVENT_WELL_LOST) sound.wellLost();
      if (e.type === EVENT_SHATTER) sound.shatter();
      if (e.type === EVENT_HEART) sound.heartHit();
      if (e.type === EVENT_LEVEL) sound.levelup();
      if (e.type === EVENT_WIN) sound.win();
      if (e.type === EVENT_DENIED) sound.denied();
      if (e.type === EVENT_OVER) {
        sound.over();
        if (world.state.score > best) {
          best = world.state.score;
          isBest = true;
          saveBest(best);
        }
        announce(`Game over. Score ${world.state.score}. Best ${best}.`);
      }
    }
  }

  function start() {
    sound.unlock();
    sound.click();
    const fresh = createWorld(createRandom(Math.floor(Math.random() * 4294967296)));
    // Swap the fresh world's state in, keeping the same object the renderer reads.
    Object.keys(world.state).forEach((k) => delete world.state[k]);
    Object.assign(world.state, fresh.state);
    world.state.lives = LIVES;
    screen = SCREEN_PLAY;
    announce('Playing. Place wells, catch stars, seal constellations, guard the Heart Star.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    // Peek, don't drain: the world drains the queues itself in step(), so a press or
    // click is consumed exactly once. Only a screen transition drains them early, so
    // the click that starts the game never also places a well.
    const pressed = input.peekPressed();
    const clicks = input.peekClicks();
    if (pressed.has(ACTION_PAUSE) && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      input.takePressed();
      input.takeClicks();
      announce('Paused.');
    } else if (pressed.has(ACTION_PAUSE) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      input.takePressed();
      input.takeClicks();
      announce('Playing.');
    }
    // Space places a well in play, but on any other screen it starts or resumes.
    const wantConfirm = pressed.has(ACTION_CONFIRM) || pressed.has(ACTION_PLACE);
    if (wantConfirm || clicks.length > 0) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
        start();
        input.takeClicks();
        input.takePressed();
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        input.takePressed();
        input.takeClicks();
      }
    }
    if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP) {
        const events = world.step(STEP, input);
        handleEvents(events);
        accumulator -= STEP;
        if (world.state.over) {
          screen = SCREEN_OVER;
          break;
        }
        if (world.state.won) {
          if (world.state.score > best) {
            best = world.state.score;
            isBest = true;
            saveBest(best);
          }
          announce(`You wove the sky. Score ${world.state.score}. Best ${best}.`);
          screen = SCREEN_WIN;
          break;
        }
      }
    }
    renderer.draw(world.state, screen, best, isBest);
  }

  announce('Starfall. Place wells, catch stars, seal constellations, guard the Heart Star. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
