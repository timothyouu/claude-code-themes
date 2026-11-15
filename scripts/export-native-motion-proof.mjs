import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const frames = argument('frames');
const sharpPath = argument('sharp');
const output = argument('output');
if (!frames || !sharpPath || !output) throw new Error('Supply --frames=directory --sharp=existing-module --output=file.gif');
const sharp = createRequire(import.meta.url)(sharpPath);
const times = JSON.parse(await fs.readFile(path.join(frames, 'times.json'), 'utf8'));
if (times.length < 3 || times.some((time, index) => index && time <= times[index - 1])) throw new Error('Need ordered capture timestamps.');
const packed = [];
let width, height;
for (let index = 0; index < times.length; index++) {
  const source = await fs.readFile(path.join(frames, `frame-${String(index).padStart(2, '0')}.png`));
  const metadata = await sharp(source).metadata();
  // Only the illustrated margins are exported; the private chat is excluded.
  const side = Math.floor(metadata.width * .19);
  const top = 36;
  height = metadata.height - top - 85;
  width = side * 2;
  const left = await sharp(source).extract({left:0, top, width:side, height}).toBuffer();
  const right = await sharp(source).extract({left:metadata.width-side, top, width:side, height}).toBuffer();
  packed.push(await sharp({create:{width,height,channels:4,background:'#fff'}}).composite([{input:left,left:0,top:0},{input:right,left:side,top:0}]).raw().toBuffer());
}
const differences = packed.slice(1).map((frame,index) => {
  let changed = 0;
  for(let pixel=0;pixel<frame.length;pixel+=4) if(Math.abs(frame[pixel]-packed[index][pixel])+Math.abs(frame[pixel+1]-packed[index][pixel+1])+Math.abs(frame[pixel+2]-packed[index][pixel+2])>24) changed++;
  return changed;
});
if (differences.some(changed => changed < 100)) throw new Error('Native margins lack meaningful frame-to-frame motion.');
const delay = times.map((time,index) => index+1<times.length ? times[index+1]-time : times[1]-times[0]);
await sharp(Buffer.concat(packed),{raw:{width,height:height*packed.length,channels:4,pageHeight:height}}).gif({loop:0,delay,effort:7}).toFile(output);
console.log(JSON.stringify({frames:packed.length,width,height,delay,changedPixels:differences,output}));
