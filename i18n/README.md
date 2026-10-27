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

## Añadir una versión a las novedades

Cada versión es una **ficha**: una `<section class="version">` en `i18n/novedades-es.html`, con la fecha y los
cambios agrupados por lo que gana quien usa Turnera, contados para el mostrador y no para quien programa.

1. La nueva va **arriba del todo**, dentro de `<div class="contenido">`, con `id` igual a su fecha
   (`2026-10-02`). Copia la estructura de la anterior: `version__cabecera` con el `<h2>` de la fecha.
   Dentro, los cambios van en **tres grupos, en este orden**, cada uno con su icono (copia el `<h3>` de una
   ficha anterior); el que no tenga nada, no se pone:
   - `<div class="grupo grupo--nuevo">` · **Nuevas características**: lo que antes no existía.
   - `<div class="grupo grupo--mejora">` · **Mejoras**: lo que ya había y ahora funciona mejor.
   - `<div class="grupo grupo--arreglo">` · **Errores corregidos**: lo que fallaba. Una sola lista, sin
     subtítulos, y sin empezar por «Arreglado:», que ya lo dice el grupo.
   En los dos primeros, cada tema lleva su `<h4>` y su lista.
   Debajo de la cabecera va el número de la versión desplegada, tal cual lo enseña Turnera en «Versión»:
   `<p class="version__numero">Versión <span translate="no">1.0.0-7a239ce</span></p>`. Desde el 19/10/2026
   (1.0.0) la numeración es **semver** (`1.0.0`, `1.1.0`, `1.0.1`...) seguida del commit; las fichas anteriores
   llevan la de antes (`2026.10.185-230e64f`) y se dejan así. Ningún script interpreta el número: es un texto más
   del catálogo, que se copia igual en `en`, `de` y `pt`. El `id` de la ficha es su fecha (`2026-10-22`).

   **Una sola ficha por día (regla de Fran, 27/10/2026).** Si ese día ya hay ficha, no se crea otra: se añaden los
   cambios dentro de sus grupos (y el número de versión pasa a ser el último del día). Si se te han juntado
   varias, `node unificar-dias.mjs` las fusiona (deja la fecha como título y la versión más reciente), y
   `node indice-novedades.mjs` rehace el índice de arriba, que tiene una línea por ficha; después extrae, añade
   la fecha en `en`/`de`/`pt` si es nueva, construye y verifica.
2. **El sello `Última versión` se mueve** a la nueva: se quita el `<span class="version__sello">` de la
   anterior. El filo de color lo pone el CSS a la primera ficha, solo.
3. Añade la fecha al índice de la izquierda, también arriba.
4. Extrae, traduce las claves nuevas en `novedades.en.json` y `novedades.de.json`, construye y verifica.
5. Se sube **cuando la versión ya está desplegada**, no antes: la página anuncia lo que los clientes ya tienen.

## Añadir un idioma

En `construir.mjs`, mete el código en `IDIOMAS` y su nombre en `NOMBRES`, crea los dos catálogos y construye.
El selector, los `hreflang` y el sitemap salen solos.

## Lo que hay que saber

- **El portugués (de Portugal) es el cuarto idioma.** Tiene catálogos de manual, novedades, Turnera, Recursos Humanos y DEVEL, pero **no del aviso legal**: un texto jurídico traducido sin revisar es más riesgo que su falta, y desde /pt/ los enlaces a /legal llevan a la versión en español. Las capturas del manual en portugués son las inglesas y la sección de integradores enlaza a la inglesa. Cada texto nuevo del manual o de las novedades se traduce ahora a **cuatro** idiomas.
- **El predeterminado va en la raíz**, sin prefijo: `/`, `/turnera` y `/turnera/manual`. Los otros bajo `/en/`
  y `/de/`.
- **El manual sale del programa, no de aquí.** El original vive en el repositorio de Turnera, en
  `docs/manual/index.html`, y se mantiene con cada cambio funcional. `i18n/manual-es.html` es ese manual metido
  en la plantilla del sitio: cuando el manual cambie, hay que traer el contenido, volver a extraer y traducir lo
  que sea nuevo.
- Cada página declara sus tres alternativas más `x-default`, que apunta al español.
- **Páginas por tipo de centro.** `clinicas-es.html`, `centros-deportivos-es.html` y `academias-es.html` son las
  páginas de aterrizaje de `/turnera/clinicas`, `/turnera/centros-deportivos` y `/turnera/academias`. Reutilizan a
  propósito frases y preguntas de la página de Turnera copiadas tal cual: con el mismo texto sale la misma clave y la
  traducción ya existe. Si cambias una de esas preguntas en Turnera, cámbiala también en ellas.
- **Los datos estructurados de cada página los añade `construir.mjs`** (WebPage, o FAQPage si la página tiene
  preguntas `faq__item` a la vista, y las migas de pan), sacándolos del título, la descripción y las preguntas ya
  traducidas. No se escriben a mano en la plantilla; lo que sí va a mano es el producto (SoftwareApplication) en
  `turnera-es.html` y la organización en `devel-es.html`. Nada de valoraciones ni reseñas: solo lo que se ve en la web.
- **Las rutas de las imágenes tienen que ser absolutas** (`/turnera/inicio.jpg`), porque las páginas viven a
  distinta profundidad y Vercel sirve `/turnera` sin barra final.
