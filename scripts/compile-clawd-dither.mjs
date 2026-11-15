#!/usr/bin/env node
/**
 * Compile the source rooms into native reference-style halftone SVG geometry.
 * Generation needs only Node. Optional contact sheets use an existing Sharp module;
 * no package is installed and the theme has no runtime graphics dependency.
 * Usage: node scripts/compile-clawd-dither.mjs [--contact-sheet=/tmp/clawd.png]
 * Optional --sharp=/absolute/path or SHARP_MODULE selects that existing review tool.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { scenesA } from '../themes/clawd-scenarios/hooks/scenes-a.mjs';
import { scenesB } from '../themes/clawd-scenarios/hooks/scenes-b.mjs';
import { clawd } from '../themes/clawd-scenarios/hooks/primitives.mjs';

const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=Object.fromEntries(process.argv.slice(2).map(value=>{
  const split=value.indexOf('=');
  return split===-1?[value.replace(/^--/,''),true]:[value.slice(2,split),value.slice(split+1)];
}));
const scenes={...scenesA,...scenesB};
const palette={ink:'#524b40',soft:'#7b8a90',cool:'#9fb9d9',accent:'#b88373',warm:'#b39a60',leaf:'#83947a',paper:'#f7f2e5',panel:'#aabcc1',line:'#aaa2ac'};
const roles=new Set(['ink','cool','accent','warm','leaf','paper','panel','line']);

function compileLayer(source,prefix) {
  const used=new Set();
  let markup=source
    .replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'')
    .replace(/<animate(?:Transform|Motion)?\b[^>]*(?:\/>|>[\s\S]*?<\/animate(?:Transform|Motion)?>)/g,'')
    .replaceAll('var(--soft)','var(--cool)')
    .replaceAll('#3e2420','var(--ink)')
    .replaceAll('#ae4e3d','var(--accent)')
    .replaceAll('fill="#d77c5c"','data-mascot="body" fill="#d77c5c"')
    .replaceAll('fill="#211d19"','data-mascot="eyes" fill="#211d19"');
  // Keep the room's actual contours. Color washes and round-dot material shading
  // occupy their interiors, while explicit strokes keep furniture legible.
  markup=markup.replace(/<(path|rect|circle|ellipse|polygon|polyline)\b([^>]*?)\/>/g,(_tag,name,attributes)=>{
    let attrs=attributes;
    const color=attrs.match(/\bfill="var\(--([a-z]+)\)"/);
    if(color) {
      const role=color[1];
      if(!roles.has(role)) throw new Error(`Unknown art material ${role}`);
      used.add(role);
      attrs=attrs.replace(color[0],`data-paint="${role}" fill="url(#${prefix}-${role})"`);
      if(!/\bstroke="/.test(attrs) || /\bstroke="none"/.test(attrs)) {
        attrs=attrs.replace(/\bstroke="none"/,'');
        attrs=attrs.replace(/\bstroke-width="[^"]*"/,'');
        attrs+=' stroke="var(--ink)" stroke-width="1.5" stroke-opacity=".55"';
      }
    }
    attrs=attrs.replace(/\bstroke-width="([\d.]+)"/g,(_match,width)=>`stroke-width="${Math.max(1.5,Math.min(2,Number(width)))}"`);
    return `<${name}${attrs}/>`;
  });
  // The sources also use a few decorative dot panels. Share the ink material
  // rather than leave an unresolved source-only pattern ID in the native SVG.
  if(markup.includes('url(#dots)')) { used.add('ink'); markup=markup.replaceAll('url(#dots)',`url(#${prefix}-ink)`); }
  const definitions=[...used].sort().map(role=>`<pattern id="${prefix}-${role}" data-paint="${role}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--${role})" opacity=".22"/><circle cx="3" cy="3" r="${role==='ink'?2.4:2.1}" fill="var(--${role})" opacity=".70"/></pattern>`).join('');
  return `<g data-dither="6px-reference-halftone"><defs>${definitions}</defs>${markup}</g>`;
}

function splitSkater(markup) {
  const startMarker='<g transform="translate(107 617) scale(1)">';
  const endMarker='<line x1="54" y1="715"';
  const start=markup.indexOf(startMarker);
  const end=markup.indexOf(endMarker,start);
  if(start<0 || end<=start) throw new Error('Skateboard actor source markers changed; inspect the complete rider boundary before compiling.');
  return {scenery:markup.slice(0,start)+markup.slice(end),actor:markup.slice(start,end)};
}

const started=Date.now();
const generated={};
for(const [key,scene] of Object.entries(scenes)) {
  let left=scene.left();
  if(key==='skateboard') left+=clawd(40,580,'plain',.38)+clawd(80,575,'plain',.45);
  generated[key]={left:compileLayer(left,`${key}-left`)};
  if(key==='skateboard') {
    const separated=splitSkater(scene.right());
    generated[key].right=compileLayer(separated.scenery,`${key}-right`);
    generated[key].actor=compileLayer(separated.actor,`${key}-actor`);
  } else generated[key].right=compileLayer(scene.right(),`${key}-right`);
}
const sceneLengths=Object.fromEntries(Object.entries(generated).map(([key,scene])=>[key,Object.values(scene).reduce((sum,markup)=>sum+markup.length,0)]));
for(const [key,length] of Object.entries(sceneLengths)) {
  if(length>=110_000) throw new Error(`${key} artwork has ${length} characters; native artwork budget is below 110000, reserving room for composition and motion.`);
}
const destination=path.join(root,'themes/clawd-scenarios/hooks/dithered.mjs');
const modulesDirectory=path.join(path.dirname(destination),'dither');
const banner='// Generated by scripts/compile-clawd-dither.mjs. Original room contours with muted washes and round-dot material shading.\n';
const moduleOutputs=Object.fromEntries(Object.entries(generated).map(([key,scene])=>[key,`${banner}export default Object.freeze(${JSON.stringify(scene,null,2)});\n`]));
const imports=Object.keys(generated).map(key=>`import ${key} from './dither/${key}.mjs';`).join('\n');
const output=`${banner}${imports}\nexport const DITHERED_SCENES = Object.freeze({ ${Object.keys(generated).join(', ')} });\n`;
const moduleSizes=Object.fromEntries(Object.entries(moduleOutputs).map(([key,source])=>[`${key}.mjs`,Buffer.byteLength(source)]));
moduleSizes['dithered.mjs']=Buffer.byteLength(output);
for(const [name,size] of Object.entries(moduleSizes)) {
  if(size>=1_048_576) throw new Error(`${name} is ${size} bytes; native sources must stay below 1048576 bytes.`);
}
await fs.mkdir(modulesDirectory,{recursive:true});
for(const [key,source] of Object.entries(moduleOutputs)) await fs.writeFile(path.join(modulesDirectory,`${key}.mjs`),source);
await fs.writeFile(destination,output);

async function findSharp() {
  const candidates=[args.sharp,process.env.SHARP_MODULE,'sharp','/home/tim/oculi/node_modules/sharp/lib/index.js'].filter(Boolean);
  for(const candidate of candidates) {
    try{return require(candidate);}catch(error){
      if(candidate===args.sharp || candidate===process.env.SHARP_MODULE) throw new Error(`Cannot load existing Sharp module ${candidate}: ${error.message}`);
    }
  }
  throw new Error('A contact sheet needs an existing Sharp module. Supply --sharp=/absolute/path; no package was installed.');
}
if(args['contact-sheet']) {
  const sharp=await findSharp();
  const tiles=[];
  for(const [index,[key,scene]] of Object.entries(generated).entries()) {
    const row=Math.floor(index/4),col=index%4;
    const art=`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="800"><rect width="520" height="800" fill="${palette.paper}"/><text x="12" y="25" font-family="monospace" font-size="16" fill="${palette.ink}">${key}</text><g transform="translate(0 40)">${scene.left}<g transform="translate(260 0)">${scene.right}${scene.actor??''}</g></g></svg>`.replace(/var\(--([a-z]+)\)/g,(_match,key)=>palette[key]);
    tiles.push({input:await sharp(Buffer.from(art)).png().toBuffer(),left:col*520,top:row*800});
  }
  await sharp({create:{width:2080,height:Math.ceil(Object.keys(generated).length/4)*800,channels:3,background:palette.paper}}).composite(tiles).png().toFile(args['contact-sheet']);
}
console.log(JSON.stringify({output:destination,moduleSizes,totalBytes:Object.values(moduleSizes).reduce((a,b)=>a+b,0),style:'reference-halftone',cell:6,palette,sceneLengths,elapsedMs:Date.now()-started},null,2));
