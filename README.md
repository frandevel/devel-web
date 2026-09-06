# Web de DEVEL

Sitio estático de una página más una función serverless para el formulario de contacto.

```
index.html          la portada (CSS y logo incrustados)
turnera/            la pagina de producto de Turnera, con sus capturas
vercel.json         turnera.es lleva a devel.es/turnera
devel-isotipo.png   favicon
api/contacto.js     función que valida el reCAPTCHA y envía el correo
```

## Desplegar en Vercel

1. Sube la carpeta a un repositorio de GitHub, o arrástrala en vercel.com/new.
2. No hay que configurar framework ni comando de build: Vercel sirve `index.html` y detecta `api/contacto.js` como función Node.

## Antes de que el formulario funcione

### 1. Claves de reCAPTCHA v3

En https://www.google.com/recaptcha/admin crea un sitio de tipo **reCAPTCHA v3** (el que puntúa el comportamiento, sin casillas ni puzles) y registra los dominios:

- `devel.es`
- `www.devel.es`
- el dominio `*.vercel.app` que te asigne el despliegue

Te da dos claves. La **clave de sitio** es pública: va en `index.html`, sustituyendo `PON_AQUI_TU_CLAVE_DE_SITIO`. La **clave secreta** no sale del servidor: va en las variables de entorno.

### 2. Envío de correo

La función usa la API de Resend (plan gratuito: 3.000 correos al mes). En resend.com verifica el dominio `devel.es` con los registros que te indique — **son registros TXT y CNAME nuevos, no tocan los MX de Google Workspace**.

Si prefieres no meter otro proveedor, la alternativa es SMTP de Google Workspace con una contraseña de aplicación; hay que cambiar `enviarCorreo` en `api/contacto.js` y añadir `nodemailer` como dependencia.

### 3. Variables de entorno en Vercel

| Variable | Valor |
|---|---|
| `RECAPTCHA_SECRET` | la clave secreta de reCAPTCHA |
| `RESEND_API_KEY` | la API key de Resend |
| `CORREO_DESTINO` | `f.serrano@devel.es` |
| `CORREO_REMITENTE` | `web@devel.es` (un remitente del dominio verificado) |

## Apuntar devel.es cuando esté conforme

En el DNS de IONOS, dos registros nuevos. **No se toca ningún MX.**

| Tipo | Host | Valor |
|---|---|---|
| A | `@` | la IP que indique Vercel |
| CNAME | `www` | el destino que indique Vercel |

## Detalles del filtro anti-bots

- reCAPTCHA v3 devuelve una puntuación de 0 a 1. El corte está en `PUNTUACION_MINIMA = 0.5`; si te entra spam, súbelo a 0.7, y si algún humano se queda fuera, bájalo.
- Se comprueba también que la acción sea `contacto`, para que nadie reutilice un token sacado de otra página.
- Hay un campo trampa (`empresa`) oculto para personas y visible para bots: si viene relleno, la función responde que todo ha ido bien y no envía nada.
