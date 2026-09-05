const PUNTUACION_MINIMA = 0.5;

async function verificarRecaptcha(token, ip) {
  const parametros = new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET,
    response: token
  });
  if (ip) parametros.set("remoteip", ip);

  const respuesta = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parametros
  });
  return respuesta.json();
}

async function enviarCorreo({ nombre, correo, mensaje }) {
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.CORREO_REMITENTE,
      to: [process.env.CORREO_DESTINO],
      reply_to: correo,
      subject: `Contacto desde devel.es — ${nombre}`,
      text: `Nombre: ${nombre}\nCorreo: ${correo}\n\n${mensaje}`
    })
  });

  if (!respuesta.ok) {
    throw new Error(`Resend respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
}

export default async function handler(peticion, respuesta) {
  if (peticion.method !== "POST") {
    return respuesta.status(405).json({ error: "Método no permitido" });
  }

  const { nombre = "", correo = "", mensaje = "", empresa = "", token = "" } = peticion.body ?? {};

  if (empresa.trim() !== "") {
    return respuesta.status(200).json({ ok: true });
  }

  if (!nombre.trim() || !mensaje.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim())) {
    return respuesta.status(400).json({ error: "Faltan datos o el correo no es válido" });
  }

  try {
    const verificacion = await verificarRecaptcha(token, peticion.headers["x-forwarded-for"]);
    const superaElFiltro =
      verificacion.success &&
      verificacion.action === "contacto" &&
      verificacion.score >= PUNTUACION_MINIMA;

    if (!superaElFiltro) {
      console.error("Verificación reCAPTCHA no superada:", JSON.stringify(verificacion));
      return respuesta.status(403).json({ error: "Verificación no superada" });
    }

    await enviarCorreo({ nombre: nombre.trim(), correo: correo.trim(), mensaje: mensaje.trim() });
    return respuesta.status(200).json({ ok: true });
  } catch (error) {
    console.error("Fallo enviando el formulario de contacto:", error);
    return respuesta.status(502).json({ error: "No se ha podido enviar el mensaje" });
  }
}
