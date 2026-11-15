// Small, independently drawn terminal glyphs animate over the static scenery.
// Every effect lives in its own margin. No source illustration moves with it.
const number = value => Math.round(value * 100) / 100;
const square = (x, y, size = 1.5) => `M${number(x)} ${number(y)}h${size}v${size}h-${size}z`;
const path = (data, fill = 'var(--ink)') => `<path d="${data}" fill="${fill}"/>`;
const at = (x, y, content) => `<g transform="translate(${x} ${y})">${content}</g>`;
const phase = (seconds, offset = 0) => `dur="${seconds}s" begin="${-offset}s" repeatCount="indefinite"`;

function pattern(rows, size = 1.4, fill = 'var(--ink)') {
  let data = '';
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== ' ') data += square(x * size, y * size, size);
    }
  }
  return path(data, fill);
}

const plus = (fill = 'var(--ink)') => pattern(['  #  ', '  #  ', '#####', '  #  ', '  #  '], 1.1, fill);
const heart = () => pattern([' ## ## ', '#######', '#######', ' ##### ', '  ###  ', '   #   '], 1.2, '#d77c5c');
const droplet = () => path(square(2, 0, 1.5) + square(1, 4, 1.5) + square(0, 8, 1.5));

function slide(content, dx, dy, seconds, offset = 0, fade = true) {
  const timing = phase(seconds, offset);
  const alpha = fade ? `<animate attributeName="opacity" values="0;.65;.65;0" keyTimes="0;.15;.72;1" ${timing}/>` : '';
  return `<g><animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy}" ${timing}/>${alpha}${content}</g>`;
}

function sway(content, dx, dy, seconds, offset = 0) {
  return `<g><animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};0 0" ${phase(seconds, offset)}/>${content}</g>`;
}

function breathe(content, seconds = 12, offset = 0) {
  return `<g><animate attributeName="opacity" values=".12;.55;.12" ${phase(seconds, offset)}/>${content}</g>`;
}

function rotate(content, seconds) {
  return `<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" ${phase(seconds)}/>${content}</g>`;
}

function arc(radius, start = 0, end = 360, steps = 24, fill = 'var(--ink)') {
  let data = '';
  for (let step = 0; step < steps; step++) {
    const angle = (start + (end - start) * step / steps) * Math.PI / 180;
    data += square(Math.cos(angle) * radius - .75, Math.sin(angle) * radius - .75);
  }
  return path(data, fill);
}

function rainPane(x, y, width, height, count, seed = 0) {
  let rain = '';
  for (let index = 0; index < count; index++) {
    // Leave enough space for the full 32px travel and dotted 10px drop.
    const px = x + 5 + ((index * 23 + seed * 7) % (width - 12));
    const py = y + 4 + ((index * 31 + seed * 11) % (height - 48));
    rain += at(px, py, slide(droplet(), -2, 32, 8 + index % 4 * 2, index * 2.3 + seed));
  }
  return `<g data-effect="window-rain">${rain}</g>`;
}

function steam(x, y) {
  const curl = pattern(['  # ', ' #  ', ' #  ', '  # ', '  # ', ' #  ', '#   '], 1.3, 'var(--ink)');
  return `<g data-effect="cup-steam">${at(x, y, slide(curl, 4, -29, 10))}${at(x + 8, y + 4, slide(curl, -3, -32, 12, 5))}</g>`;
}

function dust(x, y, count = 6, dx = 7, dy = -22) {
  return Array.from({ length: count }, (_, index) => at(x + index % 3 * 13, y + Math.floor(index / 3) * 20,
    slide(path(square(0, 0, index % 2 ? 1.2 : 1.8)), dx, dy, 12 + index % 3 * 3, index * 2.8))).join('');
}

function cloudEdge() {
  const points = [[0,12],[4,8],[8,8],[12,4],[16,0],[20,0],[24,4],[28,8],[32,4],[36,4],[40,8],[44,12],[48,12],[52,16],[48,20],[40,20],[32,20],[24,20],[16,20],[8,20],[0,20]];
  return path(points.map(([x, y]) => square(x, y, 1.5)).join(''));
}

const effects = {
  coffee: {
    left: () => rainPane(29, 147, 72, 99, 5, 1) + rainPane(117, 147, 72, 99, 5, 2) + rainPane(29, 263, 72, 99, 4, 3) + rainPane(117, 263, 72, 99, 4, 4),
    right: () => steam(160, 635) + steam(217, 557),
  },
  heart: {
    left: () => at(65, 441, slide(heart(), 4, -28, 16, 3)),
    right: () => [0, 1, 2].map(index => at(101 + index * 42, 570 + index % 2 * 18, slide(heart(), index % 2 ? -5 : 5, -42, 14 + index * 3, index * 5))).join(''),
  },
  headphones: {
    // The actual record on the turntable is at (78,451), radius 31.
    left: () => at(78, 451, rotate(arc(21, 0, 75, 8, 'var(--paper)') + arc(14, 180, 245, 6, 'var(--paper)'), 18)),
    right: () => Array.from({ length: 5 }, (_, index) => at(128 + index * 9, 402 - index % 2 * 7, breathe(pattern(['#', '#', '#', '#'], 1.7, 'var(--warm)'), 8 + index * 2, index * 1.6))).join(''),
  },
  skateboard: {
    // The separate actor is owned by the scene composer; these are wheel puffs.
    left: () => dust(120, 681, 4, -17, -8),
    right: () => dust(72, 717, 5, -22, -7),
  },
  wand: {
    left: () => at(194, 390, breathe(plus('var(--warm)'), 12)),
    right: () => at(226, 596, rotate(at(-14, -4, plus('var(--warm)')) + at(2, -19, plus('var(--ink)')) + at(9, 5, path(square(0, 0, 2))), 30)),
  },
  lightbulb: {
    left: () => at(68, 310, breathe(arc(20, 185, 350, 15, 'var(--warm)') + arc(27, 190, 345, 10, 'var(--warm)'), 14)),
    right: () => at(182, 85, breathe(arc(35, 0, 360, 24, 'var(--warm)') + arc(42, 15, 345, 12, 'var(--warm)'), 12)),
  },
  magnifier: {
    left: () => rainPane(36, 308, 77, 75, 5, 2),
    right: () => rainPane(43, 49, 76, 98, 5, 1) + rainPane(138, 49, 76, 98, 5, 2) + rainPane(43, 169, 76, 98, 4, 3) + rainPane(138, 169, 76, 98, 4, 4),
  },
  dizzy: {
    left: () => at(128, 110, rotate(arc(63, 5, 125, 14) + at(62, -3, plus('var(--warm)')), 90)),
    right: () => at(126, 322, rotate(arc(38, 10, 105, 10) + at(-28, 21, plus('var(--warm)')), 72)),
  },
  book: {
    left: () => dust(68, 470, 4, 8, -17),
    right: () => `<g data-effect="reading-lamp-dust">${dust(164, 538, 7, -8, -23)}</g>`,
  },
  bubble: {
    left: () => at(105, 535, slide(arc(5, 0, 360, 12), 5, -28, 15, 4)),
    right: () => at(173, 435, slide(arc(16, 0, 360, 26) + at(-7, -9, path(square(0, 0, 2))), 8, -77, 22)) + at(76, 490, slide(arc(10, 0, 360, 18), -7, -64, 18, 9)),
  },
  cape: {
    left: () => at(129, 243, sway(cloudEdge(), 17, 0, 44)),
    right: () => at(45, 299, sway(cloudEdge(), 23, -3, 40)),
  },
  kite: {
    left: () => at(81, 219, sway(pattern(['#    ', ' #   ', '  #  ', '   # ', '  #  ', ' #   ', '#    '], 1.5), 7, 3, 12)),
    right: () => at(175, 280, sway(pattern(['#      ', ' #     ', '  #    ', '   #   ', '    #  ', '   #   ', '  #    ', ' #     ', '#      '], 1.5) + at(-3, 5, pattern(['# #', ' # ', '# #'], 1.2, 'var(--warm)')), 9, -2, 14)),
  },
};

/** Return localized, glyph-only motion for one of the twelve scene margins. */
export function sceneMotion(key, side = 'right') {
  const effect = effects[key]?.[side];
  if (!effect) return '';
  return `<g data-motion="${key}-${side}">${effect()}</g>`;
}
