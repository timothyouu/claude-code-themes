const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { stripTypeScriptTypes } = require('node:module');

const root = path.resolve(__dirname, '..');
const plugin = path.join(root, 'themes/golden-gate-dither');

async function loadTheme() {
  const source = fs.readFileSync(path.join(plugin, 'hooks/register.tsx'), 'utf8');
  const executable = source.replace(/^import .*$/gm, '').replace(/^export /gm, '');
  const js = stripTypeScriptTypes(executable);
  const { makeColors } = await import(pathToFileURL(path.join(plugin, 'hooks/make-colors.js')));
  const atom = (address, initial) => ({ ...address, initial });
  const read = async ($, ref) => $.atoms.has(ref.key) ? $.atoms.get(ref.key) : structuredClone(ref.initial);
  const update = async ($, ref, fn) => {
    const value = fn(await read($, ref));
    $.atoms.set(ref.key, value);
    return value;
  };
  // Runs the shipped module unchanged except for import/export/type erasure.
  // Engine bindings are supplied in memory; no model or service calls run.
  return new Function('atom', 'read', 'update', 'makeColors', `${js}\nreturn { register, buildScene, lookFor, TOWERS, SPANS };`)(atom, read, update, makeColors);
}

module.exports = { root, plugin, loadTheme };
