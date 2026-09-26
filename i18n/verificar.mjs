import { chromium } from 'playwright';

// El navegador lo dice el entorno, que no es el mismo en el contenedor que en un portátil.
const navegador = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

const PAGINAS = ['/', '/en/', '/de/', '/turnera/', '/en/turnera/', '/de/turnera/',
                 '/turnera/manual/', '/en/turnera/manual/', '/de/turnera/manual/',
                 '/turnera/novedades/', '/en/turnera/novedades/', '/de/turnera/novedades/',
                 '/legal/', '/en/legal/', '/de/legal/'];
const PREFIJO = { es: '', en: '/en', de: '/de' };

let problemas = 0;
for (const ruta of PAGINAS) {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const pagina = await contexto.newPage();
  const fallos = [];
  pagina.on('pageerror', (e) => fallos.push(String(e)));
  const respuesta = await pagina.goto('http://127.0.0.1:8899' + ruta, { waitUntil: 'domcontentloaded' });
  const info = await pagina.evaluate(() => ({
    idioma: document.documentElement.lang,
    titulo: document.title,
    canonica: document.querySelector('link[rel=canonical]')?.href,
    alternativas: [...document.querySelectorAll('link[rel=alternate]')].map(l => `${l.hreflang}:${new URL(l.href).pathname}`),
    selector: [...document.querySelectorAll('.idiomas__opcion')].map(a => a.getAttribute('href') + (a.getAttribute('aria-current') ? '*' : '')),
    sinTraducir: (document.body.innerHTML.match(/\{\{t[0-9a-f]{8}\}\}/g) || []).length,
    ogLocale: document.querySelector('meta[property="og:locale"]')?.content
  }));

  // El selector tiene que llevar a las otras dos versiones de ESTA página, no a la misma ni a la portada:
  // que el botón ES devolviera a la página alemana fue un fallo real y silencioso.
  const sinPrefijo = ruta.replace(/^\/(en|de)/, '');
  const esperados = ['es', 'en', 'de'].map((i) => PREFIJO[i] + sinPrefijo);
  const selectorMal = info.selector.some((href, n) => href.replace('*', '').replace(/\/$/, '') !== esperados[n].replace(/\/$/, ''));

  const mal = info.sinTraducir > 0 || fallos.length > 0 || respuesta.status() !== 200
    || info.selector.length !== 3 || selectorMal;
  if (mal) problemas++;
  console.log(`${mal ? 'MAL' : ' OK'} ${ruta}  lang=${info.idioma}  og=${info.ogLocale}`);
  console.log(`     "${info.titulo}"`);
  console.log(`     canonica ${new URL(info.canonica).pathname} | alt ${info.alternativas.join(' ')}`);
  console.log(`     selector ${info.selector.join(' ')}${selectorMal ? '  <-- NO LLEVA A LA MISMA PAGINA' : ''}`);
  console.log(`     sin traducir ${info.sinTraducir} | errores ${fallos.length}`);
  await contexto.close();
}
console.log(problemas === 0 ? `\nlas ${PAGINAS.length} correctas` : `\n${problemas} con problemas`);
await navegador.close();
process.exit(problemas === 0 ? 0 : 1);
