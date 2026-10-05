// Verificación funcional del sitio — escritorio y móvil
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://localhost:8765/index.html';
const R = []; let fallas = 0;
function ok(vp, nombre, cond, extra) { R.push({ vp, nombre, ok: !!cond, extra: extra || '' }); if (!cond) { fallas++; console.log('  ✗', vp, nombre, extra || ''); } }
(async () => {
  const b = await chromium.launch({ channel: undefined }).catch(() => chromium.launch());
  const datos = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','js','datos.js'), 'utf8').replace(/^window\.PLAN=/, '').replace(/;$/, ''));
  for (const [vp, size, movil] of [['escritorio', { width: 1366, height: 800 }, false], ['movil', { width: 390, height: 844 }, true]]) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 1, hasTouch: movil, isMobile: movil });
    const p = await ctx.newPage(); ctx.setDefaultTimeout(7000);
    const consola = [], red = [], envios = [];
    await p.route(/arcgisonline|openstreetmap/, r => r.abort());
    await p.route('**/opiniones-prueba', r => { envios.push(r.request().postData()); r.fulfill({ status: 200, body: '{"ok":true}' }); });
    p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/arcgisonline|openstreetmap|opiniones-prueba/.test((m.location() || {}).url || '')) consola.push(m.type() + ': ' + m.text().slice(0, 160) + ' @ ' + ((m.location() || {}).url || '?')); });
    p.on('pageerror', e => consola.push('pageerror: ' + e.message));
    p.on('requestfailed', q => { if (!/arcgisonline|openstreetmap/.test(q.url()) && !/ERR_ABORTED/.test((q.failure() || {}).errorText || '')) red.push('falló ' + q.url() + ' ' + (q.failure() || {}).errorText); });
    p.on('response', q => { if (q.status() >= 400) red.push(q.status() + ' ' + q.url()); });
    const ir = async (h) => { await p.goto(BASE + '#/' + h, { waitUntil: 'load' }); await p.waitForTimeout(350); };
    const recorrer = async () => { const h = await p.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y < h; y += 600) { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(40); } await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); };
    const h1 = () => p.locator('main h1').first().innerText();

    // ---------- carga y tipografías
    await ir('');
    await p.evaluate(() => document.fonts.ready);
    ok(vp, 'Carga inicial con título', /camino/i.test(await h1()));
    const fuentes = await p.evaluate(() => [document.fonts.check('800 40px Piazzolla'), document.fonts.check('400 16px Archivo'), getComputedStyle(document.querySelector('main h1')).fontFamily, getComputedStyle(document.body).fontFamily]);
    ok(vp, 'Tipografías locales cargadas (Piazzolla, Archivo)', fuentes[0] && fuentes[1] && /Piazzolla/.test(fuentes[2]) && /Archivo/.test(fuentes[3]), fuentes.join(' | '));
    ok(vp, 'Sin dependencias externas salvo el mapa', (await p.evaluate(() => [...document.querySelectorAll('link[href^=http],script[src^=http]')].length)) === 0);

    // ---------- navegación principal
    const nav = movil ? '.nav-inf' : '.nav-sup';
    ok(vp, 'Barra de navegación visible: ' + nav, await p.locator(nav).isVisible());
    ok(vp, 'La otra barra está oculta', !(await p.locator(movil ? '.nav-sup' : '.nav-inf').isVisible()));
    const destinos = movil ? [['sendas', /Sendas/], ['lineas', /Líneas/], ['mapa', null], ['opinar', /opinión/i], ['inicio', /camino/i]] : [['fundamentos', /recta/i], ['sendas', /Sendas/], ['lineas', /Líneas/], ['mapa', null], ['datos', /cifras/i], ['opinar', /opinión/i]];
    for (const [d, re] of destinos) {
      await p.locator(`${nav} a[data-nav="${d}"]`).click(); await p.waitForTimeout(400);
      const activo = await p.locator(`${nav} a[data-nav="${d}"]`).evaluate(a => a.classList.contains('activo'));
      const bien = re ? re.test(await h1()) : await p.locator('#mapa .leaflet-pane').count() > 0;
      ok(vp, `Navegación → ${d}`, bien && activo, 'hash=' + await p.evaluate(() => location.hash));
    }
    await p.locator('.marca').click(); await p.waitForTimeout(300);
    ok(vp, 'Marca vuelve al inicio', /camino/i.test(await h1()));
    await ir('sendas'); await p.goBack(); await p.waitForTimeout(300);
    ok(vp, 'Botón atrás del navegador', /camino/i.test(await h1()));

    // ---------- CTA de la portada
    for (const [txt, re] of [['Recorrer las Sendas', /#\/sendas/], ['Ver el mapa', /#\/mapa/], ['Opinar', /#\/opinar/]]) {
      await ir(''); await p.locator('.tapa .btn', { hasText: txt }).click(); await p.waitForTimeout(300);
      ok(vp, `CTA portada «${txt}»`, re.test(await p.evaluate(() => location.hash)));
    }
    await ir(''); await p.locator('a.btn', { hasText: 'Leer los fundamentos' }).click(); await p.waitForTimeout(300);
    ok(vp, 'CTA «Leer los fundamentos»', /recta/i.test(await h1()));
    await ir(''); await p.locator('a.btn', { hasText: 'Dejar una opinión' }).click(); await p.waitForTimeout(300);
    ok(vp, 'CTA «Dejar una opinión»', /#\/opinar/.test(await p.evaluate(() => location.hash)));
    await ir(''); ok(vp, 'Portada: 4 parcelas de Sendas', await p.locator('.parcela').count() === 4);
    await p.locator('.parcela').nth(1).click(); await p.waitForTimeout(300);
    ok(vp, 'Parcela → Senda Ambiente', /Ambiente/.test(await h1()));
    await p.locator('.oca').first().click(); await p.waitForTimeout(300);
    ok(vp, 'Tarjeta → Ocasión', /Suelos cuidados/.test(await h1()));
    await p.locator('a.btn', { hasText: 'Opinar sobre esta Ocasión' }).click(); await p.waitForTimeout(300);
    ok(vp, 'CTA «Opinar sobre esta Ocasión» lleva el contexto', (await p.locator('.sobre').innerText()).includes('Suelos cuidados'));

    // ---------- niveles de lectura y tamaño de texto
    await ir('ocasion/parques-publicos');
    for (const [n, cl, tx] of [[1, false, false], [2, true, false], [3, true, true]]) {
      await p.locator(`.niveles [data-nivel="${n}"]`).click(); await p.waitForTimeout(200);
      const v = await p.evaluate(() => [!!document.querySelector('.claves') && document.querySelector('.claves').offsetParent !== null, !!document.querySelector('.capa.n3') && document.querySelector('.capa.n3').offsetParent !== null]);
      ok(vp, `Lectura nivel ${n}`, v[0] === cl && v[1] === tx, JSON.stringify(v));
    }
    await p.reload(); await p.waitForTimeout(300);
    ok(vp, 'El nivel de lectura se recuerda', await p.locator('.niveles [data-nivel="3"]').getAttribute('aria-pressed') === 'true');
    await p.locator('.niveles [data-nivel="1"]').click(); await p.locator('.mas-nivel.a2 .btn').click(); await p.waitForTimeout(300);
    ok(vp, 'Botón «Pasar a lectura media»', await p.locator('.niveles [data-nivel="2"]').getAttribute('aria-pressed') === 'true');
    const f0 = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    await p.locator('#btn-txt').click(); const f1 = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const ovG = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(vp, 'Botón de texto grande agranda y no desborda', f1 > f0 && ovG <= 0, `${f0}→${f1}, desborde ${ovG}`);
    await p.locator('#btn-txt').click();

    // ---------- galería y visor
    await ir('ocasion/parques-publicos'); await recorrer();
    await p.locator('.galeria [data-ver]').first().scrollIntoViewIfNeeded(); await p.locator('.galeria [data-ver]').first().click(); await p.waitForTimeout(250);
    ok(vp, 'Visor de imágenes abre', await p.locator('#visor').isVisible());
    const c1 = await p.locator('#visor figcaption').innerText(); await p.locator('.visor-sig').click(); await p.waitForTimeout(150);
    ok(vp, 'Visor: siguiente', (await p.locator('#visor figcaption').innerText()) !== c1);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(vp, 'Visor: cierra con Escape', !(await p.locator('#visor').isVisible()));
    await p.locator('.galeria [data-ver]').first().click(); await p.locator('.visor-x').click();
    ok(vp, 'Visor: cierra con el botón', !(await p.locator('#visor').isVisible()));
    await p.locator('.chips .chip').first().click(); await p.waitForTimeout(500);
    ok(vp, 'Chip de Línea → página Líneas con la línea marcada', await p.locator('.lin.marcada').count() === 1 && /lineas\/R2/.test(await p.evaluate(() => location.hash)));
    await ir('ocasion/parques-publicos'); const sig = p.locator('a[rel=next]'); await sig.scrollIntoViewIfNeeded(); await sig.click(); await p.waitForTimeout(300);
    ok(vp, 'Ocasión siguiente', /Deportes/.test(await h1()));
    await p.locator('a[rel=prev]').click(); await p.waitForTimeout(300); ok(vp, 'Ocasión anterior', /Parques/.test(await h1()));

    // ---------- líneas: filtros
    await ir('lineas'); ok(vp, 'Líneas: 46 líneas en 12 familias', await p.locator('.lin').count() === 46 && await p.locator('.familia').count() === 12);
    await p.locator('.filtros [data-fam="S"]').click(); await p.waitForTimeout(150);
    ok(vp, 'Filtro de familia (Salud)', await p.locator('.familia:visible').count() === 1 && await p.locator('.lin:visible').count() === 4);
    await p.locator('.filtros [data-fam=""]').click(); ok(vp, 'Filtro «Todas»', await p.locator('.familia:visible').count() === 12);
    await p.locator('.lin .anuda a').first().click(); await p.waitForTimeout(300); ok(vp, 'Línea → Ocasión donde se anuda', /#\/ocasion\//.test(await p.evaluate(() => location.hash)));

    // ---------- fundamentos: desplegables
    await ir('fundamentos'); await p.locator('.niveles [data-nivel="3"]').click(); const dt = p.locator('details.pleg').first(); await dt.locator('summary').click(); await p.waitForTimeout(150);
    ok(vp, 'Fundamentos: desplegable de texto completo', await dt.evaluate(d => d.open) && (await dt.locator('.pleg-c p').count()) > 20);
    await p.locator('.niveles [data-nivel="2"]').click();

    // ---------- mapa
    await ir('mapa'); await p.waitForTimeout(600);
    const pins = await p.locator('#mapa .pin').count();
    ok(vp, 'Mapa: marcadores de Ocasiones y plazas', pins >= 50, pins + ' marcadores');
    ok(vp, 'Mapa: límite del partido y arroyos dibujados', await p.locator('#mapa path.leaflet-interactive, #mapa svg path').count() > 100);
    await p.locator('.mapa-barra [data-capa="pueblos"]').click(); await p.waitForTimeout(200);
    ok(vp, 'Mapa: filtro por Senda oculta marcadores', await p.locator('#mapa .pin').count() === pins - 8);
    await p.locator('.mapa-barra [data-capa="pueblos"]').click();
    await ir('mapa?o=azcuenaga'); await p.waitForTimeout(1200);
    ok(vp, 'Mapa: abre enfocado con ficha de la Ocasión', await p.locator('.leaflet-popup-content h3').count() === 1 && /Azcuénaga/.test(await p.locator('.leaflet-popup-content h3').innerText()));
    await p.locator('.leaflet-popup-content a.btn').click(); await p.waitForTimeout(300); ok(vp, 'Mapa: ficha → Ocasión', /Azcuénaga/.test(await h1()));
    ok(vp, 'Minimapa en la Ocasión', await p.locator('#minimapa .pin').count() >= 1);

    // ---------- formulario
    await ir('opinar');
    await p.locator('#f-op button[type=submit]').click(); await p.waitForTimeout(150);
    ok(vp, 'Formulario: vacío muestra error y no envía', /Escribí tu opinión/.test(await p.locator('#op-aviso').innerText()) && envios.length === 0);
    await p.locator('#op-txt').fill('Prueba automática: me parece bien la plaza rural.');
    ok(vp, 'Formulario: contador de caracteres', /^49 \/ 3000/.test(await p.locator('#op-cuenta').innerText()), await p.locator('#op-cuenta').innerText());
    await p.locator('#f-op button[type=submit]').click(); await p.waitForTimeout(200);
    ok(vp, 'Formulario sin planilla conectada: avisa modo de prueba', /modo de prueba/.test(await p.locator('#op-aviso').innerText()) && envios.length === 0);
    await p.evaluate(() => { window.CONFIG.OPINIONES_URL = location.origin + '/opiniones-prueba'; });
    await p.locator('#op-tema').selectOption('ocasion:turismo'); await p.locator('.opc label', { hasText: 'Con dudas' }).click();
    await p.locator('#op-nom').fill('Vecina de prueba'); await p.locator('#op-loc').selectOption({ index: 2 });
    await p.locator('#f-op button[type=submit]').click(); await p.waitForTimeout(500);
    let d = {}; try { d = JSON.parse(envios[0] || '{}'); } catch (e) {}
    ok(vp, 'Formulario: envía los datos correctos (planilla simulada)', envios.length === 1 && d.tipo === 'ocasion' && d.id === 'turismo' && d.titulo === 'Turismo' && d.valoracion === 'Con dudas' && d.nombre === 'Vecina de prueba' && d.localidad === 'Azcuénaga' && /plaza rural/.test(d.opinion), JSON.stringify(d).slice(0, 220));
    ok(vp, 'Formulario: confirma y se limpia', /Gracias/.test(await p.locator('#op-aviso').innerText()) && (await p.locator('#op-txt').inputValue()) === '');
    await p.locator('#op-txt').fill('robot'); await p.evaluate(() => { document.querySelector('[name=sitio]').value = 'spam'; }); await p.locator('#f-op button[type=submit]').click(); await p.waitForTimeout(250);
    ok(vp, 'Formulario: trampa anti-robots bloquea el envío', envios.length === 1);
    await ir('opinar?s=habitar'); ok(vp, 'Opinar con contexto de Senda', /Habitar/.test(await p.locator('.sobre').innerText()));
    await ir('opinar?l=H2'); ok(vp, 'Opinar con contexto de Línea', /Plazas rurales/.test(await p.locator('.sobre').innerText()));
    await p.unroute('**/opiniones-prueba'); await p.route('**/opiniones-prueba', r => r.abort());
    await p.evaluate(() => { window.CONFIG.OPINIONES_URL = location.origin + '/opiniones-prueba'; }); await p.locator('#op-txt').fill('Sin conexión, prueba.'); await p.locator('#f-op button[type=submit]').click(); await p.waitForTimeout(500);
    ok(vp, 'Formulario: si falla la red avisa y conserva el texto', /No se pudo enviar/.test(await p.locator('#op-aviso').innerText()) && (await p.locator('#op-txt').inputValue()).length > 0);
    red.length = red.filter(x => !/opiniones-prueba/.test(x)).length;

    // ---------- barrido de todas las páginas: desborde, imágenes rotas, objetivos táctiles
    const rutas = ['', 'fundamentos', 'sendas', 'lineas', 'datos', 'opinar', 'mapa', 'no-existe'].concat(datos.sendas.map(s => 'senda/' + s.id), datos.ocasiones.map(o => 'ocasion/' + o.id));
    let desb = [], rotas = [], chicos = [], invis = [];
    await p.evaluate(() => localStorage.setItem('sag-nivel', '3'));
    for (const r of rutas) {
      await ir(r); await recorrer(); await p.waitForTimeout(120);
      const m = await p.evaluate(() => {
        const ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const rot = [...document.images].filter(i => !i.closest('.leaflet-container') && i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
        const fondos = [...document.querySelectorAll('.enc-foto,.oca-img,.parcela-foto')].map(e => (e.style.backgroundImage.match(/url\("?(.*?)"?\)/) || [])[1]).filter(Boolean);
        const ch = [...document.querySelectorAll('main a.btn, main button, .nav-inf a, .cabecera button, .chip, .lin .anuda a:not(.txt), .filtros button, .opc span')].filter(e => e.offsetParent).filter(e => { const b = e.getBoundingClientRect(); return b.height < 40 || b.width < 40; }).map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
        const inv = [...document.querySelectorAll('main .rv:not(.vis)')].filter(e => e.offsetParent).length;
        return { ov, rot, fondos, ch: [...new Set(ch)], inv };
      });
      if (m.ov > 0) desb.push(r + ' +' + m.ov); rotas.push(...m.rot); chicos.push(...m.ch.map(c => r + ': ' + c)); if (m.inv) invis.push(r + ' ' + m.inv);
      for (const f of m.fondos) { const st = await p.evaluate(u => fetch(u, { method: 'HEAD' }).then(x => x.status).catch(() => 0), f); if (st !== 200) rotas.push('fondo ' + f); }
    }
    ok(vp, `Sin desborde horizontal en ${rutas.length} páginas`, desb.length === 0, desb.join(', '));
    ok(vp, 'Sin imágenes ni fondos rotos', rotas.length === 0, [...new Set(rotas)].join(', '));
    ok(vp, 'Controles con tamaño táctil ≥ 40 px', chicos.length === 0, [...new Set(chicos.map(c => c.split(': ')[1]))].slice(0, 8).join(' · '));
    ok(vp, 'Nada queda oculto tras recorrer la página', invis.length === 0, invis.join(', '));
    await ir('no-existe'); ok(vp, 'Ruta inexistente muestra aviso', /No encontramos/.test(await h1()));
    ok(vp, 'Consola sin errores ni advertencias', consola.length === 0, [...new Set(consola)].slice(0, 6).join(' || '));
    ok(vp, 'Sin recursos locales fallidos', red.length === 0, [...new Set(red)].slice(0, 6).join(' || '));

    // ---------- movimiento reducido
    const ctx2 = await b.newContext({ viewport: size, reducedMotion: 'reduce' }); const q = await ctx2.newPage(); await q.route(/arcgisonline|openstreetmap/, r => r.abort());
    await q.goto(BASE + '#/datos'); await q.waitForTimeout(400);
    ok(vp, 'Con «reducir movimiento» todo es visible sin animación', await q.evaluate(() => !document.documentElement.classList.contains('anim') && [...document.querySelectorAll('.dato')].every(e => getComputedStyle(e).opacity === '1')));
    await ctx2.close(); await ctx.close();
  }
  await b.close();
  fs.writeFileSync(require('path').join(__dirname,'prueba.json'), JSON.stringify(R, null, 1));
  const t = R.length, f = R.filter(x => !x.ok).length; console.log(`\n${t - f}/${t} comprobaciones correctas`);
})().catch(e => { console.log('ERROR DE PRUEBA tras:', R.length ? R[R.length-1].vp + ' · ' + R[R.length-1].nombre : '-', '\n', e.message.slice(0, 500)); process.exit(1); });
