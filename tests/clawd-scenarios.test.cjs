const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '..');
const plugin = path.join(root, 'themes/clawd-scenarios');
const expected = ['coffee', 'heart', 'headphones', 'skateboard', 'wand', 'lightbulb', 'magnifier', 'dizzy', 'book', 'bubble', 'cape', 'kite'];

async function loadTheme() {
  const source = fs.readFileSync(path.join(plugin, 'hooks/register.tsx'), 'utf8');
  const executable = stripTypeScriptTypes(source.replace(/^import .*$/gm, '').replace(/^export /gm, ''));
  const { makeColors, checkColors } = await import(pathToFileURL(path.join(plugin, 'hooks/make-colors.js')));
  const scene = await import(pathToFileURL(path.join(plugin, 'hooks/scene.mjs')));
  return new Function('makeColors', 'SCENARIOS', 'buildScene', 'paletteFor',
    executable + '\nreturn { register, themeFor, lookFor, validPreferences };'
  )(makeColors, scene.SCENARIOS, scene.buildScene, scene.paletteFor);
}

function engine(store = new Map()) {
  const sets = [];
  const commands = [];
  const $ = {
    plugin: { name: 'clawd-scenarios' }, clears: 0,
    theme: { set: async value => { sets.push(value); return { isDrawn: true }; }, clear: async () => { $.clears++; } },
    store: { get: async key => store.get(key), set: async (key, value) => store.set(key, value) },
    command: { register: async value => commands.push(value) },
    ui: { toast: () => {}, resolve: () => ({ Svg: props => ({ type: 'Svg', props }) }) },
  };
  return { $, sets, commands, store };
}

function hooks(register) {
  const handlers = new Map();
  register((event, matcher, handler) => {
    const key = event + ':' + (typeof matcher === 'function' ? '' : matcher.command ?? matcher.component ?? '');
    handlers.set(key, handler ?? matcher);
  });
  return handlers;
}
const next = async () => 'continued';
const start = async (h, e) => h.get('session.start:')(e.$, { surface: 'desktop' }, next);
const command = async (h, e, args) => h.get('command.run:clawd-scene')(e.$, { args });

test('Clawd plugin registers a complete, self-contained module', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(plugin, '.claude-plugin/plugin.json')));
  assert.equal(manifest.name, 'clawd-scenarios');
  const modules = JSON.parse(fs.readFileSync(path.join(plugin, 'hooks/hooks.json'))).modules;
  for (const file of modules) assert(fs.existsSync(path.join(plugin, 'hooks', file)));
  for (const file of ['LICENSE', 'README.md', 'hooks/scene.mjs', 'hooks/primitives.mjs', 'hooks/scenes-a.mjs', 'hooks/scenes-b.mjs']) {
    assert(fs.existsSync(path.join(plugin, file)), file);
  }
});

test('startup applies scene and complete colors without overriding automatic appearance', async () => {
  const mod = await loadTheme();
  const e = engine();
  await start(hooks(mod.register), e);
  assert.equal(e.commands[0].name, 'clawd-scene');
  assert.equal(e.sets.length, 1);
  assert.equal(e.sets[0].backdrop.scene, 'clawd-scenarios-coffee-auto-motion');
  assert.equal(e.sets[0].backdrop.glass, false);
  assert(e.sets[0].colors);
  assert(!Object.hasOwn(e.sets[0], 'overrideColorScheme'));
});

test('all twelve scene switches apply colors and backdrop and persist across sessions', async () => {
  const mod = await loadTheme();
  const store = new Map();
  const e = engine(store);
  const h = hooks(mod.register);
  await start(h, e);
  for (const key of expected) {
    await command(h, e, key + ' dark still');
    assert.equal(e.sets.at(-1).backdrop.scene, 'clawd-scenarios-' + key + '-dark-still');
    assert.equal(e.sets.at(-1).overrideColorScheme, 'dark');
    assert(e.sets.at(-1).colors);
    assert.match(e.sets.at(-1).backdrop.scene, /^[A-Za-z0-9_-]{1,64}$/);
    assert.equal(store.get('preferences').scene, key);
  }
  assert.notDeepEqual(e.sets[1].colors, e.sets[2].colors);
  const restart = engine(store);
  await start(hooks(mod.register), restart);
  assert.equal(restart.sets[0].backdrop.scene, 'clawd-scenarios-kite-dark-still');
  await command(hooks(mod.register), restart, 'auto motion');
  assert(!Object.hasOwn(restart.sets.at(-1), 'overrideColorScheme'));
  assert.equal(restart.sets.at(-1).backdrop.scene, 'clawd-scenarios-kite-auto-motion');
});

test('all scenes match native footer colors and reserve composer clearance', async () => {
  const mod=await loadTheme();
  const { paletteFor, buildScene }=await import(pathToFileURL(path.join(plugin,'hooks/scene.mjs')));
  for(const scene of expected) for(const appearance of ['light','dark','auto']){
    const look=mod.lookFor({scene,appearance,motion:true,enabled:true});
    assert.equal(look.backdrop.glass, false);
    const svg=buildScene(scene,appearance,true);
    assert.match(svg,/composer-blend/);
    assert.match(svg,/viewBox="-150 20 320 1000"/);
    assert.match(svg,/viewBox="-60 20 320 1000"/);
    assert.equal(look.colors.inputs.light['gray-20'].toLowerCase(),paletteFor(scene,'light').wallmid);
    assert.equal(look.colors.inputs.dark['gray-900'].toLowerCase(),paletteFor(scene,'dark').wallmid);
    assert.equal(look.colors.inputs.light['gray-10'].toLowerCase(),paletteFor(scene,'light').wallmid);
    assert.equal(look.colors.inputs.dark['gray-850'].toLowerCase(),paletteFor(scene,'dark').wallmid);
    assert.equal(look.overrideColorScheme,appearance==='auto'?undefined:appearance);
  }
});

test('off survives restart; on preserves scene, appearance and motion', async () => {
  const mod = await loadTheme();
  const store = new Map();
  const e = engine(store);
  const h = hooks(mod.register);
  await command(h, e, 'book light still');
  await command(h, e, 'off');
  assert.equal(e.$.clears, 1);
  const restart = engine(store);
  const rh = hooks(mod.register);
  await start(rh, restart);
  assert.equal(restart.sets.length, 0);
  await command(rh, restart, 'on');
  assert.equal(restart.sets[0].backdrop.scene, 'clawd-scenarios-book-light-still');
});

test('invalid preferences are defensive and invalid commands do not partially mutate', async () => {
  const mod = await loadTheme();
  for (const stored of [null, [], 'coffee', 1, { scene: '__proto__', appearance: 'blue', motion: 'true', enabled: 'false' }]) {
    assert.deepEqual(mod.validPreferences(stored), { scene: 'coffee', appearance: 'auto', motion: true, enabled: true });
  }
  const e = engine(new Map([['preferences', { scene: 'heart', appearance: 'dark', motion: false, enabled: false }]]));
  const result = await command(hooks(mod.register), e, 'kite invalid');
  assert.match(result.text, /Unknown choice/);
  assert.equal(e.store.get('preferences').scene, 'heart');
  assert.equal(e.sets.length, 0);
});

test('backdrop guards ownership, scene ID, surface and off state; enables live SVG SMIL', async () => {
  const mod = await loadTheme();
  const e = engine();
  const render = hooks(mod.register).get('ui.render:Backdrop');
  const own = { surface: 'desktop', props: { plugin: 'clawd-scenarios', scene: 'clawd-scenarios-coffee-auto-motion' } };
  for (const surface of ['desktop', 'mobile']) {
    const result = await render(e.$, { ...own, surface }, next);
    assert.equal(result.type, 'Svg');
    assert.equal(result.props.isInteractive, true);
    assert.match(result.props.source, /<animate/);
    assert.match(result.props.source, /light-dark\(/);
  }
  const legacy = await render(e.$, { surface: 'desktop', props: { plugin: 'clawd-scenarios', id: own.props.scene } }, next);
  assert.equal(legacy.type, 'Svg');
  for (const event of [
    { ...own, props: { ...own.props, plugin: 'foreign' } },
    { ...own, surface: 'terminal' },
    { ...own, props: { ...own.props, scene: 'clawd-scenarios-missing-auto-motion' } },
    { ...own, props: { ...own.props, scene: 'clawd-scenarios-coffee-auto-motion-bad' } },
  ]) assert.equal(await render(e.$, event, next), 'continued');
  await command(hooks(mod.register), e, 'off');
  assert.equal(await render(e.$, own, next), 'continued');
});

function luminance(hex) {
  const c = hex.match(/[a-f0-9]{2}/gi).map(x => parseInt(x, 16) / 255)
    .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

test('all scenes have resolved live motion and distinct readable light/dark palettes', async () => {
  const { SCENARIOS, buildScene, paletteFor } = await import(pathToFileURL(path.join(plugin, 'hooks/scene.mjs')));
  const { checkColors } = await import(pathToFileURL(path.join(plugin, 'hooks/make-colors.js')));
  const mod = await loadTheme();
  assert.deepEqual(Object.keys(SCENARIOS), expected);
  for (const key of expected) {
    assert(SCENARIOS[key].title && SCENARIOS[key].description);
    assert.notEqual(SCENARIOS[key].light, SCENARIOS[key].dark);
    assert(contrast(SCENARIOS[key].light, SCENARIOS[key].dark) >= 8, key + ': distinct modes');
    assert.deepEqual(checkColors(mod.themeFor(key)).filter(x => x.startsWith("Desktop won't paint")), []);
    for (const scheme of ['light', 'dark', 'auto']) {
      const svg = buildScene(key, scheme, true);
      assert(svg.startsWith('<svg'));
      assert.match(svg, /<animate/);
      assert(!svg.includes('var(--'));
      assert(!svg.includes('@media'));
      assert(!svg.includes('<style'));
      assert(!buildScene(key, scheme, false).includes('<animate'));
    }
    for (const scheme of ['light', 'dark']) {
      const p = paletteFor(key, scheme);
      assert(contrast(p.ink, p.bg) >= 4.5, key + ': primary ' + scheme);
      assert(contrast(p.soft, p.bg) >= 4.5, key + ': muted ' + scheme);
    }
  }
});


test('continuous gradient wall stays behind protected chat furniture', async () => {
  const { paletteFor, buildScene } = await import(pathToFileURL(path.join(plugin, 'hooks/scene.mjs')));
  const channels = color => color.match(/[a-f0-9]{2}/gi).map(value => parseInt(value,16));
  const hex = values => '#' + values.map(value => Math.round(value).toString(16).padStart(2,'0')).join('');
  for (const key of expected) for (const scheme of ['light','dark']) {
    const palette = paletteFor(key,scheme);
    const svg = buildScene(key,scheme,true);
    assert(!svg.includes('room-print') && !svg.includes('wall-print'), 'no dotted wallpaper');
    assert.match(svg, /<linearGradient id="room-wall"/);
    for (const layer of ['wall','cool','rose','floor','corner']) assert(svg.includes(`width="100%" height="100%" fill="url(#room-${layer})"`));
    assert.match(svg, /<g mask="url\(#chat-protection\)"><svg x="0"/);
    assert.match(svg, /<rect x="-340" width="680" height="100%" fill="black" opacity=".80"/);
    assert.match(svg, /<svg x="0" y="0" width="38%"/);
    assert.match(svg, /<svg x="62%" y="0" width="38%"/);
    assert.match(svg, /viewBox="-150 20 320 1000"/);
    assert.match(svg, /viewBox="-60 20 320 1000"/);
    // Bound every possible continuous-lighting color, then allow 20% extreme
    // artwork through the mask. Peaks are conservatively allowed to coincide.
    const walls = ['walltop','wallmid','wallbottom'].map(role => channels(palette[role]));
    const extreme = scheme === 'light' ? Math.min : Math.max;
    let bound = walls[0].map((_,index) => extreme(...walls.map(wall => wall[index])));
    for (const [role,alpha] of [['glowcool',.22],['glowrose',.15],['glowfloor',.22],['shade',.10]]) {
      const color=channels(palette[role]);
      bound=bound.map((value,index) => extreme(value,value*(1-alpha)+color[index]*alpha));
    }
    const backdrop=hex(bound.map(value => value*.8+(scheme==='light'?0:255)*.2));
    for (const role of ['ink','soft']) assert(contrast(palette[role],backdrop)>=4.5, key+' '+scheme+' '+role+' gradient overlap contrast');
  }
});

test('self-contained gallery contains current twelve-scene appearance and motion variants', async () => {
  const html = fs.readFileSync(path.join(root, 'assets/clawd-scenarios/preview.html'), 'utf8');
  const data = JSON.parse(html.match(/<script type="application\/json" id="scene-data">([\s\S]*?)<\/script>/)[1]);
  const { buildScene } = await import(pathToFileURL(path.join(plugin, 'hooks/scene.mjs')));
  assert.deepEqual(Object.keys(data), expected);
  for (const key of expected) for (const appearance of ['light', 'dark']) for (const motion of [true, false]) {
    assert.equal(data[key].sources[appearance][motion ? 'motion' : 'still'], buildScene(key, appearance, motion));
  }
  assert(html.includes('Sample conversation · Preview only'));
  for (const control of ['light', 'dark', 'motion', 'chat', 'download', 'scene-select', 'scene-list']) {
    assert(html.includes('id="' + control + '"'));
  }
});

test('window rain travels visibly within clipped glass instead of barely drifting', async () => {
  const { sceneMotion } = await import(pathToFileURL(path.join(plugin, 'hooks/motion.mjs')));
  for (const [scene, side] of [['coffee', 'left'], ['magnifier', 'left'], ['magnifier', 'right']]) {
    const source = sceneMotion(scene, side);
    assert(source.includes('<clipPath'), scene + ': rain must stay inside the glass');
    assert(source.includes('data-effect="window-rain"'));
    const falls = [...source.matchAll(/<animateTransform[^>]*to="0 ([\d.]+)"[^>]*dur="([\d.]+)s"/g)];
    assert.equal(falls.length, 2, scene + ': separate near and far rain layers');
    for (const [, distance, seconds] of falls) {
      const speed = Number(distance) / Number(seconds);
      assert(speed >= 30 && speed <= 140, scene + ': visible, restrained rainfall speed');
    }
  }
});

test('mascot blinks and an obvious rider translation accompany motion mode only', async () => {
  const { buildScene } = await import(pathToFileURL(path.join(plugin, 'hooks/scene.mjs')));
  const coffee = buildScene('coffee', 'light', true);
  assert(coffee.includes('data-detail="mascot-blink"'));
  assert(!buildScene('coffee', 'light', false).includes('data-detail="mascot-blink"'));
  const skate = buildScene('skateboard', 'dark', true);
  const rider = skate.match(/data-actor="skateboard-rider">(<animateTransform[^>]+>)/);
  assert(rider, 'only the independent rider receives its travel transform');
  const travel = rider[1].match(/values="([^"]+)"/)[1].split(';').map(pair => Number(pair.split(' ')[0]));
  const seconds = Number(rider[1].match(/dur="([\d.]+)s"/)[1]);
  assert(Math.max(...travel) - Math.min(...travel) >= 50, 'rider covers a visible local distance');
  assert(seconds >= 6 && seconds <= 14, 'rider crosses within a short glance');
});


test('dedicated light and dark commands work for every scene and preserve motion', async () => {
  const mod=await loadTheme();
  const e=engine();
  const h=hooks(mod.register);
  await start(h,e);
  assert.deepEqual(e.commands.map(value=>value.name),['clawd-scene','clawd-light','clawd-dark']);
  for(const mode of ['light','dark']) for(const scene of expected){
    await h.get('command.run:clawd-'+mode)(e.$,{args:scene+' still'});
    assert.equal(e.sets.at(-1).overrideColorScheme,mode);
    assert.equal(e.sets.at(-1).backdrop.scene,`clawd-scenarios-${scene}-${mode}-still`);
    assert.deepEqual(e.store.get('preferences'),{scene,appearance:mode,motion:false,enabled:true});
  }
  await h.get('command.run:clawd-light')(e.$,{args:''});
  assert.equal(e.store.get('preferences').scene,'kite');
  assert.equal(e.store.get('preferences').motion,false);
  const previous=structuredClone(e.store.get('preferences'));
  const count=e.sets.length;
  const invalid=await h.get('command.run:clawd-dark')(e.$,{args:'coffee wrong'});
  assert.match(invalid.text,/Use \/clawd-dark/);
  assert.deepEqual(e.store.get('preferences'),previous);
  assert.equal(e.sets.length,count);
  const restart=engine(e.store);
  await start(hooks(mod.register),restart);
  assert.equal(restart.sets[0].backdrop.scene,'clawd-scenarios-kite-light-still');
});
