# Clawd Scenarios handoff

I added one Clawd Scenarios plugin as a second marketplace option alongside Golden Gate Dither. It contains twelve selectable environments, persistent appearance and motion controls, a gallery, and SVG exports. The user approved local installation and requested the GitHub addition.

## Final artwork and motion

The final texture is freckled-v4. I retained recognizable room furniture, converted its surfaces and contours to colored round freckles, added graduated glass densities and faint warm/cool lighting, and kept the artwork mainly in the two 25% margins. The middle 50% remains clear. A centered 680px veil covers the transcript with 70% background color.

The texture helper adapts `dotPaint`, `dotted`, `dline`, and `halftone` from the actual rainy-window source in `ishuagrawal/claude-code-themes`, commit `ae7d9d6d9fb98b2409d26d405dfbc230f2be864a`. It uses the same 6px pitch and five radii: 2.6, 2.1, 1.6, 1.15, and 0.75. The MIT attribution is retained in `hooks/reference-texture.LICENSE` and the repository notice.

Motion is localized to environmental details while room geometry stays fixed. Rain loops in 2.1 and 3.4 seconds, steam rises in 2.8 and 3.5 seconds, the record turns in 6.5 seconds, and the skateboard rider moves 30 scene units each way over 10 seconds. Mascots blink. Two skateboard spectators remain stationary.

## Changed files

The plugin lives in `themes/clawd-scenarios/`. Registration persists scene, appearance, motion, and enabled state. `scene.mjs` composes the margins, lighting, transcript veil, and scene motion. `scenes-a.mjs`, `scenes-b.mjs`, and `primitives.mjs` contain the authored rooms and mascots. `reference-texture.mjs` holds the attributed texture recipe, `dither/` contains compiled artwork, and `motion.mjs` supplies the environmental animations.

The repository also has a marketplace entry, a self-contained preview gallery, PNG preview exports, compiler/export scripts, regression tests, and an independent artwork verifier. The original Golden Gate theme remains unchanged. No raster assets or fonts are required by the installed Clawd renderer.

## Verification

- `node --test tests/*.test.cjs`: 18 passed, including the original Golden Gate checks.
- `node scripts/verify-clawd-art.mjs`: all 72 scene/appearance/motion outputs passed. Checks include the actual five-radius texture, graduated glass, valid SVG references, localized motion, the separate rider, stationary spectators, and native source limits.
- Longest generated SVG: 74,282 characters, below the native 131,072-character limit. Imported modules remain below the native 1 MiB per-file limit.
- Primary and muted text retain at least 4.5:1 contrast under the tested worst-case artwork bound inside the protected 680px lane. This is not a full-window contrast claim.
- Strict TypeScript passed against the installed native Claude SDK with `strict`, `noImplicitAny`, and `noUncheckedIndexedAccess`.
- `claude plugin validate themes/clawd-scenarios` passed. The optional marketplace listing icon warning remains.
- The gallery controls passed desktop and mobile browser checks before the artwork refinements. Their control code is unchanged; the parity test checks that embedded SVGs match the current renderer.
- The UI detector previously reported only the cream-palette warning after text contrast and mobile font fixes. The warm paper palette follows the supplied reference. That control-layout evidence does not replace a fresh native artwork check.

Native verification used Windows Claude Desktop 5.11492.5.0 with Claude Code 2.1.325. All twelve rooms, light/dark switching, still mode, off, and saved-scene restoration worked before the final freckled-v4 refinement. On the current revision, eight captured native frames confirm that café rain and steam visibly move. A current dark skateboard capture pair shows about eight screen pixels of rider movement while stationary spectators stay fixed.

The [native café motion GIF](../assets/clawd-scenarios/native-motion.gif) uses eight captured frames over 5.39 seconds with the recorded 650 to 692ms frame delays. It shows the actual app at real-time playback. The [texture comparison](../assets/clawd-scenarios/texture-comparison.png) places the downloaded upstream reference on the left and the final café on the right.

Independent visual review compared the artwork with the actual upstream rainy-window image. It identified flat glass density and missing lighting as remaining differences; freckled-v4 adds graduated glass and room lighting in response. A final native result for each new effect should not be inferred from source checks alone. Mobile Claude/device rendering and a performance benchmark were not run. The original app draft was restored without sending it.

## Native constraints

Backdrop identifiers allow only letters, digits, underscores, and hyphens, up to 64 characters. Imported files are limited to 1 MiB, and SVG sources to 131,072 characters. Registration and the verifier enforce these limits. Generated artwork is split by scene.

The renderer supports current `scene` and older `id` backdrop props, guards plugin ownership, and renders only on desktop and mobile surfaces. The host's SVG animation flag is enabled for SMIL. Automatic appearance uses resolved `light-dark()` colors without animation-freezing media styles.

## Delegation record

Two bounded scene writers delivered six scenes each. A plugin worker handled registration, the gallery, and runtime tests. Independent review checked artwork against the actual reference, and the coordinator verified integration in Claude Desktop. The coordinator retained ownership of acceptance checks and source-limit enforcement.

Later texture and motion revisions followed explicit user feedback. No packages were installed and no credential files were read for this work. Shared account counters do not establish per-task cost or a workflow speedup.

## Remaining decisions and limits

The GitHub branch and PR are intended for review before merging. No merge is part of this handoff. The user can use the locally installed plugin; installation from the default marketplace branch will include it after the PR is merged. Recheck scenes if Claude's early-access mod API changes.

An older inline Golden Gate build also loads in the existing session. Its `/golden-gate off` returned help instead of disabling that older mod. Reapplying `/clawd-scene coffee` restored Clawd successfully. A new-session ordering conflict was not reproduced, and the older inline mod was not edited or removed.
