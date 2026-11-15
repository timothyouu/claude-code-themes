# Clawd scenario verification loop

Trigger: this supervised implementation task. Scope: the Clawd Scenarios plugin, documentation, and preview assets.

Acceptance follows the user's reference-specific direction: twelve environments with continuous rainy-window lighting, a limited color palette, fine furniture texture, a quiet center, and localized motion. The corrected mascot must follow the actual plain and coffee sticker images: solid `#d97757` coral, a squat 88:64 silhouette, short stepped arms, four legs, and square black eyes. Furnishings keep their fine texture; the mascot does not.

All scenes support persistent light/dark/auto appearance and still/motion choices. `/clawd-light [scene] [still|motion]` and `/clawd-dark [scene] [still|motion]` select appearance directly. Omitted scene and motion arguments preserve those choices. Invalid arguments change nothing. Existing `/clawd-scene` controls remain available.

The full-canvas background uses cream gradients and cool/rose/warm lighting in light mode, with navy/plum lighting in dark mode. It has no wallpaper dots. Artwork uses two 38% side viewports and a 760-unit scene height. The centered 680px mask reduces artwork to 20% opacity without covering the continuous background.

The MIT rainy-window five-density recipe at commit `ae7d9d6` is adapted to a finer 2.7px object pitch by scaling the original pitch and radii by 0.45. Motion stays local: rain, steam, record rotation, blinks, clouds, bubbles, dust, and kite tails. One skateboard rider moves while two spectators remain stationary.

Verifier: coordinator-controlled regression tests, SVG parsing, independent texture/mascot/source-limit checks, comparison with actual reference images, and native Claude Desktop captures. Scene writers may not change acceptance checks to excuse a failure.

Stop when required checks pass and native behavior is established or a concrete limit is documented. Use at most three corrective passes for the same scoped issue. A repeated external blocker stops only its dependent path; other authorized work continues. Explicit user changes create a new scope interval.

Current checks passed 19 tests, strict TypeScript against the native SDK, and plugin validation with all three commands. The independent verifier passed 72 outputs, with a maximum SVG length of 75,627 characters, 21 imported modules below 1 MiB, and protected-lane text contrast of at least 4.68:1.

Current native verification checked all twelve scenes in light and dark through the new appearance shortcuts in a maximized 1707 x 1019 Claude Desktop window. The 24 current captures verify modes and the corrected mascot. Coffee automatic appearance and the original unsent draft were restored.

The older `native-all-scenes-results.json` records the unchanged motion effects at commit `02591d4`; its 33 captures are not a new current-mascot motion suite. Current mode results belong in `native-mode-checks.json`. Still mode and off/on restoration retain earlier native verification. Mobile-device rendering and a performance benchmark remain untested. Evidence and limits are recorded in `CLAWD_SCENARIOS_HANDOFF.md`.
