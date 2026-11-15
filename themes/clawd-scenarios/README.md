# Clawd scenarios

I built twelve selectable ASCII and dither scenes for the Code tab of Claude Desktop. Pixel-built Clawd appears in the margins, leaving the conversation lane clear. Each scene has a light and dark palette, restrained SMIL animation, and a still option.

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

The scenery combines clear furniture contours, soft color fills, and round halftone dots, with muted blue windows, sage plants, clay details, and warm lamps. The terracotta mascots stay crisp, while rain, steam, records, bubbles, and other small details move at the sides. In the skatepark, one rider moves and two spectators stay still.

I drew the scenes from the supplied Clawd references and compiled the scenery into compact SVG material patterns. No raster images or fonts are needed at runtime. This is an independent theme collection, not an official Anthropic product. Existing `make-colors` compatibility helpers are included unchanged.

## Compatibility

The renderer guards plugin ownership and scene IDs, supports current `scene` and older `id` backdrop props, and requests interactive SVG rendering so desktop SMIL animations run. It avoids Claude's glass effect so reduced-transparency settings cannot obscure the artwork. A matching SVG background layer protects a centered 680-pixel transcript lane, while the stronger furniture remains visible near the edges. Text contrast is checked inside this protected lane; narrower windows can place some text over stronger side artwork.

I tested all twelve scenes, light and dark appearance, still mode, and off/on restoration in Claude Desktop 5.11492.5.0 with Claude Code 2.1.325 on Windows. I also checked native screenshots taken several seconds apart to confirm that the skateboard rider moves while the two spectators stay fixed. Mobile rendering is supported by the hook but has not been tested on a device.

Run `node --test tests/clawd-scenarios.test.cjs` from the repository root for local runtime and palette checks. A browser preview does not establish native Claude compatibility; verify the installed plugin in Claude Desktop Code.

## Rebuild artwork

The checked-in generated modules need no packages at runtime. Rebuilding the artwork and gallery needs Node.js:

```sh
node scripts/compile-clawd-dither.mjs
node scripts/generate-clawd-previews.mjs
node scripts/verify-clawd-art.mjs
```

The compiler splits scene modules below Claude's 1 MiB import limit. The verifier also checks every full SVG against the native 131,072-character limit.

Generating optional PNG previews requires an existing Sharp installation. Neither script installs packages:

```sh
node scripts/export-clawd-images.mjs --sharp=/absolute/path/to/sharp
```
