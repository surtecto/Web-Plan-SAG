/* Plan SAG 2020/2030 — sitio público. Sin dependencias salvo Leaflet (mapa). */
(function () {
'use strict';
var P = window.PLAN, G = window.GEO || {}, C = window.CONFIG || {};
var main = document.getElementById('contenido');
var SENDA = {}, LIN = {}, FAM = {}, OCA = {};
P.sendas.forEach(function (s) { SENDA[s.id] = s; });
P.familias.forEach(function (f) { FAM[f.id] = f; });
P.lineas.forEach(function (l) { LIN[l.id] = l; });
P.ocasiones.forEach(function (o) { OCA[o.id] = o; });
var AZUL = '#2A5C7E';
function colorOca(o) { return o.grupo === 'pueblos' ? AZUL : SENDA[o.senda].color; }
function sendaNom(o) { return o.grupo === 'pueblos' ? 'Habitar · Pueblos' : SENDA[o.senda].nombre; }
function e(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function guardar(k, v) { try { localStorage.setItem(k, v); } catch (x) {} }
function leer(k) { try { return localStorage.getItem(k); } catch (x) { return null; } }

/* ---------------------------------------------------------------- niveles de lectura */
var nivel = parseInt(leer('sag-nivel') || '2', 10) || 2;
function ponerNivel(n, mover) {
  nivel = n; guardar('sag-nivel', String(n));
  document.body.className = document.body.className.replace(/nivel-\d/, 'nivel-' + n);
  [].forEach.call(document.querySelectorAll('[data-nivel]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-nivel') == n ? 'true' : 'false'); });
  if (mover) { var d = document.querySelector('.n' + n); if (d) d.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }
  refrescarMapas();
}
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-nivel]'); if (b) { ponerNivel(parseInt(b.getAttribute('data-nivel'), 10), b.hasAttribute('data-mover')); }
});
function masNivel(a, txt, btn) {
  return '<div class="mas-nivel a' + a + '"><p>' + txt + '</p><button class="btn" type="button" data-nivel="' + a + '" data-mover>' + btn + '</button></div>';
}

/* ---------------------------------------------------------------- piezas */
function cod(o, chico) { return '<span class="cod' + (chico ? ' chico' : '') + '" style="--acento:' + colorOca(o) + '">' + e(o.cod) + '</span>'; }
function tarjetaOca(o) {
  return '<a class="oca" href="#/ocasion/' + o.id + '">' + cod(o) + '<span class="meta">Ocasión · ' + e(o.escala) + '</span><h3>' + e(o.nombre) + '</h3><p>' + e(o.sint) + '</p></a>';
}
function chipLinea(id, ppal) {
  var l = LIN[id]; if (!l) return ''; var f = FAM[l.fam];
  return '<li><a class="chip' + (ppal ? ' ppal' : '') + '" style="--c:' + f.color + '" href="#/lineas/' + id + '"><b>' + id + '</b><span>' + e(l.nombre) + (ppal ? ' <em>· línea principal</em>' : '') + '</span></a></li>';
}
function galeria(imgs, grupo) {
  if (!imgs || !imgs.length) return '';
  return '<div class="galeria" data-grupo="' + grupo + '">' + imgs.map(function (im, i) {
    return '<figure><button type="button" data-ver="' + i + '" aria-label="Ampliar imagen"><img loading="lazy" src="' + im.src + '" alt="' + e(im.cap) + '"></button><figcaption>' + e(im.cap) + '</figcaption></figure>';
  }).join('') + '</div>';
}
var GRUPOS = {};
function reg(grupo, imgs) { GRUPOS[grupo] = imgs; return galeria(imgs, grupo); }
function pleg(tit, sub, html, abierto) {
  return '<details class="pleg"' + (abierto ? ' open' : '') + '><summary>' + tit + (sub ? '<small>' + sub + '</small>' : '') + '</summary><div class="pleg-c texto">' + html + '<p class="fuente-txt">Texto del Plan de Ordenamiento Territorial, versión de proyecto (2025).</p></div></details>';
}

/* ---------------------------------------------------------------- dibujos */
function rnd(seed) { var s = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function curva(pts) { // Catmull-Rom -> Bézier
  var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
      (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
  }
  return d;
}
function nudoSVG(o) {
  var ids = [o.principal].concat(o.lineas), n = ids.length, W = 480, H = Math.max(250, 60 + n * 26), cx = 318, cy = H / 2, r = rnd(o.id), out = '';
  out += '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Líneas que se anudan en esta Ocasión"><g fill="none" stroke-linecap="round">';
  ids.forEach(function (id, i) {
    var l = LIN[id]; if (!l) return; var col = FAM[l.fam].color, y0 = 34 + i * ((H - 68) / Math.max(1, n - 1 || 1));
    if (n === 1) y0 = cy;
    var a = r() * Math.PI * 2, y1 = 30 + r() * (H - 60);
    var pts = [[52, y0], [120 + r() * 30, y0 + (r() - .5) * 30], [210 + r() * 20, (y0 + cy) / 2 + (r() - .5) * 40],
      [cx + Math.cos(a) * 22, cy + Math.sin(a) * 22], [cx - Math.cos(a) * 16 + (r() - .5) * 14, cy - Math.sin(a) * 20],
      [cx + 60 + r() * 30, (cy + y1) / 2 + (r() - .5) * 30], [W + 6, y1]];
    out += '<path d="' + curva(pts) + '" stroke="' + col + '" stroke-width="' + (i === 0 ? 5 : 2.4) + '" opacity="' + (i === 0 ? 1 : .85) + '"/>';
  });
  out += '</g><circle cx="' + cx + '" cy="' + cy + '" r="27" fill="' + colorOca(o) + '" stroke="#F4F0E6" stroke-width="3"/>' +
    '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="600" font-size="18" fill="#fff">' + e(o.cod) + '</text>';
  ids.forEach(function (id, i) {
    var l = LIN[id]; if (!l) return; var y0 = n === 1 ? cy : 34 + i * ((H - 68) / Math.max(1, n - 1));
    out += '<rect x="6" y="' + (y0 - 11) + '" width="42" height="22" fill="' + FAM[l.fam].color + '"/><text x="27" y="' + (y0 + 5) + '" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="600" font-size="14" fill="#fff">' + id + '</text>';
  });
  return out + '</svg>';
}
var SVG_LINEA = '<svg viewBox="0 0 330 74" aria-hidden="true"><path d="M6 16H324" stroke="#7A7A72" stroke-width="1.5" stroke-dasharray="4 5" fill="none"/><path d="M6 52c30-26 46 22 78 0s20-34 52-14 34 26 66 4 30-28 58-10 34 20 64 6" stroke="#4A7C3F" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
var SVG_NUDO = '<svg viewBox="0 0 330 74" aria-hidden="true"><g fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M6 12c70 6 110 20 150 28s80 22 168 26" stroke="#8B2020"/><path d="M6 62c60-8 120-20 152-26s100-22 166-24" stroke="#2A5C7E"/><path d="M6 38c50 10 110-14 150 0s90 4 168-6" stroke="#4A7C3F"/><path d="M60 4c30 20 70 26 96 34s60 20 90 34" stroke="#6A4C7A"/></g><circle cx="158" cy="38" r="13" fill="#C8973A" stroke="#F4F0E6" stroke-width="2"/></svg>';
var SVG_SENDA = '<svg viewBox="0 0 330 74" aria-hidden="true"><path d="M0 60H330" stroke="#7A7A72" stroke-width="1"/><path d="M6 60c40-4 60-30 110-30s70 18 110 8 60-22 100-26" stroke="#C8973A" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/><g fill="#F4F0E6" stroke="#1C1A14" stroke-width="1.5"><circle cx="70" cy="43" r="5"/><circle cx="150" cy="31" r="5"/><circle cx="230" cy="37" r="5"/><circle cx="300" cy="17" r="5"/></g></svg>';
function trama() {
  var r = rnd('pampa'), s = '<svg class="trama" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g stroke="#F4F0E6" stroke-width=".6" opacity=".07">';
  for (var x = 0; x <= 1200; x += 60) s += '<path d="M' + x + ' 0V520"/>';
  for (var y = 0; y <= 520; y += 60) s += '<path d="M0 ' + y + 'H1200"/>';
  s += '</g><g fill="none" stroke-linecap="round" opacity=".55">';
  var cols = ['#C8973A', '#4A7C3F', '#7BAF5E', '#8B2020', '#2A5C7E', '#7A7A72'];
  cols.forEach(function (c, i) {
    var y0 = 60 + i * 76, pts = [[-20, y0]];
    for (var k = 1; k <= 7; k++) pts.push([k * 180 + (r() - .5) * 60, k === 5 ? 250 + (r() - .5) * 46 : y0 + (r() - .5) * 150 + (260 - y0) * (1 - Math.abs(k - 5) / 5) * .6]);
    s += '<path d="' + curva(pts) + '" stroke="' + c + '" stroke-width="' + (i < 2 ? 3 : 1.8) + '"/>';
  });
  return s + '</g><circle cx="900" cy="250" r="20" fill="none" stroke="#C8973A" stroke-width="2" opacity=".8"/></svg>';
}
var SVG_MOEBIUS = '<svg viewBox="0 0 520 190" role="img" aria-label="Campo y ciudad como dos puntos de una misma cinta"><g fill="none" stroke-linecap="round"><path d="M40 95C40 20 200 30 260 95s220 75 220 0S320 20 260 95 40 170 40 95z" stroke="#4A7C3F" stroke-width="16" opacity=".28"/><path d="M40 95C40 20 200 30 260 95s220 75 220 0S320 20 260 95 40 170 40 95z" stroke="#1C1A14" stroke-width="1.4"/></g><circle cx="52" cy="95" r="6" fill="#C8973A"/><circle cx="468" cy="95" r="6" fill="#8B2020"/><g font-family="Barlow,sans-serif" font-size="13" fill="#1C1A14"><text x="66" y="92">menor densidad</text><text x="66" y="108" font-weight="600">“campo”</text><text x="454" y="92" text-anchor="end">mayor densidad</text><text x="454" y="108" text-anchor="end" font-weight="600">“ciudad”</text><text x="260" y="182" text-anchor="middle" font-style="italic" fill="#55534a">una sola totalidad ambiental</text></g></svg>';

/* ---------------------------------------------------------------- páginas */
function inicio() {
  var s = '<section class="tapa">' + trama() + '<div class="tapa-in"><span class="rot">Partido de San Andrés de Giles · Proyecto en debate</span>' +
    '<h1>El camino se hace <em>al andar</em></h1>' +
    '<p class="tapa-bajada">El Plan de Ordenamiento Territorial 2020–2030 no fija un punto de llegada: abre <strong>Sendas</strong>, sigue las <strong>Líneas</strong> de vida de la comunidad y actúa en las <strong>Ocasiones</strong> donde se anudan. Aquí podés conocerlo, recorrerlo en el mapa y opinar.</p>' +
    '<div class="botones"><a class="btn lleno" href="#/sendas">Recorrer las Sendas</a><a class="btn" href="#/mapa">Ver el mapa</a><a class="btn" href="#/opinar">Opinar</a></div></div></section>';
  s += '<section class="banda"><div class="env"><span class="rot">Tres palabras para leer el Plan</span><h2>Líneas, Ocasiones, Sendas</h2>' +
    '<div class="tres"><div><h3>Líneas <small>' + P.lineas.length + ' en doce familias</small></h3>' + SVG_LINEA + '<p>Los trayectos y movimientos que las personas y los grupos hacen en sus vidas. No son rectas ni “lineamientos”: van, vuelven y se cruzan.</p></div>' +
    '<div><h3>Ocasiones <small>' + P.ocasiones.length + ' abiertas</small></h3>' + SVG_NUDO + '<p>El lugar y el momento en que varias líneas se anudan y dan la oportunidad de que algo suceda. No es un proyecto que otro deba ejecutar: se proyecta y se hace casi a la vez.</p></div>' +
    '<div><h3>Sendas <small>cuatro rumbos</small></h3>' + SVG_SENDA + '<p>Un rumbo que se cruza entre los anhelos de la población, las posibilidades técnicas y los intereses políticos y económicos. No es un programa ni un eje temático.</p></div></div>' +
    '<p style="margin-top:22px"><a class="btn" href="#/fundamentos">Leer los fundamentos</a></p></div></section>';
  s += '<section class="banda crema"><div class="env"><span class="rot">Las Sendas</span><h2>Cuatro rumbos, un solo territorio</h2><p class="intro">Comunidad, producción, desigualdad y ambiente deben pensarse a la vez: “el mundo en donde vivimos y el mundo del cual vivimos debe estar unificado”.</p>' + parcelas() + '</div></section>';
  s += '<section class="banda"><div class="env col2"><div><span class="rot">Capas de lectura</span><h2>Leé hasta donde quieras</h2><p class="intro">Cada Senda y cada Ocasión tiene tres profundidades. Elegí una con el selector <strong>Lectura</strong> de arriba y cambiala cuando quieras.</p>' +
    '<ul class="claves" style="--acento:var(--ocre)"><li><strong>Breve.</strong> La idea en un párrafo.</li><li><strong>Media.</strong> Las claves, las imágenes y mapas, las líneas que se anudan y dónde ocurre.</li><li><strong>Completa.</strong> El texto íntegro del Plan, tal como está escrito en el proyecto.</li></ul></div>' +
    '<aside class="pregunta"><span class="rot">Tu parte</span><p>El Plan debe ser discutido primero y, en segundo lugar, apropiado por quienes habitamos Giles.</p><a class="btn lleno" href="#/opinar">Dejar una opinión</a></aside></div></section>';
  return s;
}
function parcelas() {
  return '<div class="parcelas cuatro">' + P.sendas.map(function (s) {
    var n = P.ocasiones.filter(function (o) { return o.senda === s.id; }).length;
    return '<a class="parcela" style="--c:' + s.color + '" href="#/senda/' + s.id + '"><span class="ir" aria-hidden="true">→</span><span class="num">' + n + '<small>ocasiones</small></span><h3>' + e(s.nombre) + '</h3><p>' + e(s.lema) + '</p></a>';
  }).join('') + '</div>';
}
function enc(o) {
  return '<header class="enc" style="--acento:' + (o.color || 'var(--pastizal)') + '"><div class="enc-in">' + (o.miga ? '<p class="miga">' + o.miga + '</p>' : '') +
    '<span class="rot">' + o.rot + '</span><h1>' + o.h1 + '</h1>' + (o.lema ? '<p class="lema">' + o.lema + '</p>' : '') + '</div></header>';
}

function sendas() {
  return enc({ rot: 'Capítulos III a VII', h1: 'Las Sendas', lema: 'Dar rumbos en vez de especificar puntos de partida y de llegada.' }) +
    '<div class="cuerpo"><p class="sint">Cuatro Sendas fundamentales, que buscan salvar cuestiones históricamente planteadas como contradictorias. Debajo de todas hay una misma tensión: superar la antinomia entre el “campo” y la “ciudad”.</p>' + parcelas() +
    '<div class="capa n2" style="margin-top:28px"><h2><span class="n">2</span>Todas las Ocasiones</h2>' + P.sendas.map(function (s) {
      return '<h3 class="subt" style="color:' + s.color + '">' + e(s.nombre) + '</h3><div class="ocas tres-col">' + P.ocasiones.filter(function (o) { return o.senda === s.id; }).map(tarjetaOca).join('') + '</div>';
    }).join('') + '</div>' + masNivel(2, 'Estás en lectura breve.', 'Ver todas las Ocasiones') + '</div>';
}

function senda(id) {
  var s = SENDA[id]; if (!s) return noHay();
  var os = P.ocasiones.filter(function (o) { return o.senda === id && o.grupo !== 'pueblos'; });
  var ps = P.ocasiones.filter(function (o) { return o.senda === id && o.grupo === 'pueblos'; });
  var h = enc({ color: s.color, miga: '<a href="#/sendas">Sendas</a>', rot: s.cap, h1: e(s.titulo), lema: e(s.lema) });
  h += '<div class="cuerpo" style="--acento:' + s.color + '"><p class="sint">' + e(s.sint) + '</p>';
  h += '<div class="capa"><h2><span class="n">1</span>Ocasiones de esta Senda</h2><div class="ocas">' + os.map(tarjetaOca).join('') + '</div>';
  if (ps.length) h += '<h3 class="subt" style="color:' + AZUL + '">Pueblos rurales <small>cada pueblo es una Ocasión</small></h3><div class="texto n2" style="margin-bottom:16px">' + P.pueblosIntro + '</div><div class="ocas">' + ps.map(tarjetaOca).join('') + '</div>';
  h += '</div>';
  if (id === 'habitar') h += '<div class="capa n2"><h2><span class="n">2</span>La historia en mapas</h2>' + reg('hist', P.fund.hist) + '</div>';
  h += '<div class="capa n3"><h2><span class="n">3</span>Texto completo de la Senda</h2>' + pleg(id === 'habitar' ? 'Breve historia del habitar' : 'Presentación de la Senda', id === 'habitar' ? 'El proceso de geometrización del territorio: de la merced a la parcela, del camino al alambrado.' : '', s.texto, id !== 'habitar') + '</div>';
  h += masNivel(3, 'Para leer la presentación completa de la Senda tal como figura en el Plan:', 'Pasar a lectura completa');
  h += '<div class="capa"><aside class="pregunta"><span class="rot">Opinar sobre esta Senda</span><p>¿Es este el rumbo? ¿Qué falta, qué sobra, qué harías distinto?</p><a class="btn lleno" href="#/opinar?s=' + id + '">Opinar sobre ' + e(s.nombre) + '</a></aside></div></div>';
  return h;
}

function ocasion(id) {
  var o = OCA[id]; if (!o) return noHay();
  var s = SENDA[o.senda], col = colorOca(o), i = P.ocasiones.indexOf(o), ant = P.ocasiones[i - 1], sig = P.ocasiones[i + 1];
  var h = enc({ color: col, miga: '<a href="#/sendas">Sendas</a> › <a href="#/senda/' + s.id + '">' + e(s.nombre) + '</a>' + (o.grupo ? ' › Pueblos' : ''), rot: 'Ocasión ' + e(o.cod) + ' · ' + e(o.escala), h1: e(o.nombre) });
  h += '<div class="cuerpo" style="--acento:' + col + '"><p class="sint">' + e(o.sint) + '</p>';
  h += '<div class="capa n2"><h2><span class="n">2</span>Claves</h2><ul class="claves">' + o.claves.map(function (c) { return '<li>' + e(c) + '</li>'; }).join('') + '</ul></div>';
  if (o.imgs.length) h += '<div class="capa n2"><h2><span class="n">2</span>Mapas, gráficos e imágenes</h2>' + reg('oca', o.imgs) + '</div>';
  h += '<div class="capa n2"><h2><span class="n">2</span>Líneas que se anudan aquí</h2><div class="nudo">' + nudoSVG(o) + '<ul class="chips">' + chipLinea(o.principal, true) + o.lineas.map(function (l) { return chipLinea(l); }).join('') + '</ul></div></div>';
  h += '<div class="capa n2"><h2><span class="n">2</span>Dónde</h2>';
  var tieneGeo = o.locs.length || id === 'plazas-rurales' || id === 'corredores-territoriales';
  if (tieneGeo) {
    h += '<div class="minimapa" id="minimapa" data-oca="' + id + '"></div>';
    if (o.locs.length) h += '<ul class="locs">' + o.locs.map(function (l) { return '<li><span>' + e(l.n) + '</span>' + (l.p === 'aprox' ? '<em>ubicación aproximada</em>' : '') + '</li>'; }).join('') + '</ul>';
    if (id === 'plazas-rurales') h += '<p class="nota-loc">Trece plazas rurales y senderos, según el SIG del Plan.</p>';
    if (id === 'corredores-territoriales') h += '<p class="nota-loc">Red de caminos rurales del partido, según el SIG municipal.</p>';
    h += '<p style="margin-top:12px"><a class="btn" href="#/mapa?o=' + id + '">Abrir en el mapa grande</a></p>';
  } else h += '<p class="lect">Esta Ocasión no tiene un punto fijo: su escala es <strong>' + e(o.escala.toLowerCase()) + '</strong>. <a href="#/mapa">Ver el mapa general</a>.</p>';
  h += '</div>';
  h += masNivel(2, 'Estás en lectura breve. Hay claves, imágenes, líneas y mapa de esta Ocasión.', 'Pasar a lectura media');
  h += '<div class="capa n3"><h2><span class="n">3</span>Texto completo del Plan</h2><div class="texto">' + o.texto + '<p class="fuente-txt">Texto del Plan de Ordenamiento Territorial, versión de proyecto (2025). Los mapas e ilustraciones citados están en la galería de arriba.</p></div></div>';
  h += masNivel(3, 'El texto íntegro de esta Ocasión, tal como figura en el proyecto del Plan:', 'Pasar a lectura completa');
  h += '<div class="capa"><aside class="pregunta"><span class="rot">Una pregunta para vos</span><p>' + e(o.preg) + '</p><a class="btn lleno" href="#/opinar?o=' + id + '">Opinar sobre esta Ocasión</a></aside></div>';
  h += '<div class="capa botones">' + (ant ? '<a class="btn" href="#/ocasion/' + ant.id + '">← ' + e(ant.nombre) + '</a>' : '') + (sig ? '<a class="btn" href="#/ocasion/' + sig.id + '">' + e(sig.nombre) + ' →</a>' : '') + '</div></div>';
  return h;
}

function lineas(foco) {
  var uso = {}; P.ocasiones.forEach(function (o) { [o.principal].concat(o.lineas).forEach(function (l) { (uso[l] = uso[l] || []).push(o); }); });
  var h = enc({ rot: 'Capítulo II', h1: 'Líneas propositivas', lema: '“Toda cosa es un parlamento de líneas.” — Tim Ingold' });
  h += '<div class="cuerpo"><p class="sint">No pensamos a San Andrés de Giles como esferas que se interceptan, sino como líneas que se anudan o desanudan. Cada línea es un aspecto de la realidad que atender, estudiar y del que ocuparse; sus relaciones importan tanto o más que ellas mismas.</p>';
  h += '<p class="lect n2">El desafío de esta época no es tanto generar grandes transformaciones como trabajar para mantener la relativa buena calidad de vida: “como un ciclista que, para mantenerse en equilibrio y seguir derecho por un camino, tendrá que constantemente hacer pequeños movimientos del manubrio y su cuerpo”.</p>';
  h += '<div class="filtros" role="group" aria-label="Familias de líneas"><button type="button" data-fam="" aria-pressed="true">Todas</button>' + P.familias.map(function (f) { return '<button type="button" data-fam="' + f.id + '" aria-pressed="false" style="--c:' + f.color + '">' + e(f.nombre) + '</button>'; }).join('') + '</div>';
  P.familias.forEach(function (f) {
    var ls = P.lineas.filter(function (l) { return l.fam === f.id; });
    h += '<section class="familia" data-familia="' + f.id + '" style="--c:' + f.color + '"><h2>Líneas de ' + e(f.nombre) + ' <small>' + ls.length + ' líneas</small></h2><p class="n2">' + e(f.intro) + '</p>';
    ls.forEach(function (l) {
      var us = uso[l.id] || [];
      h += '<article class="lin" id="linea-' + l.id + '"><span class="id">' + l.id + '</span><h3>' + e(l.nombre) + (l.sub ? '<small>' + e(l.sub) + '</small>' : '') + '</h3><p class="lt n2">' + e(l.texto) + '</p>' +
        '<div class="anuda">' + (us.length ? '<span>Se anuda en</span>' + us.map(function (o) { return '<a href="#/ocasion/' + o.id + '" style="--s:' + colorOca(o) + '"><i></i>' + e(o.nombre) + '</a>'; }).join('') : '<span>Todavía sin Ocasión propia en el proyecto. <a href="#/opinar?l=' + l.id + '" style="border:0;background:none;padding:0;text-decoration:underline">¿Conocés una?</a></span>') + '</div></article>';
    });
    h += '</section>';
  });
  h += masNivel(2, 'Estás en lectura breve: se ven sólo los nombres de las líneas.', 'Ver la explicación de cada línea');
  h += '<div class="capa n3" style="margin-top:30px"><h2><span class="n">3</span>Texto completo</h2>' + pleg('Introducción al Capítulo II', '(o lo que para otros serían “objetivos” y “temáticas”)', P.fund.cap2, true) + '</div></div>';
  return h;
}

function fundamentos() {
  var F = P.fund, h = enc({ rot: 'Capítulo I · Metodología del Plan', h1: 'De la recta a la senda', lema: 'Un nuevo nudo para el Plan de San Andrés de Giles.' });
  h += '<div class="cuerpo"><p class="sint">Solemos pensar un plan como un modelo ideal que primero se proyecta y después se ejecuta. Este Plan propone otra cosa: un proceso de diseño continuo, donde proyectar y realizar son casi simultáneos, en la medida en que aparecen las ocasiones.</p>';
  function sec(tit, breve, medio, extra) {
    return '<section class="capa"><h3 style="font-size:1.7rem;margin-bottom:.4em">' + tit + '</h3><p class="lect" style="font-size:1.08rem">' + breve + '</p><div class="n2 lect">' + medio + '</div>' + (extra || '') + '</section>';
  }
  h += sec('Un plan que no es una repisa',
    'No se trata de colgar proyectos en estantes —algunos al alcance, otros en el último, donde nos quedamos dando saltos— sino de ir definiendo rumbos, sabiendo que el camino se hace al andar.',
    '<p>La división tajante entre teoría y práctica produce un desfasaje: proyectistas sin contacto con los anhelos y problemas reales, y realizadores tan metidos en la urgencia que no pueden pensar más allá de ella.</p><p class="texto"><span class="cita" style="display:block;font:italic 500 1.12rem/1.5 var(--serif);border-left:3px solid var(--ocre);padding-left:16px">“Los diseños, parece ser, deben fracasar, si cada generación habrá de contar con la oportunidad de mirar hacia el futuro y llamarlo como el suyo propio.” — Tim Ingold</span></p><p>Por eso el movimiento no parte de un inventario de lo que hay ni de una tradición que mantener, sino de un impulso hacia adelante: se planifica <em>con</em> más que <em>para</em>. Planificar es un recurso para la acción, más que algo que la determina.</p>');
  h += sec('Líneas: la vida no es recta',
    'Una línea describe los trayectos y movimientos de las personas y los grupos. No es un “lineamiento”: está hecha de trazos curvos, de idas y de vueltas.',
    '<p>Presentar los procesos sociales como flechas rectas da la falsa sensación de que las iniciativas de cada sector son claras y distintas. No lo son. Tampoco hay un lado “técnico y objetivo” y otro “social y subjetivo”: lo que importa son sus interrelaciones y los momentos en que se asocian o entran en conflicto.</p><p>Las líneas no son cerradas, ni individuales, ni uniformes, ni estancas, ni estáticas. Surgen del proceso de participación y del proceso vital de quienes ejecutan el Plan.</p><p><a class="btn" href="#/lineas">Ver las ' + P.lineas.length + ' Líneas</a></p>',
    '<div class="n2">' + reg('fund', F.imgs) + '</div>');
  h += sec('Ocasiones: el nudo',
    'Cuando varias líneas se entrelazan en un lugar y un momento, hay una ocasión: una situación donde convergen actores de distintos intereses y magnitudes y que da la oportunidad de que un plan tenga éxito.',
    '<p>La vida social se parece menos a una red de puntos conectados que a una <em>malla</em> de hilos entretejidos. Cada lugar es un nudo en la malla, y los hilos son las líneas por las que anduvieron los caminantes. Cada evento tiene especificidad, pero no por pureza sino por la combinación particular que lo forma.</p><p>Por eso una ocasión no es un proyecto que otro deba realizar: proyección y realización son más o menos simultáneas.</p>');
  h += sec('Sendas: rumbo, no programa',
    'La planificación propone dar rumbos en vez de fijar puntos de partida y de llegada; abrir sendas más que fijar objetivos. Un territorio que, más que ocupado, sea habitado.',
    '<p>El Plan se concibe para habilitar y abrir oportunidades más que para cerrarlas. Algunas posibilidades sí hay que cerrarlas —los barrios cerrados, las actividades con alto riesgo de contaminación— pero una prohibición no debe sólo impedir: prohibir barrios cerrados habilita barrios igualmente habitables y seguros que no fragmentan la sociedad ni el paisaje.</p><p>La distinción entre diseñar y hacer no es entre el proyecto y su implementación, sino entre los deseos y las limitaciones materiales para realizarlos.</p><p><a class="btn" href="#/sendas">Ver las cuatro Sendas</a></p>');
  h += sec('Campo y ciudad: una sola cinta',
    'La contradicción que subyace a todas las Sendas es la antinomia entre “campo” y “ciudad”. El Plan mira a Giles como un continuo donde la mayor y la menor densidad humana son dos puntos de una misma cinta de Moebius.',
    SVG_MOEBIUS.replace('<svg ', '<svg style="width:100%;max-width:520px;background:var(--crema);border:1px solid var(--linea);margin-bottom:14px" ') + '<p>Se busca desarmar el binarismo que concibe a la ciudad como moderna e innovadora y a lo rural como tradicional y estancado; y también la idea de que la cabecera o los pueblos —Azcuénaga, Cucullú, Franklin— estén “yendo hacia” ciudades más grandes.</p>');
  h += sec('Producir, repartir, cuidar, convivir: a la vez',
    'La creación de comunidad, las formas productivas y comerciales, el intento de eliminar desigualdades y la preocupación por el ambiente deben pensarse simultáneamente.',
    '<p>Nunca hubo tanta riqueza acumulada ni tanta distancia entre quienes la poseen y quienes no. En Giles la situación no es la más grave, pero la concentración de la tierra avanza y el acceso a un lote o a un campo para producir se vuelve un sueño imposible para muchos vecinos: los usos del suelo oscilan entre los commodities del agronegocio y la presión por lotear vivienda temporal.</p><p>La producción cada vez más tecnificada necesita cada vez menos trabajo humano. El Plan promueve la creación de riqueza, pero de un tipo que incluya a la mayor parte de la población y afecte lo menos posible el ambiente, desvinculando tecnología y tierra de intereses exclusivamente financieros.</p><p>“Los seres vivientes que luchan contra su ambiente y lo derrotan, se destruyen a sí mismos” (Bateson). La sequía de 2022 mostró que el partido no está exento de la crisis ambiental.</p>');
  h += '<section class="capa n2"><h3 style="font-size:1.7rem;margin-bottom:.4em">Cómo se hizo</h3><p class="lect">El Consejo Municipal para el Desarrollo y el Ordenamiento Territorial (CMDOT) —Concejo Deliberante, Poder Ejecutivo y dos asesores externos— trabaja desde julio de 2020. Además de estadísticas, bibliografía, archivo y trabajo en territorio, se reunió por sectores con la comunidad:</p>' +
    '<ul class="claves" style="--acento:var(--pastizal)"><li>Delegados municipales, Inspección y Juzgado de Faltas (2020)</li><li>Colegio de ingenieros agrónomos (2020)</li><li>Colectivo Ambiente Saludable y Centro para la Producción Total (2020)</li><li>Sector educativo (2020)</li><li>Centro de Comercio y Sindicato de empleados de comercio (2020)</li><li>Medios de comunicación locales (2021)</li><li>Personas y asociaciones vinculadas a la discapacidad (2021)</li><li>Colectividades (2021)</li><li>Profesionales de la arquitectura y el urbanismo</li><li>Sector inmobiliario (2022)</li><li>Secretaría de la Producción</li></ul>' +
    '<p class="lect" style="margin-top:14px">Hubo además presentaciones en la Feria del Libro, dos “Encuentros sobre Territorio y Sociedad”, un taller en el Instituto Superior de Formación Docente N.º 142 y una caminata por las 15 hectáreas de la futura Reserva. El propio Plan señala lo que falta: los encuentros participativos en cada uno de los pueblos.</p></section>';
  h += '<section class="capa n2"><aside class="pregunta" style="max-width:none"><span class="rot">Preguntas de lectura que el Plan deja abiertas</span><ul class="claves" style="--acento:var(--ocre);max-width:70ch"><li>Si los diseños “deben fracasar” para que cada generación llame suyo al futuro, ¿qué es lo que una ordenanza sí puede y debe fijar?</li><li>¿Quién reconoce una ocasión cuando aparece, y quién queda afuera del nudo?</li><li>¿Cómo gestiona “andando” un Estado municipal sin que eso se vuelva discrecionalidad?</li><li>¿Mantener la buena calidad de vida es un horizonte suficiente para quienes hoy no la tienen?</li></ul><a class="btn lleno" href="#/opinar" style="margin-top:14px">Responder</a></aside></section>';
  h += '<section class="capa n2"><h2><span class="n">2</span>Cartografía de Ocasiones</h2>' + reg('carto', F.carto) + '</section>';
  h += masNivel(2, 'Estás en lectura breve: hay más desarrollo, esquemas y preguntas en cada apartado.', 'Pasar a lectura media');
  h += '<div class="capa n3"><h2><span class="n">3</span>Texto completo</h2>' + pleg('Capítulo I. De la recta a la senda', 'Fundamentos · Líneas, Sendas y Ocasiones', F.cap1) + pleg('Introducción del informe', 'Reuniones de trabajo, encuentros y participación ciudadana', F.intro) + '</div>';
  h += masNivel(3, 'El Capítulo I y la Introducción completos, tal como figuran en el proyecto:', 'Pasar a lectura completa') + '</div>';
  return h;
}

function barras(items, max) {
  return '<div class="barras">' + items.map(function (i) { return '<div class="barra ' + (i[2] || '') + '"><span>' + i[0] + '<b>' + i[3] + '</b></span><i style="--w:' + (i[1] / max * 100).toFixed(1) + '%"></i></div>'; }).join('') + '</div>';
}
function datos() {
  var h = enc({ rot: 'Datos que cita el Plan', h1: 'El territorio en cifras', lema: 'Cada número tiene fecha y fuente: son los que usa el proyecto.' });
  h += '<div class="cuerpo"><div class="datos">';
  h += '<div class="dato ancho"><h3>Dónde vivimos</h3><div class="apilada"><i style="width:77.61%;--c:#1C1A14"></i><i style="width:10.34%;--c:#2A5C7E"></i><i style="width:12.05%;--c:#C8973A"></i></div><div class="ley"><span style="--c:#1C1A14"><b>77,61 %</b> ciudad de Giles</span><span style="--c:#2A5C7E"><b>10,34 %</b> pueblos</span><span style="--c:#C8973A"><b>12,03 %</b> rural dispersa</span></div><p class="ftd">Censo 2010. Desde 1950 la población rural se invirtió frente a la urbana.</p></div>';
  h += '<div class="dato"><div class="cifra">38<small>m²</small></div><p class="et">de espacio verde público por habitante en la cabecera. La OMS recomienda entre 10 y 15.</p>' + barras([['Giles', 38, 'ac', '38'], ['OMS, máximo recomendado', 15, '', '15'], ['OMS, mínimo recomendado', 10, '', '10']], 38) + '<p class="ftd">Senda Comunidad · <a href="#/ocasion/parques-publicos">Parques públicos</a></p></div>';
  h += '<div class="dato"><h3>Población urbana</h3>' + barras([['Provincia de Buenos Aires', 97.22, 'al', '97,22 %'], ['Argentina', 91, '', '91 %'], ['Latinoamérica', 80, '', 'casi 80 %'], ['Giles: vive en la ciudad cabecera', 77.61, 'ac', '77,61 %'], ['Mundo', 50, '', 'más de 50 %']], 100) + '<p class="ftd">Banco Mundial y Censo 2010, citados en la Senda del Habitar.</p></div>';
  h += '<div class="dato"><div class="cifra">1.291</div><p class="et">familias en el Registro Municipal de Vivienda (julio de 2020). El déficit real no está debidamente medido.</p>' + barras([['Vive en una vivienda prestada', 57, 'ac', '57 %'], ['Alquila', 43, '', '43 %'], ['Hogares monoparentales', 32, '', '32 %'], ['Sólo personas mayores', 18, '', '18 %'], ['Con alguna discapacidad', 4, '', '4 %']], 100) + '<p class="ftd">Registro 2016 (1.100 familias inscriptas). · <a href="#/ocasion/acceso-vivienda">Acceso a la vivienda</a></p></div>';
  h += '<div class="dato"><div class="cifra">18<small>%</small></div><p class="et">de las viviendas del partido están vacías.</p>' + barras([['Pueblos', 19, 'al', '19 %'], ['Partido', 18, 'ac', '18 %'], ['Ciudad cabecera', 12, '', '12 %']], 25) + '<p class="ftd">Censo 2010.</p></div>';
  h += '<div class="dato"><div class="cifra">660</div><p class="et">viviendas construidas por planes estatales desde 1947: apenas el 8 % de las existentes.</p>' + barras([['Hechas por el Estado', 8, 'ac', '8 %'], ['Resto del parque de viviendas', 92, '', '92 %']], 100) + '<p class="ftd">Datos procesados para el Plan sobre Censos Nacionales.</p></div>';
  h += '<div class="dato"><div class="cifra">96,28<small>%</small></div><p class="et">de las viviendas urbanas son casas. Densidad bruta de la cabecera: unos 34 habitantes por hectárea.</p><p class="ftd">INDEC. · <a href="#/ocasion/crecimiento-norte">Crecimiento Norte</a></p></div>';
  h += '<div class="dato"><div class="cifra">2,14<small>%</small></div><p class="et">de la población económicamente activa estaba desocupada en 2010; el Plan estima que aumentó en los últimos años.</p><p class="ftd">Censo 2010. · <a href="#/senda/produccion">Senda de la Producción y el Comercio</a></p></div>';
  h += '<div class="dato"><div class="cifra">15<small>+15 ha</small></div><p class="et">municipales para la Reserva Natural Urbana y el Parque Urbano Natural sobre el arroyo de Giles.</p><p class="ftd">Ordenanzas 2418/21 y 2619/23. · <a href="#/ocasion/reservas-naturales">Reservas Naturales</a></p></div>';
  h += '</div>';
  h += '<div class="capa n2" style="margin-top:28px"><h2><span class="n">2</span>Cómo se armó el territorio</h2><div class="tiempo">' + tiempo() + '</div><p class="ftd">Fechas tomadas de las Sendas del Habitar y de la Producción y el Comercio.</p></div>';
  h += '<div class="capa n2"><h2><span class="n">2</span>Cartografía de Ocasiones</h2>' + reg('carto', P.fund.carto) + '</div>';
  h += masNivel(2, 'Hay una línea de tiempo del territorio y la cartografía de Ocasiones.', 'Pasar a lectura media') + '</div>';
  return h;
}
function tiempo() {
  var ev = [[1580, 'Merced de Garay', 0], [1640, 'Merced a Pedro de Giles', 1], [1663, 'Camino Real al Alto Perú', 0], [1793, 'Suero dona el “terreno del santo”', 1], [1806, 'Capilla de San Andrés', 0], [1832, 'Primer Juez de Paz: nace el Partido', 1], [1854, 'Primera escuela', 0], [1877, 'Primer campo alambrado', 1], [1880, 'Ferrocarril: Azcuénaga', 0], [1889, 'Villa Ruiz y Cucullú', 1], [1894, 'Solís', 0], [1907, 'Tuyutí', 1], [1926, 'Parque Municipal', 0], [1936, 'Ruta 7 pavimentada', 1], [1965, 'Ruta 41', 0], [1993, 'Cierra el F.C. Urquiza', 1], [2001, 'Plan Estratégico y Código', 0], [2020, 'CMDOT: este Plan', 1]];
  var W = 1500, x = function (a) { return a < 1780 ? 40 + (a - 1580) / 200 * 240 : a < 1870 ? 300 + (a - 1780) / 90 * 330 : a < 1910 ? 630 + (a - 1870) / 40 * 520 : 1150 + (a - 1910) / 115 * 300; };
  var s = '<svg viewBox="0 0 ' + W + ' 230" role="img" aria-label="Línea de tiempo del territorio"><path d="M20 118H' + (W - 10) + '" stroke="#1C1A14" stroke-width="2"/><path d="M286 110l10 16M292 110l10 16" stroke="#1C1A14" stroke-width="1.2"/>';
  ev.forEach(function (v, i) {
    var X = x(v[0]), up = v[2] === 0, lvl = (Math.floor(i / 2) % 2) ? 62 : 30, y = up ? 118 - lvl : 118 + lvl;
    s += '<path d="M' + X + ' 118V' + y + '" stroke="#7A7A72" stroke-width="1"/><circle cx="' + X + '" cy="118" r="5" fill="' + (v[0] >= 1877 && v[0] <= 1907 ? '#8B2020' : '#C8973A') + '" stroke="#F4F0E6" stroke-width="1.5"/>' +
      '<text x="' + (X + 4) + '" y="' + (up ? y - 16 : y + 14) + '" font-family="Barlow Condensed,sans-serif" font-weight="600" font-size="17" fill="#1C1A14">' + v[0] + '</text>' +
      '<text x="' + (X + 4) + '" y="' + (up ? y - 2 : y + 28) + '" font-family="Barlow,sans-serif" font-size="11.500" fill="#55534a">' + v[1] + '</text>';
  });
  return s + '</svg>';
}

/* ---------------------------------------------------------------- opinar */
function opinar(q) {
  var o = q.o && OCA[q.o], s = q.s && SENDA[q.s], l = q.l && LIN[q.l];
  var col = o ? colorOca(o) : s ? s.color : 'var(--ocre)';
  var h = enc({ color: col, rot: 'Participación ciudadana', h1: 'Tu opinión', lema: 'La participación no es un evento: es un proceso en el que el territorio y quienes lo habitamos nos transformamos.' });
  h += '<div class="cuerpo col2" style="--acento:' + col + '"><div>';
  var ref = o ? 'ocasion:' + o.id : s ? 'senda:' + s.id : l ? 'linea:' + l.id : 'general';
  h += '<form class="form" id="f-op" novalidate><input type="hidden" name="ref" value="' + ref + '">';
  if (o) h += '<div class="sobre"><span class="rot">Opinás sobre la Ocasión</span><br><b>' + e(o.nombre) + '</b><p style="margin:.5em 0 0;font-style:italic">' + e(o.preg) + '</p></div>';
  else if (s) h += '<div class="sobre"><span class="rot">Opinás sobre la Senda</span><br><b>' + e(s.titulo) + '</b></div>';
  else if (l) h += '<div class="sobre"><span class="rot">Opinás sobre la Línea ' + l.id + '</span><br><b>' + e(l.nombre) + '</b></div>';
  else h += '<div><label for="op-tema">¿Sobre qué querés opinar?</label><select id="op-tema" name="tema"><option value="general">El Plan en general</option><optgroup label="Una Senda">' + P.sendas.map(function (x) { return '<option value="senda:' + x.id + '">' + e(x.nombre) + '</option>'; }).join('') + '</optgroup><optgroup label="Una Ocasión">' + P.ocasiones.map(function (x) { return '<option value="ocasion:' + x.id + '">' + e(x.nombre) + ' (' + e(sendaNom(x)) + ')</option>'; }).join('') + '</optgroup></select></div>';
  h += '<fieldset><legend>¿Cómo lo ves? <small>(opcional)</small></legend><div class="opc">' + ['De acuerdo', 'Con dudas', 'En desacuerdo', 'Tengo otra idea'].map(function (v) { return '<label><input type="radio" name="valoracion" value="' + v + '"><span>' + v + '</span></label>'; }).join('') + '</div></fieldset>';
  h += '<div><label for="op-txt">Tu opinión</label><textarea id="op-txt" name="opinion" maxlength="3000" required placeholder="Contanos qué pensás, qué falta, qué cambiarías, qué conocés del lugar…"></textarea></div>';
  h += '<div class="dos"><div><label for="op-nom">Nombre <small>(opcional)</small></label><input type="text" id="op-nom" name="nombre" maxlength="80" autocomplete="name"></div><div><label for="op-loc">Localidad <small>(opcional)</small></label><select id="op-loc" name="localidad"><option value="">Prefiero no decir</option>' + (C.LOCALIDADES || []).map(function (x) { return '<option>' + e(x) + '</option>'; }).join('') + '</select></div></div>';
  h += '<div class="trampa" aria-hidden="true"><label>No completar<input type="text" name="sitio" tabindex="-1" autocomplete="off"></label></div>';
  h += '<div id="op-aviso" role="status" aria-live="polite"></div><div><button class="btn lleno" type="submit">Enviar opinión</button></div>';
  h += '<p class="priv">Tu opinión llega al equipo del Plan (CMDOT) y se registra junto con la Senda u Ocasión a la que refiere. Nombre y localidad son opcionales. No se publica en este sitio.' + (C.CONTACTO ? ' Contacto: ' + e(C.CONTACTO) + '.' : '') + '</p></form></div>';
  h += '<aside><div class="pregunta"><span class="rot">Por qué importa</span><p style="font-size:1.08rem">“Tener presente las perspectivas de la población que va a ser afectada por el Plan ni reemplaza ni complementa los trabajos técnicos, sino que van de una forma conjunta.”</p></div>' + (o || s || l ? '<p style="margin-top:16px"><a href="#/opinar">Opinar sobre otra cosa o en general</a></p>' : '<p style="margin-top:16px">También podés opinar desde cada Ocasión: allí vas a encontrar una pregunta concreta.</p><p><a class="btn" href="#/sendas">Ver las Ocasiones</a></p>') + '</aside></div>';
  return h;
}
var enviando = false;
document.addEventListener('submit', function (ev) {
  if (ev.target.id !== 'f-op') return; ev.preventDefault();
  var f = ev.target, av = document.getElementById('op-aviso'), txt = f.opinion.value.trim();
  if (f.sitio.value) return;
  if (txt.length < 5) { av.innerHTML = '<p class="aviso error">Escribí tu opinión antes de enviar.</p>'; f.opinion.focus(); return; }
  if (enviando) return;
  var ref = (f.tema ? f.tema.value : f.ref.value).split(':'), tipo = ref[0], id = ref[1] || '';
  var val = f.querySelector('input[name=valoracion]:checked');
  var d = { tipo: tipo, id: id, titulo: tipo === 'ocasion' ? OCA[id].nombre : tipo === 'senda' ? SENDA[id].nombre : tipo === 'linea' ? id + ' ' + LIN[id].nombre : 'El Plan en general',
    senda: tipo === 'ocasion' ? sendaNom(OCA[id]) : tipo === 'senda' ? SENDA[id].nombre : '', valoracion: val ? val.value : '', opinion: txt, nombre: f.nombre.value.trim(), localidad: f.localidad.value, pagina: location.href };
  if (!C.OPINIONES_URL) {
    av.innerHTML = '<p class="aviso prueba"><strong>Formulario en modo de prueba.</strong> Todavía no está conectado a la planilla del Plan, así que esta opinión no se envió. (Para quien administra el sitio: completar OPINIONES_URL en js/config.js.)</p>'; return;
  }
  enviando = true; var b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Enviando…';
  fetch(C.OPINIONES_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })
    .then(function () { f.reset(); av.innerHTML = '<p class="aviso"><strong>Gracias.</strong> Tu opinión fue enviada al equipo del Plan.</p>'; b.textContent = 'Enviar otra opinión'; })
    .catch(function () { av.innerHTML = '<p class="aviso error">No se pudo enviar. Revisá tu conexión y probá de nuevo; tu texto sigue aquí.</p>'; b.textContent = 'Enviar opinión'; })
    .then(function () { b.disabled = false; enviando = false; });
});

/* ---------------------------------------------------------------- mapa */
var mapas = [];
function refrescarMapas() { setTimeout(function () { mapas.forEach(function (m) { try { m.invalidateSize(); } catch (x) {} }); }, 60); }
function pin(html, col, cls) { return L.divIcon({ className: '', html: '<div class="pin ' + (cls || '') + '" style="--c:' + col + '">' + html + '</div>', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] }); }
function crearMapa(el, opt) {
  if (!window.L) { el.innerHTML = '<p style="color:#fff;padding:20px">El mapa necesita conexión a internet para cargar.</p>'; return; }
  var mini = opt.mini, foco = opt.foco && OCA[opt.foco], editar = opt.editar;
  var m = L.map(el, { scrollWheelZoom: !mini, zoomControl: true, attributionControl: true }); mapas.push(m);
  var sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagen: Esri, Maxar, Earthstar Geographics' }).addTo(m);
  var rot = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, opacity: .9 }).addTo(m);
  var calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
  var capas = {};
  if (G.partido) L.polygon(G.partido, { color: '#F4F0E6', weight: 2.5, fill: false, dashArray: '2 6', interactive: false }).addTo(m);
  capas['Arroyos y cañadas'] = L.layerGroup((G.arroyos || []).map(function (l) { return L.polyline(l, { color: '#6FB3DA', weight: 1.6, opacity: .9, interactive: false }); }));
  capas['Caminos rurales'] = L.layerGroup((G.caminos || []).map(function (l) { return L.polyline(l, { color: '#E8C25A', weight: 1.3, opacity: .85, interactive: false }); }));
  capas['Senderos rurales (TIB)'] = L.layerGroup((G.senderos || []).map(function (s) { return L.polyline(s.l, { color: '#FFFFFF', weight: 3.5, dashArray: '6 6' }).bindPopup('<span class="rot">Sendero rural</span><h3>' + e(s.n) + '</h3><a class="btn" href="#/ocasion/plazas-rurales">Ver la Ocasión</a>'); }));
  capas['Plazas rurales'] = L.layerGroup((G.plazas || []).map(function (p) { return L.marker(p.ll, { icon: pin(e(p.n), '#4A7C3F', 'plaza') }).bindPopup('<span class="rot">Plaza rural propuesta</span><h3>' + e(p.n) + '</h3><p>Punto de encuentro para conocer y disfrutar el paisaje rural.</p><a class="btn" href="#/ocasion/plazas-rurales">Ver la Ocasión</a>'); }));
  capas['Escuelas rurales'] = L.layerGroup((G.escuelas || []).map(function (p) { return L.marker(p.ll, { icon: pin('', AZUL, 'esc') }).bindPopup('<span class="rot">Escuela rural</span><p><strong>' + e(p.n) + '</strong></p><p>Las escuelas rurales son centros que pueden asociarse a los nuevos puestos.</p>'); }));
  var porSenda = {}, cambios = {}, bounds = [];
  P.ocasiones.forEach(function (o) {
    if (mini && foco && o !== foco) return;
    var clave = o.grupo === 'pueblos' ? 'pueblos' : o.senda; porSenda[clave] = porSenda[clave] || L.layerGroup();
    o.locs.forEach(function (lc, i) {
      var et = lc.k === 'pago' ? (lc.n.match(/\((\d)\)/) || [0, o.cod])[1] : (/^[a-f] · /.test(lc.n) ? lc.n.charAt(0) : o.cod);
      var mk = L.marker(lc.ll, { icon: pin(e(et), colorOca(o), (lc.p === 'aprox' ? 'aprox' : '') + (lc.k === 'pago' ? ' pago' : '')), draggable: !!editar, title: lc.n, zIndexOffset: foco === o ? 500 : 0 });
      mk.bindPopup('<span class="rot" style="color:' + colorOca(o) + '">' + e(sendaNom(o)) + ' · Ocasión ' + e(o.cod) + '</span><h3>' + e(lc.n) + '</h3>' + (lc.n !== o.nombre ? '<p><strong>' + e(o.nombre) + '</strong></p>' : '') + '<p>' + e(o.sint.length > 190 ? o.sint.slice(0, 188) + '…' : o.sint) + '</p>' + (lc.p === 'aprox' ? '<p class="nota-loc">Ubicación aproximada.</p>' : '') + '<a class="btn" href="#/ocasion/' + o.id + '">Ver la Ocasión</a>');
      if (editar) mk.on('dragend', function () { var p = mk.getLatLng(); cambios[o.id + ' · ' + lc.n] = [+p.lat.toFixed(5), +p.lng.toFixed(5)]; var t = document.getElementById('ed-out'); if (t) t.value = JSON.stringify(cambios, null, 1); });
      mk.addTo(porSenda[clave]); if (foco === o) bounds.push(lc.ll);
    });
  });
  Object.keys(porSenda).forEach(function (k) { porSenda[k].addTo(m); });
  capas['Arroyos y cañadas'].addTo(m);
  if (!mini || (foco && foco.id === 'plazas-rurales')) { capas['Plazas rurales'].addTo(m); capas['Senderos rurales (TIB)'].addTo(m); }
  if (foco && foco.id === 'corredores-territoriales') capas['Caminos rurales'].addTo(m);
  if (foco && foco.id === 'nuevos-poblamientos') capas['Escuelas rurales'].addTo(m);
  if (foco && foco.id === 'plazas-rurales') (G.plazas || []).forEach(function (p) { bounds.push(p.ll); });
  if (!mini) L.control.layers({ 'Satélite': sat, 'Calles': calles }, Object.assign({ 'Nombres de lugares': rot }, capas), { collapsed: true }).addTo(m);
  L.control.scale({ imperial: false }).addTo(m);
  if (bounds.length > 1) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  else if (bounds.length === 1) m.setView(bounds[0], foco.grupo === 'pueblos' ? 14 : 15);
  else if (G.partido) m.fitBounds(G.partido, { padding: [10, 10] }); else m.setView([-34.4422, -59.4475], 11);
  if (foco && !mini && foco.locs.length === 1) setTimeout(function () { porSenda[foco.grupo === 'pueblos' ? 'pueblos' : foco.senda].eachLayer(function (k) { if (k.options.title === foco.locs[0].n) k.openPopup(); }); }, 400);
  if (editar) { var d = document.createElement('div'); d.className = 'editor'; d.innerHTML = '<strong>Modo edición</strong><br>Arrastrá los puntos a su lugar y copiá este texto para corregir las coordenadas en los datos.<textarea id="ed-out" rows="7" style="width:100%;font:11px monospace;margin-top:6px"></textarea>'; el.parentNode.style.position = 'relative'; el.parentNode.appendChild(d); }
  return { m: m, porSenda: porSenda };
}
function mapaPag(q) {
  var grupos = P.sendas.map(function (s) { return [s.id, s.nombre, s.color]; }); grupos.push(['pueblos', 'Pueblos', AZUL]);
  return '<div class="mapa-pag"><div class="mapa-barra" role="group" aria-label="Mostrar Ocasiones por Senda">' + grupos.map(function (g) { return '<button type="button" data-capa="' + g[0] + '" aria-pressed="true" style="--c:' + g[2] + '"><i></i>' + e(g[1]) + '</button>'; }).join('') + '</div><div id="mapa" data-oca="' + e(q.o || '') + '"' + (q.editar ? ' data-editar="1"' : '') + '></div></div>';
}

/* ---------------------------------------------------------------- visor */
var visor = document.getElementById('visor'), vImg = visor.querySelector('img'), vCap = visor.querySelector('figcaption'), vG = [], vI = 0, vFoco;
function ver(i) { vI = (i + vG.length) % vG.length; vImg.classList.remove('zoom'); vImg.src = vG[vI].src; vImg.alt = vG[vI].cap; vCap.textContent = vG[vI].cap + (vG.length > 1 ? '  ·  ' + (vI + 1) + ' / ' + vG.length : ''); }
function cerrarVisor() { visor.hidden = true; document.body.style.overflow = ''; if (vFoco) vFoco.focus(); }
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('[data-ver]');
  if (b) { var g = b.closest('[data-grupo]'); vG = GRUPOS[g.getAttribute('data-grupo')] || []; vFoco = b; visor.hidden = false; document.body.style.overflow = 'hidden'; ver(parseInt(b.getAttribute('data-ver'), 10)); visor.querySelector('.visor-x').focus(); return; }
  if (ev.target.closest('.visor-x')) return cerrarVisor();
  if (ev.target.closest('.visor-ant')) return ver(vI - 1);
  if (ev.target.closest('.visor-sig')) return ver(vI + 1);
  if (ev.target === vImg) return vImg.classList.toggle('zoom');
  var f = ev.target.closest('[data-fam]');
  if (f) { var id = f.getAttribute('data-fam'); [].forEach.call(document.querySelectorAll('[data-fam]'), function (x) { x.setAttribute('aria-pressed', x === f ? 'true' : 'false'); }); [].forEach.call(document.querySelectorAll('[data-familia]'), function (s) { s.hidden = !!id && s.getAttribute('data-familia') !== id; }); return; }
  var c = ev.target.closest('[data-capa]');
  if (c && mapaActual) { var on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', on ? 'true' : 'false'); var lg = mapaActual.porSenda[c.getAttribute('data-capa')]; if (lg) { if (on) lg.addTo(mapaActual.m); else mapaActual.m.removeLayer(lg); } }
});
document.addEventListener('keydown', function (ev) { if (visor.hidden) return; if (ev.key === 'Escape') cerrarVisor(); if (ev.key === 'ArrowLeft') ver(vI - 1); if (ev.key === 'ArrowRight') ver(vI + 1); });

/* ---------------------------------------------------------------- ruteo */
function noHay() { return enc({ rot: 'Plan SAG', h1: 'No encontramos esa página' }) + '<div class="cuerpo"><a class="btn" href="#/">Volver al inicio</a></div>'; }
var mapaActual = null;
function ruta() {
  var h = location.hash.replace(/^#\/?/, ''), partes = h.split('?'), seg = partes[0].split('/').filter(Boolean), q = {};
  (partes[1] || '').split('&').forEach(function (kv) { var a = kv.split('='); if (a[0]) q[a[0]] = decodeURIComponent(a[1] || ''); });
  mapas.forEach(function (m) { try { m.remove(); } catch (x) {} }); mapas = []; mapaActual = null; GRUPOS = {};
  var sec = seg[0] || 'inicio', html, tit = 'Plan de Ordenamiento Territorial · San Andrés de Giles';
  if (sec === 'inicio') html = inicio();
  else if (sec === 'fundamentos') { html = fundamentos(); tit = 'Fundamentos · Plan SAG'; }
  else if (sec === 'sendas') { html = sendas(); tit = 'Sendas · Plan SAG'; }
  else if (sec === 'senda') { html = senda(seg[1]); sec = 'sendas'; if (SENDA[seg[1]]) tit = SENDA[seg[1]].titulo + ' · Plan SAG'; }
  else if (sec === 'ocasion') { html = ocasion(seg[1]); sec = 'sendas'; if (OCA[seg[1]]) tit = OCA[seg[1]].nombre + ' · Plan SAG'; }
  else if (sec === 'lineas') { html = lineas(seg[1]); tit = 'Líneas · Plan SAG'; }
  else if (sec === 'mapa') { html = mapaPag(q); tit = 'Mapa · Plan SAG'; }
  else if (sec === 'datos') { html = datos(); tit = 'El territorio en cifras · Plan SAG'; }
  else if (sec === 'opinar') { html = opinar(q); tit = 'Opinar · Plan SAG'; }
  else html = noHay();
  main.innerHTML = html; document.title = tit;
  document.body.classList.toggle('en-mapa', sec === 'mapa');
  document.querySelector('.pie').hidden = sec === 'mapa';
  [].forEach.call(document.querySelectorAll('[data-nav]'), function (a) { a.classList.toggle('activo', a.getAttribute('data-nav') === sec); });
  var mm = document.getElementById('mapa'), mi = document.getElementById('minimapa');
  if (mm) mapaActual = crearMapa(mm, { foco: mm.getAttribute('data-oca'), editar: mm.hasAttribute('data-editar') });
  if (mi) crearMapa(mi, { foco: mi.getAttribute('data-oca'), mini: true });
  if (sec === 'lineas' && seg[1] && LIN[seg[1]]) {
    if (nivel < 2) ponerNivel(2);
    var t = document.getElementById('linea-' + seg[1]); if (t) { t.style.background = 'rgba(200,151,58,.16)'; setTimeout(function () { t.scrollIntoView({ block: 'center' }); }, 30); return; }
  }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', ruta);
ponerNivel(nivel);
if (window.L || document.readyState === 'complete') ruta(); else window.addEventListener('load', ruta);
})();
