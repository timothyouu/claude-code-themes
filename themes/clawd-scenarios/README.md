# Clawd scenarios

I built twelve selectable room scenes for the Code tab of Claude Desktop. Clawd and colored furniture appear mainly in the margins, leaving a clear middle for the conversation. Each scene has a light and dark palette, environmental SMIL animation, and a still option.

Install this plugin from the `claude-code-themes` marketplace, then start a new Code session. It defaults to Coffee, follows Claude's appearance, and enables motion. The backdrop renders on desktop and mobile surfaces; terminals do not render SVG.

```text
/plugin install clawd-scenarios --marketplace timothyouu/claude-code-themes
```

## Commands

Choose appearance directly for any room:

```text
/clawd-light coffee
/clawd-dark book motion
/clawd-light still
```

`/clawd-light [scene] [still|motion]` and `/clawd-dark [scene] [still|motion]` select the requested appearance. Omit the scene to keep the current room. Omit the motion option to retain its setting. These choices persist, and invalid arguments leave the saved choices unchanged.

Use `/clawd-scene` with any of:

- `coffee`, `heart`, `headphones`, `skateboard`, `wand`, `lightbulb`, `magnifier`, `dizzy`, `book`, `bubble`, `cape`, `kite`
- `auto`, `light`, or `dark`
- `still` or `motion`
- `on` or `off`
- `status` or `help`

Choices can be combined: `/clawd-scene kite dark still`. Selecting a scene or appearance turns the theme on. `off` clears this plugin's theme; `on` restores its saved scene, appearance, and motion. Choices persist across sessions. Invalid commands leave saved choices unchanged.

Keep one backdrop theme active at a time. If another mod replaces the background during session startup, `/clawd-scene coffee` reapplies this collection. Older inline theme builds may not support the same off command as their current marketplace version.

`auto` follows Claude's own appearance through SVG `light-dark()` colors, without media-query styles that can freeze desktop SVG motion. Both theme colors and backdrop are reapplied when a choice changes.

## Preview and export

Open [the self-contained gallery](../../assets/clawd-scenarios/preview.html), or regenerate it from the repository root with:

```sh
node scripts/generate-clawd-previews.mjs
```

The gallery offers all scenes, light/dark appearance, motion/still controls, a clearly marked sample conversation, and SVG downloads. Gallery controls change the preview only. They do not change Claude's installed theme. The downloadable SVG keeps the selected appearance and motion state.

The freckled-v5 artwork takes its overall room identity from the original rainy-window reference: continuous cream lighting, a limited set of colors, small defined furnishings, fine texture on objects, and a sparse quiet center. The wall is a smooth gradient with cool upper-right light, rose upper-left light, warm floor light, and subtle edge shading. It has no wallpaper dots. Dark mode uses navy and plum lighting.

Furniture occupies two 38% side viewports with a 760-unit scene height. Rain, steam, records, bubbles, and other details move locally at the sides. In the skatepark, one rider moves and two spectators stay still.

I drew the rooms from the supplied Clawd references and compiled them into SVG patterns. The texture helper adapts the actual rainy-window recipe from [ishuagrawal/claude-code-themes](https://github.com/ishuagrawal/claude-code-themes) at revision `ae7d9d6`. It retains the five-density recipe, dotted lines, and layered halftone edges, but scales the original 6px pitch and radii by 0.45 for a finer 2.7px object pattern. The texture pixels are adapted rather than copied at their original size. Its MIT notice is retained in `hooks/reference-texture.LICENSE` and the repository notice.

I redrew Clawd from the actual [plain sticker](https://www.stickermule.com/claudecode/item/19156131) and [coffee sticker](https://www.stickermule.com/claudecode/item/19982714) artwork. The mascot has a squat 88:64 silhouette, short stepped arms, four legs, square black eyes, and a solid `#d97757` coral body. The plain form has paired feet; the coffee form has four evenly spaced legs. Clawd stays solid while the furnishings retain their fine texture.

No raster images or fonts are needed at runtime. This is an independent theme collection, not an official Anthropic product. Existing `make-colors` compatibility helpers are included unchanged.

## Compatibility

The renderer guards plugin ownership and scene IDs, supports current `scene` and older `id` backdrop props, and sets the host SVG animation flag so desktop SMIL animations run. It avoids Claude's glass effect so reduced-transparency settings cannot obscure the artwork. A mask reduces only the artwork beneath the centered 680-pixel transcript lane to 20% opacity. The wall lighting stays continuous across the full canvas, without a flat rectangular stripe. Text contrast is checked inside this protected lane; narrower windows can place some text over stronger side artwork.

I checked the current solid-mascot build in Claude Desktop 5.11492.5.0 with Claude Code 2.1.325 on Windows. All twelve scenes rendered in both light and dark through the new shortcuts in a maximized 1707 x 1019 window. The 24 native captures show the current mascot and mode selection. Coffee was restored to automatic appearance afterward, and the original draft was left unsent.

See the current [light overview](../../assets/clawd-scenarios/native-all-scenes-light.png), [dark overview](../../assets/clawd-scenarios/native-all-scenes-dark.png), [mode-check results](../../assets/clawd-scenarios/native-mode-checks.json), and [mascot comparison](../../assets/clawd-scenarios/mascot-light-dark.png). The [native café motion capture](../../assets/clawd-scenarios/native-motion.gif) and [earlier motion-pair results](../../assets/clawd-scenarios/native-all-scenes-results.json) document the unchanged animation effects before the mascot correction. The current 24 appearance captures are not a new quantitative motion test. Still mode and off/on restoration retain earlier native verification.

The motion is now easier to see: rain layers loop in 2.1 and 3.4 seconds, steam rises in 2.8 and 3.5 seconds, the record turns in 6.5 seconds, and the rider moves 30 scene units each way over 10 seconds. Mascots also blink. Mobile rendering is supported by the hook but has not been tested on a device.

Run `node --test tests/clawd-scenarios.test.cjs` from the repository root for local runtime and palette checks. A browser preview does not establish native Claude compatibility; verify the installed plugin in Claude Desktop Code.

## Rebuild artwork

The checked-in generated modules need no packages at runtime. Rebuilding the artwork and gallery needs Node.js:

```sh
node scripts/compile-clawd-dither.mjs
node scripts/generate-clawd-previews.mjs
node scripts/verify-clawd-art.mjs
```

The current renderer passed 19 tests, strict TypeScript against the installed Claude SDK, and independent verification of all 72 scene/appearance/motion outputs. The largest SVG is 75,627 characters, below the native 131,072-character limit. All 21 imported modules are below 1 MiB. Tested text contrast inside the protected lane is at least 4.68:1.

Generating optional PNG previews requires an existing Sharp installation. Neither script installs packages:

```sh
node scripts/export-clawd-images.mjs --sharp=/absolute/path/to/sharp
```
