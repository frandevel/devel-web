// Trae el manual del repositorio de Turnera y lo mete en la plantilla del sitio.
//
// El manual lo escribe el programa: su original vive en `docs/manual/index.html` del repositorio de Turnera y
// se mantiene con cada cambio funcional. Aqui solo se trasplanta -- el indice y las secciones -- al envoltorio
// de devel.es, se reescriben las rutas de las imagenes a absolutas y se copian las capturas, con la carpeta
// `en/` de las sacadas con la aplicacion en ingles. Se copian todas y no solo las que falten: una pantalla
// que cambia se vuelve a fotografiar con el mismo nombre, y copiando solo las nuevas la web seguia
// ensenando la vieja.
//
//   node traer-manual.mjs ["ruta del repositorio de Turnera"]
//
// Despues toca lo de siempre: extraer, traducir lo nuevo y construir.

import { readFileSync, writeFileSync, existsSync, readdirSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const repositorioDeTurnera = process.argv[2] ?? join(aqui, '..', '..', 'turnera');
const original = join(repositorioDeTurnera, 'docs', 'manual', 'index.html');
const destino = join(aqui, 'manual-es.html');
const capturasOriginales = join(repositorioDeTurnera, 'docs', 'manual', 'imagenes');
const capturasDelSitio = join(aqui, '..', 'turnera', 'manual', 'imagenes');

if (!existsSync(original)) {
  console.error(`No encuentro el manual en ${original}.`);
  console.error('Pasa la ruta del repositorio de Turnera como argumento si no esta al lado de este.');
  process.exit(1);
}

function entre(texto, desde, hasta, queEs) {
  const inicio = texto.indexOf(desde);
  const fin = texto.indexOf(hasta, inicio);
  if (inicio === -1 || fin === -1) {
    throw new Error(`No encuentro ${queEs} (${desde} ... ${hasta}).`);
  }
  return { inicio, fin: fin + hasta.length, contenido: texto.slice(inicio, fin + hasta.length) };
}

const manual = readFileSync(original, 'utf8');
const sitio = readFileSync(destino, 'utf8');

const indice = entre(manual, '<nav class="indice">', '</nav>', 'el indice del manual').contenido;
const cuerpo = entre(manual, '<main', '</main>', 'las secciones del manual').contenido
  .replace(/^<main[^>]*>/, '')
  .replace(/<\/main>$/, '')
  .trim();

// Las paginas viven a distinta profundidad, asi que las capturas van con ruta absoluta.
const conRutasAbsolutas = (html) => html.replace(/src="imagenes\//g, 'src="/turnera/manual/imagenes/');

const indiceDelSitio = entre(sitio, '<nav class="indice">', '</nav>', 'el indice del sitio');
let salida = sitio.slice(0, indiceDelSitio.inicio) + conRutasAbsolutas(indice) + sitio.slice(indiceDelSitio.fin);

// El sitio guarda sus lineas con retorno de carro, asi que el cierre se busca por el final del main.
const abreContenido = salida.indexOf('<div class="contenido">');
const cierraMain = salida.indexOf('</main>', abreContenido);
if (abreContenido === -1 || cierraMain === -1) {
  throw new Error('No encuentro el contenido del sitio (<div class="contenido"> ... </main>).');
}
salida = salida.slice(0, abreContenido)
  + '<div class="contenido">\n' + conRutasAbsolutas(cuerpo) + '\n</div>\n'
  + salida.slice(cierraMain);

// El buscador del manual (su estilo y su script) vive en el original y viaja con el: ni se duplica ni se
// desincroniza. Si el sitio ya lo tiene, se sustituye; si no, se inserta antes de cerrar la cabecera y el cuerpo.
const bloqueDeBuscador = (html, abre, cierra) => {
  const inicio = html.indexOf(abre);
  const fin = html.indexOf(cierra, inicio);
  if (inicio === -1 || fin === -1) throw new Error(`No encuentro ${abre} en el manual.`);
  return html.slice(inicio, fin + cierra.length);
};
const conElBloque = (html, abre, cierra, bloque, antesDe) => {
  const inicio = html.indexOf(abre);
  if (inicio !== -1) return html.slice(0, inicio) + bloque + html.slice(html.indexOf(cierra, inicio) + cierra.length);
  const punto = html.lastIndexOf(antesDe);
  if (punto === -1) throw new Error(`No encuentro ${antesDe} en el sitio.`);
  return html.slice(0, punto) + bloque + '\n' + html.slice(punto);
};
salida = conElBloque(salida, '<style id="buscador-css">', '</style>',
  bloqueDeBuscador(manual, '<style id="buscador-css">', '</style>'), '</head>');
salida = conElBloque(salida, '<script id="buscador-js">', '</script>',
  bloqueDeBuscador(manual, '<script id="buscador-js">', '</script>'), '</body>');

writeFileSync(destino, salida);

let copiadas = 0;
if (existsSync(capturasOriginales)) {
  cpSync(capturasOriginales, capturasDelSitio, { recursive: true });
  copiadas = readdirSync(capturasOriginales, { recursive: true }).filter((nombre) => nombre.endsWith('.png')).length;
}

const titulos = (html) => (html.match(/<h[23][^>]*>/g) ?? []).length;
console.log(`Manual traido: ${titulos(cuerpo)} titulos, ${copiadas} capturas copiadas.`);
console.log('Ahora: node extraer.mjs manual-es.html plantillas/manual.html catalogos/manual.es.json');