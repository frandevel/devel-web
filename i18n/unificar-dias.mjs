import { readFileSync, writeFileSync } from 'fs';
const f = 'i18n/novedades-es.html';
const html = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const reSec = /<section id="([^"]+)" class="version">\n([\s\S]*?)\n<\/section>/g;
const secciones = [];
let m;
while ((m = reSec.exec(html))) secciones.push({ texto: m[0], id: m[1], cuerpo: m[2] });
const reGrupo = /  <div class="grupo (grupo--\w+)">\n(    <h3[^\n]*<\/h3>)\n([\s\S]*?)\n  <\/div>/g;
function analizar(s) {
  const h2 = s.cuerpo.match(/<h2>([\s\S]*?)<\/h2>/)[1];
  const fecha = h2.split(' · ')[0];
  const sello = /version__sello/.test(s.cuerpo);
  const numero = s.cuerpo.match(/<p class="version__numero">[\s\S]*?<\/p>/)[0];
  const grupos = {};
  let g;
  reGrupo.lastIndex = 0;
  while ((g = reGrupo.exec(s.cuerpo))) grupos[g[1]] = { h3: g[2], cuerpo: g[3] };
  const resto = s.cuerpo.replace(reGrupo, '').replace(/<div class="version__cabecera">[\s\S]*?<\/div>/, '').replace(/<p class="version__numero">[\s\S]*?<\/p>/, '').trim();
  if (resto) console.log('RESTO en', s.id, resto.slice(0, 60));
  return { ...s, h2, fecha, sello, numero, grupos, resto, isoFecha: s.id.slice(0, 10) };
}
const fichas = secciones.map(analizar);
const orden = ['grupo--nuevo', 'grupo--mejora', 'grupo--arreglo'];
const porDia = new Map();
for (const ficha of fichas) { if (!porDia.has(ficha.isoFecha)) porDia.set(ficha.isoFecha, []); porDia.get(ficha.isoFecha).push(ficha); }
function fusionar(dia, lista) {
  const grupos = [];
  for (const clase of orden) {
    const con = lista.filter((x) => x.grupos[clase]);
    if (!con.length) continue;
    const conSubtitulos = con.some((x) => /<h4>/.test(x.grupos[clase].cuerpo));
    let cuerpo;
    if (clase === 'grupo--arreglo' && !conSubtitulos) {
      const items = con.flatMap((x) => x.grupos[clase].cuerpo.match(/<li>[\s\S]*?<\/li>/g) || []);
      cuerpo = '    <ul>\n' + items.map((i) => '      ' + i).join('\n') + '\n    </ul>';
    } else {
      cuerpo = con.map((x) => x.grupos[clase].cuerpo).join('\n');
    }
    grupos.push('  <div class="grupo ' + clase + '">\n' + con[0].grupos[clase].h3 + '\n' + cuerpo + '\n  </div>');
  }
  const primera = lista[0];
  const sello = lista.some((x) => x.sello) ? '\n    <span class="version__sello">Última versión</span>' : '';
  const notas = lista.filter((x) => x.resto).map((x) => '  ' + x.resto + '\n').join('');
  return '<section id="' + dia + '" class="version">\n  <div class="version__cabecera">\n    <h2>' + primera.fecha + '</h2>' + sello + '\n  </div>\n  ' + primera.numero + '\n' + notas + '\n' + grupos.join('\n\n') + '\n</section>';
}
let salida = html;
let dias = 0;
for (const [dia, lista] of porDia) {
  if (lista.length === 1) continue;
  dias++;
  const fusionada = fusionar(dia, lista);
  salida = salida.replace(lista[0].texto, () => fusionada);
  for (const x of lista.slice(1)) salida = salida.replace(x.texto + '\n', '');
  console.log(dia, lista.length, 'fichas ->', 1);
}
writeFileSync(f, salida);
console.log('dias fusionados', dias, '| fichas ahora', (salida.match(/<section id=/g) || []).length);