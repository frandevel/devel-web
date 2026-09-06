import { load } from 'cheerio';
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

// Los atributos cuyo valor lee una persona y por tanto hay que traducir.
const ATRIBUTOS_CON_TEXTO = ['alt', 'title', 'placeholder', 'aria-label', 'content'];
const METAS_TRADUCIBLES = new Set(['description', 'og:title', 'og:description', 'og:image:alt',
                                   'twitter:title', 'twitter:description']);

function claveDe(texto) {
  return 't' + createHash('sha1').update(texto).digest('hex').slice(0, 8);
}

export function extraer(rutaHtml) {
  const html = readFileSync(rutaHtml, 'utf8');
  const $ = load(html, { decodeEntities: false });
  const catalogo = {};

  const anotar = (texto) => {
    const limpio = texto.trim();
    if (!limpio || /^[\s\d.,:;·—–|@€%+-]*$/.test(limpio)) return null;
    const clave = claveDe(limpio);
    catalogo[clave] = limpio;
    return clave;
  };

  // Texto suelto dentro de las etiquetas
  $('*').contents().each((_, nodo) => {
    if (nodo.type !== 'text') return;
    const padre = nodo.parent?.name;
    if (padre === 'script' || padre === 'style') return;
    const clave = anotar(nodo.data);
    if (clave) {
      // Se conserva el espaciado original a los lados para no alterar la maquetación
      const [, izquierda, medio, derecha] = nodo.data.match(/^(\s*)([\s\S]*?)(\s*)$/);
      nodo.data = izquierda + '{{' + clave + '}}' + derecha;
    }
  });

  // Atributos
  $('[' + ATRIBUTOS_CON_TEXTO.join('],[') + ']').each((_, elemento) => {
    const $e = $(elemento);
    for (const atributo of ATRIBUTOS_CON_TEXTO) {
      const valor = $e.attr(atributo);
      if (!valor) continue;
      if (atributo === 'content') {
        const nombre = $e.attr('name') || $e.attr('property');
        if (!METAS_TRADUCIBLES.has(nombre)) continue;
      }
      const clave = anotar(valor);
      if (clave) $e.attr(atributo, '{{' + clave + '}}');
    }
  });

  return { plantilla: $.html(), catalogo };
}

const [entrada, salidaPlantilla, salidaCatalogo] = process.argv.slice(2);
const { plantilla, catalogo } = extraer(entrada);
writeFileSync(salidaPlantilla, plantilla);
writeFileSync(salidaCatalogo, JSON.stringify(catalogo, null, 2) + '\n');
console.log(`${entrada}: ${Object.keys(catalogo).length} cadenas`);
