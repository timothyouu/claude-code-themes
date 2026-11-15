import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENARIOS, buildScene, paletteFor } from '../themes/clawd-scenarios/hooks/scene.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'assets/clawd-scenarios/preview.html');
const scenes = Object.fromEntries(Object.entries(SCENARIOS).map(([key, scene]) => [key, {
  title: scene.title, description: scene.description,
  palettes: { light: paletteFor(key, 'light'), dark: paletteFor(key, 'dark') },
  sources: Object.fromEntries(['light', 'dark'].map(scheme => [scheme, {
    motion: buildScene(key, scheme, true), still: buildScene(key, scheme, false),
  }])),
}]));
const data = JSON.stringify(scenes).replaceAll('<', '\\u003c');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clawd scenarios · Theme gallery</title>
<style>
*{box-sizing:border-box}html{color-scheme:light;--bg:#f3f1ec;--ink:#292821;--soft:#686659;--panel:#e5dfcd;--line:#b0ad9c;--paper:#f8f3e7;--accent:#bc7155;background:var(--bg);color:var(--ink)}body{margin:0;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,select{font:inherit;color:inherit}button,select{min-height:42px;background:transparent;border:1px solid var(--line);border-radius:7px;padding:8px 13px;cursor:pointer}button:hover,select:hover{background:var(--panel)}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid var(--ink);outline-offset:4px}button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}::selection{background:var(--ink);color:var(--bg)}*{scrollbar-color:var(--soft) var(--bg)}a{color:inherit;text-underline-offset:4px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 28px;border-bottom:1px solid var(--line)}h1{margin:0;font-size:23px;line-height:1.15;font-weight:650;letter-spacing:-.025em}header p{margin:5px 0 0;color:var(--soft);font-size:13px}.controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.control-group{display:flex;gap:5px}.stage{position:relative;height:calc(100vh - 242px);min-height:570px;max-height:1050px;isolation:isolate;overflow:hidden}.art{position:absolute;inset:0;z-index:-1}.art>svg{width:100%;height:100%;display:block}.conversation{width:min(56%,780px);margin:auto;padding:38px 30px 28px;height:100%;overflow:auto;display:flex;flex-direction:column;gap:24px}.conversation[hidden]{display:none}.sample{margin:0;color:var(--soft);font-size:12px;text-align:center}.message{font-size:16px;line-height:1.65}.message p{margin:0 0 13px}.message h2{font-size:19px;margin:0 0 14px;font-weight:600}.person{display:block;color:var(--soft);font-size:12px;margin:0 0 6px}.user .person{color:var(--ink)}.user{background:var(--panel);padding:16px 20px;border-radius:12px}.message code{font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}.message pre{padding:16px;background:var(--paper);border:1px solid var(--line);border-radius:7px;overflow:auto}.composer{margin-top:auto;padding:14px 18px;border:1px solid var(--line);border-radius:12px;color:var(--soft);font-size:14px}.composer small{display:block;font-size:11px;margin-top:14px}.scene-info{display:flex;gap:24px;align-items:center;padding:16px 28px;border-top:1px solid var(--line)}.scene-info h2{margin:0;font-size:17px;min-width:180px;font-weight:600}.scene-info p{margin:0;color:var(--soft);font-size:13px;max-width:75ch}.scene-list{display:flex;gap:7px;padding:0 28px 20px;overflow:auto}.scene-list button{flex-shrink:0;font-size:13px;min-height:36px;padding:6px 12px}footer{padding:0 28px 18px;font-size:12px;color:var(--soft);display:flex;justify-content:space-between;gap:20px}.scene-select{display:none}#notice{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);padding:10px 18px;background:var(--ink);color:var(--bg);border-radius:8px;font-size:13px;z-index:2}#notice:empty{display:none}
@media(max-width:1000px){header{align-items:flex-start;padding:18px 20px;gap:16px}.controls{justify-content:flex-end}.stage{height:calc(100vh - 280px);min-height:540px}.conversation{padding:28px 22px}.scene-info{padding:14px 20px;align-items:flex-start}.scene-info h2{min-width:145px}.scene-list{padding-left:20px;padding-right:20px}footer{padding-left:20px;padding-right:20px}.controls button{font-size:13px;padding:8px 10px}}
@media(max-width:680px){header{flex-direction:column;padding:16px;gap:14px}h1{font-size:21px}.controls{width:100%;justify-content:flex-start;gap:7px}.control-group{gap:4px}.controls button{min-height:38px;padding:6px 9px;font-size:12px}.stage{height:660px;min-height:0}.conversation{width:56%;padding:25px 10px;gap:20px}.message{font-size:13px;line-height:1.6}.message h2{font-size:15px}.message pre{padding:9px}.message code{font-size:10px}.person,.sample{font-size:11px}.user{padding:12px}.composer{padding:12px 10px;font-size:12px}.composer small{font-size:11px}.scene-info{padding:14px 16px;display:block}.scene-info h2{font-size:16px;margin-bottom:4px}.scene-info p{font-size:12px}.scene-list{padding:0 16px 16px}footer{padding:0 16px 18px;display:block}footer span{display:block;margin-top:5px}.scene-select{display:block;width:100%;margin-top:3px}}
</style>
</head>
<body>
<header>
<div><h1>Clawd scenarios</h1><p>Twelve little worlds around your conversation.</p></div>
<div class="controls" aria-label="Preview controls">
<div class="control-group" aria-label="Appearance"><button id="light" type="button" aria-pressed="true">Light</button><button id="dark" type="button" aria-pressed="false">Dark</button></div>
<button id="motion" type="button" aria-pressed="true">Motion on</button>
<button id="chat" type="button" aria-pressed="true">Sample chat on</button>
<button id="download" type="button">Download SVG</button>
<label class="scene-select">Scene <select id="scene-select"></select></label>
</div>
</header>
<main>
<section class="stage" aria-label="Selected scene preview">
<div class="art" id="art"></div>
<div class="conversation" id="conversation">
<p class="sample">Sample conversation · Preview only</p>
<div class="message user"><span class="person">You</span><p>Help me make a little room for a good idea.</p></div>
<div class="message"><span class="person">Claude · Sample response</span><h2>Start with one small thing.</h2><p>Leave a clear space in the middle. Keep what matters close, and let the rest wait at the edges.</p><p>A small function is a good place to begin:</p><pre><code>function begin(idea: string) {<br>  return idea.trim();<br>}</code></pre><p>Then take a breath, look again, and choose the next step.</p></div>
<div class="composer" aria-label="Non-interactive sample composer">A little space to think.<small>Illustrative interface. This preview does not send messages.</small></div>
</div>
</section>
<div class="scene-info"><h2 id="scene-title"></h2><p id="scene-description"></p></div>
<nav class="scene-list" id="scene-list" aria-label="Choose one of twelve scenes"></nav>
</main>
<footer><span id="command"></span><span>Preview controls affect this gallery only. <a href="https://github.com/timothyouu/claude-code-themes">Plugin source</a></span></footer>
<div id="notice" role="status" aria-live="polite"></div>
<script type="application/json" id="scene-data">${data}</script>
<script>
'use strict';
const scenes = JSON.parse(document.getElementById('scene-data').textContent);
const keys = Object.keys(scenes);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const state = { scene: 'coffee', appearance: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', motion: !reduced.matches, chat: true };
const get = id => document.getElementById(id);
for (const key of keys) {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = scenes[key].title; button.dataset.scene = key;
  button.addEventListener('click', () => { state.scene = key; render(); });
  get('scene-list').append(button);
  const option = document.createElement('option'); option.value = key; option.textContent = scenes[key].title;
  get('scene-select').append(option);
}
function render() {
  const scene = scenes[state.scene];
  const palette = scene.palettes[state.appearance];
  document.documentElement.style.colorScheme = state.appearance;
  for (const [key, value] of Object.entries(palette)) document.documentElement.style.setProperty('--' + key, value);
  get('art').innerHTML = scene.sources[state.appearance][state.motion ? 'motion' : 'still'];
  get('art').setAttribute('role', 'img'); get('art').setAttribute('aria-label', scene.description);
  get('scene-title').textContent = scene.title; get('scene-description').textContent = scene.description;
  get('light').setAttribute('aria-pressed', String(state.appearance === 'light'));
  get('dark').setAttribute('aria-pressed', String(state.appearance === 'dark'));
  get('motion').setAttribute('aria-pressed', String(state.motion)); get('motion').textContent = 'Motion ' + (state.motion ? 'on' : 'off');
  get('chat').setAttribute('aria-pressed', String(state.chat)); get('chat').textContent = 'Sample chat ' + (state.chat ? 'on' : 'off');
  get('conversation').hidden = !state.chat;
  get('scene-select').value = state.scene;
  for (const button of get('scene-list').children) button.setAttribute('aria-pressed', String(button.dataset.scene === state.scene));
  get('command').textContent = '/clawd-scene ' + state.scene + ' ' + state.appearance + ' ' + (state.motion ? 'motion' : 'still');
}
for (const mode of ['light','dark']) get(mode).addEventListener('click', () => { state.appearance = mode; render(); });
get('motion').addEventListener('click', () => { state.motion = !state.motion; render(); });
get('chat').addEventListener('click', () => { state.chat = !state.chat; render(); });
get('scene-select').addEventListener('change', event => { state.scene = event.target.value; render(); });
get('download').addEventListener('click', () => {
  const svg = scenes[state.scene].sources[state.appearance][state.motion ? 'motion' : 'still'].replace('width="100%" height="100%"', 'width="1600" height="1000"');
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
  const link = document.createElement('a'); link.href = url;
  link.download = 'clawd-' + state.scene + '-' + state.appearance + '-' + (state.motion ? 'motion' : 'still') + '.svg';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  get('notice').textContent = 'Downloaded ' + link.download;
  setTimeout(() => { get('notice').textContent = ''; }, 3500);
});
reduced.addEventListener('change', event => { if (event.matches) { state.motion = false; render(); } });
render();
</script>
</body>
</html>`;

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, html);
console.log(`Wrote ${path.relative(root, destination)} (${Object.keys(scenes).length} scenes; light/dark × motion/still).`);
