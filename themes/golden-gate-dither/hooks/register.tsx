import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Hud } from '../types'
import { makeColors } from './make-colors.js'

const SCENE = 'golden-gate'
type Appearance = 'auto' | 'light' | 'dark'

const EMPTY: Hud = {
  contextPercent: null,
  contextTokens: null,
  contextWindow: 0,
  agentsLive: 0,
  agentsTotal: 0,
  costUsd: null,
  fiveHourPercent: null,
}

const hud = atom({ plugin: 'golden-gate-dither', key: 'hud' } as const, EMPTY)
const appearance = atom({ plugin: 'golden-gate-dither', key: 'appearance' } as const, 'auto' as Appearance)

// ---------------------------------------------------------------------------
// Look: warm paper by day, lamp-lit paper by night, International Orange accent.

const { theme, problems } = makeColors({
  label: 'Golden Gate dither',
  roles: { accent: '#c4532f', danger: '#b3392f', success: '#4e7d3a', warning: '#a86f14', pro: '#6d4f94' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ebe1cd',
        'surface-1': '#f1e9d8',
        'surface-2': '#f7f1e4',
        'text-primary': '#221c16',
        'text-secondary': '#3f352a',
        'text-muted': '#463a2b',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1b1713',
        'surface-1': '#231e19',
        'surface-2': '#2b251f',
        'surface-3': '#332c25',
        'text-primary': '#f5eee2',
        'text-secondary': '#ded3c1',
        'text-muted': '#c6b89f',
      },
    },
  },
})

type Mode = 'scene' | 'image' | 'test'
const MODES: readonly Mode[] = ['scene', 'image', 'test']
const TEST_SCENE = 'golden-gate-test'

/** The look for each mode: the live animated scene, a still JPEG of it, or a plain test pattern. */
function lookFor(mode: Mode, scheme: Appearance): ThemeSetArgs {
  // Windows reduced transparency can turn the glass veil fully opaque.
  // Keep the scene visible without changing the user's OS appearance preferences.
  const glass = false as const
  const override = scheme === 'auto' ? {} : { overrideColorScheme: scheme }
  if (mode === 'image') return { colors: theme, overrideColorScheme: 'light', backdrop: { image: { source: 'golden-gate.jpg' } } }
  if (mode === 'test') return { colors: theme, ...override, backdrop: { scene: TEST_SCENE, glass } }
  return { colors: theme, ...override, backdrop: { scene: `${SCENE}-${scheme}`, glass } }
}

/** A loud, minimal SVG: if this doesn't show, the app isn't drawing Svg backdrops at all. */
const TEST_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
  '<rect width="1600" height="1000" fill="#c4532f"/><circle cx="800" cy="500" r="300" fill="#ece2ce"/>' +
  '<rect x="760" y="200" width="80" height="600" fill="#2a231c"/></svg>'

// ---------------------------------------------------------------------------
// Scene geometry. Everything snaps to a 6px grid so edges read as dithered pixels.

const G = 6
const snap = (v: number): number => Math.round(v / G) * G

const DECK_Y = 758
const WATER_Y = 822
const TOWERS = [570, 1030] as const
const TOWER_TOP = 452
const CABLE_TOP = 470

type Span = { x0: number; y0: number; x1: number; y1: number; sag: number }

const SPANS: Span[] = [
  { x0: 210, y0: DECK_Y, x1: TOWERS[0], y1: CABLE_TOP, sag: 34 },
  { x0: TOWERS[0], y0: CABLE_TOP, x1: TOWERS[1], y1: CABLE_TOP, sag: 232 },
  { x0: TOWERS[1], y0: CABLE_TOP, x1: 1390, y1: DECK_Y, sag: 34 },
]

function cableY(s: Span, x: number): number {
  const t = (x - s.x0) / (s.x1 - s.x0)
  return s.y0 + (s.y1 - s.y0) * t + s.sag * 4 * t * (1 - t)
}

/** Stair-stepped cable as one path of 5px squares, gaps filled on steep runs. */
function cablePath(): string {
  const seen = new Set<string>()
  let d = ''
  const square = (x: number, y: number): void => {
    const k = `${x},${y}`
    if (seen.has(k)) return
    seen.add(k)
    d += `M${x} ${y}h5v5h-5z`
  }
  for (const s of SPANS) {
    let prev: number | null = null
    for (let x = snap(s.x0); x <= s.x1; x += G) {
      const y = snap(cableY(s, x))
      if (prev !== null && Math.abs(y - prev) > G) {
        const step = y > prev ? G : -G
        for (let fill: number = prev + step; fill !== y; fill += step) square(x, fill)
      }
      square(x, y)
      prev = y
    }
  }
  return d
}

function suspenderPath(): string {
  let d = ''
  for (const s of SPANS) {
    for (let x = snap(s.x0) + 18; x < s.x1 - 6; x += 18) {
      const y = snap(cableY(s, x)) + G
      if (DECK_Y - y > 10) d += `M${x + 2} ${y}V${DECK_Y}`
    }
  }
  return d
}

function towerMarkup(cx: number): string {
  const legW = 14
  const left = cx - 28
  const right = cx + 14
  const parts: string[] = [
    `<rect x="${left}" y="${TOWER_TOP}" width="${legW}" height="${WATER_Y - TOWER_TOP}"/>`,
    `<rect x="${right}" y="${TOWER_TOP}" width="${legW}" height="${WATER_Y - TOWER_TOP}"/>`,
    // Art-deco stepped caps
    `<rect x="${left - 2}" y="${TOWER_TOP - 6}" width="${legW + 4}" height="6"/>`,
    `<rect x="${right - 2}" y="${TOWER_TOP - 6}" width="${legW + 4}" height="6"/>`,
    `<rect x="${left + 2}" y="${TOWER_TOP - 12}" width="${legW - 4}" height="6"/>`,
    `<rect x="${right + 2}" y="${TOWER_TOP - 12}" width="${legW - 4}" height="6"/>`,
  ]
  for (const y of [474, 540, 612, 690]) {
    parts.push(`<rect x="${left}" y="${y}" width="${right + legW - left}" height="${y === 474 ? 12 : 8}"/>`)
  }
  return `<g fill="url(#ob)">${parts.join('')}</g>` +
    `<rect x="${cx - 40}" y="${WATER_Y - 6}" width="80" height="14" fill="url(#sd)"/>`
}

const CLOUD_SHAPE =
  '<circle cx="48" cy="62" r="28"/><circle cx="92" cy="42" r="38"/><circle cx="142" cy="52" r="32"/>' +
  '<circle cx="182" cy="66" r="22"/><rect x="34" y="60" width="160" height="30" rx="15"/>'

// Static parts of the scene, built once per module load.
const BRIDGE = (() => {
  const towers = TOWERS.map(towerMarkup).join('')
  return `<g>` +
    `<path d="${suspenderPath()}" stroke="var(--orange)" stroke-width="2" stroke-dasharray="3 4" opacity=".55"/>` +
    towers +
    `<path d="${cablePath()}" fill="var(--orange)"/>` +
    `<rect x="180" y="${DECK_Y}" width="1240" height="10" fill="url(#ob)"/>` +
    `<rect x="180" y="${DECK_Y + 10}" width="1240" height="8" fill="url(#om)"/>` +
    `</g>`
})()

type Anim = { name: string; seconds: number; offset: number }

const ANIMS: Anim[] = [
  { name: 'sun', seconds: 26, offset: 4 },
  { name: 'cloudA', seconds: 136, offset: 0 },
  { name: 'cloudB', seconds: 104, offset: 40 },
  { name: 'cloudC', seconds: 60, offset: 10 },
  { name: 'cloudD', seconds: 88, offset: 60 },
  { name: 'fogA', seconds: 76, offset: 0 },
  { name: 'fogB', seconds: 96, offset: 30 },
  { name: 'gull', seconds: 27, offset: 0 },
  { name: 'water', seconds: 10, offset: 0 },
  { name: 'shimmer', seconds: 8, offset: 0 },
]

// SMIL, not CSS: the desktop app's SVG sandbox may drop <style>, and SMIL is what the
// working desktop Svg examples use. Each motion goes out and back (from → to → from).
const MOTION: Record<string, [string, string]> = {
  sun: ['0 0', '0 8'],
  cloudA: ['-70 0', '90 6'],
  cloudB: ['60 0', '-80 -6'],
  cloudC: ['-24 0', '30 4'],
  cloudD: ['40 4', '-50 0'],
  fogA: ['-60 0', '60 0'],
  fogB: ['50 0', '-70 0'],
  gull: ['0 0', '110 -12'],
  shimmer: ['-5 0', '5 0'],
}

/** One SMIL element for a named motion, phased by wall-clock time so a redraw continues mid-motion. */
function smil(name: string, nowSeconds: number, waterTravel = 48): string {
  const a = ANIMS.find(x => x.name === name)
  if (a === undefined) return ''
  if (name === 'water') {
    const begin = -((nowSeconds + a.offset) % a.seconds)
    return `<animate attributeName="stroke-dashoffset" values="0;-${waterTravel}" dur="${a.seconds}s" begin="${begin.toFixed(2)}s" repeatCount="indefinite"/>`
  }
  const m = MOTION[name]
  if (m === undefined) return ''
  const dur = a.seconds * 2
  const begin = -((nowSeconds + a.offset) % dur)
  return `<animateTransform attributeName="transform" type="translate" values="${m[0]};${m[1]};${m[0]}" keyTimes="0;.5;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" dur="${dur}s" begin="${begin.toFixed(2)}s" repeatCount="indefinite"/>`
}

/** Puts each named motion inside the elements that carry its class. */
function animate(svg: string, nowSeconds: number): string {
  return svg
    .replace(/<g class="([A-Za-z]+)"[^>]*>/g, (tag: string, name: string) => tag + smil(name, nowSeconds))
    .replace(/class="water" data-drift="(\d+)"\/>/g, (_tag: string, distance: string) => `class="water">${smil('water', nowSeconds, Number(distance))}</path>`)
}

// Resolve colors before sending the SVG: color-scheme media rules can freeze animation.
const LIGHT: Record<string, string> = {
  bg: '#ece2ce', bg2: '#e3d6bd', sand: '#c2ab85', sandd: '#a68d66',
  orange: '#c4532f', cloud: '#f5eee1', ink: '#2a231c',
}
const DARK: Record<string, string> = {
  bg: '#1b1713', bg2: '#231e19', sand: '#8c7b64', sandd: '#a08b70',
  orange: '#de875e', cloud: '#9b8d78', ink: '#f5eee2',
}
const DEFS = `
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--bg)"/><stop offset="1" stop-color="var(--bg2)"/></linearGradient>
<pattern id="ss" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="var(--sand)"/></pattern>
<pattern id="sl" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="var(--sand)"/></pattern>
<pattern id="sm" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="var(--sand)"/><rect x="6" y="6" width="3" height="3" fill="var(--sand)"/></pattern>
<pattern id="sd" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="var(--sandd)"/></pattern>
<pattern id="os" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="var(--orange)"/></pattern>
<pattern id="ol" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="var(--orange)"/></pattern>
<pattern id="om" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="var(--orange)"/></pattern>
<pattern id="ob" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="var(--orange)"/></pattern>
<clipPath id="under"><rect x="0" y="66" width="240" height="40"/></clipPath>
<clipPath id="water"><rect x="0" y="${WATER_Y}" width="1600" height="${1000 - WATER_Y}"/></clipPath>
</defs>`

const CLOUD = `<g fill="var(--cloud)">${CLOUD_SHAPE}</g><g fill="url(#ss)">${CLOUD_SHAPE}</g><g fill="url(#sm)" clip-path="url(#under)">${CLOUD_SHAPE}</g>`

const SHORE = `
<path d="M0 690 C90 658 170 656 260 690 C330 720 380 768 440 ${WATER_Y} L0 ${WATER_Y} Z" fill="url(#sl)"/>
<path d="M0 742 C120 710 230 732 330 780 L380 ${WATER_Y} L0 ${WATER_Y} Z" fill="url(#sm)"/>
<path d="M0 790 C100 766 200 790 260 ${WATER_Y} L0 ${WATER_Y} Z" fill="url(#sd)" opacity=".8"/>`

const LANDSCAPE = `
<path d="M0 ${snap(250)} Q 320 ${snap(236)} 640 ${snap(262)} T 1600 ${snap(246)}" fill="none" stroke="var(--sand)" stroke-width="3" stroke-dasharray="3 9" opacity=".35"/>
<path d="M0 676 C 260 640 420 700 700 690 S 1180 664 1600 688" fill="none" stroke="var(--sand)" stroke-width="3" stroke-dasharray="3 6" opacity=".7"/>
<path d="M0 712 C 300 690 520 744 820 730 S 1280 706 1600 734" fill="none" stroke="var(--sand)" stroke-width="3" stroke-dasharray="3 5" opacity=".55"/>
${SHORE}<g transform="translate(1600 0) scale(-1 1)">${SHORE}</g>`

const WATER = `
<g fill="none" stroke="var(--sand)" stroke-width="3">
<path d="M40 846 H560 M1040 846 H1560" stroke-dasharray="3 9" opacity=".75" class="water" data-drift="48"/>
<path d="M0 876 H420 M520 876 H1080 M1180 876 H1600" stroke-dasharray="3 6" opacity=".6" class="water" data-drift="45"/>
<path d="M120 912 H740 M860 912 H1480" stroke-dasharray="3 8" opacity=".55" class="water" data-drift="44"/>
<path d="M0 952 H1600" stroke-dasharray="3 5" opacity=".5" class="water" data-drift="48"/>
<path d="M0 988 H1600" stroke-dasharray="3 4" opacity=".45" class="water" data-drift="49"/>
</g>`

const SUN = `
<g class="sun">
<circle cx="800" cy="246" r="92" fill="url(#os)" opacity=".75"/>
<circle cx="800" cy="246" r="74" fill="url(#ol)"/>
<circle cx="800" cy="246" r="58" fill="url(#om)"/>
<circle cx="800" cy="246" r="44" fill="var(--orange)"/>
</g>`

const GULLS = `
<g class="gull" fill="var(--ink)" opacity=".55">
<path d="M730 392h3v3h3v-3h3v-3h-3v3h-3v-3h-3z"/>
<path d="M758 410h3v3h3v-3h3v-3h-3v3h-3v-3h-3z" opacity=".7"/>
</g>`

function cloud(cls: string, x: number, y: number, scale: number, opacity = 1): string {
  return `<g class="${cls}"><g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">${CLOUD}</g></g>`
}

// ---------------------------------------------------------------------------
// Readout, pinned top right: small, mono, low contrast.

function bar(x: number, y: number, percent: number): string {
  const cells = 12
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * cells)
  let out = ''
  for (let i = 0; i < cells; i++) {
    const on = i < filled
    const fill = on ? (percent >= 80 ? 'var(--ink)' : 'var(--orange)') : 'var(--sand)'
    const size = on ? 6 : 3
    const pad = on ? 0 : 1.5
    out += `<rect x="${x + i * 9 + pad}" y="${y + pad}" width="${size}" height="${size}" fill="${fill}"/>`
  }
  return out
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

/** Drawn in scene units, inset from the top-right so common window shapes keep it in view. */
function hudMarkup(h: Hud): string {
  const right = 1500
  const labelX = 1294
  let y = 112
  const rows: string[] = []
  const row = (label: string, value: string, extra = ''): void => {
    rows.push(
      `<text x="${labelX}" y="${y}" font-size="12" opacity=".5" letter-spacing=".08em">${label}</text>` +
        extra +
        `<text x="${right}" y="${y}" font-size="12" text-anchor="end" opacity=".72">${value}</text>`,
    )
    y += 22
  }

  const pct = h.contextPercent
  const ctxValue = pct === null ? '—' : `${Math.round(pct)}%`
  row('CONTEXT', ctxValue, pct === null ? '' : bar(1364, y - 8, pct))
  if (h.contextTokens !== null && h.contextWindow > 0) {
    rows.push(
      `<text x="${right}" y="${y - 6}" font-size="10" text-anchor="end" opacity=".38">${compact(h.contextTokens)} / ${compact(h.contextWindow)}</text>`,
    )
    y += 10
  }
  const agents = h.agentsLive > 0
    ? `${h.agentsLive} live · ${h.agentsTotal} run`
    : h.agentsTotal > 0 ? `idle · ${h.agentsTotal} run` : 'idle'
  const dot = h.agentsLive > 0
    ? `<rect x="${labelX - 12}" y="${y - 8}" width="5" height="5" fill="var(--orange)"><animate attributeName="opacity" values="1;.25;1" dur="2.4s" repeatCount="indefinite"/></rect>`
    : ''
  row('AGENTS', agents, dot)
  if (h.fiveHourPercent !== null) row('5H LIMIT', `${Math.round(h.fiveHourPercent)}%`)
  if (h.costUsd !== null) row('COST', `$${h.costUsd.toFixed(2)}`)

  rows.push(
    `<text x="${right}" y="${y + 4}" font-size="9.5" text-anchor="end" opacity=".3" letter-spacing=".06em">37.8199° N · 122.4783° W</text>`,
  )
  return `<g class="hud" fill="var(--ink)" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">${rows.join('')}</g>`
}

export function buildScene(h: Hud, nowSeconds: number, scheme: Appearance = 'auto'): string {
  const palette = scheme === 'dark' ? DARK : LIGHT
  // Bound artwork contrast everywhere, including narrow windows where the bridge
  // crosses the transcript. This does not depend on the app's opaque glass veil.
  const artworkOpacity = scheme === 'auto' ? 0.26 : scheme === 'dark' ? 0.32 : 0.24
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: ${scheme === 'auto' ? 'light dark' : scheme}" width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">` +
    DEFS +
    `<rect width="1600" height="1000" fill="url(#sky)"/>` +
    `<g opacity="${artworkOpacity}">` +
    cloud('cloudA', 260, 150, 0.9, 0.9) +
    cloud('cloudD', 40, 390, 0.55, 0.8) +
    cloud('cloudB', 1142, 150, 0.9, 0.9) +
    SUN +
    cloud('cloudC', 1438, 390, 0.55, 0.8) +
    `<g>` +
    LANDSCAPE +
    `<g clip-path="url(#water)"><g class="shimmer"><g transform="translate(0 ${WATER_Y * 2}) scale(1 -1)" opacity=".13">${BRIDGE}</g></g></g>` +
    BRIDGE +
    cloud('cloudC', 490, 548, 0.5, 0.85) +
    cloud('cloudD', 1000, 548, 0.5, 0.85) +
    WATER +
    cloud('fogA', 100, 770, 0.9, 0.85) +
    cloud('fogB', 672, 770, 1.15, 0.9) +
    cloud('fogA', 1302, 770, 0.9, 0.85) +
    `</g>` +
    GULLS +
    `</g>` +
    hudMarkup(h) +
    `</svg>`
  // light-dark() follows the embedding app's used color scheme live, including
  // Claude's explicit appearance choice, without the @media animation-freeze bug.
  return animate(svg, nowSeconds).replace(/var\(--([a-z0-9]+)\)/g, (_match: string, name: string) =>
    scheme === 'auto'
      ? `light-dark(${LIGHT[name] ?? '#000000'}, ${DARK[name] ?? '#000000'})`
      : palette[name] ?? '#000000')
}

// ---------------------------------------------------------------------------
// Live figures.

async function refresh($: EngineInterface): Promise<void> {
  const usage = await $.session.usage()
  const five = usage.rateLimits.find(r => r.kind === 'five_hour')
  const prev = await read($, hud)
  const next: Hud = {
    ...prev,
    contextPercent: usage.context.percent ?? null,
    contextTokens: usage.context.tokens ?? null,
    contextWindow: usage.context.window,
    costUsd: usage.cost?.usd ?? null,
    fiveHourPercent: five?.percentUsed ?? null,
  }
  const isSame =
    prev.contextPercent === next.contextPercent &&
    prev.contextWindow === next.contextWindow &&
    prev.fiveHourPercent === next.fiveHourPercent &&
    (prev.costUsd ?? 0).toFixed(2) === (next.costUsd ?? 0).toFixed(2)
  if (!isSame) await update($, hud, () => next)
}

/** Sets the look for a mode and says whether a window draws it. */
async function setLook($: EngineInterface, mode: Mode): Promise<string> {
  const scheme = await read($, appearance)
  const look = lookFor(mode, scheme)
  const set = await $.theme.set(look)
  return set.isDrawn ? `drawn (${mode})` : `not drawn (${mode}): ${set.reason}`
}

export const register: Register = on => {
  let lastSet = 'theme not set yet'
  let renders = 0
  let lastRender = 'none'
  let mode: Mode = 'scene'


  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)

    // A new session (not a reload) starts the agent count over.
    await update($, hud, h => ({ ...h, agentsLive: 0 }))
    if ((await $.store.get('off')) !== true) {
      lastSet = await setLook($, mode)
      if (!lastSet.startsWith('drawn') && e.surface !== 'terminal') $.ui.toast(`golden-gate: backdrop ${lastSet}`)
    } else {
      lastSet = 'disabled'
    }
    await refresh($)
    await $.command.register({
      name: 'golden-gate',
      description: 'Follow Claude appearance automatically, optionally choose dark or light, or inspect the backdrop',
      argumentHint: 'on | off | auto | dark | light | scene | image | test | status',
    })
    await $.tool.register({
      name: 'golden_gate_status',
      description: 'Reports whether the golden-gate-dither backdrop is set and drawn, for debugging the mod.',
      isDeferred: true,
    })
    return next(e)
  })

  on('tool.call', { tool: 'mcp__golden-gate-dither__golden_gate_status' }, async ($) => {
    const surfaces = await $.session.surfaces()
    return { result: JSON.stringify({ mode, theme: lastSet, backdropRenders: renders, lastRender, surfaces, hud: await read($, hud) }) }
  })

  on('command.run', { command: 'golden-gate' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    if (asked === 'off') {
      await $.store.set('off', true)
      await $.theme.clear()
      lastSet = 'disabled'
      return { text: 'Golden Gate is off. Use /golden-gate on to enable it again.' }
    }
    if (asked === 'on' || asked === '') {
      await $.store.delete('off')
      lastSet = await setLook($, mode)
      return { text: `Golden Gate is on (${lastSet}).` }
    }
    if (asked === 'status') return { text: JSON.stringify({ mode, appearance: await read($, appearance), lastSet, renders, lastRender, surfaces: await $.session.surfaces() }) }
    if (asked === 'auto' || asked === 'dark' || asked === 'light') {
      await $.store.delete('off')
      await update($, appearance, () => asked)
      mode = 'scene'
      lastSet = await setLook($, mode)
      return { text: asked === 'auto' ? `Golden Gate now follows Claude's appearance automatically (${lastSet}).` : `Golden Gate: ${asked} mode with a softened animated background (${lastSet}).` }
    }
    if (!MODES.includes(asked as Mode)) {
      return { text: `Backdrop is "${mode}". Use /golden-gate on or off; auto follows Claude's appearance. Dark, light, image, test, and status are also available.` }
    }
    mode = asked as Mode
    await $.store.delete('off')
    lastSet = await setLook($, mode)
    return { text: `Golden Gate backdrop: ${mode} (${lastSet}).` }
  })

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    await update($, hud, h => ({ ...h, agentsLive: h.agentsLive + 1, agentsTotal: h.agentsTotal + 1 }))
    try {
      return await next(e)
    } finally {
      await update($, hud, h => ({ ...h, agentsLive: Math.max(0, h.agentsLive - 1) }))
      await refresh($)
    }
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    lastRender = JSON.stringify({ surface: e.surface, props: e.props })
    if (e.props.plugin !== $.plugin.name) return next(e)
    // Newer engines name the scene `scene`, older ones `id`; read either, as theme-examples does.
    const name = e.props.scene ?? (e.props as { id?: string }).id
    if (name !== SCENE && name !== `${SCENE}-auto` && name !== `${SCENE}-light` && name !== `${SCENE}-dark` && name !== TEST_SCENE) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)

    renders += 1
    const { Svg } = $.ui.resolve(e)
    if (name === TEST_SCENE) {
      return Svg({ source: TEST_SVG, alt: 'Backdrop test pattern' })
    }
    // Not named `h`: JSX compiles to calls to the global `h`.
    const stats = await read($, hud)
    const now = (await $.clock.now()) / 1000
    return Svg({
      source: buildScene(stats, now, name === `${SCENE}-light` ? 'light' : name === `${SCENE}-dark` ? 'dark' : 'auto'),
      alt: 'A dithered Golden Gate Bridge at sunset with drifting clouds, and a small readout of context use and agents',
      isInteractive: true,
    })
  })
}
