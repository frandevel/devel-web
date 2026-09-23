// Trae la guia de la API de integracion del repositorio de Turnera y la publica en /turnera/api.
//
// El original es `docs/api-integracion.md` y lo mantiene el programa, igual que el manual: aqui solo se pasa a
// HTML con el envoltorio del sitio, se le pone indice y se copia al lado el fichero OpenAPI, que una prueba del
// repositorio de Turnera mantiene igual que el codigo. Va solo en espanol: la lee quien programa, no el centro.
//
//   node traer-api.mjs ["ruta del repositorio de Turnera"]

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const aqui = dirname(fileURLToPath(import.meta.url));
const repositorioDeTurnera = process.argv[2] ?? join(aqui, '..', '..', 'turnera');
const guia = join(repositorioDeTurnera, 'docs', 'api-integracion.md');
const openApi = join(repositorioDeTurnera, 'docs', 'api', 'openapi-integracion.json');
const envoltorio = join(aqui, '..', 'turnera', 'manual', 'index.html');
const destino = join(aqui, '..', 'turnera', 'api');

for (const fichero of [guia, openApi, envoltorio]) {
  if (!existsSync(fichero)) {
    console.error(`No encuentro ${fichero}.`);
    process.exit(1);
  }
}

const sinAcentos = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const idDe = (texto) => sinAcentos(texto).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const titulos = [];
const marked = new Marked({
  renderer: {
    heading({ tokens, depth }) {
      const texto = this.parser.parseInline(tokens);
      const id = idDe(texto);
      if (depth === 2 || depth === 3) {
        titulos.push({ depth, id, texto: texto.replace(/<[^>]+>/g, '') });
      }
      return `<h${depth} id="${id}">${texto}</h${depth}>\n`;
    },
    table(token) {
      return `<div class="tabla-envoltorio">${this.constructor.prototype.table.call(this, token)}</div>`;
    }
  }
});

// La nota de cabecera apunta a un documento interno del repositorio, que en la web no existe.
const original = readFileSync(guia, 'utf8')
  .split(/\r?\n/)
  .filter((linea) => !linea.includes('api-publica.md') && !linea.startsWith('*Guía para quien programa'))
  .join('\n');
const cuerpo = marked.parse(original);

const indice = [
  '<nav class="indice">',
  '  <h2>API de integración</h2>',
  '  <p><a href="/turnera/api/openapi-integracion.json" download>Descargar el OpenAPI</a></p>',
  '  <ol>',
  ...titulos.map((titulo) => `    <li><a href="#${titulo.id}"${titulo.depth === 3 ? ' class="sub"' : ''}>${titulo.texto}</a></li>`),
  '  </ol>',
  '</nav>'
].join('\n');

const descarga = '<div class="ojo"><p><strong>OpenAPI.</strong> La descripción de todos los recursos, para '
  + 'importarla en Postman o generar un cliente: '
  + '<a href="/turnera/api/openapi-integracion.json" download>openapi-integracion.json</a>.</p></div>';

let pagina = readFileSync(envoltorio, 'utf8');
const finDeCabecera = pagina.indexOf('</head>');
let cabecera = pagina.slice(0, finDeCabecera)
  .replace(/<title>[^<]*<\/title>/, '<title>API de integración · Turnera</title>')
  .replace(/(<meta name="description" content=")[^"]*(")/,
    '$1Guía para integrar un programa con Turnera: autenticación, permisos, recursos, reservas y errores.$2')
  .replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\s*/g, '')
  .replace(/https:\/\/devel\.es\/turnera\/manual/g, 'https://devel.es/turnera/api');
pagina = cabecera + pagina.slice(finDeCabecera);

pagina = pagina
  .replace('<a href="/turnera/manual" aria-current="page">Manual</a>',
    '<a href="/turnera/manual">Manual</a>\n      <a href="/turnera/api" aria-current="page">API</a>')
  .replace(/<div class="idiomas"[\s\S]*?<\/div>\s*<\/div>\s*<\/header>/, '</div>\n</header>');

const abreMain = pagina.indexOf('<main');
const cierraMain = pagina.indexOf('</main>') + '</main>'.length;
const main = `<main id="top" class="shell manual">\n${indice}\n<div class="contenido">\n${descarga}\n${cuerpo}</div>\n</main>`;
pagina = pagina.slice(0, abreMain) + main + pagina.slice(cierraMain);

// El manual no trae estilo para bloques de codigo: la guia es sobre todo eso.
pagina = pagina.replace('</head>', '<style>.contenido pre{background:#10302b;color:#e7f1ef;padding:1rem 1.25rem;'
  + 'border-radius:10px;overflow-x:auto;font-size:.85rem;line-height:1.5}.contenido pre code{background:none;'
  + 'color:inherit;padding:0;border:0;box-shadow:none;text-decoration:none;display:block;white-space:pre}</style>\n</head>');

mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, 'index.html'), pagina);
copyFileSync(openApi, join(destino, 'openapi-integracion.json'));
console.log(`API publicada: ${titulos.length} apartados, OpenAPI copiado.`);