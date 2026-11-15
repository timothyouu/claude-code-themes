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
const { clawd } = await import(pathToFileURL(path.join(hooks, 'primitives.mjs')));
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
const textureScale = .45;
const texturePitch = PITCH * textureScale;
const unitRecipe = createReferenceTexture('verifier-unit', 1);
assert.match(unitRecipe.dline('M0 0L12 12', 'ink'), /stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 6"/);
const recipe = createReferenceTexture('verifier-recipe', textureScale);
const cachedPaints = expectedRadii.map((_radius, density) => recipe.dotPaint(density, 'cool'));
assert.equal(recipe.dotPaint(2, 'cool'), cachedPaints[2], 'Identical density/paint must reuse its pattern');
assert.match(recipe.dline('M0 0L12 12', 'ink'), /stroke-width="2.07" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 2.7"/);
assert.match(recipe.dline('M0 0L12 12', 'ink', 3.8), /stroke-width="1.71"/);
assert.deepEqual([...recipe.patterns().matchAll(/<circle[^>]*\br="([\d.]+)"/g)].map(match => Number(match[1])), expectedRadii.map(radius => Number((radius * textureScale).toFixed(4))), 'All rendered densities must scale from the original radii by .45');
assert([...recipe.patterns().matchAll(/<pattern\b[^>]*>/g)].every(match => match[0].includes(`width="${texturePitch}"`) && match[0].includes(`height="${texturePitch}"`)));
const defaultRecipe = createReferenceTexture('verifier-default');
defaultRecipe.dotPaint(0, 'ink');
assert.match(defaultRecipe.patterns(), /width="2.7" height="2.7"/);
const defaultRings = recipe.halftone((scale, density) => `<rect data-test-scale="${scale}" data-test-density="${density}" fill="var(--cool)"/>`);
assert.deepEqual([...defaultRings.matchAll(/data-test-scale="([\d.]+)" data-test-density="(\d+)"/g)].map(match => [Number(match[1]), Number(match[2])]), [[1.5,3],[1.25,2],[1,0]]);
assert(!defaultRings.includes('fill="var(--'), 'Halftone layers must use actual dot patterns');
const convertedPaint = recipe.dotted(2, '<path fill="var(--cool)" stroke="var(--warm)"/>');
assert(!convertedPaint.includes('var(--'), 'Dotted helper must convert both fill and stroke');

const documents = [];
for (const variant of ['plain', 'coffee']) {
  const fixture = clawd(0, 0, variant, 1).replaceAll('fill="#d77c5c"', 'data-mascot="body" fill="#d77c5c"').replaceAll('fill="#211d19"', 'data-mascot="eyes" fill="#211d19"');
  documents.push({ label: `source-mascot/${variant}`, kind: 'mascot-fixture', variant, svg: `<svg xmlns="http://www.w3.org/2000/svg">${fixture}</svg>` });
}
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
    // Bound each channel independently across the continuous wall and every
    // optional glow/shade. This deliberately permits all radial peaks to
    // coincide, then adds worst-case art at the protected lane's .20 opacity.
    const stops = ['walltop', 'wallmid', 'wallbottom'].map(role => rgb(palette[role]));
    const choose = mode === 'light' ? Math.min : Math.max;
    let gradientBound = [0, 1, 2].map(channel => choose(...stops.map(color => color[channel])));
    for (const [role, alpha] of [['glowcool', .22], ['glowrose', .15], ['glowfloor', .22], ['shade', .10]]) {
      const color = rgb(palette[role]);
      gradientBound = gradientBound.map((channel, index) => choose(channel, channel * (1-alpha) + color[index] * alpha));
    }
    const extreme = mode === 'light' ? 0 : 255;
    const worstBackground = gradientBound.map(channel => channel * .8 + extreme * .2);
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
      const paint_values = Object.fromEntries(['ink', 'soft', 'cool', 'accent', 'warm', 'leaf', 'panel', 'line', 'paper', 'walltop', 'wallmid', 'wallbottom', 'glowcool', 'glowrose', 'glowfloor', 'shade'].map(role => [role, mode === 'auto' ? `light-dark(${paletteFor(key, 'light')[role]},${paletteFor(key, 'dark')[role]})` : paletteFor(key, mode)[role]]));
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
TEXTURE_SCALE = .45
TEXTURE_PITCH = 6 * TEXTURE_SCALE
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

def orthogonal_polygons(element, label):
    data = element.get('d','')
    assert re.fullmatch(r'[MmLlHhVvZz0-9.,+\-\s]+',data), label + ': mascot needs clean orthogonal steps'
    tokens = re.findall(r'[MmLlHhVvZz]|[-+]?(?:\d*\.\d+|\d+)',data)
    polygons, polygon = [], []
    cursor = start = (0.,0.)
    index = 0
    command = None
    while index < len(tokens):
        if tokens[index].isalpha():
            command = tokens[index]; index += 1
        assert command is not None, label + ': malformed mascot path'
        if command.lower() == 'z':
            if polygon[-1] != start:
                polygon.append(start)
            polygons.append(polygon)
            polygon = []
            cursor = start
            command = None
            continue
        relative = command.islower()
        kind = command.lower()
        x,y = cursor
        if kind in ('m','l'):
            target = (float(tokens[index]),float(tokens[index+1])); index += 2
            cursor = (x+target[0],y+target[1]) if relative else target
            if kind == 'm':
                assert not polygon, label + ': mascot subpath must close'
                start = cursor
                command = 'l' if relative else 'L'
        elif kind == 'h':
            value = float(tokens[index]); index += 1
            cursor = (x+value if relative else value,y)
        elif kind == 'v':
            value = float(tokens[index]); index += 1
            cursor = (x,y+value if relative else value)
        if polygon:
            assert cursor[0] == polygon[-1][0] or cursor[1] == polygon[-1][1], label + ': mascot silhouette may not have diagonal edges'
        polygon.append(cursor)
    assert not polygon and polygons, label + ': mascot path must close'
    return polygons

def path_bounds(polygons):
    points = [point for polygon in polygons for point in polygon]
    return min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)

def row_intervals(polygons, row):
    crossings = []
    for polygon in polygons:
        for (x1,y1),(x2,y2) in zip(polygon,polygon[1:]):
            if (y1 <= row < y2) or (y2 <= row < y1):
                crossings.append(x1 + (row-y1)*(x2-x1)/(y2-y1))
    crossings.sort()
    assert len(crossings)%2 == 0, 'Invalid mascot row intersections'
    return list(zip(crossings[::2],crossings[1::2]))

def validate_body(element, label, variant='plain'):
    polygons = orthogonal_polygons(element,label)
    assert len(polygons) == 1, label + ': body must be one connected silhouette'
    left,top,right,bottom = path_bounds(polygons)
    width,height = right-left,bottom-top
    assert math.isclose(width/height,88/64), label + ': body must retain squat sticker proportions'
    def normalized(row):
        return [((a-left)/width,(b-left)/width) for a,b in row_intervals(polygons,top+row*height)]
    def matches(actual, expected):
        return len(actual) == len(expected) and all(math.isclose(a,c) and math.isclose(b,d) for (a,b),(c,d) in zip(actual,expected))
    torso = [(8/88,80/88)]
    assert matches(normalized(.125),torso) and matches(normalized(.375),[(0,1)]) and matches(normalized(.625),torso), label + ': crown, short side arms and torso must retain clean stepped proportions'
    feet = [(16/88,24/88),(32/88,40/88),(48/88,56/88),(64/88,72/88)] if variant == 'coffee' else [(8/88,16/88),(24/88,32/88),(56/88,64/88),(72/88,80/88)]
    assert matches(normalized(.89),feet) and matches(normalized(.99),feet), label + ': mascot needs four equal-width, flat-bottom feet in its sticker arrangement'

def validate_eyes(element, label, variant='plain'):
    polygons = orthogonal_polygons(element,label)
    assert len(polygons) == 2, label + ': mascot needs exactly two eyes'
    bounds = sorted(path_bounds([polygon]) for polygon in polygons)
    for left,top,right,bottom in bounds:
        assert math.isclose(right-left,bottom-top) and right-left > 0, label + ': eyes must be square'
    centers = [((a+c)/2,(b+d)/2,c-a) for a,b,c,d in bounds]
    expected = [(24,25,8),(64,25,8)] if variant == 'coffee' else [(20,33,8),(68,33,8)]
    scale = centers[0][2]/8
    assert all(all(math.isclose(actual,wanted*scale) for actual,wanted in zip(center,target)) for center,target in zip(centers,expected)), label + ': eyes must match the two-square sticker expression'

def validate_crossed_eyes(element, label):
    data = element.get('d','')
    assert re.fullmatch(r'[MmLl0-9.,+\-\s]+',data), label + ': dizzy expression must use diagonal line strokes only'
    tokens = re.findall(r'[MmLl]|[-+]?(?:\d*\.\d+|\d+)',data)
    index, command, cursor, segments = 0, None, (0.,0.), []
    while index < len(tokens):
        if tokens[index].isalpha():
            command = tokens[index]; index += 1
        x,y = float(tokens[index]),float(tokens[index+1]); index += 2
        target = (cursor[0]+x,cursor[1]+y) if command.islower() else (x,y)
        if command.lower() == 'l':
            segments.append(tuple(sorted((cursor,target))))
        cursor = target
        if command.lower() == 'm':
            command = 'l' if command.islower() else 'L'
    expected = []
    for left in (16.,64.):
        expected += [((left,29.),(left+8,37.)),((left,37.),(left+8,29.))]
    assert sorted(segments) == sorted(expected), label + ': dizzy eyes must form two 8px crosses at the square-eye positions'

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
        assert role in ART_ROLES, label + ': density pattern needs known semantic or mascot paint'
        assert math.isclose(float(pattern.get('width')),TEXTURE_PITCH) and math.isclose(float(pattern.get('height')),TEXTURE_PITCH) and pattern.get('patternUnits') == 'userSpaceOnUse', label + ': rendered freckle pitch must be .45 of upstream'
        assert len(pattern) == 1 and name(pattern[0]) == 'circle', label + ': real reference patterns contain one dot only, with no wash rectangle'
        density = int(pattern.get('data-density', '-1'))
        assert 0 <= density < 5 and pattern.get('data-texture') == 'density-' + str(density), label + ': missing exact reference density metadata'
        dot = pattern[0]
        assert math.isclose(float(dot.get('cx')),TEXTURE_PITCH/2) and math.isclose(float(dot.get('cy')),TEXTURE_PITCH/2) and math.isclose(float(dot.get('r','0')),RADII[density]*TEXTURE_SCALE,abs_tol=.00005), label + ': rendered dot must retain the upstream radius/spacing ratio'
        expected = paints[role]
        assert dot.get('fill') == expected, label + ': freckle paint must match its role'
        assert dot.get('opacity', '1') == '1', label + ': native reference density dots must be solid'
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
            assert element.get('data-dither') == 'fine-freckled-reference' and element.get('data-texture') == 'freckled-v5', label + ': expected actual freckle recipe'
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
                assert paint in set(paints.values()) | {'#d97757', '#000000', '#d77c5c', '#211d19'}, label + ': unknown art paint ' + paint
        if tag in ('path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon') and not in_defs:
            visible.append(element)
            stroke = element.get('stroke', 'none')
            if stroke != 'none':
                if stroke.startswith('url('):
                    printed_edges.append(element)
                elif stroke == '#211d19':
                    # The dizzy mascot's two crossed eyes are facial marks,
                    # not continuous furniture outlines.
                    validate_crossed_eyes(element,label)
                elif document['kind'] in ('art', 'actor'):
                    assert element.get('data-texture') == 'dline' and element.get('stroke-dasharray') == '0 2.7' and element.get('stroke-linecap') == 'round' and element.get('stroke-linejoin') == 'round', label + ': authored strokes must use the upstream dotted-line recipe, not continuous outlines'
                    printed_edges.append(element)
            if tag in ('circle', 'ellipse') or (tag == 'path' and re.search('[AaCcQqSsTt]', element.get('d', ''))):
                rounded.append(element)
        if element.get('data-texture') == 'printed-edge':
            assert 4.4*TEXTURE_SCALE-.0001 <= float(element.get('stroke-width','0')) <= 4.6*TEXTURE_SCALE+.0001, label + ': printed edges must scale from the original dot widths'
        if element.get('data-texture') == 'dline':
            assert element.get('stroke-dasharray') == '0 2.7' and element.get('stroke-linecap') == 'round' and element.get('stroke-linejoin') == 'round', label + ': adapted dotted lines differ from upstream pitch/caps'
        if element.get('data-mascot'):
            assert re.fullmatch(r'[MmLlHhVvZz0-9.,+\-\s]+', element.get('d', '')), label + ': mascot pixel silhouette was altered'
            if element.get('data-mascot') == 'body':
                assert element.get('fill') == '#d97757' and element.get('data-texture') == 'mascot-solid', label + ': body must use sampled solid coral, with no texture pattern'
                validate_body(element, label)
            else:
                assert element.get('data-mascot') == 'eyes' and element.get('fill') == '#000000', label + ': eyes must stay solid black'
                validate_eyes(element, label)
        for child in element:
            walk(child, in_defs)
    walk(root)
    for parent in root.iter():
        children = list(parent)
        for index, outer in enumerate(children):
            if outer.get('data-texture') != 'edge-ring' or outer.get('data-density') != '4':
                continue
            assert index+2 < len(children), label + ': edge rings must surround a material silhouette'
            inner, material = children[index+1:index+3]
            assert inner.get('data-texture') == 'edge-ring' and inner.get('data-density') == '3' and material.get('data-texture') == 'material', label + ': reference rings must order sparse outer, intermediate, dense material'
            for ring, growth in ((outer,1.7),(inner,.85)):
                assert name(ring) == name(material), label + ': ring and material silhouettes differ'
                if name(material) == 'rect':
                    comparisons = [('x',-growth),('y',-growth),('width',growth*2),('height',growth*2)]
                elif name(material) == 'circle':
                    comparisons = [('r',growth)]
                elif name(material) == 'ellipse':
                    comparisons = [('rx',growth),('ry',growth)]
                else:
                    raise AssertionError(label + ': unsupported expanded silhouette')
                assert all(math.isclose(float(ring.get(key,'0')),float(material.get(key,'0'))+offset,abs_tol=.015) for key,offset in comparisons), label + ': object-edge rings must use the reduced 1.7/.85 growth'
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
    assert 'room-print' not in patterns and not any(element.get('data-texture') == 'wall-print' for element in root.iter()), label + ': background wallpaper dots must be absent'
    definitions = next(element for element in root if name(element) == 'defs')
    gradients = {element.get('id'): element for element in root.iter() if name(element) in ('radialGradient','linearGradient')}
    assert set(gradients) == {'room-wall','room-cool','room-rose','room-floor','room-corner'}, label + ': background must use only its five controlled continuous gradients'
    assert all(element in definitions for element in gradients.values()), label + ': background gradients must be defined directly at root'
    wall = gradients['room-wall']
    assert name(wall) == 'linearGradient' and [wall.get(key) for key in ('x1','y1','x2','y2')] == ['0','0','0','1'], label + ': wall must shade continuously from top to bottom'
    assert len(wall) == 3, label + ': wall needs its three graduated colors'
    for stop, offset, role in zip(wall,[0,.55,1],['walltop','wallmid','wallbottom']):
        assert name(stop) == 'stop' and math.isclose(float(stop.get('offset')),offset) and stop.get('stop-color') == paints[role] and float(stop.get('stop-opacity','1')) == 1, label + ': wall stop differs from its semantic palette'
    for identity, role, alpha, cx, cy, radius in [('room-cool','glowcool',.22,.9,.2,.6),('room-rose','glowrose',.15,.12,.14,.55),('room-floor','glowfloor',.22,.5,1.05,.7)]:
        gradient = gradients[identity]
        assert name(gradient) == 'radialGradient' and all(math.isclose(float(gradient.get(key)),expected) for key,expected in [('cx',cx),('cy',cy),('r',radius)]), label + ': atmospheric glow geometry differs from contrast assumptions'
        assert len(gradient) == 3, label + ': glow must have three continuous fade stops'
        for stop,offset,opacity in zip(gradient,[0,.45,1],[alpha,alpha*.42,0]):
            assert name(stop) == 'stop' and math.isclose(float(stop.get('offset')),offset) and stop.get('stop-color') == paints[role] and math.isclose(float(stop.get('stop-opacity')),opacity), label + ': glow paint/opacity differs from contrast assumptions'
    corner = gradients['room-corner']
    assert name(corner) == 'linearGradient' and len(corner) == 4, label + ': edge shade must be continuous'
    for stop,offset,opacity in zip(corner,[0,.13,.87,1],[.1,0,0,.1]):
        assert math.isclose(float(stop.get('offset')),offset) and stop.get('stop-color') == paints['shade'] and math.isclose(float(stop.get('stop-opacity')),opacity), label + ': corner shade differs from the conservative contrast bound'
    background = [element for element in root if name(element) == 'rect']
    assert [element.get('fill') for element in background] == ['url(#room-wall)','url(#room-cool)','url(#room-rose)','url(#room-floor)','url(#room-corner)'], label + ': full-canvas background layers must retain their order'
    assert all(element.get('width') == '100%' and element.get('height') == '100%' and element.get('mask') is None for element in background), label + ': continuous background may not be clipped, masked, or replaced with a flat text stripe'
    masks = [element for element in root.iter() if name(element) == 'mask']
    assert len(masks) == 1, label + ': exactly one art-only chat protection mask expected'
    mask = masks[0]
    assert mask.get('id') == 'chat-protection' and mask in definitions and mask.get('maskUnits') == 'userSpaceOnUse' and mask.get('width') == '100%' and mask.get('height') == '100%', label + ': art protection must use the full canvas'
    assert len(mask) == 2, label + ': art mask must contain an exterior white field and a centered protected lane'
    white, center = mask
    assert name(white) == 'rect' and white.get('fill') == 'white' and white.get('width') == '100%' and white.get('height') == '100%', label + ': art should remain visible outside the chat lane'
    assert name(center) == 'svg' and center.get('x') == '50%' and center.get('width') == '1' and center.get('height') == '100%' and center.get('overflow') == 'visible' and len(center) == 1, label + ': protected lane must be centered in viewport coordinates'
    black = center[0]
    assert name(black) == 'rect' and black.get('x') == '-340' and black.get('width') == '680' and black.get('height') == '100%' and black.get('fill') == 'black' and math.isclose(float(black.get('opacity')),.8), label + ': 680px lane must limit only art to .20 opacity'
    art_groups = [element for element in root if element.get('mask') == 'url(#chat-protection)']
    assert len(art_groups) == 1 and name(art_groups[0]) == 'g', label + ': protection mask must wrap only the art group'
    margins = list(art_groups[0])
    assert len(margins) == 2 and all(name(element) == 'svg' and element.get('width') == '38%' for element in margins) and sorted(element.get('x') for element in margins) == ['0','62%'], label + ': art margins must leave the central 24% empty'
    for margin in margins:
        side = 'left' if margin.get('x') == '0' else 'right'
        expected_box = '0 20 320 760' if side == 'left' else '-60 20 320 760'
        assert margin.get('overflow') == 'hidden' and margin.get('viewBox') == expected_box, label + ': complete rooms must render at the selected smaller scale'
        validate_art({'label':label,'kind':'scene','paint_values':paints},margin,patterns)
        authored = [element for element in margin if element.get('data-dither')]
        assert len(authored) == 1 and canonical(authored[0],paints) == canonical(art_sources[document['scene']+'/'+side][0],paints), label + ': room/body/eye geometry changed beyond blink wrapping'
    assert all(element is definitions or element in background or element in art_groups for element in root), label + ': unexpected graphics could introduce a stripe or escape the art margins'
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
    if document['kind'] == 'mascot-fixture':
        body = next(element for element in root.iter() if element.get('data-mascot') == 'body')
        eyes = next(element for element in root.iter() if element.get('data-mascot') == 'eyes')
        validate_body(body,document['label'],document['variant'])
        validate_eyes(eyes,document['label'],document['variant'])
    elif document['kind'] in ('art','actor'):
        art_sources[document['label']] = root
        validate_art(document,root)
    else:
        check_scene(document,root)
assert len(used_art_roles) >= 3, 'Collection must use multiple actual semantic freckle colors'
assert glass_windows >= 1, 'Expected actual upstream graduated glass recipe in room windows'
print('Verified reference freckle paints: ' + ', '.join(sorted(used_art_roles)))
print('Validated original dot ratios at .45 scale, room/eye fingerprints, pane-clipped near/far rain, all 25 art layers and 72 outputs; continuous background is unmasked and the protected 680px art opacity is .20.')
`;
const validation = spawnSync('python3', ['-c', python], { input: JSON.stringify(documents), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (validation.error) throw validation.error;
assert.equal(validation.status, 0, validation.stderr || validation.stdout);
process.stdout.write(validation.stdout);
console.log(`Native Svg source-size limit: longest output ${longestSvg}/${nativeSvgCharacterLimit} characters.`);
console.log('PASS: 12 distinct reference-style rooms, native limits, protected-lane contrast, localized motion/still, actors, and desktop-safe IDs.');
