/**
 * PLAN SAG — Receptor de opiniones.
 * Pegar este código en Extensiones > Apps Script de la planilla de Google
 * e implementarlo como "Aplicación web" (ver LEEME.txt).
 */
var HOJA = 'Opiniones';
var COLUMNAS = ['Fecha', 'Tipo', 'Referencia', 'Título', 'Senda', 'Valoración', 'Opinión', 'Nombre', 'Localidad', 'Página'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents || '{}');
    var txt = limpiar(d.opinion, 3000);
    if (!txt || txt.length < 5) return salida({ ok: false });
    var libro = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
    if (hoja.getLastRow() === 0) {
      hoja.appendRow(COLUMNAS);
      hoja.setFrozenRows(1);
      hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
    }
    hoja.appendRow([new Date(), limpiar(d.tipo, 20), limpiar(d.id, 60), limpiar(d.titulo, 120), limpiar(d.senda, 60),
                    limpiar(d.valoracion, 30), txt, limpiar(d.nombre, 80), limpiar(d.localidad, 60), limpiar(d.pagina, 200)]);
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return salida({ ok: true, servicio: 'Opiniones Plan SAG' }); }

// Evita que un texto que empiece con = + - @ se interprete como fórmula.
function limpiar(v, max) {
  var s = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
