/** Pixel-built Clawd, redrawn for these scenes from the supplied character references. */
export function clawd(x, y, variant = 'plain', scale = 1) {
  const accessories = {
    coffee: '<path d="M75 32h23v22H75z" fill="var(--paper)"/><path d="M98 36h8v13h-8" fill="none" stroke="var(--ink)" stroke-width="4"/><path d="M84 25v-9m8 9v-13" stroke="var(--soft)" stroke-width="3"/>',
    heart: '<path d="M-9 12h8v-6h10v6h8v12L4 37-9 24z" fill="#cf605b"/>',
    headphones: '<path d="M11 30V8h12V0h42v8h12v22" fill="none" stroke="var(--ink)" stroke-width="7"/><path d="M7 24h12v25H7zm62 0h12v25H69z" fill="var(--accent)"/>',
    skateboard: '<path d="M-2 77h96l-7 7H5z" fill="var(--ink)"/><circle cx="17" cy="88" r="5" fill="var(--warm)"/><circle cx="76" cy="88" r="5" fill="var(--warm)"/>',
    wand: '<path d="M81 42l17-35" stroke="var(--ink)" stroke-width="5"/><path d="M99-7l4 8 9 2-7 6 1 9-8-5-8 4 2-9-6-7 10-1z" fill="var(--warm)"/>',
    lightbulb: '<path d="M32-8a13 13 0 1 1 25 0l-6 11H38z" fill="var(--warm)"/><path d="M39 6h12m-10 6h8M44-35v-7M20-23l-6-4m54 4 6-4" stroke="var(--ink)" stroke-width="3"/>',
    magnifier: '<circle cx="84" cy="20" r="15" fill="var(--paper)" fill-opacity=".65" stroke="var(--ink)" stroke-width="5"/><path d="M74 32L60 49" stroke="var(--ink)" stroke-width="7"/><path d="M14 16V5h57v11" fill="var(--ink)"/>',
    dizzy: '<path d="M23 27l10 10m0-10L23 37m29-10 10 10m0-10L52 37" stroke="#211d19" stroke-width="4"/><path d="M17-6l8 5-2-9 7-6-9-1-4-8-4 8-9 1 7 6-2 9z" fill="var(--warm)"/>',
    book: '<path d="M15 23h23v19H15zm35 0h23v19H50zM38 30h12" fill="none" stroke="#3e2420" stroke-width="4"/><path d="M68 49h24v25H68z" fill="var(--accent)"/><path d="M71 53h18" stroke="var(--paper)" stroke-width="3"/>',
    bubble: '<path d="M76 27h15v15H76z" fill="none" stroke="var(--ink)" stroke-width="3"/><circle cx="104" cy="12" r="13" fill="none" stroke="var(--soft)" stroke-width="2"/><path d="M99 5l6-2" stroke="var(--paper)" stroke-width="3"/>',
    cape: '<path d="M18 17L2 72l18 9 21-11 30 10 15-9-18-55z" fill="#ae4e3d"/><path d="M29 17h31v14H29z" fill="var(--warm)"/>',
    kite: '<path d="M76 37q29-10 24-68" fill="none" stroke="var(--ink)" stroke-width="2"/><path d="M100-74l23 23-23 25-24-25z" fill="var(--warm)"/><path d="M100-74v48m-24-25h47" stroke="var(--ink)" stroke-width="2"/>',
  };
  const eyes = variant === 'dizzy' ? '' : '<g><animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;.94;.95;.96;1" dur="8s" repeatCount="indefinite"/><path d="M20 26h7v8h-7zm39 0h7v8h-7z" fill="#211d19"/></g>';
  const body = '<path d="M10 12h67v10h10v20H77v18h-7v17H59V60H49v17H39V60H29v17H18V60h-8V42H0V22h10z" fill="#d77c5c"/>' + eyes;
  // The cape sits behind the body; other props sit in front.
  return `<g transform="translate(${x} ${y}) scale(${scale})">${variant === 'cape' ? accessories.cape : ''}${body}${variant !== 'cape' ? accessories[variant] ?? '' : '<path d="M25 17h38v6H25z" fill="var(--warm)"/>'}</g>`;
}
