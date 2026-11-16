// Input: keyboard, mouse and touch, all read every frame. The Weaver follows the
// pointer wherever it goes; a left click places a well (or seals the well it lands
// on), a right click detonates the nearest well. Space places a well at the Weaver,
// E seals the fullest well, X detonates the nearest one, R restarts, P pauses.

export const ACTION_PLACE = 'place';
export const ACTION_SEAL = 'seal';
export const ACTION_DETONATE = 'detonate';
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_DRAFT1 = 'draft1';
export const ACTION_DRAFT2 = 'draft2';
export const ACTION_DRAFT3 = 'draft3';

const KEYS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: ACTION_PLACE,
  KeyE: ACTION_SEAL,
  KeyX: ACTION_DETONATE,
  Enter: ACTION_CONFIRM,
  KeyR: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  Digit1: ACTION_DRAFT1,
  Digit2: ACTION_DRAFT2,
  Digit3: ACTION_DRAFT3,
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const clicks = [];
  let pointer = null;
  let pointerSeen = false;

  function toLocal(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    const action = KEYS[event.code];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) pressed.add(action);
    held.add(action);
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYS[event.code];
    if (action) held.delete(action);
  });
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointermove', (event) => {
    pointer = toLocal(event);
    pointerSeen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointer = toLocal(event);
    pointerSeen = true;
    pressed.add(ACTION_CONFIRM);
    if (event.button === 2) clicks.push({ button: 'right', x: pointer.x, y: pointer.y });
    else if (event.button === 0) clicks.push({ button: 'left', x: pointer.x, y: pointer.y });
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Held directions, as {left, right, up, down} of booleans. */
    directions() {
      return {
        left: held.has('left'),
        right: held.has('right'),
        up: held.has('up'),
        down: held.has('down'),
      };
    },
    /** The pointer's logical position, or null before the pointer has ever moved. */
    pointer() {
      return pointerSeen ? pointer : null;
    },
    /** Actions pressed since the last frame; calling this clears them. */
    takePressed() {
      const out = new Set(pressed);
      pressed.clear();
      return out;
    },
    /** Clicks since the last frame, each {button: 'left'|'right', x, y}. */
    takeClicks() {
      const out = clicks.splice(0, clicks.length);
      return out;
    },
    /** A non-draining view of the pressed actions (the loop peeks before the world drains). */
    peekPressed() {
      return pressed;
    },
    /** A non-draining view of the clicks (the loop peeks before the world drains). */
    peekClicks() {
      return clicks;
    },
  };
}
