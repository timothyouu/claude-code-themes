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
import { createReferenceTexture } from '../themes/clawd-scenarios/hooks/reference-texture.mjs';

const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=Object.fromEntries(process.argv.slice(2).map(value=>{
  const split=value.indexOf('=');
  return split===-1?[value.replace(/^--/,''),true]:[value.slice(2,split),value.slice(split+1)];
}));
const scenes={...scenesA,...scenesB};
const palette={ink:'#292821',soft:'#34332b',cool:'#9fb9d9',accent:'#b88373',warm:'#b68b3f',leaf:'#738e68',paper:'#f8f3e7',panel:'#b7c8e6',line:'#8d8ea4'};
const roles=new Set(['ink','cool','accent','warm','leaf','paper','panel','line']);

const attr=(attributes,name)=>attributes.match(new RegExp(`(?:^|\\s)${name}="([^"\\n]*)"`))?.[1];
const put=(attributes,name,value)=>{
  const pattern=new RegExp(`(?:^|\\s)${name}="[^"\\n]*"`,'g');
  return `${attributes.replace(pattern,'')} ${name}="${value}"`;
};
const remove=(attributes,name)=>attributes.replace(new RegExp(`(?:^|\\s)${name}="[^"\\n]*"`,'g'),'');
const numeric=(attributes,name,fallback=0)=>Number(attr(attributes,name)??fallback);
const shape=(name,attributes)=>`<${name}${attributes}/>`;

function simpleBounds(name,attrs) {
  if(attr(attrs,'transform')) return undefined;
  if(name==='rect') return {x:numeric(attrs,'x'),y:numeric(attrs,'y'),w:numeric(attrs,'width'),h:numeric(attrs,'height')};
  if(name==='circle') {const r=numeric(attrs,'r');return {x:numeric(attrs,'cx')-r,y:numeric(attrs,'cy')-r,w:r*2,h:r*2};}
  if(name==='ellipse') {const rx=numeric(attrs,'rx'),ry=numeric(attrs,'ry');return {x:numeric(attrs,'cx')-rx,y:numeric(attrs,'cy')-ry,w:rx*2,h:ry*2};}
  return undefined;
}

function grow(name,attrs,amount) {
  if(name==='rect') {
    for(const [key,value] of Object.entries({x:numeric(attrs,'x')-amount,y:numeric(attrs,'y')-amount,width:numeric(attrs,'width')+2*amount,height:numeric(attrs,'height')+2*amount})) attrs=put(attrs,key,Number(value.toFixed(2)));
  } else if(name==='circle') attrs=put(attrs,'r',numeric(attrs,'r')+amount);
  else if(name==='ellipse') {attrs=put(attrs,'rx',numeric(attrs,'rx')+amount);attrs=put(attrs,'ry',numeric(attrs,'ry')+amount);}
  return attrs;
}

function compileLayer(source,prefix) {
  const texture=createReferenceTexture(prefix);
  let markup=source
    .replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'')
    .replace(/<animate(?:Transform|Motion)?\b[^>]*(?:\/>|>[\s\S]*?<\/animate(?:Transform|Motion)?>)/g,'')
    .replaceAll('var(--soft)','var(--cool)')
    .replaceAll('#3e2420','var(--ink)')
    .replaceAll('#ae4e3d','var(--accent)')
    .replaceAll('fill="#d77c5c"','data-mascot="body" fill="#d77c5c"')
    .replaceAll('fill="#211d19"','data-mascot="eyes" fill="#211d19"');
  markup=markup.replace(/<(path|rect|circle|ellipse|polygon|polyline|line)\b([^>]*?)\/>/g,(_tag,name,attributes)=>{
    let attrs=attributes;
    // Keep Clawd's pixel silhouette, printing the body in full terracotta dots.
    // His tiny square eyes stay solid so the expression remains legible.
    if(attr(attrs,'data-mascot')==='body') {
      attrs=put(attrs,'fill',texture.dotPaint(0,'#d77c5c'));
      return shape(name,put(attrs,'data-texture','mascot-freckles'));
    }
    if(attr(attrs,'data-mascot')) return shape(name,attrs);
    const fill=attr(attrs,'fill');
    const stroke=attr(attrs,'stroke');
    const fillRole=fill?.match(/^var\(--([a-z]+)\)$/)?.[1];
    const strokeRole=stroke?.match(/^var\(--([a-z]+)\)$/)?.[1];
    if(fillRole && !roles.has(fillRole)) throw new Error(`Unknown material ${fillRole}`);
    if(strokeRole && !roles.has(strokeRole)) throw new Error(`Unknown stroke ${strokeRole}`);
    if(!fillRole) {
      if(!strokeRole) return shape(name,attrs);
      // Stroke-only paths are round-ended dots, not continuous black outlines.
      const width=Math.max(2.6,Math.min(5.2,numeric(attrs,'stroke-width',1.5)*.65+2.5));
      if(name==='line' || name==='path') {
        const d=name==='line'?`M${numeric(attrs,'x1')} ${numeric(attrs,'y1')}L${numeric(attrs,'x2')} ${numeric(attrs,'y2')}`:attr(attrs,'d');
        for(const key of ['d','x1','y1','x2','y2','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','fill']) attrs=remove(attrs,key);
        return texture.dline(d,strokeRole,Number(width.toFixed(2)),attrs.trim());
      }
      attrs=put(attrs,'stroke',texture.dotPaint(0,strokeRole));
      attrs=put(attrs,'stroke-width',4.6);
      attrs=put(attrs,'data-texture','printed-edge');
      return shape(name,attrs);
    }
    const bounds=simpleBounds(name,attrs);
    const thin=bounds && Math.min(bounds.w,bounds.h)<11;
    const base={ink:0,cool:1,accent:1,warm:1,leaf:0,panel:2,line:4,paper:4}[fillRole];
    const density=thin && fillRole!=='paper' && fillRole!=='line'?Math.max(0,base-1):base;
    // Filled objects get colored printed edges only where the source drew one.
    // This deliberately does not add an enclosing dark vector contour.
    let edge='';
    if(strokeRole) {
      let edgeRole=strokeRole;
      if(strokeRole==='ink' && fillRole!=='ink') edgeRole=fillRole==='paper'?'cool':fillRole==='panel'?'cool':fillRole;
      let edgeAttrs=put(attrs,'fill','none');
      edgeAttrs=put(edgeAttrs,'stroke',texture.dotPaint(0,edgeRole));
      edgeAttrs=put(edgeAttrs,'stroke-width',4.4);
      edgeAttrs=put(edgeAttrs,'data-texture','printed-edge');
      edge=shape(name,edgeAttrs);
    }
    let fillAttrs=remove(remove(remove(attrs,'stroke'),'stroke-width'),'stroke-opacity');
    fillAttrs=put(fillAttrs,'data-paint',fillRole);
    fillAttrs=put(fillAttrs,'data-texture','material');
    const canRing=bounds && bounds.w>=13 && bounds.h>=13 && fillRole!=='paper' && fillRole!=='line';
    const glass=name==='rect' && fillRole==='cool' && bounds && bounds.w>=75 && bounds.h>=120 && bounds.h/bounds.w>1.1 && !numeric(attrs,'rx') && !numeric(attrs,'ry');
    let printed;
    let clearGlass='';
    if(glass) {
      // Source windows stack a glass rectangle over a solid frame rectangle.
      // Clear that backing before printing sky bands, so sparse sky reveals
      // paper and its faint blue wash instead of the frame's ochre dots.
      let clear=put(put(fillAttrs,'fill','var(--paper)'),'data-paint','paper');
      clear=put(remove(clear,'opacity'),'data-texture','glass-clear');
      clearGlass=shape(name,clear);
      // Match windowView's 36/42/48px density bands in a 220px reference pane.
      // The remaining sky is clear wash; original silhouettes still sit above it.
      let bandY=bounds.y;
      printed=[[36,2],[42,3],[48,4]].map(([referenceHeight,bandDensity])=>{
        const bandHeight=bounds.h*referenceHeight/220;
        let band=put(put(fillAttrs,'y',Number(bandY.toFixed(3))),'height',Number(bandHeight.toFixed(3)));
        band=put(put(band,'data-texture','glass-band'),'data-density',bandDensity);
        bandY+=bandHeight;
        return texture.dotted(bandDensity,shape(name,band));
      }).join('');
    } else if(canRing) {
      // The reference's halftone recipe layers sparse grown silhouettes around
      // the denser material. A few pixels of growth keeps the margin composed.
      printed=texture.halftone((growth,ringDensity)=>shape(name,put(put(grow(name,fillAttrs,growth),'data-texture',growth?'edge-ring':'material'),'data-density',ringDensity)),[[3.8,4],[1.9,3],[0,density]]);
    } else printed=texture.dotted(density,shape(name,put(fillAttrs,'data-density',density)));
    let wash='';
    if(bounds && bounds.w*bounds.h>8000 && ['cool','panel','warm'].includes(fillRole)) {
      let washAttrs=put(fillAttrs,'opacity','.055');
      washAttrs=put(washAttrs,'data-texture','soft-wash');
      wash=shape(name,washAttrs);
    }
    return clearGlass+wash+printed+edge;
  });
  if(markup.includes('url(#dots)')) markup=markup.replaceAll('url(#dots)',texture.dotPaint(4,'line'));
  // A faint wall print helps the freckled room read as one setting. The actor
  // layer stays transparent so its only moving marks are the actual rider.
  const wall=prefix.endsWith('-actor')?'':`<rect x="0" y="0" width="260" height="760" fill="${texture.dotPaint(4,'line')}" opacity=".13" data-texture="wall-print"/>`;
  return `<g data-dither="6px-freckled-reference" data-texture="freckled-v4"><defs>${texture.patterns()}</defs>${wall}${markup}</g>`;
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
const banner='// Generated by scripts/compile-clawd-dither.mjs. Freckled reference texture; MIT recipe attribution in reference-texture.mjs and reference-texture.LICENSE.\n';
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
if(args['contact-sheet'] || args['coffee-preview']) {
  const sharp=await findSharp();
  const tiles=[];
  for(const [index,[key,scene]] of Object.entries(generated).entries()) {
    const row=Math.floor(index/4),col=index%4;
    const tilePalette={...palette,accent:scenes[key].accent};
    const art=`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="800"><rect width="520" height="800" fill="${palette.paper}"/><text x="12" y="25" font-family="monospace" font-size="16" fill="${palette.ink}">${key}</text><g transform="translate(0 40)">${scene.left}<g transform="translate(260 0)">${scene.right}${scene.actor??''}</g></g></svg>`.replace(/var\(--([a-z]+)\)/g,(_match,key)=>tilePalette[key]);
    const png=await sharp(Buffer.from(art)).png().toBuffer();
    tiles.push({input:png,left:col*520,top:row*800});
    if(key==='coffee' && args['coffee-preview']) await fs.writeFile(args['coffee-preview'],png);
  }
  if(args['contact-sheet']) await sharp({create:{width:2080,height:Math.ceil(Object.keys(generated).length/4)*800,channels:3,background:palette.paper}}).composite(tiles).png().toFile(args['contact-sheet']);
}
console.log(JSON.stringify({output:destination,moduleSizes,totalBytes:Object.values(moduleSizes).reduce((a,b)=>a+b,0),style:'freckled-reference-v4',cell:6,palette,sceneLengths,elapsedMs:Date.now()-started},null,2));
