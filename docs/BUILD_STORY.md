# How I built Golden Gate Dither

## What I wanted to make

I wanted a Golden Gate Bridge backdrop for Claude Code's Code tab, with enough motion to feel alive while keeping the conversation readable. I drew the bridge, shore, clouds, gulls, sun, and water as an SVG scene on a six-pixel grid, then paired it with a warm light palette and a darker night palette.

## How I worked with Claude and Codex

I used Claude Code to iterate on the scene geometry, palette, and motion. I used Codex to trace the Backdrop API, investigate the Windows rendering behavior, and review the app after each visibility and contrast change. I kept the implementation in the mod's `hooks/register.tsx` so the scene and its data stayed together.

I followed Anthropic's [Backdrop documentation](https://code.claude.com/docs/en/plugins/mods/interface#put-a-backdrop-behind-the-conversation) and used the unchanged `makeColors` helper supplied with Claude Code's mod-authoring tooling, as described in [Anthropic's custom color mod guide](https://code.claude.com/docs/en/plugins/mods/interface#write-a-colors-mod-yourself). I also looked at [Anthropic's theme-examples plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/theme-examples) as a published backdrop example.

I used [ishuagrawal/claude-code-themes](https://github.com/ishuagrawal/claude-code-themes) as a reference for marketplace packaging and setup documentation. I developed the Golden Gate scene through the Claude and Codex workflow described above.

## Getting the scene to show on Windows

At first, `$.theme.set` reported that a surface could draw the theme and the Backdrop hook ran, but the SVG was not visible. On my Windows test setup, transparency was disabled and the desktop app's glass veil covered the backdrop with an opaque layer. Setting the backdrop's `glass` to `false` made the scene visible without changing Windows preferences.

The static test SVG also appeared blank at first, which helped separate a scene issue from a backdrop surface issue. During debugging, I also removed the SVG `shape-rendering` property and color-scheme `@media` rules associated with frozen animation in the Windows build I tested. The scene keeps its motion in SMIL elements.

I centered the towers at x570 and x1030, centered the sun, and balanced the shorelines and cloud groups. The bridge and shore stay fixed as a reading anchor. I made the cloud and fog cycles 25 percent faster and adjusted the water rows to loop without a seam.

## Following Light, Dark, and System

The current Backdrop render props do not expose the effective app color scheme, and `$.theme` has no current-theme getter. `overrideColorScheme` is a setting the mod can apply, so I leave it unset in automatic mode and use SVG `light-dark()` colors with `color-scheme: light dark`. This lets the embedded SVG follow Claude Desktop's Light, Dark, or System appearance without the media rules that froze the scene.

The `/golden-gate light` and `/golden-gate dark` commands apply explicit appearance overrides. I set the animated artwork to 0.26 opacity in automatic mode, 0.24 in light mode, and 0.32 in dark mode so the illustration stays subdued behind the conversation. The JPEG image mode is an older still fallback and stays in light appearance.

## The session readout

I added a small readout in the upper-right area for context use, token and window counts, active and total agent calls, five-hour usage, and session cost when Claude Code provides them. It reads current session data through the mods API and agent tool events. The mod makes no direct network or analytics calls, and the preview images use sample values rather than a real conversation.

## Checking the result

I checked the running scene in Claude Desktop 5.11492.5.0 with Claude Code 2.1.325 on Windows. I confirmed that the bridge and shore stayed fixed while the clouds and water moved between screenshots, and that changing Claude Desktop's Appearance setting recolored the automatic scene. I have not verified mobile or other operating systems.

For repeatable local checks, run these commands from the repository root:

```bash
claude plugin validate themes/golden-gate-dither
node --test tests/*.test.cjs
```

The JavaScript checks need Node.js 22.14 or later. For the install and development steps, see the [repository README](../README.md) and [theme README](../themes/golden-gate-dither/README.md).
