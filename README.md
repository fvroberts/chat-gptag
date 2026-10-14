# TAG ARENA

An original browser arcade game for one person versus the computer, or two or three people sharing a keyboard. Chase when you're IT. Pass the tag by touching an opponent. Whoever is IT at the buzzer loses.

## Run

Requires Node.js 20.19+ or 22.12+ (developed with Node 24) and npm.

```sh
npm install
npm run dev
```

For a repeatable installation use `npm ci`. The development server binds to all interfaces. Open the address Vite prints in a desktop browser.

```sh
npm run build      # TypeScript check and production bundle in dist/
npm run preview    # Serve the production bundle
npm test           # Deterministic gameplay and AI tests
npm run test:browser
```

Browser tests use the cloud machine's `/usr/bin/chromium`. Elsewhere, set `CHROMIUM_PATH` to your Chromium or Chrome executable. The suite starts Vite automatically when needed. Browser screenshots and reports are generated in ignored directories.

## Play

| Player | Move                | Jump     | Activate a collected dash |
| ------ | ------------------- | -------- | ------------------------- |
| 1      | A / D               | W        | Q                         |
| 2      | Left / Right arrows | Up arrow | Right Shift               |
| 3      | J / L               | I        | U                         |

Hold jump for height, release for a short hop. Coyote time and jump buffering make ledges forgiving. ESC pauses. The game pauses when the tab loses focus. Keyboard hardware can limit how many simultaneous keys it reports; the game tracks all three players independently.

Choose **vs Computer**, **2 Players**, or **3 Players**, select an arena, and press **LET'S PLAY**. The computer has easy, normal and hard difficulty, with the same movement physics as people. Networking is not required; multiplayer is local.

- **Classic Forest:** woodland terraces, paired portal shortcuts, spring pads.
- **Winter Wonderland:** slippery ice routes and a moving bridge.
- **Desert Ruins:** crumbling stone, ancient portals, a speed corridor.
- **Volcano Escape:** lava that launches you away, moving rock and unstable ledges.
- **Neon City:** rooftop routes, a moving platform and ground speed lanes.
- **Sky Islands:** suspended routes, a vertically moving island and a crumbling ledge.

Every map has three spawn locations, two linked portals, two bounce pads and fixed reachable power-up locations. Portals retain momentum and have a cooldown. Platforms are one-way from below; arena walls and floor bound the playfield. Moving platforms carry riders, and crumbling platforms regenerate.

Power-ups: **speed** (5 seconds), **double jump** (8 seconds), **shield** (3 seconds), **super jump** (5 seconds), **slow opponents** (3 seconds), and a **dash charge** (use within 10 seconds). A shield protects against receiving a tag; it does not prevent an IT player from passing the tag. Effects refresh rather than multiply when collected again.

Settings include 30/60/120/180-second rounds, difficulty, power-ups, special hazards, sound/music sliders and fullscreen. Changes to round rules apply to the next round; audio changes are immediate. Player colours, bean/cat/robot appearance and statistics are stored in this browser's local storage. No account or external services are needed.

## Implementation

TypeScript, Phaser 3 and Vite. All artwork is drawn procedurally and audio is generated with Web Audio; there are no missing asset requests, downloaded music or copied game assets. Sound starts after an interaction to satisfy browser audio policy. The Canvas renderer keeps these vector arenas inexpensive, targeting 60 FPS. Physics advances at 120 fixed steps per second, with bounded catch-up after slow frames.

- `src/maps.ts`: typed, data-driven arena layouts, palettes and interactive objects.
- `src/engine.ts`: match state, collisions, movement, tagging, power-ups and AI decisions.
- `src/navigation.ts`: reachable platform graph, jump/drop/bounce/portal edges and shortest paths.
- `src/scene.ts`: Phaser rendering, original characters, particles and keyboard state.
- `src/main.ts`: accessible HTML menus, settings, HUD, pause and round results.
- `src/audio.ts`: procedural music and sound effects.
- `src/settings.ts`: persistent preferences and statistics.

The AI replans on landings and at difficulty-dependent intervals, anticipates movement on hard difficulty, chooses escape routes away from the chaser, considers nearby pickups and can use portal edges. It follows the same collision, jump, bounce, power-up and speed rules as human players. Tests exercise pursuit and escape on all six maps and opponents on every platform elevation.

`?test` exposes a small inspection hook used only by the browser suite. It is absent during normal play.

## Cloud environment

The current checkout is already isolated: use `/workspace/chat-gptag` directly. Do not create a separate Git worktree unless requested. Dependencies and build outputs can be retained in the environment snapshot; the Vite process must be started again in a new task. Reinstall with `npm ci` when the lockfile changes. The saved environment setup/start instructions cover this workflow.
