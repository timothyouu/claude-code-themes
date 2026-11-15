# Clawd Scenarios handoff

I added a second marketplace option alongside Golden Gate Dither: one Clawd Scenarios plugin with twelve selectable environments. The final direction follows rainy-window's readable colored furniture, material washes, and round halftone detail. Motion stays in the margins. The user explicitly approved the local plugin installation and requested the GitHub addition.

## Changed files

The plugin lives in `themes/clawd-scenarios/`. Its registration stores scene, appearance, motion, and enabled state. `scene.mjs` lays out the two 25% margins, a clear middle, and a 680px transcript veil. `scenes-a.mjs`, `scenes-b.mjs`, and `primitives.mjs` contain the authored rooms and mascots. `dither/` contains generated room material geometry. `motion.mjs` adds rain, steam, vinyl rotation, bubbles, dust, clouds, stars, and kite tails. A separate skateboard actor rolls while two spectators stay fixed.

I added the marketplace entry, preview gallery, two PNG scene previews, generator/export scripts, regression tests, and an independent artwork verifier. The original Golden Gate theme remains unchanged. The reference repository was downloaded and inspected at commit `ae7d9d6d9fb98b2409d26d405dfbc230f2be864a`.

## Verification

- `node --test tests/*.test.cjs`: 16 passed, including the original Golden Gate checks.
- `node scripts/verify-clawd-art.mjs`: 72 scene/appearance/motion combinations and 25 artwork layers passed. It checks actual room geometry, round halftone paints, source sizes, IDs, localized motion, the separate rider, and spectators.
- Worst-case primary and muted text contrast is at least 4.92:1 inside the protected 680px lane. This is not a full-window contrast claim.
- Longest generated SVG: 48,440 of the native 131,072-character limit. Imported modules remain below the native 1 MiB per-file limit.
- `claude plugin validate themes/clawd-scenarios`: passed. The optional marketplace listing icon warning remains.
- Strict TypeScript passed against the installed native Claude SDK, with `strict`, `noImplicitAny`, and `noUncheckedIndexedAccess` enabled.
- The UI detector completed and reported only a cream-palette warning. The supplied references deliberately use warm paper backgrounds, so that palette was retained.
- Native Windows Claude Desktop 5.11492.5.0 / Claude Code 2.1.325: installed successfully; all twelve final room scenes rendered; light/dark switching, still mode, off, and saved-scene restoration worked. Full-width skateboard screenshots several seconds apart show the rider moving and spectators fixed. The final installed scene is Coffee with automatic appearance and motion enabled.
- Independent read-only review inspected all twelve contact scenes plus shipped light/dark renders and found no material composition issue against the final furniture direction.

The gallery controls were tested at desktop and mobile browser sizes before the final artwork changes; the control code is unchanged and a parity test confirms its embedded SVGs match the final renderer. Mobile Claude/device rendering and a performance benchmark were not run. The original app draft was restored without sending it.

## Native constraints found during integration

Backdrop identifiers allow only letters, digits, underscores, and hyphens, up to 64 characters. Imported files are limited to 1 MiB, and an SVG source is limited to 131,072 characters. The implementation and verifier enforce these constraints. Generated source is split by scene, and shared material patterns keep the final SVGs small.

## Delegation record

Two bounded scene writers delivered six scenes each. A plugin worker handled registration, the gallery, and runtime tests. A separate read-only review checked the final artwork, and the coordinator verified integration and the actual app. All twelve scene units were accepted. Several style changes were explicit user steering, separate from the native constraint fixes. No package installs or credential-file reads were needed. Account usage counters are shared with other activity and do not establish per-task cost or a workflow speedup.

## Remaining decisions

The GitHub branch and PR are intended for review before merging. No merge is part of this handoff. Use the local installed theme immediately; a marketplace install from the default branch will include this option after the PR is merged. Scenes should be rechecked if Claude's early-access mod API changes.

The existing session also loads an older inline Golden Gate build. Its `/golden-gate off` returned help instead of disabling that older mod. Clawd Coffee was reapplied successfully afterward. A new-session ordering conflict was not reproduced, so the documentation explains how to reapply Clawd if another backdrop replaces it. The older inline mod was not edited or removed.
