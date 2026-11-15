# Clawd Scenarios handoff

I added one Clawd Scenarios plugin as a second marketplace option alongside Golden Gate Dither. It contains twelve selectable environments, persistent appearance and motion controls, a gallery, and SVG exports. The user approved local installation and requested the GitHub addition.

## Current artwork and motion

The latest artwork is freckled-v5. The user asked for the original rainy-window room identity, smaller objects, less visible circular texture, and a gradient background. The current design follows the reference's continuous lighting, limited color families, small defined furnishings, fine object texture, quiet sparse center, and localized environmental motion.

The light wall uses the original reference's top, middle, and bottom cream colors: `#f2ece2`, `#efe7db`, and `#eedfca`. Cool upper-right light, rose upper-left light, warm floor light, and subtle edge shading cover the whole canvas. Dark mode uses a navy/plum equivalent. There are no wallpaper dots.

Furniture occupies the two 38% side viewports. A 760-unit scene height gives it more screen coverage while retaining the fine object texture. Only artwork beneath the centered 680px transcript lane is masked to 20% opacity. The background remains continuous through the lane, without a flat veil stripe.

The texture helper adapts `dotPaint`, `dotted`, `dline`, and `halftone` from the actual rainy-window source in `ishuagrawal/claude-code-themes`, commit `ae7d9d6d9fb98b2409d26d405dfbc230f2be864a`. It retains the five-density relationships and scales the original 6px pitch and radii by 0.45, producing a finer 2.7px object pattern. The original radii were 2.6, 2.1, 1.6, 1.15, and 0.75; current pixels are scaled adaptations, not an exact-size copy. MIT attribution remains in `hooks/reference-texture.LICENSE` and the repository notice.

Motion stays in environmental details while room geometry remains fixed. Rain loops in 2.1 and 3.4 seconds, steam rises in 2.8 and 3.5 seconds, the record turns in 6.5 seconds, and the skateboard rider moves 30 scene units each way over 10 seconds. Mascots blink. Two skateboard spectators remain stationary.

## Changed files

The plugin lives in `themes/clawd-scenarios/`. Registration persists scene, appearance, motion, and enabled state. `scene.mjs` composes the full-canvas lighting, margin artwork, transcript artwork mask, and motion. `scenes-a.mjs`, `scenes-b.mjs`, and `primitives.mjs` contain authored rooms and mascots. `reference-texture.mjs` holds the attributed texture recipe, `dither/` contains compiled artwork, and `motion.mjs` supplies environmental animations.

The repository also has a marketplace entry, a self-contained preview gallery, PNG preview exports, compiler/export scripts, regression tests, and an independent artwork verifier. The original Golden Gate theme remains unchanged. No raster assets or fonts are required by the installed Clawd renderer.

## Verification

- `node --test tests/*.test.cjs`: 18 passed on the current renderer, including the original Golden Gate checks.
- Strict TypeScript passed against the installed native Claude SDK with `strict`, `noImplicitAny`, and `noUncheckedIndexedAccess`.
- The contrast regression bounds continuous background lighting and 20% artwork contribution inside the protected 680px lane. Current primary and muted text contrast is at least 4.68:1. This is not a full-window contrast claim.
- The independent verifier passed all 72 current freckled-v5 scene/appearance/motion outputs, including finer texture, smaller layout, continuous lighting, and the artwork-only mask.
- The largest current SVG is 75,900 characters, below the native 131,072-character limit. All 21 imported modules are below the native 1 MiB per-file limit.
- Plugin validation passed, with only the optional marketplace icon advisory.
- Gallery controls previously passed desktop and mobile browser checks. Their control code is unchanged; the parity test checks that embedded SVGs match the current renderer.
- The UI detector previously reported only the cream-palette warning after text contrast and mobile font fixes. The warm paper palette follows the reference. This control-layout evidence does not replace current native artwork checks.

Current freckled-v5 native verification used Windows Claude Desktop 5.11492.5.0 with Claude Code 2.1.325. After reloading the plugin, Coffee rendered in dark/auto and light appearance with continuous full-canvas lighting, smaller defined furnishings, readable chat, and no flat stripe. Eight new light-mode frames spanning 5.55 seconds show active rain and steam.

I tested the other eleven scenes in a maximized 1707 x 1019 Claude Desktop window in both light and dark appearance. I saved 33 native captures: a dark motion pair and one light frame per scene. Side framing and transcript readability passed visual review in every scene. The dark pairs show environmental changes outside mascot-eye regions, so a blink alone cannot pass the motion check. The skateboard pair includes the rider intentionally. No artwork or animation changes were needed.

The [dark overview](../assets/clawd-scenarios/native-all-scenes-dark.png), [light overview](../assets/clawd-scenarios/native-all-scenes-light.png), and [capture results](../assets/clawd-scenarios/native-all-scenes-results.json) contain the evidence. Overview sheets contain only the native illustrated margins; the private transcript is excluded. Raw full-window captures remain local. The source tested is commit `02591d42d479dd14702d25b3ee94d4cd40f3955f`.

| Scene | Observed motion | Changed side pixels | Pair interval |
| --- | --- | ---: | ---: |
| heart | Floating hearts | 967 | 1821 ms |
| headphones | Record rotation and equalizer | 1,459 | 1855 ms |
| skateboard | Moving rider and dust; fixed spectators | 17,384 | 1899 ms |
| wand | Orbiting sparkles and twinkles | 300 | 1893 ms |
| lightbulb | Pulsing lamp halos | 611 | 1874 ms |
| magnifier | Clipped window rain | 3,570 | 1841 ms |
| dizzy | Orbiting stars | 1,744 | 1851 ms |
| book | Reading-lamp dust | 365 | 1859 ms |
| bubble | Rising bubbles | 1,348 | 1862 ms |
| cape | Drifting clouds | 2,002 | 1871 ms |
| kite | Swaying kite tails | 1,058 | 1871 ms |

Still mode and off/on restoration passed native checks on earlier revisions; these controls were unchanged in this pass. Coffee had already passed the same maximized light/dark check.

The [earlier native café motion capture](../assets/clawd-scenarios/native-motion.gif) shows actual app frames. The [reference comparison](../assets/clawd-scenarios/texture-comparison.png) compares the artwork with the actual upstream image. Comparison exports alone do not establish native rendering or motion.

Independent review used the actual upstream rainy-window source and image. The current revision responds to the user's later request for the whole room identity rather than large round-dot treatment alone. Mobile Claude/device rendering and a performance benchmark were not run. The original app draft was restored without sending it.

## Native constraints

Backdrop identifiers allow only letters, digits, underscores, and hyphens, up to 64 characters. Registration and the verifier enforce these identifier and source-size limits. Generated artwork is split by scene.

The renderer supports current `scene` and older `id` backdrop props, guards plugin ownership, and renders only on desktop and mobile surfaces. The host SVG animation flag is enabled for SMIL. Automatic appearance uses resolved `light-dark()` colors without animation-freezing media styles.

## Delegation record

Two bounded scene writers delivered six scenes each. A plugin worker handled registration, the gallery, and runtime tests. Independent review compared artwork with the actual reference, and the coordinator checked integration in Claude Desktop. The coordinator retained ownership of acceptance checks and source-limit enforcement.

Later texture, lighting, scale, and motion changes followed explicit user feedback. No packages were installed and no credential files were read for this work. Shared account counters do not establish per-task cost or a workflow speedup.

## Remaining decisions and limits

The GitHub branch and PR are intended for review before merging. No merge is part of this handoff. The user can use the locally installed plugin; installation from the default marketplace branch will include it after the PR is merged. Recheck scenes if Claude's early-access mod API changes.

An older inline Golden Gate build also loads in the existing session. Its `/golden-gate off` returned help instead of disabling that older mod. Reapplying `/clawd-scene coffee` restored Clawd successfully. A new-session ordering conflict was not reproduced, and the older inline mod was not edited or removed.
