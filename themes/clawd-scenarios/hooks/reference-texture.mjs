/**
 * Adapted from rainy-window/hooks/scene.ts in ishuagrawal/claude-code-themes,
 * revision ae7d9d6. Copyright (c) 2026 Ishu Agrawal. MIT licensed; see
 * reference-texture.LICENSE. This adapts dotPaint, dotted, dline and halftone.
 */
export const PITCH = 6;
export const RADII = Object.freeze([2.6, 2.1, 1.6, 1.15, .75]);

export function createReferenceTexture(prefix) {
  const dots = new Map();
  function dotPaint(density, role) {
    const key = `${density}|${role}`;
    if (!dots.has(key)) dots.set(key, `${prefix}-${role.startsWith('#') ? `fixed-${role.slice(1)}` : role}-d${density}`);
    return `url(#${dots.get(key)})`;
  }
  const dotted = (density, inner) => inner.replace(/\b(fill|stroke)="var\(--([a-z]+)\)"/g, (_match, kind, role) => `${kind}="${dotPaint(density, role)}"`);
  const dline = (d, role, width = 4.6, extra = '') => `<path d="${d}" data-texture="dline" stroke="var(--${role})" fill="none" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 ${PITCH}"${extra ? ` ${extra}` : ''}/>`;
  const halftone = (shape, rings = [[1.5, 3], [1.25, 2], [1, 0]]) => rings.map(([scale, density]) => dotted(density, shape(scale, density))).join('');
  function patterns() {
    return [...dots].map(([key, id]) => {
      const [density, role] = key.split('|');
      const fixed=role.startsWith('#');
      const paint=fixed?role:`var(--${role})`;
      return `<pattern id="${id}" data-paint="${fixed?'mascot':role}"${fixed?` data-color="${role}"`:''} data-texture="density-${density}" data-density="${density}" width="${PITCH}" height="${PITCH}" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="${RADII[Number(density)]}" fill="${paint}"/></pattern>`;
    }).join('');
  }
  return { dotPaint, dotted, dline, halftone, patterns };
}
