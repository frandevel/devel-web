import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';

const IDIOMAS = ['es', 'en', 'de'];
const PREDETERMINADO = 'es';
const SITIO = 'https://devel.es';

const PAGINAS = [
  { plantilla: 'plantillas/devel.html',   catalogo: 'devel',   ruta: '' },
  { plantilla: 'plantillas/turnera.html', catalogo: 'turnera', ruta: 'turnera' }
];

/** La dirección de una página en un idioma: el predeterminado va en la raíz y los demás bajo su prefijo. */
function direccionDe(idioma, ruta) {
  const prefijo = idioma === PREDETERMINADO ? '' : '/' + idioma;
  return prefijo + '/' + ruta;
}

function bloqueDeAlternativas(ruta) {
  const lineas = IDIOMAS.map((idioma) =>
    `<link rel="alternate" hreflang="${idioma}" href="${SITIO}${direccionDe(idioma, ruta)}">`);
  lineas.push(`<link rel="alternate" hreflang="x-default" href="${SITIO}${direccionDe(PREDETERMINADO, ruta)}">`);
  return lineas.join('\n');
}

const NOMBRES = { es: 'Español', en: 'English', de: 'Deutsch' };

function selectorDeIdioma(idiomaActual, ruta) {
  const opciones = IDIOMAS.map((idioma) => {
    const actual = idioma === idiomaActual;
    return `<a class="idiomas__opcion" href="${direccionDe(idioma, ruta)}" lang="${idioma}"`
      + (actual ? ' aria-current="true"' : '')
      + `>${idioma.toUpperCase()}<span class="idiomas__nombre">${NOMBRES[idioma]}</span></a>`;
  }).join('');
  return `<div class="idiomas" role="group" aria-label="Idioma / Language / Sprache">${opciones}</div>`;
}

/**
 * Un enlace a otra página del sitio tiene que llevar al mismo idioma que la página desde la que se pulsa: desde
 * `/de/` el enlace a Turnera va a `/de/turnera`, no a la versión en español.
 *
 * Se comparan las direcciones enteras, no por principio de cadena, para no tocar las de las imágenes: la ruta
 * `/turnera` es un enlace y `/turnera/inicio.jpg` es un fichero.
 */
function conLosEnlacesInternosEnSuIdioma(html, idioma) {
  if (idioma === PREDETERMINADO) return html;
  const rutasInternas = ['', ...PAGINAS.map((pagina) => pagina.ruta)];
  for (const ruta of rutasInternas) {
    const original = '/' + ruta;
    const traducida = direccionDe(idioma, ruta);
    html = html.split('href="' + original + '"').join('href="' + traducida + '"');
  }
  return html;
}

function construir() {
  for (const pagina of PAGINAS) {
    const plantilla = readFileSync(pagina.plantilla, 'utf8');
    for (const idioma of IDIOMAS) {
      const catalogo = JSON.parse(readFileSync(`catalogos/${pagina.catalogo}.${idioma}.json`, 'utf8'));

      let html = plantilla.replace(/\{\{(t[0-9a-f]{8})\}\}/g, (coincidencia, clave) => {
        const traduccion = catalogo[clave];
        if (traduccion === undefined) {
          throw new Error(`Falta la clave ${clave} en ${pagina.catalogo}.${idioma}.json`);
        }
        return traduccion;
      });

      html = html.replace('<html lang="es">', `<html lang="${idioma}">`);
      html = html.replace(/<link rel="canonical" href="[^"]*">/,
        `<link rel="canonical" href="${SITIO}${direccionDe(idioma, pagina.ruta)}">\n${bloqueDeAlternativas(pagina.ruta)}`);
      html = html.replace(/<meta property="og:url" content="[^"]*">/,
        `<meta property="og:url" content="${SITIO}${direccionDe(idioma, pagina.ruta)}">`);
      html = html.replace(/<meta property="og:locale" content="[^"]*">/,
        `<meta property="og:locale" content="${{ es: 'es_ES', en: 'en_GB', de: 'de_DE' }[idioma]}">`);
      html = html.replace('<!--selector-de-idioma-->', selectorDeIdioma(idioma, pagina.ruta));
      html = conLosEnlacesInternosEnSuIdioma(html, idioma);

      const destino = join('..', 'sitio', direccionDe(idioma, pagina.ruta).replace(/^\//, ''), 'index.html');
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, '<!-- Generado por i18n/construir.mjs: no editar a mano, se pierde. -->\n' + html);
      console.log(`  ${destino}`);
    }
  }
}

function sitemap() {
  const hoy = new Date().toISOString().slice(0, 10);
  const entradas = PAGINAS.flatMap((pagina) => IDIOMAS.map((idioma) => {
    const alternativas = IDIOMAS.map((otro) =>
      `    <xhtml:link rel="alternate" hreflang="${otro}" href="${SITIO}${direccionDe(otro, pagina.ruta)}"/>`).join('\n');
    return `  <url>
    <loc>${SITIO}${direccionDe(idioma, pagina.ruta)}</loc>
    <lastmod>${hoy}</lastmod>
${alternativas}
  </url>`;
  }));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entradas.join('\n')}
</urlset>
`;
}

construir();
writeFileSync('../sitio/sitemap.xml', sitemap());
console.log('  ../sitio/sitemap.xml');
