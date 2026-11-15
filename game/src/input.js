// Input: keyboard, mouse and touch, all read every frame. The ship follows the pointer
// when one is down or moving, and the arrow keys / A D W S steer it too. Confirm is the
// key or click that starts and restarts; pause is P or Escape.

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

const KEYS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyR: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let pointer = null;
  let pointerActive = false;

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

  canvas.addEventListener('pointerdown', (event) => {
    pointer = toLocal(event);
    pointerActive = true;
    pressed.add(ACTION_CONFIRM);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (pointerActive) pointer = toLocal(event);
  });
  window.addEventListener('pointerup', () => {
    pointerActive = false;
  });
  canvas.addEventListener('pointerleave', () => {
    pointerActive = false;
  });

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
    /** The pointer's logical position, or null when no pointer is steering. */
    pointer() {
      return pointerActive ? pointer : null;
    },
    /** Actions pressed since the last frame; calling this clears them. */
    takePressed() {
      const out = new Set(pressed);
      pressed.clear();
      return out;
    },
  };
}
