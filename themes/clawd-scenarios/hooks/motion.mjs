// Local SVG motion follows the reference room's falling rain and rising wisps.
// Definitions and artwork stay inside their own margin; the room itself is still.
const ink = 'var(--ink)';
const at = (x, y, content) => `<g transform="translate(${x} ${y})">${content}</g>`;
const loop = (seconds, offset = 0) => `dur="${seconds}s" begin="${-offset}s" repeatCount="indefinite"`;
const square = (x, y, size = 2) => `M${x} ${y}h${size}v${size}h-${size}z`;
const filled = (data, color = ink) => `<path d="${data}" fill="${color}"/>`;
const dotted = (data, color = ink, width = 2.2, gap = 4.5) => `<path d="${data}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="0 ${gap}"/>`;

function pixels(rows, size = 1.8, color = ink) {
  let data = '';
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    if (rows[y][x] !== ' ') data += square(x * size, y * size, size);
  }
  return filled(data, color);
}
const sparkle = (color = ink) => pixels(['  #  ', '  #  ', '#####', '  #  ', '  #  '], 1.4, color);
const littleHeart = () => pixels([' ## ## ', '#######', '#######', ' ##### ', '  ###  ', '   #   '], 1.6, '#d77c5c');

function rise(content, dx, dy, seconds, offset = 0) {
  const timing = loop(seconds, offset);
  return `<g><animateTransform attributeName="transform" type="translate" from="0 0" to="${dx} ${dy}" ${timing}/><animate attributeName="opacity" values="0;.85;.65;0" keyTimes="0;.12;.72;1" ${timing}/>${content}</g>`;
}
function sway(content, dx, dy, seconds, offset = 0) {
  return `<g><animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};0 0" ${loop(seconds, offset)}/>${content}</g>`;
}
function breathe(content, seconds = 3, offset = 0) {
  return `<g><animate attributeName="opacity" values=".15;.9;.15" ${loop(seconds, offset)}/>${content}</g>`;
}
function turn(content, seconds) {
  return `<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" ${loop(seconds)}/>${content}</g>`;
}
function arc(radius, start, end, color = ink, width = 2.1) {
  const from = start * Math.PI / 180;
  const to = end * Math.PI / 180;
  const point = angle => `${(Math.cos(angle) * radius).toFixed(2)} ${(Math.sin(angle) * radius).toFixed(2)}`;
  return dotted(`M${point(from)}A${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${point(to)}`, color, width);
}

function windowRain(id, panes) {
  const bounds = panes.reduce((box, [x, y, width, height]) => [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x + width), Math.max(box[3], y + height)], [260, 800, 0, 0]);
  const [left, top, right, bottom] = bounds;
  const clips = panes.map(([x, y, width, height]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}"/>`).join('');
  function layer(tile, seconds, width, opacity, spacing, seed) {
    let data = '';
    for (let column = 0, x = left + 5; x < right; x += spacing, column++) {
      const phase = (column * 23 + seed) % tile;
      for (let y = top - tile * 2 + phase; y < bottom + tile; y += tile) {
        data += `M${x} ${y}l-5 ${width > 2 ? 21 : 15}`;
      }
    }
    return `<g opacity="${opacity}"><animateTransform attributeName="transform" type="translate" from="0 0" to="0 ${tile}" ${loop(seconds, seconds * .37)}/>${dotted(data, ink, width, width > 2 ? 4.4 : 5.2)}</g>`;
  }
  // Tiled copies meet at the loop boundary; clipping protects sills and mullions.
  return `<defs><clipPath id="${id}">${clips}</clipPath></defs><g data-effect="window-rain" clip-path="url(#${id})">${layer(108, 3.4, 1.3, .35, 23, 17)}${layer(144, 2.1, 2.3, .75, 31, 53)}</g>`;
}

function steam(x, y) {
  const wisp = dotted('M0 0q-7 -9 0 -18t0 -18', ink, 2.3, 4.2);
  return `<g data-effect="cup-steam">${at(x, y, rise(wisp, 4, -28, 2.8))}${at(x + 8, y + 3, rise(wisp, -3, -30, 3.5, 1.7))}</g>`;
}
function dust(x, y, count = 5, dx = 10, dy = -28, seconds = 5) {
  return Array.from({ length: count }, (_, index) => at(x + index % 3 * 13, y + Math.floor(index / 3) * 16,
    rise(filled(square(0, 0, index % 2 ? 2 : 2.5)), dx, dy, seconds + index % 2, index * .8))).join('');
}
function dottedCloud() {
  return dotted('M0 17q0 -11 12 -9q5 -18 20 -10q12 -8 21 7q17 -1 17 13H0', ink, 2.2, 5);
}

const effects = {
  coffee: {
    left: () => windowRain('motion-coffee-left-glass', [[29,147,72,99],[117,147,72,99],[29,263,72,99],[117,263,72,99]]),
    right: () => steam(164, 647) + steam(222, 565),
  },
  heart: {
    left: () => at(66, 450, rise(littleHeart(), 6, -48, 5.5, 2)),
    right: () => [0,1,2].map(index => at(99 + index * 40, 579 + index % 2 * 16, rise(littleHeart(), index % 2 ? -8 : 8, -57, 5 + index, index * 1.9))).join(''),
  },
  headphones: {
    left: () => at(78, 451, turn(arc(21, 0, 100, 'var(--paper)', 2.7) + arc(14, 180, 260, 'var(--paper)', 2.4) + filled('M20 -2h5v3h-5z', '#d77c5c'), 6.5)),
    right: () => Array.from({ length: 5 }, (_, index) => at(128 + index * 9, 422,
      `<g><animateTransform attributeName="transform" type="scale" values="1 .25;1 1;1 .4;1 .85;1 .25" ${loop(2 + index * .3, index * .4)}/>${dotted('M0 0V-24', 'var(--accent)', 3, 5)}</g>`)).join(''),
  },
  skateboard: {
    left: () => dust(120, 685, 4, -26, -12, 2.5),
    right: () => dust(72, 720, 5, -34, -11, 2.4),
  },
  wand: {
    left: () => at(194, 390, breathe(sparkle('var(--warm)'), 2.6)),
    right: () => at(226, 596, turn(at(-16,-3,breathe(sparkle('var(--warm)'),2.4)) + at(2,-20,breathe(sparkle(),3.2,1)) + at(12,6,filled(square(0,0,3))), 7)),
  },
  lightbulb: {
    left: () => at(68,310,breathe(arc(22,185,350,'var(--warm)',2.5) + arc(30,190,345,'var(--warm)',2),2.8)),
    right: () => at(182,85,breathe(arc(35,0,359,'var(--warm)',2.7) + arc(43,15,345,'var(--warm)',2),2.5)),
  },
  magnifier: {
    left: () => windowRain('motion-magnifier-left-glass', [[36,308,77,75]]),
    right: () => windowRain('motion-magnifier-right-glass', [[43,49,76,98],[138,49,76,98],[43,169,76,98],[138,169,76,98]]),
  },
  dizzy: {
    left: () => at(128,110,turn(arc(63,5,125) + at(60,-4,sparkle('var(--warm)')),22)) + at(35,224,breathe(sparkle(),2.7)),
    right: () => at(126,322,turn(arc(38,10,105) + at(-29,20,sparkle('var(--warm)')),18)) + at(202,415,breathe(sparkle(),3.4,1)),
  },
  book: {
    left: () => dust(68,470,4,10,-24,4.5),
    right: () => `<g data-effect="reading-lamp-dust">${dust(164,538,6,-10,-32,4.5)}</g>`,
  },
  bubble: {
    left: () => at(105,535,rise(arc(6,0,359,ink,2),8,-48,8,3)),
    right: () => at(173,435,rise(arc(18,0,359,ink,2.2) + at(-7,-10,filled(square(0,0,3),'var(--paper)')),9,-78,9)) + at(76,490,rise(arc(11,0,359,ink,2),-9,-65,11,4)),
  },
  cape: {
    left: () => at(127,243,sway(dottedCloud(),40,-3,21)),
    right: () => at(45,299,sway(dottedCloud(),42,-4,18)),
  },
  kite: {
    left: () => at(81,219,sway(dotted('M0 0q12 8 0 16t0 16',ink,2.5,4) + at(-3,11,pixels(['# #',' # ','# #'],1.5,'var(--warm)')),11,3,4)),
    right: () => at(175,280,sway(dotted('M0 0q13 9 0 18t0 18',ink,2.5,4) + at(-4,12,pixels(['# #',' # ','# #'],1.8,'var(--warm)')),12,-3,4.5)),
  },
};

/** Return actual scene-local environmental movement; the center never receives art. */
export function sceneMotion(key, side = 'right') {
  const effect = effects[key]?.[side];
  return effect ? `<g data-motion="${key}-${side}">${effect()}</g>` : '';
}
