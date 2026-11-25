// Saca el manual de Turnera en Markdown, uno por idioma, junto a su pagina: /turnera/manual/manual.md,
// /en/turnera/manual/manual.md... Es para darselo a una IA que ayude en el soporte: el mismo texto que la web, sin
// menus, buscador ni capturas (de cada captura queda su pie). Lo llama construir.mjs al final, asi que siempre va al
// dia con el manual publicado.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITIO = 'https://devel.es';
const IDIOMAS = { es: '', en: '/en', de: '/de', pt: '/pt' };
const AVISO = {
  es: 'Manual de usuario de Turnera, el mismo texto que la web sin capturas de pantalla.',
  en: 'Turnera user manual, the same text as the website without screenshots.',
  de: 'Benutzerhandbuch von Turnera, derselbe Text wie auf der Website, ohne Bildschirmfotos.',
  pt: 'Manual do utilizador do Turnera, o mesmo texto da página web, sem capturas de ecrã.',
};

function enLinea($, nodo) {
  return $(nodo).contents().toArray().map((hijo) => {
    if (hijo.type === 'text') return hijo.data.replace(/\s+/g, ' ');
    if (hijo.type !== 'tag') return '';
    const texto = enLinea($, hijo);
    switch (hijo.name) {
      case 'strong': case 'b': return texto.trim() ? `**${texto.trim()}**` : '';
      case 'em': case 'i': return texto.trim() ? `*${texto.trim()}*` : '';
      case 'code': case 'kbd': return `\`${$(hijo).text()}\``;
      case 'br': return '\n';
      case 'img': case 'svg': case 'button': case 'input': case 'script': case 'style': return '';
      default: return texto;
    }
  }).join('');
}

function limpia(texto) {
  return texto.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
}

function lista($, nodo, nivel) {
  const ordenada = nodo.name === 'ol';
  return $(nodo).children('li').toArray().map((li, posicion) => {
    const sangria = '  '.repeat(nivel);
    const marca = ordenada ? `${posicion + 1}.` : '-';
    const propio = $(li).clone();
    propio.children('ul, ol').remove();
    const lineas = [`${sangria}${marca} ${limpia(enLinea($, propio))}`];
    $(li).children('ul, ol').each((_, sub) => lineas.push(lista($, sub, nivel + 1)));
    return lineas.join('\n');
  }).join('\n');
}

function tabla($, nodo) {
  const filas = $(nodo).find('tr').toArray().map((tr) =>
    $(tr).children('th, td').toArray().map((celda) => limpia(enLinea($, celda)).replace(/\|/g, '\\|').replace(/\n/g, ' ')));
  if (filas.length === 0) return '';
  const ancho = Math.max(...filas.map((fila) => fila.length));
  const completa = (fila) => `| ${[...fila, ...Array(ancho - fila.length).fill('')].join(' | ')} |`;
  return [completa(filas[0]), `|${' --- |'.repeat(ancho)}`, ...filas.slice(1).map(completa)].join('\n');
}

function bloques($, nodo, salida) {
  for (const hijo of $(nodo).contents().toArray()) {
    if (hijo.type === 'text') {
      const texto = limpia(hijo.data);
      if (texto) salida.push(texto);
      continue;
    }
    if (hijo.type !== 'tag') continue;
    const nombre = hijo.name;
    if (['script', 'style', 'svg', 'button', 'input', 'img', 'nav'].includes(nombre)) continue;
    if (/^h[1-6]$/.test(nombre)) {
      const texto = limpia(enLinea($, hijo));
      if (texto) salida.push(`${'#'.repeat(Number(nombre[1]))} ${texto}`);
    } else if (nombre === 'p' || nombre === 'summary' || nombre === 'blockquote') {
      const texto = limpia(enLinea($, hijo));
      if (texto) salida.push(nombre === 'summary' ? `**${texto}**` : texto);
    } else if (nombre === 'ul' || nombre === 'ol') {
      salida.push(lista($, hijo, 0));
    } else if (nombre === 'table') {
      salida.push(tabla($, hijo));
    } else if (nombre === 'figure') {
      const pie = limpia(enLinea($, $(hijo).find('figcaption')));
      if (pie) salida.push(`*[Captura] ${pie}*`);
    } else if (nombre === 'pre') {
      salida.push('```\n' + $(hijo).text().trim() + '\n```');
    } else {
      bloques($, hijo, salida);
    }
  }
}

export function manualEnMarkdown() {
  const hoy = new Date().toISOString().slice(0, 10);
  for (const [idioma, prefijo] of Object.entries(IDIOMAS)) {
    const pagina = join(raiz, prefijo.slice(1), 'turnera', 'manual', 'index.html');
    if (!existsSync(pagina)) continue;
    const $ = cheerio.load(readFileSync(pagina, 'utf8'));
    const principal = $('main').first();
    principal.find('nav.indice, script, style').remove();
    const salida = [];
    bloques($, principal, salida);
    const cabecera = `<!-- ${AVISO[idioma]} ${SITIO}${prefijo}/turnera/manual · ${hoy} -->`;
    const texto = [cabecera, ...salida].join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n';
    const destino = join(dirname(pagina), 'manual.md');
    writeFileSync(destino, texto);
    console.log(`  ${destino.replace(raiz, '..')} (${Math.round(texto.length / 1024)} KB)`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  manualEnMarkdown();
}
