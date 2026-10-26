import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';

const IDIOMAS = ['es', 'en', 'de', 'pt'];
const PREDETERMINADO = 'es';
const SITIO = 'https://devel.es';

const PAGINAS = [
  { plantilla: 'plantillas/devel.html',   catalogo: 'devel',   ruta: '' },
  { plantilla: 'plantillas/turnera.html', catalogo: 'turnera', ruta: 'turnera' },
  { plantilla: 'plantillas/recursos-humanos.html', catalogo: 'recursos-humanos', ruta: 'turnera/recursos-humanos' },
  { plantilla: 'plantillas/clinicas.html', catalogo: 'clinicas', ruta: 'turnera/clinicas' },
  { plantilla: 'plantillas/centros-deportivos.html', catalogo: 'centros-deportivos', ruta: 'turnera/centros-deportivos' },
  { plantilla: 'plantillas/academias.html', catalogo: 'academias', ruta: 'turnera/academias' },
  { plantilla: 'plantillas/tradeguncharts.html', catalogo: 'tradeguncharts', ruta: 'tradeguncharts', idiomas: ['es', 'en'], respaldo: 'en' },
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
  // Una pagina que no existe en este idioma y tiene `respaldo` se enlaza a su version en ese otro idioma.
  for (const pagina of PAGINAS.filter((p) => p.respaldo && !idiomasDe(p).includes(idioma))) {
    html = html.split('href="/' + pagina.ruta + '"').join('href="' + direccionDe(pagina.respaldo, pagina.ruta) + '"');
  }
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

/** El nombre corto de cada pagina en las migas de pan de los datos estructurados. */
const NOMBRES_DE_PAGINA = {
  '': { es: 'DEVEL' },
  'turnera': { es: 'Turnera' },
  'tradeguncharts': { es: 'TradegunCharts', en: 'TradegunCharts' },
  'turnera/recursos-humanos': { es: 'Recursos Humanos', en: 'Human Resources', de: 'Personal', pt: 'Recursos Humanos' },
  'turnera/clinicas': { es: 'Clínicas', en: 'Clinics', de: 'Praxen und Kliniken', pt: 'Clínicas' },
  'turnera/centros-deportivos': { es: 'Centros deportivos', en: 'Training centres and clubs', de: 'Trainingszentren und Vereine', pt: 'Centros desportivos' },
  'turnera/academias': { es: 'Academias', en: 'Academies', de: 'Schulen und Akademien', pt: 'Academias' },
  'turnera/manual': { es: 'Manual', en: 'Manual', de: 'Handbuch', pt: 'Manual' },
  'turnera/novedades': { es: 'Novedades', en: "What's new", de: 'Neuigkeiten', pt: 'Novidades' },
  'legal': { es: 'Información legal', en: 'Legal information', de: 'Rechtliche Hinweise' }
};
const IDIOMA_DE_LOS_DATOS = { es: 'es', en: 'en', de: 'de', pt: 'pt-PT' };

function textoPlano(html) {
  return html.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').replace(/ ([.,;:)])/g, '$1').trim();
}

/** `turnera/clinicas` cuelga de `turnera`, que cuelga de la portada. */
function rutasDeLasMigas(ruta) {
  const tramos = ruta === '' ? [] : ruta.split('/');
  return [''].concat(tramos.map((_, n) => tramos.slice(0, n + 1).join('/')));
}

/**
 * Los datos estructurados de cada pagina salen de la propia pagina ya traducida: su titulo, su descripcion, sus
 * migas y, si tiene preguntas frecuentes a la vista, esas mismas preguntas. Asi no hay un texto en los datos que
 * no este en la pagina, ni una version en espanol escondida en la alemana.
 */
function conLosDatosEstructurados(html, idioma, pagina) {
  const url = SITIO + direccionDe(idioma, pagina.ruta);
  const titulo = textoPlano((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
  const descripcion = textoPlano((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const preguntas = [...html.matchAll(/<details class="faq__item">\s*<summary>([\s\S]*?)<\/summary>\s*<div class="faq__respuesta">([\s\S]*?)<\/div>\s*<\/details>/g)]
    .map(([, pregunta, respuesta]) => ({
      '@type': 'Question', name: textoPlano(pregunta), acceptedAnswer: { '@type': 'Answer', text: textoPlano(respuesta) }
    }));
  const estaPagina = {
    '@type': preguntas.length > 0 ? 'FAQPage' : 'WebPage', '@id': url + '#pagina', url, name: titulo,
    description: descripcion, inLanguage: IDIOMA_DE_LOS_DATOS[idioma], isPartOf: { '@id': SITIO + '/#web' }
  };
  if (pagina.ruta.startsWith('turnera')) estaPagina.about = { '@id': SITIO + '/turnera#producto' };
  const grafo = [estaPagina];
  const migas = rutasDeLasMigas(pagina.ruta);
  if (migas.length > 1) {
    estaPagina.breadcrumb = { '@id': url + '#migas' };
    grafo.push({
      '@type': 'BreadcrumbList', '@id': url + '#migas',
      itemListElement: migas.map((ruta, posicion) => ({
        '@type': 'ListItem', position: posicion + 1,
        name: NOMBRES_DE_PAGINA[ruta][idioma] ?? NOMBRES_DE_PAGINA[ruta].es,
        item: SITIO + direccionDe(idioma, ruta)
      }))
    });
  }
  if (preguntas.length > 0) estaPagina.mainEntity = preguntas;
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo }, null, 2).replace(/</g, '\\u003c');
  return html.replace('</head>', `<script type="application/ld+json">\n${json}\n</script>\n</head>`);
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
      html = conLosDatosEstructurados(html, idioma, pagina);

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
      `    <xhtml:link rel="alternate" hreflang="${otro}" href="${SITIO}${direccionDe(otro, pagina.ruta)}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITIO}${direccionDe(PREDETERMINADO, pagina.ruta)}"/>`).join('\n');
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
