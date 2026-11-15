import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { spawnSync } from 'node:child_process';

// No renderer or package dependency: validate the actual shipped SVG and hook IDs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hooks = path.join(root, 'themes/clawd-scenarios/hooks');
const generatedFile = path.join(hooks, 'dithered.mjs');
const nativeSourceLimit = 1_048_576;
const nativeSvgCharacterLimit = 131_072;
function verifyModuleSizes(directory) {
  let count = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) count += verifyModuleSizes(filename);
    else if (/\.(?:mjs|tsx|js)$/.test(entry.name)) {
      const bytes = fs.statSync(filename).size;
      assert(bytes <= nativeSourceLimit, `${path.relative(root, filename)}: imported module is ${bytes} bytes; native limit is ${nativeSourceLimit}`);
      count++;
    }
  }
  return count;
}
const moduleCount = verifyModuleSizes(hooks);
console.log(`Native source-size limit: ${moduleCount} hook modules are each ≤ ${nativeSourceLimit} bytes.`);
const expected = ['coffee', 'heart', 'headphones', 'skateboard', 'wand', 'lightbulb', 'magnifier', 'dizzy', 'book', 'bubble', 'cape', 'kite'];
if (!fs.existsSync(generatedFile)) {
  console.error('PENDING: hooks/dithered.mjs has not been generated. Run this verifier after the dither compilation and integration.');
  process.exit(2);
}
const { DITHERED_SCENES } = await import(pathToFileURL(generatedFile));
const { PITCH, RADII, createReferenceTexture } = await import(pathToFileURL(path.join(hooks, 'reference-texture.mjs')));
const { sceneMotion } = await import(pathToFileURL(path.join(hooks, 'motion.mjs')));
const { SCENARIOS, buildScene, paletteFor } = await import(pathToFileURL(path.join(hooks, 'scene.mjs')));
assert.deepEqual(Object.keys(DITHERED_SCENES).sort(), [...expected].sort(), 'Generated art must contain all twelve scenarios');
assert.deepEqual(Object.keys(SCENARIOS).sort(), [...expected].sort(), 'Runtime must expose all twelve scenarios');

function markupFor(scene, side) {
  const value = scene[side];
  const markup = typeof value === 'function' ? value() : value;
  assert.equal(typeof markup, 'string', `${side} art must be an SVG markup string or function`);
  assert(markup.length > 0, `${side} art must not be empty`);
  return markup;
}

function rgb(hex) {
  assert.match(hex, /^#[\da-f]{6}$/i, 'Palette colors must be six-digit hex');
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
}
function luminance(channels) {
  const linear = channels.map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function contrast(first, second) {
  const [hi, lo] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (hi + .05) / (lo + .05);
}

// Pin the adapted recipe to the actual downloaded upstream, when that checkout
// is present; the fixed contract remains runnable in the published repository.
const expectedRadii = [2.6, 2.1, 1.6, 1.15, .75];
assert.equal(PITCH, 6);
assert.deepEqual([...RADII], expectedRadii);
const referenceScene = path.resolve(root, '../claude-scenarios-reference/themes/rainy-window/hooks/scene.ts');
if (fs.existsSync(referenceScene)) {
  const upstream = fs.readFileSync(referenceScene, 'utf8');
  const sourceRadii = upstream.match(/const RADII = (\[[^\]]+\])/);
  assert(sourceRadii, 'Upstream dot-radius declaration is missing');
  assert.deepEqual(JSON.parse(sourceRadii[1]), [...RADII], 'Adapted radii differ from actual upstream');
  assert.match(upstream, /const PITCH = 6\b/);
  assert.match(upstream, /stroke-dasharray="0 \$\{PITCH\}"/);
  console.log('Compared pitch, exact five radii, and dotted-line pitch with actual rainy-window source.');
} else console.warn('Upstream checkout unavailable; using the independently pinned reference recipe.');
const license = fs.readFileSync(path.join(hooks, 'reference-texture.LICENSE'), 'utf8');
assert.match(license, /MIT License/);
assert.match(license, /Copyright \(c\) 2026 Ishu Agrawal/);
assert.match(license, /Permission is hereby granted, free of charge/);
assert.match(license, /THE SOFTWARE IS PROVIDED "AS IS"/);
assert.match(fs.readFileSync(path.join(hooks, 'reference-texture.mjs'), 'utf8'), /Adapted from rainy-window\/hooks\/scene\.ts[\s\S]*reference-texture\.LICENSE/);
const referenceLicense = path.resolve(path.dirname(referenceScene), '../LICENSE');
if (fs.existsSync(referenceLicense)) assert.equal(license.trim(), fs.readFileSync(referenceLicense, 'utf8').trim());
const recipe = createReferenceTexture('verifier-recipe');
const cachedPaints = expectedRadii.map((_radius, density) => recipe.dotPaint(density, 'cool'));
assert.equal(recipe.dotPaint(2, 'cool'), cachedPaints[2], 'Identical density/paint must reuse its pattern');
assert.match(recipe.dline('M0 0L12 12', 'ink'), /stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 6"/);
const defaultRings = recipe.halftone((scale, density) => `<rect data-test-scale="${scale}" data-test-density="${density}" fill="var(--cool)"/>`);
assert.deepEqual([...defaultRings.matchAll(/data-test-scale="([\d.]+)" data-test-density="(\d+)"/g)].map(match => [Number(match[1]), Number(match[2])]), [[1.5,3],[1.25,2],[1,0]]);
assert(!defaultRings.includes('fill="var(--'), 'Halftone layers must use actual dot patterns');
const convertedPaint = recipe.dotted(2, '<path fill="var(--cool)" stroke="var(--warm)"/>');
assert(!convertedPaint.includes('var(--'), 'Dotted helper must convert both fill and stroke');

const documents = [];
const distinct = new Set();
let longestSvg = 0;
for (const key of expected) {
  const sides = ['left', 'right'].map(side => {
    const markup = markupFor(DITHERED_SCENES[key], side);
    documents.push({ label: `${key}/${side}`, svg: `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, kind: 'art' });
    return markup;
  });
  const actor = DITHERED_SCENES[key].actor;
  if (key === 'skateboard') {
    assert.equal(typeof actor, 'string', 'Skateboard needs its separate rider markup');
    assert.match(actor, /data-mascot="body"/, 'The separate rider must preserve its mascot body');
    documents.push({ label: `${key}/actor`, svg: `<svg xmlns="http://www.w3.org/2000/svg">${actor}</svg>`, kind: 'actor' });
  } else assert.equal(actor, undefined, `${key}: only skateboard may introduce a separate actor`);
  assert.match(sides.join(''), /data-mascot="body"/, `${key}: Clawd body must remain present`);
  distinct.add(sides.join(''));
  let weakest = Infinity;
  for (const mode of ['light', 'dark']) {
    const palette = paletteFor(key, mode);
    // This bound applies only to the protected 680px text lane. The user's
    // selected layout intentionally permits stronger artwork outside that lane.
    const extreme = mode === 'light' ? 0 : 255;
    const worstBackground = rgb(palette.bg).map(channel => channel * .7 + extreme * .3);
    for (const role of ['ink', 'soft']) {
      const ratio = contrast(rgb(palette[role]), worstBackground);
      weakest = Math.min(weakest, ratio);
      assert(ratio >= 4.5, `${key}/${mode}/${role}: protected 680px-lane overlap contrast is ${ratio.toFixed(2)}:1`);
    }
  }
  for (const mode of ['light', 'dark', 'auto']) {
    for (const motion of [false, true]) {
      const svg = buildScene(key, mode, motion);
      assert(svg.length <= nativeSvgCharacterLimit, `${key}/${mode}: generated Svg exceeds native ${nativeSvgCharacterLimit}-character limit (${svg.length})`);
      longestSvg = Math.max(longestSvg, svg.length);
      const resolve = markup => markup.replace(/var\(--([a-z]+)\)/g, (_match, role) => mode === 'auto' ? `light-dark(${paletteFor(key, 'light')[role]},${paletteFor(key, 'dark')[role]})` : paletteFor(key, mode)[role]);
      for (const side of ['left', 'right']) {
        const overlay = sceneMotion(key, side);
        assert(overlay.includes(`data-motion="${key}-${side}"`), `${key}/${side}: relevant motion needs a labeled overlay`);
        assert(/<animateTransform\b|<animate\b/.test(overlay), `${key}/${side}: labeled overlay must actually animate`);
        if (motion) assert(svg.includes(resolve(overlay)), `${key}/${mode}/${side}: runtime must embed its complete scene motion`);
        else assert(!svg.includes(`data-motion="${key}-${side}"`), `${key}/${side}: still output must omit the motion layer`);
      }

      // XML canonicalization below checks raw art after removing only blink wrappers.
      for (const duration of svg.matchAll(/dur="([\d.]+)s"/g)) assert(Number(duration[1]) >= 1 && Number(duration[1]) <= 90, `${key}/${mode}: environmental periods must stay within 1–90 seconds`);
      assert(!svg.includes('var(--'), `${key}/${mode}: unresolved CSS variables`);
      assert(!svg.includes('undefined') && !svg.includes('NaN'), `${key}/${mode}: invalid generated values`);
      assert.equal(/<animate(?:Transform|Motion)?\b/.test(svg), motion, `${key}/${mode}: motion flag must govern animation`);
      const paint_values = Object.fromEntries(['ink', 'soft', 'cool', 'accent', 'warm', 'leaf', 'panel', 'line', 'paper'].map(role => [role, mode === 'auto' ? `light-dark(${paletteFor(key, 'light')[role]},${paletteFor(key, 'dark')[role]})` : paletteFor(key, mode)[role]]));
      documents.push({ label: `${key}/${mode}/${motion ? 'motion' : 'still'}`, svg, kind: 'scene', scene: key, motion, paint_values });
    }
  }
  console.log(`${key}: original room contours present; protected-lane contrast ≥ ${weakest.toFixed(2)}:1`);
}
assert.equal(distinct.size, 12, 'Every generated scenario must be distinct');

// Execute the current runtime's real sceneId/parseSceneId, rather than duplicate
// their format in the verifier. Function definitions do not execute engine APIs.
const registration = fs.readFileSync(path.join(hooks, 'register.tsx'), 'utf8');
const javascript = stripTypeScriptTypes(registration.replace(/^import .*$/gm, '').replace(/^export /gm, ''));
const runtime = new Function('SCENARIOS', javascript + '\nreturn { sceneId, parseSceneId };')(SCENARIOS);
for (const scene of expected) {
  for (const appearance of ['light', 'dark', 'auto']) {
    for (const motion of [false, true]) {
      const preference = { scene, appearance, motion, enabled: true };
      const id = runtime.sceneId(preference);
      assert.match(id, /^[a-zA-Z0-9_-]{1,64}$/, 'Backdrop IDs must satisfy the desktop identifier constraint');
      assert.deepEqual(runtime.parseSceneId(id), preference, `Runtime ID must round-trip: ${id}`);
    }
  }
}

// Python's standard XML parser checks structure, glyph-only geometry, clipping,
// and the inherited opacity cap. Input goes over stdin; no files are created.
const python = String.raw`
import json, math, re, sys, xml.etree.ElementTree as ET

def name(element):
    return element.tag.rsplit('}', 1)[-1]

ART_ROLES = {'ink', 'soft', 'cool', 'accent', 'warm', 'leaf', 'panel', 'line', 'paper'}
RADII = [2.6, 2.1, 1.6, 1.15, .75]
used_art_roles = set()
art_sources = {}
glass_windows = 0

def canonical(element, paints):
    if name(element).startswith('animate'):
        return []
    children = [node for child in element for node in canonical(child, paints)]
    if element.get('data-detail') == 'mascot-blink':
        return children
    def resolve(value):
        return re.sub(r'var\(--([a-z]+)\)', lambda match: paints[match.group(1)], value)
    return [(name(element), tuple(sorted((key, resolve(value)) for key, value in element.attrib.items())), (element.text or '').strip(), tuple(children))]

def validate_art(document, root, global_patterns=None):
    global glass_windows
    label = document['label']
    local_patterns = {element.get('id'): element for element in root.iter() if name(element) == 'pattern'}
    patterns = global_patterns or local_patterns
    ids = [element.get('id') for element in root.iter() if element.get('id')]
    assert len(ids) == len(set(ids)), label + ': pattern IDs collide'
    paints = document.get('paint_values', {role: 'var(--' + role + ')' for role in ART_ROLES})
    for pattern in local_patterns.values():
        role = pattern.get('data-paint')
        assert role in ART_ROLES | {'mascot'}, label + ': density pattern needs known semantic or mascot paint'
        assert pattern.get('width') == '6' and pattern.get('height') == '6' and pattern.get('patternUnits') == 'userSpaceOnUse', label + ': freckle patterns must retain upstream 6px pitch'
        assert len(pattern) == 1 and name(pattern[0]) == 'circle', label + ': real reference patterns contain one dot only, with no wash rectangle'
        density = int(pattern.get('data-density', '-1'))
        assert 0 <= density < 5 and pattern.get('data-texture') == 'density-' + str(density), label + ': missing exact reference density metadata'
        dot = pattern[0]
        assert dot.get('cx') == '3' and dot.get('cy') == '3' and math.isclose(float(dot.get('r', '0')), RADII[density]), label + ': dot differs from exact upstream radius or center'
        expected = '#d77c5c' if role == 'mascot' else paints[role]
        assert dot.get('fill') == expected, label + ': freckle paint must match its role'
        assert dot.get('opacity', '1') == '1', label + ': native reference density dots must be solid'
        if role == 'mascot':
            assert pattern.get('data-color') == '#d77c5c' and density == 0, label + ': Clawd must use full terracotta freckles'
    clears = [element for element in root.iter() if element.get('data-texture') == 'glass-clear']
    bands = [element for element in root.iter() if element.get('data-texture') == 'glass-band']
    assert len(bands) == len(clears) * 3, label + ': every graduated glass rectangle needs three reference density bands'
    for window, clear in enumerate(clears):
        assert name(clear) == 'rect' and clear.get('fill') == paints['paper'], label + ': glass clearing must use the semantic paper paint'
        x, y, width, height = [float(clear.get(key)) for key in ('x','y','width','height')]
        offset = y
        for band, portion, density in zip(bands[window*3:window*3+3], [36,42,48], [2,3,4]):
            assert name(band) == 'rect' and band.get('data-density') == str(density), label + ': glass density sequence must match the upstream top/middle/bottom'
            assert math.isclose(float(band.get('x')),x) and math.isclose(float(band.get('width')),width) and math.isclose(float(band.get('y')),offset,abs_tol=.002) and math.isclose(float(band.get('height')),height*portion/220,abs_tol=.002), label + ': glass-band geometry differs from upstream 36/42/48 of 220 proportions'
            reference = re.fullmatch(r'url\(#([a-zA-Z0-9_-]+)\)',band.get('fill',''))
            assert reference and patterns[reference.group(1)].get('data-paint') == 'cool' and patterns[reference.group(1)].get('data-density') == str(density), label + ': glass band must use its corresponding blue freckle density'
            offset += height*portion/220
    if document['kind'] == 'art':
        glass_windows += len(clears)
    visible = []
    printed_edges = []
    rounded = []
    def walk(element, in_defs=False):
        tag = name(element)
        in_defs = in_defs or tag == 'defs'
        assert tag not in ('image', 'foreignObject', 'script', 'style', 'mask'), label + ': unsupported external or CSS art'
        assert not any(attribute in element.attrib for attribute in ('style', 'mask', 'shape-rendering')), label + ': unsupported rendering controls'
        assert element.get('data-cells') is None and element.get('data-glyph') is None, label + ': old point-cell approximation remains'
        if element.get('data-dither'):
            assert element.get('data-dither') == '6px-freckled-reference' and element.get('data-texture') == 'freckled-v4', label + ': expected actual freckle recipe'
        for attribute in ('fill', 'stroke'):
            paint = element.get(attribute)
            if paint is None or paint == 'none':
                continue
            if paint.startswith('url('):
                reference = re.fullmatch(r'url\(#([a-zA-Z0-9_-]+)\)', paint)
                assert reference and reference.group(1) in patterns, label + ': missing local or shared-root pattern'
                if not in_defs and document['kind'] in ('art', 'actor'):
                    role = patterns[reference.group(1)].get('data-paint')
                    if role in ART_ROLES:
                        used_art_roles.add(role)
            else:
                assert paint in set(paints.values()) | {'#d77c5c', '#211d19'}, label + ': unknown art paint ' + paint
        if tag in ('path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon') and not in_defs:
            visible.append(element)
            stroke = element.get('stroke', 'none')
            if stroke != 'none':
                if stroke.startswith('url('):
                    printed_edges.append(element)
                elif stroke == '#211d19':
                    # The dizzy mascot's two crossed eyes are facial marks,
                    # not continuous furniture outlines.
                    assert element.get('d') == 'M23 27l10 10m0-10L23 37m29-10 10 10m0-10L52 37', label + ': unexpected solid facial accent'
                elif document['kind'] in ('art', 'actor'):
                    assert element.get('data-texture') == 'dline' and element.get('stroke-dasharray') == '0 6' and element.get('stroke-linecap') == 'round' and element.get('stroke-linejoin') == 'round', label + ': authored strokes must use the upstream dotted-line recipe, not continuous outlines'
                    printed_edges.append(element)
            if tag in ('circle', 'ellipse') or (tag == 'path' and re.search('[AaCcQqSsTt]', element.get('d', ''))):
                rounded.append(element)
        if element.get('data-texture') == 'dline':
            assert element.get('stroke-dasharray') == '0 6' and element.get('stroke-linecap') == 'round' and element.get('stroke-linejoin') == 'round', label + ': adapted dotted lines differ from upstream pitch/caps'
        if element.get('data-mascot'):
            assert re.fullmatch(r'[MmLlHhVvZz0-9.,+\-\s]+', element.get('d', '')), label + ': mascot pixel silhouette was altered'
            if element.get('data-mascot') == 'body':
                paint = element.get('fill', '')
                reference = re.fullmatch(r'url\(#([a-zA-Z0-9_-]+)\)', paint)
                assert reference and patterns[reference.group(1)].get('data-paint') == 'mascot', label + ': body must retain terracotta density-zero freckles'
            else:
                assert element.get('data-mascot') == 'eyes' and element.get('fill') == '#211d19', label + ': eyes must stay solid and readable'
        for child in element:
            walk(child, in_defs)
    walk(root)
    if document['kind'] == 'art':
        assert 10 <= len(visible) <= 2000, label + ': expected composed source geometry, not an enormous point cloud'
        assert len(printed_edges) >= 3 and rounded, label + ': authored contours or reference printed edges are missing'
        assert local_patterns and any(element.get('fill', '').startswith('url(') for element in visible), label + ': room must actually use dots-only halftone'
    if document['kind'] == 'actor':
        assert not any(element.get('data-texture') == 'wall-print' for element in root.iter()), label + ': moving actor may not carry a moving wall'
    if label == 'skateboard/left':
        assert sum(element.get('data-mascot') == 'body' for element in root.iter()) == 2, label + ': expected two stationary Clawds'

def check_rain(document, root):
    expected = {}
    if document['scene'] == 'coffee':
        expected['motion-coffee-left-glass'] = [(29,147,72,99),(117,147,72,99),(29,263,72,99),(117,263,72,99)]
    elif document['scene'] == 'magnifier':
        expected['motion-magnifier-left-glass'] = [(36,308,77,75)]
        expected['motion-magnifier-right-glass'] = [(43,49,76,98),(138,49,76,98),(43,169,76,98),(138,169,76,98)]
    clips = {element.get('id'): element for element in root.iter() if name(element) == 'clipPath' and element.get('id', '').startswith('motion-')}
    assert set(clips) == (set(expected) if document['motion'] else set()), document['label'] + ': unexpected window clipping definitions'
    if not document['motion']:
        return
    for identity, panes in expected.items():
        rectangles = [tuple(float(element.get(key, '0')) for key in ('x','y','width','height')) for element in clips[identity]]
        assert rectangles == panes, document['label'] + ': rain must clip to its exact glass panes and avoid sills/mullions'
        rain = next(element for element in root.iter() if element.get('clip-path') == 'url(#' + identity + ')')
        assert rain.get('data-effect') == 'window-rain' and len(rain) == 2, document['label'] + ': rain needs distinct near and far layers'
        specifications = [('108','3.4s','1.3'), ('144','2.1s','2.3')]
        for layer, (travel, period, width) in zip(rain, specifications):
            animation, drops = layer
            assert name(animation) == 'animateTransform' and animation.get('type') == 'translate' and animation.get('from') == '0 0' and animation.get('to') == '0 ' + travel and animation.get('dur') == period, document['label'] + ': rain timing/travel must remain visibly active'
            assert drops.get('stroke-width') == width and drops.get('stroke-linecap') == 'round' and drops.get('stroke-dasharray', '').startswith('0 '), document['label'] + ': rain must remain actual dotted strokes'

def check_scene(document, root):
    label = document['label']
    paints = document['paint_values']
    ids = [element.get('id') for element in root.iter() if element.get('id')]
    assert len(ids) == len(set(ids)), label + ': cross-layer IDs collide'
    patterns = {element.get('id'): element for element in root.iter() if name(element) == 'pattern'}
    gradients = {element.get('id'): element for element in root.iter() if name(element) in ('radialGradient', 'linearGradient')}
    assert set(gradients) == {'room-cool','room-warm'}, label + ': only the two controlled root ambient gradients are allowed'
    for identity, role, alpha, cy, radius in [('room-cool','cool',.16,.23,.85),('room-warm','warm',.20,1,.8)]:
        gradient = gradients[identity]
        assert name(gradient) == 'radialGradient' and gradient in root.find('{http://www.w3.org/2000/svg}defs'), label + ': ambient gradients must be defined directly at root'
        assert math.isclose(float(gradient.get('cx')), .5) and math.isclose(float(gradient.get('cy')),cy) and math.isclose(float(gradient.get('r')),radius), label + ': ambient gradient geometry changed'
        assert len(gradient) == 2, label + ': ambient gradient must have two controlled stops'
        first, last = gradient
        assert first.get('offset') == '0' and last.get('offset') == '1' and first.get('stop-color') == paints[role] and last.get('stop-color') == paints[role] and math.isclose(float(first.get('stop-opacity')),alpha) and float(last.get('stop-opacity')) == 0, label + ': ambient gradient must remain a subtle semantic-color wash'
    paint_servers = {**patterns, **gradients}
    wall = patterns.get('room-print')
    assert wall is not None and wall.get('width') == '6' and wall.get('height') == '6' and len(wall) == 1, label + ': shared wall print must use one dot per 6px tile'
    dot = wall[0]
    assert name(dot) == 'circle' and dot.get('cx') == '3' and dot.get('cy') == '3' and math.isclose(float(dot.get('r')), .75) and math.isclose(float(dot.get('opacity')), .16) and dot.get('fill') == paints['line'], label + ': shared wall print recipe changed'
    margins = [element for element in root.iter() if name(element) == 'svg' and element is not root and element.get('width') == '25%']
    assert len(margins) == 2 and sorted(element.get('x') for element in margins) == ['0','75%'], label + ': center 50% must remain free of art'
    for margin in margins:
        side = 'left' if margin.get('x') == '0' else 'right'
        assert margin.get('overflow') == 'hidden' and margin.get('viewBox') == '0 0 260 800', label + ': clipped 800px margin must retain footer padding'
        validate_art({'label': label, 'kind': 'scene', 'paint_values': paints}, margin, paint_servers)
        prints = [element for element in margin if element.get('fill') in ('url(#room-cool)','url(#room-warm)','url(#room-print)')]
        assert [element.get('fill') for element in prints] == ['url(#room-cool)','url(#room-warm)','url(#room-print)'] and all(element.get('width') == '260' and element.get('height') == '800' for element in prints), label + ': shared ambient fields and room print must remain in each margin'
        authored = [element for element in margin if element.get('data-dither')]
        assert len(authored) == 1, label + ': each margin must retain exactly one original art root'
        assert canonical(authored[0], paints) == canonical(art_sources[document['scene'] + '/' + side][0], paints), label + ': original room/body/eye geometry was changed beyond blink wrapping'
    veils = [element for element in root.iter() if name(element) == 'svg' and element.get('x') == '50%' and element.get('overflow') == 'visible']
    protected = []
    for veil in veils:
        assert veil in list(root) and veil.get('width') == '1' and veil.get('height') == '100%', label + ': text veil must use root coordinates'
        assert all(list(root).index(veil) > list(root).index(margin) for margin in margins), label + ': text veil must paint last'
        for rectangle in veil:
            if name(rectangle) == 'rect' and rectangle.get('x') == '-340' and rectangle.get('width') == '680':
                alpha = float(rectangle.get('opacity','1')) * float(rectangle.get('fill-opacity','1')) * float(veil.get('opacity','1'))
                assert math.isclose(alpha,.7) and rectangle.get('height') == '100%' and rectangle.get('fill') == next(element for element in root if name(element) == 'rect').get('fill'), label + ': protected 680px lane must retain .70 background veil'
                protected.append(rectangle)
    assert len(protected) == 1, label + ': protected text lane is missing'
    def walk(element, within_margin=False, within_defs=False):
        tag = name(element)
        within_margin = within_margin or element in margins
        within_defs = within_defs or tag == 'defs'
        if tag in ('path','circle','ellipse','rect','text','image','line','polygon','polyline','use') and not within_margin and not within_defs:
            assert (tag == 'rect' and element.get('width') == '100%' and element.get('height') == '100%') or element in protected, label + ': room art escaped its margins'
        for child in element:
            walk(child,within_margin,within_defs)
    walk(root)
    labels = [element.get('data-motion') for element in root.iter() if element.get('data-motion')]
    assert sorted(labels) == (sorted([document['scene']+'-left',document['scene']+'-right']) if document['motion'] else []), label + ': environmental motion must occur once per side only when enabled'
    actors = [element for element in root.iter() if element.get('data-actor')]
    assert len(actors) == (1 if document['scene'] == 'skateboard' else 0), label + ': expected exactly one independent skateboard actor'
    if actors:
        actor = actors[0]
        authored = next(element for element in actor if element.get('data-dither'))
        assert canonical(authored, paints) == canonical(art_sources['skateboard/actor'][0], paints), label + ': rider geometry changed'
        travel = [element for element in actor if name(element) == 'animateTransform']
        assert len(travel) == int(document['motion']), label + ': rider moves exactly once only in motion mode'
        if travel:
            assert travel[0].get('dur') == '10s' and travel[0].get('values') == '0 0;30 0;0 0;-30 0;0 0', label + ': rider travel or timing changed'
    blink = [element for element in root.iter() if element.get('data-detail') == 'mascot-blink']
    expected_blinks = sum(element.get('data-mascot') == 'eyes' for element in art_sources[document['scene']+'/right'].iter())
    if actors:
        expected_blinks += sum(element.get('data-mascot') == 'eyes' for element in art_sources['skateboard/actor'].iter())
    assert len(blink) == (expected_blinks if document['motion'] else 0), label + ': right-side mascot eyes must blink without changing geometry'
    for group in blink:
        animation = group[0]
        assert name(animation) == 'animate' and animation.get('dur') == '6s' and animation.get('attributeName') == 'opacity' and animation.get('calcMode') == 'discrete', label + ': blink must use its small six-second opacity loop'
    check_rain(document, root)

for document in json.load(sys.stdin):
    root = ET.fromstring(document['svg'])
    if document['kind'] in ('art','actor'):
        art_sources[document['label']] = root
        validate_art(document,root)
    else:
        check_scene(document,root)
assert len(used_art_roles) >= 3, 'Collection must use multiple actual semantic freckle colors'
assert glass_windows >= 1, 'Expected actual upstream graduated glass recipe in room windows'
print('Verified reference freckle paints: ' + ', '.join(sorted(used_art_roles)))
print('Validated exact five-radius dot recipe, original geometry/eye fingerprints, pane-clipped near/far rain, all 25 art layers and 72 outputs; protected lane is 680px at .70.')
`;
const validation = spawnSync('python3', ['-c', python], { input: JSON.stringify(documents), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (validation.error) throw validation.error;
assert.equal(validation.status, 0, validation.stderr || validation.stdout);
process.stdout.write(validation.stdout);
console.log(`Native Svg source-size limit: longest output ${longestSvg}/${nativeSvgCharacterLimit} characters.`);
console.log('PASS: 12 distinct reference-style rooms, native limits, protected-lane contrast, localized motion/still, actors, and desktop-safe IDs.');
