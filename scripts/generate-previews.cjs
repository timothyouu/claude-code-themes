const fs = require('node:fs');
const path = require('node:path');
const { root, loadTheme } = require('./load-theme.cjs');

async function main() {
  const { buildScene } = await loadTheme();
  const sample = { contextPercent: 42, contextTokens: 84000, contextWindow: 200000, agentsLive: 0, agentsTotal: 2, costUsd: 1.23, fiveHourPercent: 12 };
  const assets = path.join(root, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  for (const appearance of ['dark', 'light']) {
    const svg = buildScene(sample, 100, 'auto').replace('color-scheme: light dark', `color-scheme: ${appearance}`);
    fs.writeFileSync(path.join(assets, `golden-gate-${appearance}.svg`), svg);
  }
  fs.writeFileSync(path.join(assets, 'preview.html'), `<!doctype html>
<html lang="en" style="color-scheme:dark"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Golden Gate scene preview</title><style>
*{box-sizing:border-box}body{margin:0;font:16px system-ui;background:light-dark(#ece2ce,#1b1713);color:light-dark(#221c16,#f5eee2)}
main{position:fixed;inset:0}main>svg{width:100%;height:100%}nav{position:fixed;left:24px;top:24px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
button{font:inherit;padding:10px 16px;border:1px solid currentColor;border-radius:8px;background:light-dark(#f7f1e4,#231e19);color:inherit;cursor:pointer}
p{margin:0;padding:10px 16px;background:light-dark(#f7f1e4,#231e19);border-radius:8px}button:focus-visible{outline:3px solid #de875e;outline-offset:3px}
</style><main aria-label="Animated Golden Gate scene">${buildScene(sample, 100, 'auto')}</main>
<nav aria-label="Preview appearance"><button type="button" data-scheme="light">Light</button><button type="button" data-scheme="dark">Dark</button><p>Scene preview. Readout values are samples.</p></nav>
<script>for(const button of document.querySelectorAll('button'))button.addEventListener('click',()=>{document.documentElement.style.colorScheme=button.dataset.scheme});</script></html>`);
  console.log('Generated light/dark SVGs and assets/preview.html from the shipped theme.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
