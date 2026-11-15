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
  assert.match(sides.join(''), /<path\b(?=[^>]*data-mascot="body")(?=[^>]*fill="#d77c5c")/i, `${key}: solid terracotta Clawd foreground must remain present`);
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
      if (actor) assert(svg.includes(resolve(actor)), `${key}/${mode}: actor must be visible in both motion states`);
      assert(sides.every(side => svg.includes(resolve(side))), `${key}/${mode}: runtime must embed the generated room contours`);
      for (const duration of svg.matchAll(/dur="([\d.]+)s"/g)) assert(Number(duration[1]) >= 8, `${key}/${mode}: localized motion must remain slow`);
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
used_art_roles = set()

def validate_art(document, root):
    label = document['label']
    patterns = {element.get('id'): element for element in root.iter() if name(element) == 'pattern'}
    ids = [element.get('id') for element in root.iter() if element.get('id')]
    assert len(ids) == len(set(ids)), label + ': pattern IDs collide'
    paints = document.get('paint_values', {role: 'var(--' + role + ')' for role in ART_ROLES})
    for pattern in patterns.values():
        role = pattern.get('data-paint')
        assert role in ART_ROLES, label + ': halftone pattern needs a known semantic color'
        assert pattern.get('width') == '6' and pattern.get('height') == '6' and pattern.get('patternUnits') == 'userSpaceOnUse', label + ': reference halftone must tile at 6px in fixed coordinates'
        assert len(pattern) == 2, label + ': reference halftone needs one wash rectangle and one round dot'
        wash, dot = pattern
        assert name(wash) == 'rect' and name(dot) == 'circle', label + ': reference furniture requires wash + round halftone, not square glyphs'
        assert wash.get('width') == '6' and wash.get('height') == '6', label + ': wash must cover its tile'
        assert dot.get('cx') == '3' and dot.get('cy') == '3' and 1.8 <= float(dot.get('r', '0')) <= 2.4, label + ': round halftone dot must be centered and readable'
        assert .15 <= float(wash.get('opacity', '1')) <= .3 and .6 <= float(dot.get('opacity', '1')) <= .85, label + ': halftone wash/dot opacity must preserve the authored object'
        assert wash.get('fill') == paints[role] and dot.get('fill') == paints[role], label + ': halftone paints must match their semantic role'
    visible_shapes = []
    outlined_shapes = []
    round_contours = []
    def walk(element, in_defs=False):
        tag = name(element)
        in_defs = in_defs or tag == 'defs'
        assert tag not in ('image', 'foreignObject', 'script', 'style', 'mask'), label + ': unsupported or externally rendered artwork'
        assert not any(attribute in element.attrib for attribute in ('style', 'mask', 'shape-rendering')), label + ': unsupported rendering controls'
        assert element.get('data-cells') is None and element.get('data-glyph') is None, label + ': obsolete point-cell artwork remains'
        if element.get('data-dither'):
            assert element.get('data-dither') == '6px-reference-halftone', label + ': expected reference-style room rendering'
        for attribute in ('fill', 'stroke'):
            paint = element.get(attribute)
            if paint is None or paint == 'none':
                continue
            if paint.startswith('url('):
                reference = re.fullmatch(r'url\(#([a-zA-Z0-9_-]+)\)', paint)
                assert reference and reference.group(1) in patterns, label + ': missing local halftone reference'
                if not in_defs and document['kind'] in ('art', 'actor'):
                    used_art_roles.add(patterns[reference.group(1)].get('data-paint'))
            else:
                assert paint in set(paints.values()) | {'#d77c5c', '#211d19'}, label + ': unknown freeform art paint ' + paint
        if tag in ('path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon') and not in_defs:
            visible_shapes.append(element)
            if element.get('stroke') not in (None, 'none') and float(element.get('stroke-width', '1')) >= 1:
                outlined_shapes.append(element)
            if tag in ('circle', 'ellipse') or (tag == 'path' and re.search('[AaCcQqSsTt]', element.get('d', ''))):
                round_contours.append(element)
        if element.get('data-mascot') in ('body', 'eyes'):
            expected = '#d77c5c' if element.get('data-mascot') == 'body' else '#211d19'
            assert element.get('fill') == expected, label + ': mascot must retain its solid pixel paint'
            assert re.fullmatch(r'[MmLlHhVvZz0-9.,+\-\s]+', element.get('d', '')), label + ': mascot must retain geometric pixel contours'
        if element.get('data-motion'):
            for glyph in element.iter():
                if name(glyph) == 'path':
                    assert re.fullmatch(r'[MmLlHhVvZz0-9.,+\-\s]+', glyph.get('d', '')), label + ': localized motion must retain square-glyph geometry'
        for child in element:
            walk(child, in_defs)
    walk(root)
    if document['kind'] == 'art':
        assert 10 <= len(visible_shapes) <= 1500, label + ': expected composed furniture geometry, not a dense point cloud'
        assert len(outlined_shapes) >= 3, label + ': furniture must retain readable outlines'
        assert round_contours, label + ': original rounded furniture/scenery contours are missing'
        assert patterns and any(element.get('fill', '').startswith('url(') for element in visible_shapes), label + ': authored room must actually use round halftone fills'
    if label == 'skateboard/left':
        spectators = [element for element in root.iter() if element.get('data-mascot') == 'body']
        assert len(spectators) == 2, label + ': expected two stationary Clawd bodies'

def check_scene(document, root):
    label = document['label']
    ids = [element.get('id') for element in root.iter() if element.get('id')]
    assert len(ids) == len(set(ids)), label + ': cross-margin or actor pattern IDs collide'
    margins = [element for element in root.iter() if name(element) == 'svg' and element is not root and element.get('width') == '25%']
    assert len(margins) == 2, label + ': exactly two 25% art margins required'
    assert sorted(element.get('x') for element in margins) == ['0', '75%'], label + ': center 50% must remain free of art'
    for margin in margins:
        assert margin.get('overflow') == 'hidden' and margin.get('viewBox') == '0 0 260 800', label + ': clipped 800px margin must retain footer padding'
    veils = [element for element in root.iter() if name(element) == 'svg' and element.get('x') == '50%' and element.get('overflow') == 'visible']
    veil_rectangles = []
    for veil in veils:
        assert veil in list(root) and veil.get('width') == '1' and veil.get('height') == '100%', label + ': text-lane veil must use root coordinates'
        assert all(margin in list(root) and list(root).index(veil) > list(root).index(margin) for margin in margins), label + ': text-lane veil must paint after artwork'
        for rectangle in veil:
            if name(rectangle) == 'rect' and rectangle.get('x') == '-340' and rectangle.get('width') == '680':
                alpha = float(rectangle.get('opacity', '1')) * float(rectangle.get('fill-opacity', '1')) * float(veil.get('opacity', '1'))
                assert math.isclose(alpha, .7) and rectangle.get('height') == '100%', label + ': protected 680px lane must use the selected .70 veil'
                background = next(element for element in root if name(element) == 'rect')
                assert rectangle.get('fill') == background.get('fill'), label + ': protected lane must match the background'
                veil_rectangles.append(rectangle)
    assert len(veil_rectangles) == 1, label + ': missing protected 680px lane'
    def walk(element, within_margin=False, within_defs=False):
        tag = name(element)
        within_margin = within_margin or element in margins
        within_defs = within_defs or tag == 'defs'
        if element in margins:
            validate_art({'label': label, 'kind': 'scene', 'paint_values': document['paint_values']}, element)
        if tag in ('path', 'circle', 'ellipse', 'rect', 'text', 'image', 'line', 'polygon', 'polyline', 'use') and not within_margin and not within_defs:
            assert (tag == 'rect' and element.get('width') == '100%' and element.get('height') == '100%') or element in veil_rectangles, label + ': art escapes its selected side margins'
        for child in element:
            walk(child, within_margin, within_defs)
    walk(root)
    labels = [element.get('data-motion') for element in root.iter() if element.get('data-motion')]
    expected_labels = [document['scene'] + '-left', document['scene'] + '-right'] if document['motion'] else []
    assert sorted(labels) == sorted(expected_labels), label + ': localized motion layers must occur once per side only when enabled'
    actors = [element for element in root.iter() if element.get('data-actor')]
    assert len(actors) == (1 if document['scene'] == 'skateboard' else 0), label + ': only skateboard gets one independently moving actor'
    if actors:
        actor = actors[0]
        assert actor.get('data-actor') == 'skateboard-rider', label + ': unexpected actor identity'
        animations = [element for element in actor.iter() if name(element).startswith('animate')]
        assert len(animations) == (1 if document['motion'] else 0), label + ': exactly one rider moves only in motion mode'
        if animations:
            animation = animations[0]
            assert animation.get('type') == 'translate' and animation.get('dur') == '24s' and animation.get('values') == '0 0;18 0;0 0;-18 0;0 0', label + ': rider movement must remain restrained and independent'

for document in json.load(sys.stdin):
    root = ET.fromstring(document['svg'])
    if document['kind'] in ('art', 'actor'):
        validate_art(document, root)
    else:
        check_scene(document, root)
assert len(used_art_roles) >= 3, 'Room collection must use at least three actual semantic halftone colors'
print('Verified reference halftone paints: ' + ', '.join(sorted(used_art_roles)))
print('Validated authored contours and round 6px halftone in 25 art layers and all 72 outputs; center 50% clear, protected text lane 680px at .70 veil.')
`;
const validation = spawnSync('python3', ['-c', python], { input: JSON.stringify(documents), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (validation.error) throw validation.error;
assert.equal(validation.status, 0, validation.stderr || validation.stdout);
process.stdout.write(validation.stdout);
console.log(`Native Svg source-size limit: longest output ${longestSvg}/${nativeSvgCharacterLimit} characters.`);
console.log('PASS: 12 distinct reference-style rooms, native limits, protected-lane contrast, localized motion/still, actors, and desktop-safe IDs.');
