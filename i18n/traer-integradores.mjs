// Trae la guia de la API de integracion del repositorio de Turnera y la publica como la seccion "Integradores",
// en espanol, ingles y aleman.
//
// Los originales son `docs/api-integracion.md`, `.en.md` y `.de.md`, y los mantiene el programa, igual que el
// manual: aqui solo se pasan a HTML con el envoltorio del sitio, se les pone indice y se copia al lado el fichero
// OpenAPI, que una prueba del repositorio de Turnera mantiene igual que el codigo. El OpenAPI es uno solo, el
// de /turnera/integradores, y las tres paginas lo enlazan.
//
//   node traer-integradores.mjs ["ruta del repositorio de Turnera"]

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');
const repositorioDeTurnera = process.argv[2] ?? join(aqui, '..', '..', 'turnera');
const openApi = join(repositorioDeTurnera, 'docs', 'api', 'openapi-integracion.json');
const RUTA_OPENAPI = '/turnera/integradores/openapi-integracion.json';

const IDIOMAS = [
  {
    codigo: 'es', guia: 'api-integracion.md', prefijo: '', carpeta: 'integradores', locale: 'es_ES',
    nav: 'Integradores', titulo: 'Integradores · Turnera',
    descripcion: 'Todo para conectar un programa con Turnera: autenticación, permisos, endpoints, webhooks, errores, versiones y la especificación OpenAPI.',
    indice: 'Integradores', descargar: 'Descargar el OpenAPI',
    caja: ['OpenAPI.', 'La descripción de todos los recursos, para importarla en Postman o generar un cliente:',
      'Entorno de pruebas.', 'Hay un sandbox con datos inventados: véase el apartado «El entorno de pruebas». Para pedir acceso o resolver dudas, ',
      'escríbanos desde el formulario de contacto', '.']
  },
  {
    codigo: 'en', guia: 'api-integracion.en.md', prefijo: '/en', carpeta: 'integrators', locale: 'en_GB',
    nav: 'Integrators', titulo: 'Integrators · Turnera',
    descripcion: 'Everything to connect a program to Turnera: authentication, permissions, endpoints, webhooks, errors, versions and the OpenAPI specification.',
    indice: 'Integrators', descargar: 'Download the OpenAPI',
    caja: ['OpenAPI.', 'The description of every resource, to import into Postman or to generate a client:',
      'Test environment.', 'There is a sandbox with made-up data: see the section on the test environment. To ask for access or with any question, ',
      'write to us through the contact form', '.']
  },
  {
    codigo: 'de', guia: 'api-integracion.de.md', prefijo: '/de', carpeta: 'integratoren', locale: 'de_DE',
    nav: 'Integratoren', titulo: 'Integratoren · Turnera',
    descripcion: 'Alles, um ein Programm mit Turnera zu verbinden: Authentifizierung, Berechtigungen, Endpunkte, Webhooks, Fehler, Versionen und die OpenAPI-Spezifikation.',
    indice: 'Integratoren', descargar: 'OpenAPI herunterladen',
    caja: ['OpenAPI.', 'Die Beschreibung aller Ressourcen, zum Importieren in Postman oder zum Erzeugen eines Clients:',
      'Testumgebung.', 'Es gibt eine Sandbox mit erfundenen Daten: siehe den Abschnitt zur Testumgebung. Um Zugang anzufragen oder bei Fragen ',
      'schreiben Sie uns über das Kontaktformular', '.']
  }
];
for (const idioma of IDIOMAS) {
  idioma.ruta = `${idioma.prefijo}/turnera/${idioma.carpeta}`;
}

for (const fichero of [openApi, ...IDIOMAS.map((idioma) => join(repositorioDeTurnera, 'docs', idioma.guia))]) {
  if (!existsSync(fichero)) {
    console.error(`No encuentro ${fichero}.`);
    process.exit(1);
  }
}

const sinAcentos = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
const idDe = (texto) => sinAcentos(texto).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const escapar = (texto) => texto.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function publicar(idioma) {
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
  const original = readFileSync(join(repositorioDeTurnera, 'docs', idioma.guia), 'utf8')
    .split(/\r?\n/)
    .filter((linea) => !linea.includes('api-publica.md') && !linea.startsWith('*Guía para quien programa'))
    .join('\n');
  const cuerpo = marked.parse(original);

  const indice = [
    '<nav class="indice">',
    `  <h2>${idioma.indice}</h2>`,
    `  <p><a href="${RUTA_OPENAPI}" download>${idioma.descargar}</a></p>`,
    '  <ol>',
    ...titulos.map((titulo) => `    <li><a href="#${titulo.id}"${titulo.depth === 3 ? ' class="sub"' : ''}>${titulo.texto}</a></li>`),
    '  </ol>',
    '</nav>'
  ].join('\n');

  const [openapi, descripcionOpenapi, pruebas, textoPruebas, enlace, fin] = idioma.caja;
  const caja = `<div class="ojo"><p><strong>${openapi}</strong> ${descripcionOpenapi} `
    + `<a href="${RUTA_OPENAPI}" download>openapi-integracion.json</a>.</p>`
    + `<p><strong>${pruebas}</strong> ${textoPruebas}<a href="${idioma.prefijo}/#contacto">${enlace}</a>${fin}</p></div>`;

  // El envoltorio es el del manual de ese idioma: trae la cabecera, el pie y el estilo del sitio.
  const envoltorio = join(raiz, idioma.prefijo.replace('/', ''), 'turnera', 'manual', 'index.html');
  let pagina = readFileSync(envoltorio, 'utf8');
  const finDeCabecera = pagina.indexOf('</head>');
  const alternativas = IDIOMAS.map((otro) => `<link rel="alternate" hreflang="${otro.codigo}" href="https://devel.es${otro.ruta}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="https://devel.es${IDIOMAS[0].ruta}">`).join('\n');
  let cabecera = pagina.slice(0, finDeCabecera)
    .replace(/<html lang="[^"]*"/, `<html lang="${idioma.codigo}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapar(idioma.titulo)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapar(idioma.descripcion)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapar(idioma.titulo)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapar(idioma.titulo)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapar(idioma.descripcion)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapar(idioma.descripcion)}$2`)
    .replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${idioma.locale}$2`)
    .replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\s*/g, '')
    .replace(/https:\/\/devel\.es(\/[a-z]{2})?\/turnera\/manual/g, `https://devel.es${idioma.ruta}`);
  cabecera = cabecera.replace(/(<link rel="canonical"[^>]*>)/, `$1\n${alternativas}`);
  pagina = cabecera + pagina.slice(finDeCabecera);

  const selector = IDIOMAS.map((otro) => `<a class="idiomas__opcion" href="${otro.ruta}" lang="${otro.codigo}"`
    + `${otro.codigo === idioma.codigo ? ' aria-current="true"' : ''}>${otro.codigo.toUpperCase()}`
    + `<span class="idiomas__nombre">${{ es: 'Español', en: 'English', de: 'Deutsch' }[otro.codigo]}</span></a>`).join('');
  // El menu del manual ya trae el enlace a esta seccion: se marca como actual y el manual deja de serlo. Un
  // manual construido antes de tenerlo lo recibe aqui, detras del suyo.
  const enlaceDelManual = /<a href="([^"]*\/turnera\/manual)" aria-current="page">([^<]*)<\/a>/;
  const yaLoEnlaza = pagina.includes(`<a href="${idioma.ruta}">`);
  pagina = (yaLoEnlaza
    ? pagina.replace(enlaceDelManual, '<a href="$1">$2</a>')
      .replace(`<a href="${idioma.ruta}">`, `<a href="${idioma.ruta}" aria-current="page">`)
    : pagina.replace(enlaceDelManual,
      `<a href="$1">$2</a>\n      <a href="${idioma.ruta}" aria-current="page">${idioma.nav}</a>`))
    .replace(/<div class="idiomas"[^>]*>[\s\S]*?<\/div>/,
      `<div class="idiomas" role="group" aria-label="Idioma / Language / Sprache">${selector}</div>`);

  const abreMain = pagina.indexOf('<main');
  const cierraMain = pagina.indexOf('</main>') + '</main>'.length;
  const main = `<main id="top" class="shell manual">\n${indice}\n<div class="contenido">\n${caja}\n${cuerpo}</div>\n</main>`;
  pagina = pagina.slice(0, abreMain) + main + pagina.slice(cierraMain);

  // El manual no trae estilo para bloques de codigo: la guia es sobre todo eso.
  pagina = pagina.replace('</head>', '<style>.contenido pre{background:#10302b;color:#e7f1ef;padding:1rem 1.25rem;'
    + 'border-radius:10px;overflow-x:auto;font-size:.85rem;line-height:1.5}.contenido pre code{background:none;'
    + 'color:inherit;padding:0;border:0;box-shadow:none;text-decoration:none;display:block;white-space:pre}</style>\n</head>');

  const destino = join(raiz, idioma.prefijo.replace('/', ''), 'turnera', idioma.carpeta);
  mkdirSync(destino, { recursive: true });
  writeFileSync(join(destino, 'index.html'), pagina);
  console.log(`${idioma.ruta}: ${titulos.length} apartados.`);
}

for (const idioma of IDIOMAS) {
  publicar(idioma);
}
copyFileSync(openApi, join(raiz, 'turnera', 'integradores', 'openapi-integracion.json'));
console.log('OpenAPI copiado.');
