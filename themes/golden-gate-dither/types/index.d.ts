export type Hud = {
  /** Context window fill, 0 to 100; null before the first response. */
  contextPercent: number | null
  contextTokens: number | null
  contextWindow: number
  /** Agent tool calls running right now. */
  agentsLive: number
  /** Agent tool calls started this session. */
  agentsTotal: number
  costUsd: number | null
  fiveHourPercent: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'golden-gate-dither': { hud: Hud; appearance: 'auto' | 'light' | 'dark' }
  }
}
