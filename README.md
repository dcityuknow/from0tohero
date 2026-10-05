# Block Arena

A first-person shooter built with Three.js (r128). Every model in the game is made of voxels.

## Running the game
- **Quickest way:** double-click `index.html` (an Internet connection is needed to load Three.js from the CDN).
- **Recommended for development** (so `talking.txt` can be read and `fetch` isn't blocked): run `npm start`
  or `python -m http.server 8000`, then open http://localhost:8000

## Project structure
```
block-arena/
├─ index.html
├─ assets/
│  ├─ css/style.css
│  └─ data/talking.txt        boss dialogue lines (one line per sentence, any language)
└─ src/
   ├─ loader.js               LIST of JS files in load order (add new files here)
   ├─ main.js                 main loop, damage handling, restart
   ├─ core/                   core.js (renderer/camera) · config.js (weapon stats, drops) · state.js
   ├─ world/
   │  ├─ common/              world.js (floor 1, MAPK, FHT) · sky.js · level.js (4 floors, stairs, gates) · physics.js · floors.js (lazy load / unload) · daycycle.js
   │  ├─ nature/              shared nature engine for every floor (split from the old nature.js, shares state via window.NatureKit):
   │  │                       kit.js (CFG, THM themes, RNG) · placement.js (keep-out zones) · plants.js (trees, rocks, logs, butterflies)
   │  │                       lake.js (rivers: depth, carving) · state.js (FL, lakeAt, isWater, wetAt) · fx.js (splash, ripples, bullets in water)
   │  │                       fish.js · swim.js (wade / swim / hold breath) · build.js (buildFloor) · runtime.js (frame loop, load / unload, window.Nature)
   │  ├─ floor1/              house.js · pavilion.js · statues.js · teaset.js · bath.js
   │  └─ floor2/              greatwall.js
   ├─ i18n/                   lang-data.js (translations) · i18n.js (language selection)
   ├─ engine/                 input.js · sound.js · music.js · voxel.js (voxel building core) · occlusion.js (occlusion culling)
   ├─ player/                 player.js (hands) · weapons.js (4 weapons) · viewmodel.js (reload, bolt action)
   ├─ entities/               bot-model · boss-model · steering · boss · spawner · boss-talk · floor-manager
   │                          bot-throw (bots pick up and throw rocks) · ally (recruit defeated bosses as allies)
   ├─ gameplay/               combat · effects · items · grenade
   └─ ui/                     minimap · mobile (touch controls) · ui (start / pause screen)
```

## Quick tweaks
| To change | Edit |
|---|---|
| Map size of all 4 floors | `MAPK` in `src/world/common/world.js` |
| Floor height per floor (ceiling, stair length / step count) | `FHT` in `src/world/common/world.js` (default `[22.4,32,32,32]`; use `FY(f)` / `FHT[f]` / `flOf(y)` in code, not `f*FH`) |
| Damage, magazine size, fire rate | `src/core/config.js` |
| Drop rate, health restore | `src/core/config.js` |
| How long a left floor stays in memory (default 25 s) | `KEEP` in `src/world/common/floors.js` |
| Occlusion culling (budget ms, min distance) | `cfg` in `src/engine/occlusion.js` · add `?occ=0` to the URL to turn it off and compare |
| Fish jumping out of the river (on/off, how often, how high) | `fishJump`, `jumpEvery`, `jumpH` in `CFG` of `src/world/nature/kit.js` |
| Archers on the Great Wall (count, range, damage, fire rate) | `CFG` in `src/entities/archer.js` |
| Respawn lives (+1 / +2 / +3 per boss, stacking) | `addLives` in `src/main.js` (called from `bossDown`) |
| Max bots, spawn speed | `MAXBOT`, `SP_IV` in `src/entities/spawner.js` |
| Boss health / weapons per floor | `src/entities/boss.js` |
| Bots to defeat before the boss appears | `need()` in `src/world/common/level.js` |
| Sky, clouds, ceiling fog | `SKY` / `SKYFOG` in `src/world/common/sky.js` |
| Tea set position | `TEA` in `src/world/floor1/teaset.js` |
| Bath pools with waterfall (position, which corners) | `BATHS` in `src/world/floor1/bath.js` |
| Statue position | `STA` in `src/world/floor1/statues.js` |
| Text and languages | `src/i18n/lang-data.js` |
| Boss dialogue | `assets/data/talking.txt` |

## Adding things per floor
- Put a floor's own files in `src/world/floorN/` and register them in `loader.js` **before** the `nature/` block.
- Files inside `src/world/nature/` share helpers through `window.NatureKit` (`const {CFG,V}=NK;` at the top, `Object.assign(NK,{...})` at the bottom); load order inside that block matters.

## Conventions
- No `import`/`export`: all files share global variables, so **the order in `src/loader.js` matters a lot**
  (a file that uses something must be loaded AFTER the file that defines it).
- Each folder is one group of responsibility. Put a new file in the appropriate group, then register it in `loader.js`.
- Scenery files (`floor1/house.js`, `pavilion.js`, `statues.js`, `teaset.js`, `bath.js`) must load **before** the `nature/` files, so trees, rocks and rivers
  avoid them. Each one exposes a keep-out area (`HouseZone`, `PavilionKeep`, `TeaKeeps`, `BathKeeps`) that `keepOuts()` in `src/world/nature/placement.js` reads.

## Performance: lazy floors + occlusion culling
- **Only the floor you are on is built.** On start only floor 1 (trees, river, house, pavilion, statues, tea sets) exists. Floors 2-4 are built when you walk near the stairs
  (a "Loading floor N…" label shows), and a floor you left is removed from the scene, the collision list and the GPU after `KEEP` seconds. Floors are generated from a fixed seed, so they look the same when rebuilt.
  The light map frame (floor slabs, walls, blocks, stairs, gates in `world.js` / `level.js`) stays resident and is just hidden when far from your floor.
- **Occlusion culling** (`engine/occlusion.js`, CPU rays against wall / block / house boxes): trees, rocks, grass patches and bots that are completely hidden behind walls are not drawn.
  It only hides an object when all 15 sample points are blocked, never hides anything closer than 7 m, and works in small slices per frame.
  In the browser console: `OC.log()` shows how many objects are hidden, `OC.set(false)` turns it off.
- New scenery pieces that belong to floor 1 must expose a `rebuild()` and be added to `buildSet0()` in `floors.js`, otherwise they will not come back when you return to floor 1.

## Language + name selection, names engraved on walls (new)
- `src/ui/profile.js`: the first screen of the game: pick a language -> enter a name (max 20 characters; accepts Latin letters plus letters of the chosen language). Read the name via `PROFILE.name`.
- `src/gameplay/engrave.js`: defeating a boss = 1 engraving. Look at a wall (within 8 m) and press **E**. Below the name there is a small line "Honored on floor N" (in the engraver's language). A spot that is already engraved cannot be engraved over. Quick tweaks in `CFG`.
- Names are shared between players through the **Firebase Realtime Database** (no separate server needed, the game calls the REST API directly). One-time setup:
  1. Go to https://console.firebase.google.com -> create a project -> **Build -> Realtime Database -> Create database**.
  2. In the **Rules** tab: paste the contents of `firebase/database.rules.json` -> **Publish** (allows reading, only allows creating new entries with valid data, does not allow editing / deleting).
  3. Copy the database address (at the top of the Data tab, like `https://xxx-default-rtdb.firebaseio.com`) and paste it into `CFG.db` in `src/gameplay/engrave.js`.
  - Leave `CFG.db` empty = save on this machine only (localStorage). To remove an inappropriate name from the board: open the Data tab and delete the matching entry.
