# Las webs en tres idiomas

Español, inglés y alemán, con una dirección por idioma. **Los HTML de `/`, `/en/` y `/de/` están generados: no
se editan a mano.**

## Cómo funciona

```
i18n/
  plantillas/devel.html      el HTML con {{marcadores}} en lugar de los textos
  plantillas/turnera.html
  plantillas/manual.html
  catalogos/devel.es.json    los textos, uno por marcador
  catalogos/devel.en.json
  catalogos/devel.de.json
  catalogos/turnera.{es,en,de}.json
  catalogos/manual.{es,en,de}.json
  plantillas/novedades.html  lo nuevo de cada versión, para los clientes
  catalogos/novedades.{es,en,de}.json
  construir.mjs              genera las nueve páginas y el sitemap
  extraer.mjs                saca los marcadores de un HTML en español
```

**`construir.mjs` escribe en la raíz del repositorio**, que es lo que publica Vercel: `index.html`,
`turnera/index.html`, `turnera/manual/index.html` y sus equivalentes bajo `/en/` y `/de/`. Después de
construir, `git status` enseña exactamente qué páginas han cambiado: si no cambia ninguna, es que el texto que
tocaste no llegó a la página.

La clave de cada texto es el resumen de su contenido, así que **mientras el español no cambie, la clave no
cambia** y las traducciones siguen valiendo. Si cambias una frase en español, su clave cambia y el generador
falla diciendo cuál falta: eso es a propósito, para que no se publique una página a medio traducir.

## Cambiar un texto

1. Edita `i18n/<pagina>-es.html`, que es el original en español.
2. `node extraer.mjs <pagina>-es.html plantillas/<pagina>.html catalogos/<pagina>.es.json`
3. Añade la clave nueva a los catálogos `.en.json` y `.de.json`.
4. `node construir.mjs`
5. Comprueba con `node verificar.mjs` (con el sitio servido en el 8899).

## Añadir un idioma

En `construir.mjs`, mete el código en `IDIOMAS` y su nombre en `NOMBRES`, crea los dos catálogos y construye.
El selector, los `hreflang` y el sitemap salen solos.

## Lo que hay que saber

- **El predeterminado va en la raíz**, sin prefijo: `/`, `/turnera` y `/turnera/manual`. Los otros bajo `/en/`
  y `/de/`.
- **El manual sale del programa, no de aquí.** El original vive en el repositorio de Turnera, en
  `docs/manual/index.html`, y se mantiene con cada cambio funcional. `i18n/manual-es.html` es ese manual metido
  en la plantilla del sitio: cuando el manual cambie, hay que traer el contenido, volver a extraer y traducir lo
  que sea nuevo.
- Cada página declara sus tres alternativas más `x-default`, que apunta al español.
- **Las rutas de las imágenes tienen que ser absolutas** (`/turnera/inicio.jpg`), porque las páginas viven a
  distinta profundidad y Vercel sirve `/turnera` sin barra final.
