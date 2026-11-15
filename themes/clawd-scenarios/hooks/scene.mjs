// Cream wall colors and layered lighting adapted from the MIT rainy-window
// theme by Ishu Agrawal (ae7d9d6); see reference-texture.LICENSE and NOTICE.
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
    walltop: dark ? '#17182d' : '#f2ece2',
    wallmid: dark ? '#1d1c32' : '#efe7db',
    wallbottom: dark ? '#292137' : '#eedfca',
    glowcool: dark ? '#4b58ac' : '#bcc8ee',
    glowrose: dark ? '#884d85' : '#efc9d6',
    glowfloor: dark ? '#bb7855' : '#f3d3b1',
    shade: dark ? '#080b1b' : '#c9b596',
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

function mascotEyes(markup, key, motion) {
  if (!motion) return markup;
  const offset = Object.keys(SCENARIOS).indexOf(key) % 5 * .8;
  return markup.replace(/<path(?=[^>]*\bdata-mascot="eyes")[^>]*\/>/g, eyes =>
    `<g data-detail="mascot-blink"><animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;.93;.945;.96;1" calcMode="discrete" dur="6s" begin="-${offset}s" repeatCount="indefinite"/>${eyes}</g>`);
}

/** Keep environmental motion at the edges and protect the conversation lane. */
export function buildScene(key = 'coffee', appearance = 'auto', motion = true) {
  const scene = SCENARIOS[key];
  if (!scene) throw new RangeError(`Unknown Clawd scenario: ${key}`);
  const light = paletteFor(key, 'light');
  const dark = paletteFor(key, 'dark');
  const colors = appearance === 'dark' ? dark : light;
  const art = DITHERED_SCENES[key];
  const leftMotion = motion ? sceneMotion(key, 'left') : '';
  const rightMotion = motion ? sceneMotion(key, 'right') : '';
  const rightArt = mascotEyes(art.right, key, motion);
  const actor = art.actor ? `<g data-actor="skateboard-rider">${motion ? '<animateTransform attributeName="transform" type="translate" values="0 0;30 0;0 0;-30 0;0 0" dur="10s" repeatCount="indefinite"/>' : ''}${mascotEyes(art.actor, key, motion)}</g>` : '';
  // Continuous room lighting comes from the reference's cream wall, cool window,
  // rose bounce, and warm floor. Only the objects carry a fine printed texture.
  const radial = (id, role, cx, cy, r, alpha) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="var(--${role})" stop-opacity="${alpha}"/><stop offset=".45" stop-color="var(--${role})" stop-opacity="${alpha * .42}"/><stop offset="1" stop-color="var(--${role})" stop-opacity="0"/></radialGradient>`;
  const lighting = radial('room-cool','glowcool',.9,.2,.6,.22) + radial('room-rose','glowrose',.12,.14,.55,.15) + radial('room-floor','glowfloor',.5,1.05,.7,.22);
  const corner = '<linearGradient id="room-corner"><stop offset="0" stop-color="var(--shade)" stop-opacity=".10"/><stop offset=".13" stop-color="var(--shade)" stop-opacity="0"/><stop offset=".87" stop-color="var(--shade)" stop-opacity="0"/><stop offset="1" stop-color="var(--shade)" stop-opacity=".10"/></linearGradient>';
  // Mask only the furniture beneath the transcript, so its background lighting
  // stays continuous and does not acquire a flat rectangular stripe.
  const mask = '<mask id="chat-protection" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect width="100%" height="100%" fill="white"/><svg x="50%" y="0" width="1" height="100%" overflow="visible"><rect x="-340" width="680" height="100%" fill="black" opacity=".80"/></svg></mask>';
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="color-scheme:${appearance === 'auto' ? 'light dark' : appearance}" fill="none"><defs><linearGradient id="room-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--walltop)"/><stop offset=".55" stop-color="var(--wallmid)"/><stop offset="1" stop-color="var(--wallbottom)"/></linearGradient>${lighting}${corner}${mask}</defs><rect width="100%" height="100%" fill="url(#room-wall)"/><rect width="100%" height="100%" fill="url(#room-cool)"/><rect width="100%" height="100%" fill="url(#room-rose)"/><rect width="100%" height="100%" fill="url(#room-floor)"/><rect width="100%" height="100%" fill="url(#room-corner)"/><g mask="url(#chat-protection)"><svg x="0" y="0" width="25%" height="100%" viewBox="0 -200 320 1000" preserveAspectRatio="xMinYMax meet" overflow="hidden">${art.left}${leftMotion}</svg><svg x="75%" y="0" width="25%" height="100%" viewBox="-60 -200 320 1000" preserveAspectRatio="xMaxYMax meet" overflow="hidden">${rightArt}${actor}${rightMotion}</svg></g></svg>`;
  svg = svg.replace(/var\(--([a-z]+)\)/g, (_match, name) => {
    if (!(name in colors)) throw new Error(`Unknown scene color: ${name}`);
    return appearance === 'auto' ? `light-dark(${light[name]},${dark[name]})` : colors[name];
  });
  if (!motion) svg = svg.replace(/<animate(?:Transform|Motion)?\b[^>]*(?:\/>|>[\s\S]*?<\/animate(?:Transform|Motion)?>)/g, '');
  return svg;
}
