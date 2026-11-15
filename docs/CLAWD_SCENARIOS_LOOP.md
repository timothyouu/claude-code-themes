# Clawd scenario verification loop

Trigger: this supervised implementation task. Scope: the Clawd Scenarios plugin, its documentation, and preview assets.

The latest user direction asks for the original rainy-window identity: continuous lighting, limited color families, smaller defined furniture, fine object texture, a sparse quiet center, and visible localized motion. The background must be a smooth gradient rather than wallpaper dots. Retain all twelve scenes, persistent choices, light/dark/auto, still mode, and off/on restoration. One skateboard rider moves while two spectators remain stationary.

The current revision is freckled-v5. The full-canvas light wall uses the original cream top/middle/bottom colors, cool upper-right light, rose upper-left light, warm floor light, and subtle edge shading. Dark mode uses navy/plum lighting. Furniture is about 20% smaller through a 1,000-unit scene height. It remains mainly in two 35% margins. A centered 680px mask reduces artwork only to 20% opacity; the continuous background is not covered by a flat veil.

The texture helper adapts the MIT-licensed rainy-window five-density recipe at commit `ae7d9d6`. The original 6px pitch and five radii are scaled by 0.45 for a finer 2.7px object pattern. These are adapted texture pixels, not an exact-pitch reproduction. No room-wide dot print remains. Rain, steam, record rotation, blinks, and skateboard movement remain localized.

Verifier: coordinator-controlled regression tests, generated SVG parsing, independent texture/source-limit checks, comparison with the actual upstream image, and native Claude Desktop captures. Scene writers may not change acceptance checks to excuse a failure.

Stop: finish when the required checks pass and native behavior is established or a concrete remaining limit is documented. Apply at most three corrective passes to the same scoped issue. A repeated external blocker stops only its dependent path; other authorized work continues. Explicit user changes to artwork direction create a new scope interval.

Current evidence: all 18 tests and strict TypeScript against the native SDK passed. The independent verifier passed 72 freckled-v5 scene/appearance/motion outputs. The largest SVG is 75,898 characters, below the native 131,072-character limit; all 21 imported modules are below 1 MiB. Tested text contrast inside the protected lane is at least 4.68:1.

Current native verification reloaded freckled-v5 in Claude Desktop and confirmed Coffee in dark/auto and light appearance: continuous full-canvas lighting, smaller furniture, readable chat, and no flat stripe. Eight new light-mode frames spanning 5.55 seconds show active rain and steam. Earlier native checks covered all twelve rooms, still mode, off/on restoration, and rider movement with fixed spectators. Do not describe those earlier results as a native retest of every current scene. Evidence, attribution, and remaining limits are recorded in `CLAWD_SCENARIOS_HANDOFF.md`.

The latest layout widens each side viewport from 25% to 35% and uses an 800-unit scene height so the artwork occupies more of the screen. The centered 680px chat mask and fine object texture remain unchanged. Reloaded and visually checked the expanded Coffee layout in Claude Desktop; the linked motion GIF predates this layout-only change. All 18 tests, strict SDK TypeScript, and 72-output SVG checks passed.
