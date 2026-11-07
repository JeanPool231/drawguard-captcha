const CLASES = {
  estrella: { nombre: "ESTRELLA", emoji: "⭐" },
  rayo:     { nombre: "RAYO",     emoji: "⚡" },
  espiral:  { nombre: "ESPIRAL",  emoji: "🌀" },
  corazon:  { nombre: "CORAZÓN",  emoji: "❤️" },
  nube:     { nombre: "NUBE",     emoji: "☁️" },
};
const META_EQUIPO = 250;
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
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 1400); }
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
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
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
$("empezar").onclick = async () => {
  const n = $("autor").value.trim();
  if (n.length < 2) { $("autor").focus(); $("autor").style.borderColor = "var(--bad)"; return; }
  autor = n; autorSlug = slug(n); meta = +$("meta").value;
  store.set("pc03_autor", n); store.set("pc03_meta", String(meta));
  $("nombreAutor").textContent = autor; $("miMeta").textContent = `${meta} por figura (${meta * 5} total)`;
  try { await cargarStats(); } catch { alert("No se pudo conectar con el servidor. ¿Ejecutaste  python servidor.py ?"); return; }
  $("inicio").classList.add("hidden"); $("captura").classList.remove("hidden");
  pintarMiProgreso(); siguiente();
};
$("cambiar").onclick = () => { autor = ""; ultimo = null; $("deshacerGuardado").disabled = true; irA("capturar"); };

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
    $("emoji").textContent = "🎉"; $("objetivo").textContent = "¡META CUMPLIDA!";
    mensaje("Completaste tu meta. Puedes subirla en 'Cambiar persona' o pasar el turno a otra persona.", "ok");
    limpiar();
    return;
  }
  // Prioriza la figura con menos dibujos (dataset balanceado) y desempata al azar
  const otras = pendientes.filter(c => c !== actual);
  const opciones = saltando && otras.length ? otras : pendientes;
  const minimo = Math.min(...opciones.map(c => mis[c]));
  let candidatos = opciones.filter(c => mis[c] === minimo);
  if (candidatos.length > 1 && actual) candidatos = candidatos.filter(c => c !== actual) ;
  actual = candidatos[Math.floor(Math.random() * candidatos.length)];
  $("emoji").textContent = CLASES[actual].emoji; $("objetivo").textContent = CLASES[actual].nombre;
  limpiar();
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
    toast(`✓ ${CLASES[actual].nombre} guardada`);
    pintarMiProgreso(); siguiente(); mensaje("");
  } catch (e) { mensaje("No se pudo guardar: " + e.message + ". ¿Sigue abierto el servidor?", "bad"); }
  finally { $("guardar").disabled = false; }
}
async function borrarUltimo() {
  if (!ultimo) return;
  try {
    stats = await api("/api/borrar", ultimo);
    toast(`Borrado: ${CLASES[ultimo.clase].nombre}`);
    ultimo = null; $("deshacerGuardado").disabled = true; pintarMiProgreso();
    if (!actual) { siguiente(); mensaje(""); }
  } catch (e) { toast("No se pudo borrar"); }
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

function barra(c, n, objetivo) {
  const pct = Math.min(100, Math.round(100 * n / objetivo));
  return `<div class="prog-row"><span>${CLASES[c].emoji}</span><span>${CLASES[c].nombre}</span>
    <div class="track"><div class="fill ${n >= objetivo ? "done" : ""}" style="width:${pct}%"></div></div>
    <span class="muted" style="text-align:right">${n}/${objetivo}</span></div>`;
}
function pintarMiProgreso() {
  const mis = misConteos();
  $("miTotal").textContent = Object.values(mis).reduce((a, b) => a + b, 0);
  $("miProgreso").innerHTML = Object.keys(CLASES).map(c => barra(c, mis[c], meta)).join("");
}

/* ---------------- Progreso del equipo ---------------- */
async function pintarProgresoEquipo() {
  await cargarStats();
  $("totalProgreso").innerHTML = Object.keys(CLASES).map(c => barra(c, stats.total[c], META_EQUIPO)).join("") +
    `<p class="muted" style="margin-top:10px">Total: <b>${Object.values(stats.total).reduce((a, b) => a + b, 0)}</b> imágenes</p>`;
  const autores = Object.keys(stats.por_autor).sort();
  $("tablaAutores").innerHTML = `<tr><th>Autor</th>${Object.keys(CLASES).map(c => `<th>${CLASES[c].emoji}</th>`).join("")}<th>Total</th></tr>` +
    (autores.length ? autores.map(a => { const f = stats.por_autor[a];
      return `<tr><td>${a}</td>${Object.keys(CLASES).map(c => `<td>${f[c]}</td>`).join("")}<td><b>${Object.values(f).reduce((x, y) => x + y, 0)}</b></td></tr>`; }).join("")
    : `<tr><td colspan="7" class="muted">Aún no hay dibujos.</td></tr>`);
}

/* ---------------- Revisar ---------------- */
$("filtroClase").innerHTML = Object.keys(CLASES).map(c => `<option value="${c}">${CLASES[c].emoji} ${CLASES[c].nombre}</option>`).join("");
$("filtroClase").onchange = pintarGaleria; $("filtroAutor").onchange = pintarGaleria;
async function prepararRevisar() {
  await cargarStats();
  const sel = $("filtroAutor").value;
  $("filtroAutor").innerHTML = `<option value="">Todos</option>` + Object.keys(stats.por_autor).sort().map(a => `<option>${a}</option>`).join("");
  $("filtroAutor").value = sel || (stats.por_autor[autorSlug] ? autorSlug : "");
  pintarGaleria();
}
async function pintarGaleria() {
  const clase = $("filtroClase").value, filtro = $("filtroAutor").value;
  const { archivos } = await api("/api/lista?clase=" + clase);
  const lista = archivos.filter(f => !filtro || f.split("_")[1] === filtro);
  $("cuentaRevisar").textContent = `${lista.length} dibujos`;
  $("galeria").innerHTML = lista.map(f => `<div class="thumb"><img loading="lazy" src="/img/${clase}/${f}" alt="">
    <button title="Eliminar" data-f="${f}">×</button><small>${f.split("_")[1]}</small></div>`).join("");
  $("galeria").querySelectorAll("button").forEach(b => b.onclick = async () => {
    stats = await api("/api/borrar", { clase, archivo: b.dataset.f });
    if (ultimo && ultimo.archivo === b.dataset.f) { ultimo = null; $("deshacerGuardado").disabled = true; }
    b.parentElement.remove();
    $("cuentaRevisar").textContent = `${$("galeria").children.length} dibujos`;
  });
}
