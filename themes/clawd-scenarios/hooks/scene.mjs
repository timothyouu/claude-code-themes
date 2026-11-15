import { scenesA } from './scenes-a.mjs';
import { scenesB } from './scenes-b.mjs';
import { DITHERED_SCENES } from './dithered.mjs';
import { sceneMotion } from './motion.mjs';
export const SCENARIOS = Object.freeze({ ...scenesA, ...scenesB });

export function paletteFor(key, appearance = 'light') {
  const scene = SCENARIOS[key];
  if (!scene) throw new RangeError(`Unknown Clawd scenario: ${key}`);
  const dark = appearance === 'dark';
  return {
    bg: dark ? scene.dark : scene.light,
    ink: dark ? '#fff8e8' : '#292821',
    soft: dark ? '#faf3e4' : '#34332b',
    accent: scene.accent,
    warm: dark ? '#d8b975' : '#b68b3f',
    cool: dark ? '#627fac' : '#9fb9d9',
    leaf: dark ? '#87a584' : '#738e68',
    paper: dark ? '#272a28' : '#f8f3e7',
    panel: dark ? '#56658d' : '#b7c8e6',
    line: dark ? '#7c8099' : '#8d8ea4',
  };
}

/** Edge-anchored art leaves a full-width opaque conversation lane available to Claude. */
export function buildScene(key = 'coffee', appearance = 'auto', motion = true) {
  const scene = SCENARIOS[key];
  if (!scene) throw new RangeError(`Unknown Clawd scenario: ${key}`);
  const light = paletteFor(key, 'light');
  const dark = paletteFor(key, 'dark');
  const colors = appearance === 'dark' ? dark : light;
  const art = DITHERED_SCENES[key];
  const leftMotion = motion ? sceneMotion(key, 'left') : '';
  const rightMotion = motion ? sceneMotion(key, 'right') : '';
  const actor = art.actor ? `<g data-actor="skateboard-rider">${motion ? '<animateTransform attributeName="transform" type="translate" values="0 0;18 0;0 0;-18 0;0 0" dur="24s" repeatCount="indefinite"/>' : ''}${art.actor}</g>` : '';
  // A fixed transcript veil also protects text when Claude's conversation spans
  // most of a narrow window. Wide windows retain stronger art outside this lane.
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="color-scheme:${appearance === 'auto' ? 'light dark' : appearance}" fill="none"><rect width="100%" height="100%" fill="var(--bg)"/><svg x="0" y="0" width="25%" height="100%" viewBox="0 0 260 800" preserveAspectRatio="xMinYMax meet" overflow="hidden">${art.left}${leftMotion}</svg><svg x="75%" y="0" width="25%" height="100%" viewBox="0 0 260 800" preserveAspectRatio="xMaxYMax meet" overflow="hidden">${art.right}${actor}${rightMotion}</svg><svg x="50%" y="0" width="1" height="100%" overflow="visible"><rect x="-340" width="680" height="100%" fill="var(--bg)" opacity=".70"/></svg></svg>`;
  svg = svg.replace(/var\(--([a-z]+)\)/g, (_match, name) => {
    if (!(name in colors)) throw new Error(`Unknown scene color: ${name}`);
    return appearance === 'auto' ? `light-dark(${light[name]},${dark[name]})` : colors[name];
  });
  if (!motion) svg = svg.replace(/<animate(?:Transform|Motion)?\b[^>]*(?:\/>|>[\s\S]*?<\/animate(?:Transform|Motion)?>)/g, '');
  return svg;
}
