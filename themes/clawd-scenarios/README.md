# Clawd scenarios

I built twelve selectable freckled scenes for the Code tab of Claude Desktop. Clawd and colored furniture appear mainly in the margins, leaving a clear middle for the conversation. Each scene has a light and dark palette, environmental SMIL animation, and a still option.

Install this plugin from the `claude-code-themes` marketplace, then start a new Code session. It defaults to Coffee, follows Claude's appearance, and enables motion. The backdrop renders on desktop and mobile surfaces; terminals do not render SVG.

```text
/plugin install clawd-scenarios --marketplace timothyouu/claude-code-themes
```

## Commands

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

The final freckled-v4 artwork uses colored round dots for furniture, dotted edges, terracotta Clawd, graduated window densities, and faint warm/cool room lighting. Rain, steam, records, bubbles, and other details move at the sides. In the skatepark, one rider moves and two spectators stay still.

I drew the rooms from the supplied Clawd references and compiled them into SVG patterns. The texture helper adapts the actual rainy-window recipe from [ishuagrawal/claude-code-themes](https://github.com/ishuagrawal/claude-code-themes) at revision `ae7d9d6`: a 6px pitch, five dot radii (2.6, 2.1, 1.6, 1.15, and 0.75), dotted lines, and layered halftone edges. Its MIT notice is retained in `hooks/reference-texture.LICENSE` and the repository notice.

No raster images or fonts are needed at runtime. This is an independent theme collection, not an official Anthropic product. Existing `make-colors` compatibility helpers are included unchanged.

## Compatibility

The renderer guards plugin ownership and scene IDs, supports current `scene` and older `id` backdrop props, and sets the host SVG animation flag so desktop SMIL animations run. It avoids Claude's glass effect so reduced-transparency settings cannot obscure the artwork. A matching SVG background layer protects a centered 680-pixel transcript lane, while the stronger furniture remains visible near the edges. Text contrast is checked inside this protected lane; narrower windows can place some text over stronger side artwork.

I tested all twelve rooms, light/dark appearance, still mode, and off/on restoration in Claude Desktop 5.11492.5.0 with Claude Code 2.1.325 on Windows before the final texture refinement. On the current freckled-v4 revision, eight native frames confirm visible café rain and steam. A current dark skateboard capture pair shows the rider shift by about eight screen pixels while the two spectators stay fixed.

See the [native café motion capture](../../assets/clawd-scenarios/native-motion.gif) and the [actual reference beside the final café](../../assets/clawd-scenarios/texture-comparison.png).

The motion is now easier to see: rain layers loop in 2.1 and 3.4 seconds, steam rises in 2.8 and 3.5 seconds, the record turns in 6.5 seconds, and the rider moves 30 scene units each way over 10 seconds. Mascots also blink. Mobile rendering is supported by the hook but has not been tested on a device.

Run `node --test tests/clawd-scenarios.test.cjs` from the repository root for local runtime and palette checks. A browser preview does not establish native Claude compatibility; verify the installed plugin in Claude Desktop Code.

## Rebuild artwork

The checked-in generated modules need no packages at runtime. Rebuilding the artwork and gallery needs Node.js:

```sh
node scripts/compile-clawd-dither.mjs
node scripts/generate-clawd-previews.mjs
node scripts/verify-clawd-art.mjs
```

The final checks passed 18 tests, strict TypeScript against the installed Claude SDK, and an independent verifier covering 72 scene/appearance/motion outputs. The largest SVG is 74,282 characters, below the native 131,072-character limit. Imported modules remain below Claude's 1 MiB per-file limit.

Generating optional PNG previews requires an existing Sharp installation. Neither script installs packages:

```sh
node scripts/export-clawd-images.mjs --sharp=/absolute/path/to/sharp
```
