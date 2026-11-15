import type { Appearance, ScenarioKey } from '../types/index'
export type Palette = { bg: string; walltop: string; wallmid: string; wallbottom: string; glowcool: string; glowrose: string; glowfloor: string; shade: string; ink: string; soft: string; accent: string; warm: string; cool: string; leaf: string; paper: string; panel: string; line: string }
export type Scenario = { title: string; description: string; accent: string; light: string; dark: string; left: () => string; right: () => string }
export const SCENARIOS: Readonly<Record<ScenarioKey, Scenario>>
export function paletteFor(key: ScenarioKey, appearance?: Appearance): Palette
export function buildScene(key?: ScenarioKey, appearance?: Appearance, motion?: boolean): string
