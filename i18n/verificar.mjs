import { chromium } from 'playwright';
const navegador = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
});
const PAGINAS = ['/', '/en/', '/de/', '/turnera/', '/en/turnera/', '/de/turnera/'];
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
  const mal = info.sinTraducir > 0 || fallos.length > 0 || respuesta.status() !== 200 || info.selector.length !== 3;
  if (mal) problemas++;
  console.log(`${mal ? 'MAL' : ' OK'} ${ruta}  lang=${info.idioma}  og=${info.ogLocale}`);
  console.log(`     "${info.titulo}"`);
  console.log(`     canonica ${new URL(info.canonica).pathname} | alt ${info.alternativas.join(' ')}`);
  console.log(`     selector ${info.selector.join(' ')} | sin traducir ${info.sinTraducir} | errores ${fallos.length}`);
  await contexto.close();
}
console.log(problemas === 0 ? '\nlas seis correctas' : `\n${problemas} con problemas`);
await navegador.close();
