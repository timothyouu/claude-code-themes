import type { EngineInterface, Register, ThemeColors, ThemeSetArgs } from 'claude-code'
import type { Appearance, Preferences, ScenarioKey } from '../types'
import { makeColors } from './make-colors.js'
import { SCENARIOS, buildScene, paletteFor } from './scene.mjs'

const PREFIX = 'clawd-scenarios'
const STORE_KEY = 'preferences'
const DEFAULTS: Preferences = { scene: 'coffee', appearance: 'auto', enabled: true, motion: true }
const KEYS = Object.keys(SCENARIOS) as ScenarioKey[]
const colors = new Map<ScenarioKey, ThemeColors>()

function isScene(value: unknown): value is ScenarioKey {
  return typeof value === 'string' && Object.hasOwn(SCENARIOS, value)
}

/** Ignore stale or malformed store fields independently, preserving valid choices. */
function validPreferences(value: unknown): Preferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ...DEFAULTS }
  const stored = value as Record<string, unknown>
  return {
    scene: isScene(stored.scene) ? stored.scene : DEFAULTS.scene,
    appearance: stored.appearance === 'light' || stored.appearance === 'dark' || stored.appearance === 'auto' ? stored.appearance : DEFAULTS.appearance,
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : DEFAULTS.enabled,
    motion: typeof stored.motion === 'boolean' ? stored.motion : DEFAULTS.motion,
  }
}

async function preferences($: EngineInterface): Promise<Preferences> {
  return validPreferences(await $.store.get(STORE_KEY))
}

function lift(hex: string, amount: number): string {
  return '#' + [1, 3, 5].map(offset => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16)
    return Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0')
  }).join('')
}

function themeFor(key: ScenarioKey): ThemeColors {
  const cached = colors.get(key)
  if (cached !== undefined) return cached
  const light = paletteFor(key, 'light')
  const dark = paletteFor(key, 'dark')
  const { theme } = makeColors({
    label: `Clawd · ${SCENARIOS[key].title}`,
    roles: { accent: SCENARIOS[key].accent, danger: '#ae3c38', success: '#426d48', warning: '#94651d', pro: '#73538b' },
    light: { gray: { anchors: {
      'surface-0': light.bg, 'surface-1': lift(light.bg, .2), 'surface-2': lift(light.bg, .4),
      'text-primary': light.ink, 'text-secondary': light.ink, 'text-muted': light.soft,
    } } },
    dark: { gray: { anchors: {
      'surface-0': dark.bg, 'surface-1': lift(dark.bg, .025), 'surface-2': lift(dark.bg, .05), 'surface-3': lift(dark.bg, .075),
      'text-primary': dark.ink, 'text-secondary': dark.ink, 'text-muted': dark.soft,
    } } },
  })
  colors.set(key, theme)
  return theme
}

function sceneId(p: Preferences): string {
  return `${PREFIX}-${p.scene}-${p.appearance}-${p.motion ? 'motion' : 'still'}`
}

function lookFor(p: Preferences): ThemeSetArgs {
  const override = p.appearance === 'auto' ? {} : { overrideColorScheme: p.appearance }
  return { colors: themeFor(p.scene), ...override, backdrop: { scene: sceneId(p), glass: false } }
}

function parseSceneId(value: unknown): Preferences | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith(PREFIX + '-')) return null
  const [scene, appearance, motion, ...extra] = value.slice(PREFIX.length + 1).split('-')
  if (!isScene(scene) || extra.length > 0) return null
  if (appearance !== 'auto' && appearance !== 'light' && appearance !== 'dark') return null
  if (motion !== 'motion' && motion !== 'still') return null
  return { scene, appearance, enabled: true, motion: motion === 'motion' }
}

async function apply($: EngineInterface, p: Preferences): Promise<string> {
  if (!p.enabled) {
    await $.theme.clear()
    return 'off'
  }
  const result = await $.theme.set(lookFor(p))
  return result.isDrawn ? 'drawn' : `not drawn: ${result.reason}`
}

const HELP = `Use /clawd-scene ${KEYS.join(' | ')}; auto | light | dark; on | off; still | motion; status. Combine choices, for example /clawd-scene kite dark still.`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'clawd-scene',
      description: 'Choose a Clawd scene, appearance, and motion',
      argumentHint: '<scene> [auto|light|dark] [on|off] [still|motion]',
    })
    const p = await preferences($)
    if (p.enabled) {
      const status = await apply($, p)
      if (status !== 'drawn' && e.surface !== 'terminal') $.ui.toast(`Clawd scenarios: ${status}`)
    }
    return next(e)
  })

  on('command.run', { command: 'clawd-scene' }, async ($, e) => {
    const tokens = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const current = await preferences($)
    if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === 'help')) return { text: HELP }
    if (tokens.length === 1 && tokens[0] === 'status') {
      return { text: `Clawd: ${current.scene}, ${current.appearance}, ${current.motion ? 'motion' : 'still'}, ${current.enabled ? 'on' : 'off'}.` }
    }
    const next = { ...current }
    for (const token of tokens) {
      if (isScene(token)) { next.scene = token; next.enabled = true }
      else if (token === 'auto' || token === 'light' || token === 'dark') { next.appearance = token; next.enabled = true }
      else if (token === 'still' || token === 'motion') next.motion = token === 'motion'
      else if (token === 'on' || token === 'off') next.enabled = token === 'on'
      else return { text: `Unknown choice "${token}". ${HELP}` }
    }
    await $.store.set(STORE_KEY, next)
    const status = await apply($, next)
    return { text: `Clawd: ${SCENARIOS[next.scene].title}, ${next.appearance}, ${next.motion ? 'motion' : 'still'} (${status}).` }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const p = parseSceneId(e.props.scene ?? (e.props as { id?: string }).id)
    if (p === null || !(await preferences($)).enabled) return next(e)
    const { Svg } = $.ui.resolve(e)
    return Svg({
      source: buildScene(p.scene, p.appearance, p.motion),
      alt: SCENARIOS[p.scene].description,
      isInteractive: true,
    })
  })
}
