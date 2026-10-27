import { readFileSync, writeFileSync } from 'fs';
const f = 'novedades-es.html';
let html = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const dias = [...html.matchAll(/<section id="([^"]+)" class="version">\n  <div class="version__cabecera">\n    <h2>([^<]*)<\/h2>/g)].map((m) => [m[1], m[2]]);
const lista = dias.map(([id, fecha]) => '    <li><a href="#' + id + '">' + fecha + '</a></li>').join('\n');
const antes = html;
html = html.replace(/(<nav class="indice">[\s\S]*?<ol>\n)[\s\S]*?(\n  <\/ol>)/, (m, a, b) => a + lista + b);
console.log(antes === html ? 'SIN CAMBIO' : 'indice reescrito con ' + dias.length + ' dias');
writeFileSync(f, html);