import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');
const outFile = path.resolve(root, '..', 'kaancha-mela.html');

const jsResult = await esbuild.build({
  entryPoints: [path.join(root, 'src', 'main.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari15'],
  write: false,
  minify: !dev,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
});

const cssResult = await esbuild.build({
  entryPoints: [path.join(root, 'src', 'style.css')],
  bundle: true,
  write: false,
  minify: !dev,
  loader: { '.woff2': 'dataurl' },
  logLevel: 'warning',
});

const js = jsResult.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = cssResult.outputFiles[0].text;

const template = fs.readFileSync(path.join(root, 'src', 'index.template.html'), 'utf8');
const html = template
  .replace('/*__STYLE__*/', () => css)
  .replace('/*__SCRIPT__*/', () => js);

fs.writeFileSync(outFile, html);
const size = fs.statSync(outFile).size;
console.log(`Built ${outFile} (${(size / 1024 / 1024).toFixed(2)} MB)${dev ? ' [dev]' : ''}`);
