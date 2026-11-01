// Standalone prototype build: compiled Tailwind utilities and inline Lucide SVG.
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const icons = require('lucide-react');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
async function build() {
  const root = path.resolve(__dirname, '..');
  const source = path.join(root, 'public/prototype-tailwind.html');
  let html = fs.readFileSync(source, 'utf8');
  const svg = (name, className = '') => {
    if (!icons[name]) throw new Error('Unknown Lucide icon: ' + name);
    return renderToStaticMarkup(React.createElement(icons[name], { width: 20, height: 20, strokeWidth: 1.5, className, 'aria-hidden': true, focusable: false }));
  };
  html = html.replace(/<i data-icon="([^"]+)"([^>]*)><\/i>/g, (_, name, attrs) => svg(name, attrs.match(/class="([^"]*)"/)?.[1] || ''));
  html = html.replace('<!-- PAUSE_SVG -->', svg('Pause')).replace('<!-- PLAY_SVG -->', svg('Play'));
  const result = await postcss([tailwind({ base: root, optimize: true })]).process('@import "tailwindcss";\n@source "' + source + '";', { from: path.join(root, 'prototype.css') });
  html = html.replace('<!-- TAILWIND_STYLES -->', '<style>' + result.css + '</style>');
  const license = fs.readFileSync(require.resolve('lucide-react/package.json').replace('package.json', 'LICENSE'), 'utf8');
  html = html.replace('<head>', '<head><!-- Lucide icon license\n' + license + '\n-->');
  new (require('node:vm').Script)(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  const dest = process.argv[2] || '/tmp/junning-tailwind-demo.html';
  fs.writeFileSync(dest, html);
  console.log(JSON.stringify({ output: dest, bytes: Buffer.byteLength(html), icons: (html.match(/<svg/g) || []).length, externalAssets: false }));
}
build().catch(error => { console.error(error); process.exitCode = 1; });
