/** Pixel-built Clawd, independently drawn from the supplied official sticker images. */
export function clawd(x, y, variant = 'plain', scale = 1) {
  const accessories = {
    coffee: '<path d="M75 32h23v22H75z" fill="var(--paper)"/><path d="M98 36h8v13h-8" fill="none" stroke="var(--ink)" stroke-width="4"/><path d="M84 25v-9m8 9v-13" stroke="var(--soft)" stroke-width="3"/>',
    heart: '<path d="M-9 12h8v-6h10v6h8v12L4 37-9 24z" fill="#cf605b"/>',
    headphones: '<path d="M5 30V8h11V0h56v8h11v22" fill="none" stroke="var(--ink)" stroke-width="7"/><path d="M0 25h11v24H0zm77 0h11v24H77z" fill="var(--accent)"/>',
    skateboard: '<path d="M-2 77h96l-7 7H5z" fill="var(--ink)"/><circle cx="17" cy="88" r="5" fill="var(--warm)"/><circle cx="76" cy="88" r="5" fill="var(--warm)"/>',
    wand: '<path d="M81 42l17-35" stroke="var(--ink)" stroke-width="5"/><path d="M99-7l4 8 9 2-7 6 1 9-8-5-8 4 2-9-6-7 10-1z" fill="var(--warm)"/>',
    lightbulb: '<path d="M32-8a13 13 0 1 1 25 0l-6 11H38z" fill="var(--warm)"/><path d="M39 6h12m-10 6h8M44-35v-7M20-23l-6-4m54 4 6-4" stroke="var(--ink)" stroke-width="3"/>',
    magnifier: '<circle cx="84" cy="20" r="15" fill="var(--paper)" fill-opacity=".65" stroke="var(--ink)" stroke-width="5"/><path d="M74 32L60 49" stroke="var(--ink)" stroke-width="7"/><path d="M14 16V5h57v11" fill="var(--ink)"/>',
    dizzy: '<path d="M16 29l8 8m0-8l-8 8M64 29l8 8m0-8l-8 8" stroke="#211d19" stroke-width="4"/><path d="M17-6l8 5-2-9 7-6-9-1-4-8-4 8-9 1 7 6-2 9z" fill="var(--warm)"/>',
    book: '<path d="M12 25h20v17H12zm44 0h20v17H56zM32 31h24" fill="none" stroke="#3e2420" stroke-width="4"/><path d="M68 49h24v25H68z" fill="var(--accent)"/><path d="M71 53h18" stroke="var(--paper)" stroke-width="3"/>',
    bubble: '<path d="M76 27h15v15H76z" fill="none" stroke="var(--ink)" stroke-width="3"/><circle cx="104" cy="12" r="13" fill="none" stroke="var(--soft)" stroke-width="2"/><path d="M99 5l6-2" stroke="var(--paper)" stroke-width="3"/>',
    cape: '<path d="M18 17L2 72l18 9 21-11 30 10 15-9-18-55z" fill="#ae4e3d"/><path d="M29 17h31v14H29z" fill="var(--warm)"/>',
    kite: '<path d="M76 37q29-10 24-68" fill="none" stroke="var(--ink)" stroke-width="2"/><path d="M100-74l23 23-23 25-24-25z" fill="var(--warm)"/><path d="M100-74v48m-24-25h47" stroke="var(--ink)" stroke-width="2"/>',
  };
  // The plain sticker is an 11 × 8 grid: a nine-cell crown, two short
  // side arms, and paired outer feet separated by a three-cell middle gap.
  // An 8px cell keeps the established 88 × 77 accessory canvas and foot line.
  const bodyD = variant === 'coffee'
    ? 'M8 13H80V29H88V45H80V61H72V77H64V61H56V77H48V61H40V77H32V61H24V77H16V61H8V45H0V29H8Z'
    : 'M8 13H80V29H88V45H80V77H72V61H64V77H56V61H32V77H24V61H16V77H8V45H0V29H8Z';
  const eyesD = variant === 'coffee'
    ? 'M20 21h8v8h-8zm40 0h8v8h-8z'
    : 'M16 29h8v8h-8zm48 0h8v8h-8z';
  const eyes = variant === 'dizzy' ? '' : `<g><animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;.94;.95;.96;1" dur="8s" repeatCount="indefinite"/><path d="${eyesD}" fill="#211d19"/></g>`;
  const body = `<path d="${bodyD}" fill="#d77c5c"/>` + eyes;
  // The cape sits behind the body; other props sit in front.
  return `<g transform="translate(${x} ${y}) scale(${scale})">${variant === 'cape' ? accessories.cape : ''}${body}${variant !== 'cape' ? accessories[variant] ?? '' : '<path d="M25 17h38v6H25z" fill="var(--warm)"/>'}</g>`;
}
