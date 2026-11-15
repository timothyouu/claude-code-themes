const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { root, plugin, loadTheme } = require('../scripts/load-theme.cjs');

const HUD = {
  contextPercent: 42, contextTokens: 84000, contextWindow: 200000,
  agentsLive: 0, agentsTotal: 2, costUsd: 1.23, fiveHourPercent: 12,
};

function engine(store = new Map()) {
  const sets = [];
  const commands = [];
  const $ = {
    atoms: new Map(), plugin: { name: 'golden-gate-dither' },
    theme: { set: async value => { sets.push(value); return { isDrawn: true }; }, clear: async () => { $.clears++; } },
    store: { get: async key => store.get(key), set: async (key, value) => store.set(key, value), delete: async key => store.delete(key) },
    session: { usage: async () => ({ context: { percent: 42, tokens: 84000, window: 200000 }, rateLimits: [] }), surfaces: async () => ['desktop'] },
    command: { register: async value => commands.push(value) }, tool: { register: async () => {} },
    ui: { toast: () => {}, resolve: () => ({ Svg: props => ({ type: 'Svg', props }) }) },
    clock: { now: async () => 100000 }, clears: 0,
  };
  return { $, sets, commands };
}

function hooks(register) {
  const handlers = new Map();
  register((event, matcher, handler) => {
    const fn = handler ?? matcher;
    const key = `${event}:${typeof matcher === 'function' ? '' : matcher.command ?? matcher.component ?? matcher.tool ?? ''}`;
    handlers.set(key, fn);
  });
  return handlers;
}

test('marketplace points at a complete, version-matched plugin', () => {
  const market = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/marketplace.json')));
  const manifest = JSON.parse(fs.readFileSync(path.join(plugin, '.claude-plugin/plugin.json')));
  const entry = market.plugins.find(item => item.name === manifest.name);
  assert.equal(path.resolve(root, entry.source), plugin);
  assert.equal(entry.version, manifest.version);
  const modules = JSON.parse(fs.readFileSync(path.join(plugin, 'hooks/hooks.json'))).modules;
  for (const file of modules) assert(fs.existsSync(path.join(plugin, 'hooks', file)));
  assert(fs.existsSync(path.join(plugin, 'LICENSE')));
  assert(fs.existsSync(path.join(plugin, 'README.md')));
});

test('automatic startup leaves appearance under Claude control', async () => {
  const mod = await loadTheme();
  const { $, sets, commands } = engine();
  await hooks(mod.register).get('session.start:')($, { surface: 'desktop' }, async () => 'started');
  assert.equal(sets.length, 1);
  assert.equal(sets[0].backdrop.scene, 'golden-gate-auto');
  assert.equal(sets[0].backdrop.glass, false);
  assert(!Object.hasOwn(sets[0], 'overrideColorScheme'));
  assert.equal(commands[0].name, 'golden-gate');
});

test('off survives a new session; on and auto enable the theme again', async () => {
  const mod = await loadTheme();
  const store = new Map();
  const first = engine(store);
  const firstHooks = hooks(mod.register);
  await firstHooks.get('session.start:')(first.$, { surface: 'desktop' }, async () => {});
  await firstHooks.get('command.run:golden-gate')(first.$, { args: 'off' });
  assert.equal(store.get('off'), true);
  assert.equal(first.$.clears, 1);
  const second = engine(store);
  const secondHooks = hooks(mod.register);
  await secondHooks.get('session.start:')(second.$, { surface: 'desktop' }, async () => {});
  assert.equal(second.sets.length, 0);
  await secondHooks.get('command.run:golden-gate')(second.$, { args: 'on' });
  assert(!store.has('off'));
  assert.equal(second.sets.at(-1).backdrop.scene, 'golden-gate-auto');
  await secondHooks.get('command.run:golden-gate')(second.$, { args: 'dark' });
  assert.equal(second.sets.at(-1).overrideColorScheme, 'dark');
  await secondHooks.get('command.run:golden-gate')(second.$, { args: 'auto' });
  assert(!Object.hasOwn(second.sets.at(-1), 'overrideColorScheme'));
});

test('backdrop ignores other plugins and preserves animated SVG output', async () => {
  const mod = await loadTheme();
  const { $ } = engine();
  const render = hooks(mod.register).get('ui.render:Backdrop');
  const own = { surface: 'desktop', props: { plugin: 'golden-gate-dither', scene: 'golden-gate-auto' } };
  const result = await render($, own, async () => 'next');
  assert.equal(result.type, 'Svg');
  assert.equal(result.props.isInteractive, true);
  assert(result.props.source.includes('light-dark('));
  assert(result.props.source.includes('<animateTransform'));
  assert.equal(await render($, { ...own, props: { ...own.props, plugin: 'other' } }, async () => 'next'), 'next');
  assert.equal(await render($, { ...own, surface: 'terminal' }, async () => 'next'), 'next');
});

test('all palettes preserve motion; water loops have no dash discontinuity', async () => {
  const { buildScene } = await loadTheme();
  for (const appearance of ['auto', 'dark', 'light']) {
    const svg = buildScene(HUD, 100, appearance);
    assert(svg.includes('<animateTransform'));
    assert(!svg.includes('@media'));
    assert(!svg.includes('shape-rendering'));
    assert(!svg.includes('var(--'));
    assert(!svg.includes('class="pan"'));
    assert.notEqual(svg, buildScene(HUD, 110, appearance));
    const rows = [...svg.matchAll(/<path[^>]*stroke-dasharray="(\d+) (\d+)"[^>]*class="water"><animate[^>]*values="0;-(\d+)"/g)];
    assert.equal(rows.length, 5);
    for (const row of rows) assert.equal(Number(row[3]) % (Number(row[1]) + Number(row[2])), 0);
  }
});

test('bridge stays centered and fits typical wide and narrow crops', async () => {
  const { TOWERS, SPANS } = await loadTheme();
  assert.equal(TOWERS[0] + TOWERS[1], 1600);
  assert.equal(SPANS[0].x0 + SPANS[2].x1, 1600);
  assert.equal(SPANS[0].y0, SPANS[2].y1);
  for (const aspect of [0.65, 1, 1.6, 2.2]) {
    const visibleWidth = Math.min(1600, 1000 * aspect);
    const left = (1600 - visibleWidth) / 2;
    assert(TOWERS[0] - 40 >= left);
    assert(TOWERS[1] + 40 <= 1600 - left);
  }
});

function luminance(hex) {
  const c = hex.match(/[a-f0-9]{2}/gi).map(x => parseInt(x, 16) / 255)
    .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}

test('authored text anchors retain 4.5:1 contrast over worst-case artwork', () => {
  const bound = (base, artwork, opacity) => '#' + base.match(/[a-f0-9]{2}/gi)
    .map((x, i) => Math.ceil(parseInt(x, 16) * (1 - opacity) + artwork[i] * opacity).toString(16).padStart(2, '0')).join('');
  for (const opacity of [0.26, 0.32]) {
    const background = bound('#231e19', [222, 141, 120], opacity);
    for (const text of ['#f5eee2', '#ded3c1', '#c6b89f']) assert((luminance(text) + 0.05) / (luminance(background) + 0.05) >= 4.5);
  }
  for (const opacity of [0.24, 0.26]) {
    const background = bound('#e3d6bd', [42, 35, 28], opacity);
    for (const text of ['#221c16', '#3f352a', '#463a2b']) assert((luminance(background) + 0.05) / (luminance(text) + 0.05) >= 4.5);
  }
});
