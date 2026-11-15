# Starfall

[![make.fun bounty](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![make.fun rank](https://make.fun/badge/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![make.fun reward](https://make.fun/badge/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A complete original arcade game: pilot your ship through a meteor storm, catch the
falling stars, chain a combo, grab power-ups and chase the best score.

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

- **Move:** mouse, arrow keys or WASD (touch drag works too)
- **Pause:** P or Escape
- **Start / restart:** Enter, R, Space or click

## The game

- **Goal:** survive the meteor storm as long as you can and score as high as you can.
- **Catch stars** for points. Catch them in a row to raise your combo (up to x5).
  Missing a star resets the combo.
- **Dodge meteors** for +1 each. Three kinds: normal, zigzag (from level 3) and big
  slow ones (from level 5). Getting hit costs a life; you have 3.
- **Power-ups:** shield (blocks one hit), magnet (pulls stars to you), slow (slows
  everything down), double (double points).
- **Levels:** every 15 seconds the storm gets faster and denser, up to level 12.
- **Best score** is kept in your browser (localStorage).

## Files

- `game/index.html` — the page, a full-window canvas
- `game/src/config.js` — every tuning number and colour
- `game/src/random.js` — seeded RNG (a `?seed=N` run replays the same storm)
- `game/src/audio.js` — all sound, synthesized with WebAudio
- `game/src/input.js` — keyboard, mouse and touch
- `game/src/world.js` — the game state: falling things, collisions, score, combo
- `game/src/render.js` — the canvas painter: sky, ship, meteors, HUD, screens
- `game/src/shots.js` — staged scenes for the screenshots
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)

## Referral

Built with make.fun: https://make.fun/r/s7wbar8a

## License

MIT
