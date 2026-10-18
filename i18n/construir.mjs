import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';

const IDIOMAS = ['es', 'en', 'de', 'pt'];
const PREDETERMINADO = 'es';
const SITIO = 'https://devel.es';

const PAGINAS = [
  { plantilla: 'plantillas/devel.html',   catalogo: 'devel',   ruta: '' },
  { plantilla: 'plantillas/turnera.html', catalogo: 'turnera', ruta: 'turnera' },
  { plantilla: 'plantillas/recursos-humanos.html', catalogo: 'recursos-humanos', ruta: 'turnera/recursos-humanos' },
  { plantilla: 'plantillas/manual.html',  catalogo: 'manual',  ruta: 'turnera/manual' },
  { plantilla: 'plantillas/novedades.html', catalogo: 'novedades', ruta: 'turnera/novedades' },
  // El aviso legal no esta en portugues: un texto juridico traducido sin revisar es mas riesgo que su falta. Desde
  // las paginas en portugues los enlaces a /legal siguen llevando a la version en espanol.
  { plantilla: 'plantillas/legal.html',   catalogo: 'legal',   ruta: 'legal', idiomas: ['es', 'en', 'de'] }
];

/** La dirección de una página en un idioma: el predeterminado va en la raíz y los demás bajo su prefijo. */
/** Los idiomas en que existe una pagina: todos, salvo que ella diga otra cosa. */
function idiomasDe(pagina) {
  return pagina.idiomas ?? IDIOMAS;
}

function direccionDe(idioma, ruta) {
  const prefijo = idioma === PREDETERMINADO ? '' : '/' + idioma;
  return prefijo + '/' + ruta;
}

function bloqueDeAlternativas(pagina) {
  const ruta = pagina.ruta;
  const lineas = idiomasDe(pagina).map((idioma) =>
    `<link rel="alternate" hreflang="${idioma}" href="${SITIO}${direccionDe(idioma, ruta)}">`);
  lineas.push(`<link rel="alternate" hreflang="x-default" href="${SITIO}${direccionDe(PREDETERMINADO, ruta)}">`);
  return lineas.join('\n');
}

const NOMBRES = { es: 'Español', en: 'English', de: 'Deutsch', pt: 'Português' };

/** La seccion de integradores la genera traer-integradores.mjs, y cada idioma tiene su propia carpeta. */
const INTEGRADORES = { es: '/turnera/integradores', en: '/en/turnera/integrators', de: '/de/turnera/integratoren', pt: '/en/turnera/integrators' };
const IDIOMAS_DE_INTEGRADORES = ['es', 'en', 'de'];

function selectorDeIdioma(idiomaActual, pagina) {
  const ruta = pagina.ruta;
  const opciones = idiomasDe(pagina).map((idioma) => {
    const actual = idioma === idiomaActual;
    return `<a class="idiomas__opcion" href="${direccionDe(idioma, ruta)}" lang="${idioma}"`
      + (actual ? ' aria-current="true"' : '')
      + `>${idioma.toUpperCase()}<span class="idiomas__nombre">${NOMBRES[idioma]}</span></a>`;
  }).join('');
  return `<div class="idiomas" role="group" aria-label="Idioma / Language / Sprache / Língua">${opciones}</div>`;
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
  const rutasInternas = ['', ...PAGINAS.filter((pagina) => idiomasDe(pagina).includes(idioma)).map((pagina) => pagina.ruta)];
  for (const ruta of rutasInternas) {
    const original = '/' + ruta;
    const traducida = direccionDe(idioma, ruta);
    html = html.split('href="' + original + '"').join('href="' + traducida + '"');
    // Los enlaces a un apartado de otra pagina, como el menu del manual a /turnera#preguntas.
    if (ruta !== '') html = html.split('href="' + original + '#').join('href="' + traducida + '#');
  }
  html = html.split('href="' + INTEGRADORES.es + '"').join('href="' + INTEGRADORES[idioma] + '"');
  return html;
}

/**
 * El manual en ingles y en aleman ensena las pantallas con la aplicacion en ingles, que estan en `imagenes/en/`.
 * La aplicacion no habla aleman, y una captura en ingles se entiende mejor que una en castellano. Se cambia
 * captura a captura y solo si existe la inglesa: una pantalla nueva sin fotografiar en ingles sale en castellano
 * en vez de salir rota.
 */
const CAPTURAS = '/turnera/manual/imagenes/';
const IDIOMA_DE_LAS_CAPTURAS = { es: null, en: 'en', de: 'en', pt: 'en' };

function conLasCapturasEnSuIdioma(html, idioma) {
  const carpeta = IDIOMA_DE_LAS_CAPTURAS[idioma];
  if (carpeta === null) return html;
  return html.replace(/"\/turnera\/manual\/imagenes\/([^"\/]+)"/g, (coincidencia, nombre) =>
    existsSync(join('..', CAPTURAS, carpeta, nombre)) ? `"${CAPTURAS}${carpeta}/${nombre}"` : coincidencia);
}

function construir() {
  for (const pagina of PAGINAS) {
    const plantilla = readFileSync(pagina.plantilla, 'utf8');
    for (const idioma of idiomasDe(pagina)) {
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
        `<link rel="canonical" href="${SITIO}${direccionDe(idioma, pagina.ruta)}">\n${bloqueDeAlternativas(pagina)}`);
      html = html.replace(/<meta property="og:url" content="[^"]*">/,
        `<meta property="og:url" content="${SITIO}${direccionDe(idioma, pagina.ruta)}">`);
      html = html.replace(/<meta property="og:locale" content="[^"]*">/,
        `<meta property="og:locale" content="${{ es: 'es_ES', en: 'en_GB', de: 'de_DE', pt: 'pt_PT' }[idioma]}">`);
      // El selector se pone despues de traducir los enlaces, y no antes: es el unico sitio de la pagina donde
      // un enlace a `/turnera` tiene que seguir llevando al espanol estando en la version alemana, que es
      // justo lo que hace el selector. Al reves, la traduccion se lo llevaba por delante y el boton ES
      // devolvia a la misma pagina.
      html = conLosEnlacesInternosEnSuIdioma(html, idioma);
      html = conLasCapturasEnSuIdioma(html, idioma);
      html = html.replace('<!--selector-de-idioma-->', selectorDeIdioma(idioma, pagina));

      const destino = join('..', direccionDe(idioma, pagina.ruta).replace(/^\//, ''), 'index.html');
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, '<!-- Generado por i18n/construir.mjs: no editar a mano, se pierde. -->\n' + html);
      console.log(`  ${destino}`);
    }
  }
}

function sitemap() {
  const hoy = new Date().toISOString().slice(0, 10);
  const entradas = PAGINAS.flatMap((pagina) => idiomasDe(pagina).map((idioma) => {
    const alternativas = idiomasDe(pagina).map((otro) =>
      `    <xhtml:link rel="alternate" hreflang="${otro}" href="${SITIO}${direccionDe(otro, pagina.ruta)}"/>`).join('\n');
    return `  <url>
    <loc>${SITIO}${direccionDe(idioma, pagina.ruta)}</loc>
    <lastmod>${hoy}</lastmod>
${alternativas}
  </url>`;
  }));
  // La seccion de integradores la genera traer-integradores.mjs y cada idioma tiene su propia direccion.
  const integradores = INTEGRADORES;
  for (const idioma of IDIOMAS_DE_INTEGRADORES) {
    const alternativas = IDIOMAS_DE_INTEGRADORES.map((otro) =>
      `    <xhtml:link rel="alternate" hreflang="${otro}" href="${SITIO}${integradores[otro]}"/>`).join('\n');
    entradas.push(`  <url>\n    <loc>${SITIO}${integradores[idioma]}</loc>\n    <lastmod>${hoy}</lastmod>\n${alternativas}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entradas.join('\n')}
</urlset>
`;
}

construir();
writeFileSync('../sitemap.xml', sitemap());
console.log('  ../sitemap.xml');
