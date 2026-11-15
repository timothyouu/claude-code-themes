# Clawd scenario verification loop

Trigger: this supervised implementation task. Scope: the Clawd Scenarios plugin, its documentation, and preview assets.

Final acceptance follows the user's latest reference-specific direction: all twelve named scenarios; recognizable colored furniture printed with the actual rainy-window five-radius freckle recipe; dotted contours, graduated glass density, faint warm/cool room lighting; artwork mainly in two 25% margins; a clear middle 50%; a protected 680px text lane with 70% background coverage; persistent switching; and visible environmental motion. Still mode removes SMIL. One skateboard rider moves while two spectators remain stationary.

The final artwork revision is freckled-v4. Its texture helper adapts the MIT-licensed rainy-window `dotPaint`, `dotted`, `dline`, and `halftone` recipe at upstream commit `ae7d9d6`, with the notice retained. The recipe uses a 6px pitch and radii 2.6, 2.1, 1.6, 1.15, and 0.75. Environmental motion now includes 2.1/3.4-second rain, 2.8/3.5-second steam, a 6.5-second record turn, and a 10-second skateboard cycle.

Verifier: coordinator-controlled regression tests, generated SVG parsing, independent texture/source-limit checks, comparison with the actual upstream image, and native Claude Desktop screenshots. Scene writers may not change acceptance checks to excuse a failure.

Stop: finish when the required checks pass and native behavior is established or a concrete remaining limit is documented. Apply at most three corrective passes to the same scoped issue. A repeated external blocker stops only its dependent path; other authorized work continues. Explicit user changes to artwork direction create a new scope interval.

Current evidence: 18 tests and strict TypeScript against the native SDK passed. The independent verifier passed 72 scene/appearance/motion outputs. The largest generated SVG is 74,282 characters, below the native 131,072-character cap; imported modules remain below 1 MiB. Earlier native checks covered all twelve rooms, light/dark, still, off/on restoration, and rider movement with fixed spectators.

On the current freckled-v4 revision, eight native frames confirm visible café rain and steam. A current dark skateboard capture pair shows about eight screen pixels of rider movement while both spectators remain fixed. The native café capture is preserved in `assets/clawd-scenarios/native-motion.gif`, and `texture-comparison.png` places the actual upstream image beside the final café. Do not treat earlier artwork screenshots or source timing assertions as confirmation of every current native animation. Evidence, attribution, and remaining limits are recorded in `CLAWD_SCENARIOS_HANDOFF.md`.
