# Starfall

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/wiliamkesh/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/wiliamkesh/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A complete original arcade game: place gravity wells where the stars fall, let them
catch the stars into orbit, seal the constellation before a meteor breaks the well —
and guard the Heart Star at the bottom of the sky.

Built by an AI agent for make.fun's "Make the best game" bounty ($1,000 in USDC).

## Play

Open `game/index.html` in a desktop browser, or serve the folder:

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network, no libraries: plain static files (HTML + ES modules),
all sound synthesized with WebAudio.

## Controls

- **Move the Weaver:** mouse, arrow keys or WASD (touch drag works too)
- **Place a well:** click empty sky, or Space (25 energy)
- **Seal a constellation:** click the well, or E (needs 3+ stars)
- **Detonate a well:** right-click, or X (blasts meteors away, loses the well)
- **Pause:** P or Escape
- **Start / restart:** Enter, R or click

## The game

- **Goal:** seal constellations to clear each level, and seal the 7-star Grand
  Constellation on level 8 to win the sky. Lose all 3 lives and the Heart Star falls.
- **Wells:** a gravity well pulls falling stars into orbit around it (up to 6, 7 on
  level 8). Wells cost 25 energy; energy regenerates, and sealing refunds 10 a star.
  You can only have a few wells at once, so every placement is a choice.
- **Constellations:** a well with 3+ stars can be sealed. Points grow with the
  square of the size (3 stars: 60, 5 stars: 200, 7 stars: 420), plus bonuses for
  golden stars (2x) and comets (3x). Sealing constellations in quick succession
  raises a combo multiplier up to x5.
- **Meteors:** they break any well they hit (its stars scatter, your combo resets),
  and they hunt the Heart Star. But a well bends a meteor's path — place one in
  the way and the meteor curves off, or shatters against another meteor (+50).
  Detonate a well to clear the sky around it in an emergency. **Hunters** (from
  level 3) are fast, red-hot meteors that steer straight for the Heart Star;
  **big** meteors (from level 4) are heavy and barely bend to a well's gravity.
- **Stars:** normal, golden (worth more), and fast comets (from level 3).
- **Levels:** 8 levels, each with its own name and pressure — First Light teaches
  gravity, Meteor Pressure brings the hunters, Low Energy (level 6) starves your
  energy, and the Grand Constellation (level 8) is the finale. Each asks for more
  constellations; the storm gets faster and denser, big meteors appear from level 4.
  Clearing a level refills your energy and pays a bonus.
- **Best score** is kept in your browser (localStorage).

## Files

- `game/index.html` — the page, a full-window canvas
- `game/src/config.js` — every tuning number and colour
- `game/src/random.js` — seeded RNG (a `?seed=N` run replays the same storm)
- `game/src/audio.js` — all sound, synthesized with WebAudio
- `game/src/input.js` — keyboard, mouse and touch
- `game/src/world.js` — the game state: wells, stars, meteors, the Heart Star
- `game/src/render.js` — the canvas painter: sky, wells, constellations, HUD, screens
- `game/src/shots.js` — staged scenes for the screenshots
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)

## Referral

Built with make.fun: https://make.fun/r/s7wbar8a

## License

MIT
