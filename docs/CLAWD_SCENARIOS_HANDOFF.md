# Clawd Scenarios handoff

I added one Clawd Scenarios plugin as a second marketplace option alongside Golden Gate Dither. It contains twelve environments, persistent scene/appearance/motion choices, direct light/dark commands, a gallery, and SVG exports. The user approved local installation and requested the GitHub addition.

## Current behavior

The plugin registers three commands: `/clawd-scene`, `/clawd-light`, and `/clawd-dark`. The appearance shortcuts accept `[scene] [still|motion]`; leaving out the scene keeps the current room, and leaving out motion keeps its setting. Invalid arguments leave preferences unchanged. The existing scene, automatic appearance, on/off, still/motion, status, and help choices remain available.

I redrew the mascot from the actual [plain sticker](https://www.stickermule.com/claudecode/item/19156131) and [coffee sticker](https://www.stickermule.com/claudecode/item/19982714) images. Its dominant coral was sampled as `#d97757`. The solid silhouette has an 88:64 proportion, short stepped arms, four legs, and square black eyes. Plain Clawd has paired feet; the coffee form has four evenly spaced legs. Most scenes use the plain body with their own props. Glasses and dizzy X eyes align with the corrected face. The mascot is not freckled.

The furnishings retain the fine freckled-v5 texture and continuous rainy-window lighting. The light wall uses the reference's cream top, middle, and bottom colors: `#f2ece2`, `#efe7db`, and `#eedfca`. Cool upper-right light, rose upper-left light, warm floor light, and subtle edge shading cover the full canvas. Dark mode uses navy/plum lighting. There are no wallpaper dots.

Artwork uses two 38% side viewports with a 760-unit scene height. Only artwork beneath the centered 680px transcript lane is masked to 20% opacity. The gradient background stays continuous through that lane, without a flat stripe.

The texture helper adapts `dotPaint`, `dotted`, `dline`, and `halftone` from rainy-window in `ishuagrawal/claude-code-themes`, commit `ae7d9d6d9fb98b2409d26d405dfbc230f2be864a`. It scales the original 6px pitch and five radii by 0.45, producing a finer 2.7px object pattern. This is an adapted texture size, not an exact-pitch copy. MIT attribution remains in `hooks/reference-texture.LICENSE` and the repository notice.

Environmental motion is unchanged by the mascot correction. Rain loops in 2.1 and 3.4 seconds, steam rises in 2.8 and 3.5 seconds, the record turns in 6.5 seconds, and the skateboard rider moves 30 scene units each way over 10 seconds. Mascots blink; two skateboard spectators remain stationary.

## Changed files

The plugin lives in `themes/clawd-scenarios/`. Registration persists preferences and handles all three commands. `scene.mjs` composes lighting, artwork, the transcript mask, and motion. `scenes-a.mjs`, `scenes-b.mjs`, and `primitives.mjs` contain authored rooms, props, and mascots. `reference-texture.mjs` holds the attributed texture recipe, `dither/` contains compiled artwork, and `motion.mjs` supplies environmental animations.

The repository also contains the marketplace entry, self-contained gallery, PNG exports, compiler/export scripts, regression tests, and an independent artwork verifier. Golden Gate remains unchanged. The installed renderer needs no raster images or fonts.

## Verification

- The current checks passed 19 tests, including the original Golden Gate checks and the appearance shortcuts.
- Strict TypeScript passed against the installed native Claude SDK with `strict`, `noImplicitAny`, and `noUncheckedIndexedAccess`.
- The independent verifier passed all 72 scene/appearance/motion outputs. The largest SVG is 75,627 characters, below the native 131,072-character limit. All 21 imported modules are below 1 MiB.
- Tested primary and muted text contrast inside the protected lane is at least 4.68:1. This is not a full-window contrast claim.
- Plugin validation passed with all three commands. Only the optional marketplace icon advisory remains.
- Gallery controls previously passed desktop and mobile browser checks. Their control code is unchanged, and the parity test compares embedded SVGs with the current renderer.
- Earlier UI detector checks reported only the cream-palette warning after text contrast and mobile font fixes. The palette follows the reference.

Current native verification used Windows Claude Desktop 5.11492.5.0 with Claude Code 2.1.325 in a maximized 1707 x 1019 window. All twelve scenes rendered in both light and dark through `/clawd-light` and `/clawd-dark`. The 24 native captures verify the corrected solid mascot and appearance selection. Coffee was restored to automatic appearance, and the original draft was left unsent.

Current evidence is in the [light overview](../assets/clawd-scenarios/native-all-scenes-light.png), [dark overview](../assets/clawd-scenarios/native-all-scenes-dark.png), [mode-check results](../assets/clawd-scenarios/native-mode-checks.json), and [mascot comparison](../assets/clawd-scenarios/mascot-light-dark.png). Overview sheets contain illustrated margins rather than the private transcript. Raw full-window captures remain local.

Motion evidence is separate. The [earlier motion-pair results](../assets/clawd-scenarios/native-all-scenes-results.json) record 33 captures from commit `02591d42d479dd14702d25b3ee94d4cd40f3955f`: dark pairs and light frames for eleven scenes, with Coffee checked separately. Those pairs established environmental changes outside mascot-eye regions and included the moving skateboard rider intentionally. The [native café GIF](../assets/clawd-scenarios/native-motion.gif) also demonstrates the unchanged rain and steam effects. These earlier captures are not current-mascot quantitative motion evidence.

Still mode and off/on restoration retain earlier native verification. Mobile Claude/device rendering and a performance benchmark were not run. Source timing assertions and comparison exports alone do not establish native behavior.

## Native constraints

Backdrop identifiers allow only letters, digits, underscores, and hyphens, up to 64 characters. SVG sources are limited to 131,072 characters and imports to 1 MiB per file. Registration and the verifier enforce these limits, and generated artwork is split by scene.

The renderer supports current `scene` and older `id` backdrop props, guards plugin ownership, and renders only on desktop and mobile surfaces. The host SVG animation flag is enabled for SMIL. Automatic appearance uses resolved `light-dark()` colors without animation-freezing media styles.

## Delegation record

Two bounded scene writers delivered six rooms each. A plugin worker handled registration, the gallery, and runtime tests. Independent review compared the artwork with the actual reference, and the coordinator verified integration in Claude Desktop. The coordinator retained ownership of acceptance checks and source-limit enforcement.

Texture, lighting, scale, motion, shortcuts, and mascot corrections followed explicit user feedback. No packages were installed or credential files read for this work. Shared account counters do not establish per-task cost or a workflow speedup.

## Remaining decisions and limits

The GitHub branch and PR are intended for review before merging. No merge is part of this handoff. The user can use the local installation; the default marketplace branch includes this option after the PR is merged. Recheck compatibility if Claude's early-access mod API changes.

An older inline Golden Gate build also loads in the existing session. Its `/golden-gate off` returned help instead of disabling that older mod. Reapplying `/clawd-scene coffee` restored Clawd. A new-session ordering conflict was not reproduced; the older inline mod was not edited or removed.
