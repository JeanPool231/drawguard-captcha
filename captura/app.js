const CLASES = {
  estrella: { nombre: "ESTRELLA", corto: "estrella", guia: "Dibuja una" },
  rayo:     { nombre: "RAYO",     corto: "rayo",     guia: "Dibuja un" },
  espiral:  { nombre: "ESPIRAL",  corto: "espiral",  guia: "Dibuja una" },
  corazon:  { nombre: "CORAZÓN",  corto: "corazón",  guia: "Dibuja un" },
  nube:     { nombre: "NUBE",     corto: "nube",     guia: "Dibuja una" },
};
const META_EQUIPO = 250, MINIMO_EQUIPO = 150;
const SIN_SERVIDOR = "No hay conexión con el servidor. Comprueba que siga abierto.";
const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

let autor = "", autorSlug = "", meta = 40, stats = null, actual = null, ultimo = null;

function slug(t) {
  return (t || "anonimo").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "anonimo";
}
function mensaje(t, tipo = "") { const el = $("msg"); el.textContent = t; el.className = "msg " + tipo; }

async function api(url, body) {
  const r = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body) } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "error");
  return j;
}
async function cargarStats() { stats = await api("/api/stats"); return stats; }
function misConteos() { return (stats && stats.por_autor[autorSlug]) || Object.fromEntries(Object.keys(CLASES).map(c => [c, 0])); }

/* ---------------- Pestañas ---------------- */
document.querySelectorAll("nav button").forEach(b => b.onclick = () => irA(b.dataset.tab));
function irA(tab) {
  document.querySelectorAll("nav button").forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("on", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  document.body.classList.toggle("lapiz", tab === "capturar");
  document.body.classList.toggle("dibujando", tab === "capturar" && !!autor);
  ["inicio", "captura", "revisar", "progreso"].forEach(s => $(s).classList.add("hidden"));
  if (tab === "capturar") {
    $(autor ? "captura" : "inicio").classList.remove("hidden");
    if (autor) { pintarMiProgreso(); if (!actual) siguiente(); }
  }
  if (tab === "revisar") { $("revisar").classList.remove("hidden"); prepararRevisar(); }
  if (tab === "progreso") { $("progreso").classList.remove("hidden"); pintarProgresoEquipo(); }
}

/* ---------------- Inicio ---------------- */
$("autor").value = store.get("pc03_autor", "");
$("meta").value = store.get("pc03_meta", "40");
$("autor").addEventListener("keydown", e => { if (e.key === "Enter") $("empezar").click(); });
function errorInicio(t) { $("errorInicio").textContent = t; }
$("autor").addEventListener("input", () => { $("autor").removeAttribute("aria-invalid"); errorInicio(""); });
$("empezar").onclick = async () => {
  const n = $("autor").value.trim();
  if (n.length < 2) {
    $("autor").setAttribute("aria-invalid", "true"); errorInicio("Escribe tu nombre: al menos 2 letras."); $("autor").focus();
    return;
  }
  try { await cargarStats(); } catch { errorInicio(SIN_SERVIDOR); return; }
  autor = n; autorSlug = slug(n); meta = +$("meta").value; actual = null;
  store.set("pc03_autor", n); store.set("pc03_meta", String(meta));
  $("nombreAutor").textContent = autor; $("miMeta").textContent = meta * 5;
  irA("capturar");
};
$("cambiar").onclick = () => { autor = ""; ultimo = null; actual = null; mensaje(""); $("deshacerGuardado").disabled = true; irA("capturar"); };

/* ---------------- Lienzo ---------------- */
const cv = $("lienzo"), ctx = cv.getContext("2d");
let trazos = [], trazo = null, punteroActivo = null;
function redibujar() {
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const t of trazos) {
    ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]);
    if (t.length === 1) ctx.lineTo(t[0][0] + 0.1, t[0][1]);
    for (let i = 1; i < t.length; i++) ctx.lineTo(t[i][0], t[i][1]);
    ctx.stroke();
  }
}
function punto(e) { const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
cv.addEventListener("pointerdown", e => { if (trazo) return; punteroActivo = e.pointerId; cv.setPointerCapture(e.pointerId); trazo = [punto(e)]; trazos.push(trazo); redibujar(); mensaje(""); });
cv.addEventListener("pointermove", e => { if (!trazo || e.pointerId !== punteroActivo) return; trazo.push(punto(e)); redibujar(); });
["pointerup", "pointercancel", "pointerleave"].forEach(ev => cv.addEventListener(ev, e => { if (e.pointerId === punteroActivo) trazo = null; }));
function limpiar() { trazos = []; redibujar(); }
redibujar();

function dibujoValido() {
  const pts = trazos.flat();
  if (pts.length < 8) return "El lienzo está casi vacío. Dibuja la figura completa.";
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  if (Math.max(w, h) < 35) return "El dibujo es demasiado pequeño. Hazlo un poco más grande.";
  return null;
}

/* ---------------- Flujo de captura ---------------- */
function siguiente(saltando) {
  const mis = misConteos();
  const pendientes = Object.keys(CLASES).filter(c => mis[c] < meta);
  if (!pendientes.length) {
    actual = null;
    $("guia").textContent = "Terminaste"; $("objetivo").textContent = "META CUMPLIDA"; $("objetivo").classList.add("largo");
    limpiar(); mensaje("Pasa el turno o sube tu meta con el enlace Cambiar.", "ok");
    $("guardar").disabled = true; pintarMiProgreso();
    return;
  }
  // Prioriza la figura con menos dibujos (dataset balanceado) y desempata al azar
  const otras = pendientes.filter(c => c !== actual);
  const opciones = saltando && otras.length ? otras : pendientes;
  const minimo = Math.min(...opciones.map(c => mis[c]));
  let candidatos = opciones.filter(c => mis[c] === minimo);
  if (candidatos.length > 1 && actual) candidatos = candidatos.filter(c => c !== actual) ;
  actual = candidatos[Math.floor(Math.random() * candidatos.length)];
  $("guia").textContent = CLASES[actual].guia; $("objetivo").textContent = CLASES[actual].nombre; $("objetivo").classList.remove("largo");
  limpiar(); mensaje(""); $("guardar").disabled = false; pintarMiProgreso();
}

async function guardar() {
  if (!actual || $("guardar").disabled) return;
  const error = dibujoValido();
  if (error) { mensaje(error, "bad"); return; }
  $("guardar").disabled = true;
  try {
    const r = await api("/api/guardar", { clase: actual, autor: autorSlug, imagen: cv.toDataURL("image/png") });
    stats = r; ultimo = { clase: actual, archivo: r.archivo };
    $("deshacerGuardado").disabled = false;
    const guardada = CLASES[actual].corto;
    siguiente();
    if (actual) mensaje(`Guardado: ${guardada}`, "ok");
  } catch (e) { mensaje("No se pudo guardar: " + e.message + ". ¿Sigue abierto el servidor?", "bad"); }
  finally { $("guardar").disabled = !actual; }
}
async function borrarUltimo() {
  if (!ultimo) return;
  try {
    stats = await api("/api/borrar", ultimo);
    const borrada = CLASES[ultimo.clase].corto;
    ultimo = null; $("deshacerGuardado").disabled = true;
    if (actual) pintarMiProgreso(); else siguiente();
    mensaje(`Borrado: ${borrada}`, "ok");
  } catch (e) { mensaje("No se pudo borrar: ¿sigue abierto el servidor?", "bad"); }
}

$("guardar").onclick = guardar;
$("limpiar").onclick = () => { limpiar(); mensaje(""); };
$("deshacerTrazo").onclick = () => { trazos.pop(); redibujar(); };
$("saltar").onclick = () => siguiente(true);
$("deshacerGuardado").onclick = borrarUltimo;
// Un clic no deja el foco en el botón: si no, Enter lo repetiría en vez de guardar
$("captura").addEventListener("click", e => { if (e.detail) e.target.closest("button")?.blur(); });
document.addEventListener("keydown", e => {
  if ($("captura").classList.contains("hidden") || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === "enter") {
    if (e.target.tagName === "BUTTON") return;  // con Tab, Enter activa ese botón
    e.preventDefault();
    if (!e.repeat) guardar();
  }
  else if (k === "c") { limpiar(); mensaje(""); }
  else if (k === "z") { trazos.pop(); redibujar(); }
  else if (k === "s") siguiente(true);
});

const icono = c => `<svg class="icono" aria-hidden="true"><use href="#f-${c}"/></svg>`;
function pintarMiProgreso() {
  const mis = misConteos(), lista = $("miProgreso");
  if (!lista.children.length) {
    lista.innerHTML = Object.keys(CLASES).map(c => `<li data-c="${c}"><span class="fig">
      <svg class="vacio" aria-hidden="true"><use href="#f-${c}"/></svg>
      <svg class="lleno" aria-hidden="true"><use href="#f-${c}"/></svg></span><span class="n"></span></li>`).join("");
  }
  for (const li of lista.children) {
    const c = li.dataset.c, n = mis[c];
    li.classList.toggle("actual", c === actual);
    li.setAttribute("aria-label", `${CLASES[c].corto}: ${n} de ${meta}`);
    li.querySelector(".fig").style.setProperty("--p", `${Math.min(100, 100 * n / meta)}%`);
    li.querySelector(".n").textContent = `${n}/${meta}`;
  }
  $("miTotal").textContent = Object.values(mis).reduce((a, b) => a + b, 0);
}

/* ---------------- Progreso del equipo ---------------- */
function barra(c, n) {
  const pct = Math.min(100, 100 * n / META_EQUIPO);
  return `<div class="fila-barra">${icono(c)}<span class="nombre">${CLASES[c].corto}</span>
    <div class="pista" style="--minimo:${100 * MINIMO_EQUIPO / META_EQUIPO}%"><div class="relleno" style="width:${pct}%"></div></div>
    <span>${n} de ${META_EQUIPO}</span></div>`;
}
async function pintarProgresoEquipo() {
  try { await cargarStats(); } catch { $("totalProgreso").textContent = SIN_SERVIDOR; $("tablaAutores").innerHTML = ""; return; }
  const figuras = Object.keys(CLASES);
  $("totalProgreso").innerHTML = figuras.map(c => barra(c, stats.total[c])).join("") +
    `<p class="resumen">${Object.values(stats.total).reduce((a, b) => a + b, 0)} de ${META_EQUIPO * figuras.length} imágenes</p>`;
  const autores = Object.keys(stats.por_autor).sort();
  $("tablaAutores").innerHTML = `<tr><th>Autor</th>${figuras.map(c => `<th aria-label="${CLASES[c].corto}">${icono(c)}</th>`).join("")}<th>Total</th></tr>` +
    (autores.length ? autores.map(a => { const f = stats.por_autor[a];
      return `<tr class="${a === autorSlug ? "mia" : ""}"><td>${a}</td>${figuras.map(c => `<td>${f[c]}</td>`).join("")}<td><b>${Object.values(f).reduce((x, y) => x + y, 0)}</b></td></tr>`; }).join("")
    : `<tr><td colspan="7">Aún no hay dibujos. Empieza en Capturar.</td></tr>`);
}

/* ---------------- Revisar ---------------- */
let claseRevisar = "estrella", turnoGaleria = 0;
const marcados = new Set();
const dibujos = n => `${n} ${n === 1 ? "dibujo" : "dibujos"}`;

function pintarChips() {
  const filtro = $("filtroAutor").value, fila = filtro ? stats.por_autor[filtro] : stats.total;
  $("filtroClase").innerHTML = Object.keys(CLASES).map(c => `<button data-c="${c}" aria-pressed="${c === claseRevisar}"
    aria-label="${CLASES[c].corto}: ${fila?.[c] ?? 0}">${icono(c)}<span>${CLASES[c].corto}</span>${fila?.[c] ?? 0}</button>`).join("");
}
function pintarBarraBorrar() {
  const n = marcados.size;
  $("barraBorrar").classList.toggle("hidden", !n);
  $("textoBorrar").textContent = `${dibujos(n)} ${n === 1 ? "marcado" : "marcados"}`;
  $("abrirBorrar").textContent = $("confirmarBorrar").textContent = `Borrar ${dibujos(n)}`;
  $("tituloBorrar").textContent = `¿Borrar ${dibujos(n)}?`;
}
async function prepararRevisar() {
  try { await cargarStats(); } catch { $("cuentaRevisar").textContent = SIN_SERVIDOR; $("galeria").innerHTML = ""; return; }
  const sel = $("filtroAutor").value;
  $("filtroAutor").innerHTML = `<option value="">Todos</option>` + Object.keys(stats.por_autor).sort().map(a => `<option>${a}</option>`).join("");
  $("filtroAutor").value = sel || (stats.por_autor[autorSlug] ? autorSlug : "");
  pintarChips(); pintarGaleria();
}
async function pintarGaleria() {
  const turno = ++turnoGaleria, clase = claseRevisar, filtro = $("filtroAutor").value;
  marcados.clear(); pintarBarraBorrar();
  let archivos;
  try { ({ archivos } = await api("/api/lista?clase=" + clase)); }
  catch { $("cuentaRevisar").textContent = SIN_SERVIDOR; $("galeria").innerHTML = ""; return; }
  if (turno !== turnoGaleria) return;  // llegó tarde: ya se eligió otra figura
  const lista = archivos.filter(f => !filtro || f.split("_")[1] === filtro);
  $("cuentaRevisar").textContent = lista.length ? dibujos(lista.length) : "Sin dibujos aquí. Prueba con otra figura o autor.";
  $("galeria").innerHTML = lista.map(f => `<button class="miniatura" data-f="${f}" aria-pressed="false">
    <img loading="lazy" src="/img/${clase}/${f}" alt="Dibujo de ${f.split("_")[1]}"><small>${f.split("_")[1]}</small></button>`).join("");
}
$("filtroAutor").onchange = () => { pintarChips(); pintarGaleria(); };
$("filtroClase").onclick = e => {
  const b = e.target.closest("button");
  if (!b) return;
  claseRevisar = b.dataset.c; pintarChips(); pintarGaleria();
};
$("galeria").onclick = e => {
  const b = e.target.closest("button");
  if (!b) return;
  const marcar = !marcados.has(b.dataset.f);
  if (marcar) marcados.add(b.dataset.f); else marcados.delete(b.dataset.f);
  b.setAttribute("aria-pressed", marcar);
  pintarBarraBorrar();
};
$("quitarMarcas").onclick = () => {
  marcados.clear(); pintarBarraBorrar();
  $("galeria").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", "false"));
};
$("abrirBorrar").onclick = () => $("dialogoBorrar").showModal();
$("cancelarBorrar").onclick = () => $("dialogoBorrar").close();
$("confirmarBorrar").onclick = async () => {
  const lista = [...marcados], clase = claseRevisar;
  let fallos = 0;
  $("confirmarBorrar").disabled = true;
  for (const archivo of lista) {
    try {
      stats = await api("/api/borrar", { clase, archivo });
      if (ultimo && ultimo.archivo === archivo) { ultimo = null; $("deshacerGuardado").disabled = true; }
    } catch { fallos++; }
  }
  $("confirmarBorrar").disabled = false;
  $("dialogoBorrar").close();
  pintarChips();
  await pintarGaleria();
  $("cuentaRevisar").textContent += `. Borrados: ${lista.length - fallos}` + (fallos ? `. Fallaron: ${fallos}. ${SIN_SERVIDOR}` : "");
};
