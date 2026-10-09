# Block Arena

A first-person shooter built with Three.js (r128). Every model in the game is made of voxels.

## Running the game
- **Quickest way:** double-click `index.html` (an Internet connection is needed to load Three.js from the CDN).
- **Recommended for development** (so `talking.txt` can be read and `fetch` isn't blocked): run `npm start`
  or `python -m http.server 8000`, then open http://localhost:8000

## Project structure
```
Block Arena/
├─ index.html
├─ package.json
├─ README.md
├─ tools/
│  └─ embed-team-images.js          embeds team images into JS
├─ assets/
│  ├─ css/
│  │  └─ style.css
│  ├─ data/
│  │  ├─ talking.txt                 boss dialogue (one line per sentence)
│  │  └─ groq-keys.txt               Groq keys (do not commit real keys)
│  └─ audio/
│     ├─ nhac1.mp3
│     ├─ nhac2.mp3
│     └─ guide-bot/                  8 languages × 16 voices
│        ├─ bn/   en/   fil/   hi/
│        ├─ ru/   uk/   vi/   zh/
│        └─ each folder: abbas, alan-sunny, chandler-otterbein, david-song,
│           eli-laipson, flash, har-preet-singh, jeffrey-elliott, kent-lin,
│           kishori-konwar, lewej-whitelow, muriel-medard, nancy-lynch,
│           sajida-zouarhi, sriram-viswanath, swarna  (.mp3)
└─ src/
   ├─ loader.js                      JS load order (add new files here)
   ├─ main.js                        main loop, damage, restart
   ├─ core/
   │  ├─ core.js                     renderer / camera
   │  ├─ config.js                   weapon stats, drops
   │  └─ state.js
   ├─ data/
   │  ├─ team-images.js
   │  └─ team-media.js
   ├─ i18n/
   │  ├─ lang-data.js
   │  └─ i18n.js
   ├─ engine/
   │  ├─ input.js
   │  ├─ sound.js
   │  ├─ music.js
   │  ├─ voxel.js
   │  ├─ occlusion.js
   │  └─ merge.js
   ├─ player/
   │  ├─ player.js
   │  ├─ weapons.js
   │  └─ viewmodel.js
   ├─ entities/
   │  ├─ bot-model.js
   │  ├─ boss-model.js
   │  ├─ boss2-model.js
   │  ├─ steering.js
   │  ├─ boss.js
   │  ├─ spawner.js
   │  ├─ ai-talk.js
   │  ├─ boss-talk.js
   │  ├─ floor-manager.js
   │  ├─ guide-bot.js
   │  ├─ bot-throw.js
   │  ├─ ally.js
   │  └─ archer.js
   ├─ gameplay/
   │  ├─ combat.js
   │  ├─ effects.js
   │  ├─ items.js
   │  ├─ grenade.js
   │  ├─ fall.js
   │  ├─ engrave.js
   │  ├─ fruit-eat.js
   │  └─ portrait-info.js
   ├─ ui/
   │  ├─ minimap.js
   │  ├─ mobile.js
   │  ├─ ui.js
   │  └─ profile.js
   └─ world/
      ├─ common/
      │  ├─ world.js                 map keys, FHT
      │  ├─ sky.js
      │  ├─ daycycle.js
      │  ├─ level.js
      │  ├─ physics.js
      │  ├─ floors.js                lazy load / unload
      │  └─ build.js
      ├─ floor1/
      │  ├─ house.js
      │  ├─ pavilion.js
      │  ├─ statues.js
      │  ├─ teaset.js
      │  ├─ bath.js
      │  ├─ stairgrove.js
      │  └─ fruit-kit.js
      ├─ floor2/
      │  └─ greatwall.js
      └─ nature/
         ├─ kit.js
         ├─ placement.js
         ├─ plants.js
         ├─ lake.js
         ├─ state.js
         ├─ fx.js
         ├─ fish.js
         ├─ swim.js
         ├─ build.js
         └─ runtime.js
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
