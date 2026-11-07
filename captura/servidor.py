"""
PC03 - CAPTCHA de dibujo | Servidor de captura de datos
--------------------------------------------------------
Usa solo la librería estándar de Python.

Uso:
    python servidor.py            (puerto 8000)
    python servidor.py 8080       (otro puerto)
    python servidor.py --lan      (abre la red local para capturar desde el celular)

Dirección en el navegador:  http://localhost:8000
Por defecto solo responde en esta PC. Con --lan, quienes estén en la misma red
WiFi pueden abrir la dirección "Red local" que aparece en la consola (celular/tablet).

Los dibujos se guardan en:  ../dataset/<clase>/<clase>_<autor>_<fecha>.png
"""
import argparse
import base64
import errno
import json
import os
import re
import socket
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

CLASES = ["estrella", "rayo", "espiral", "corazon", "nube"]
AQUI = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.abspath(os.path.join(AQUI, "..", "dataset"))
PNG_HEADER = b"\x89PNG\r\n\x1a\n"
# Lista blanca: ningún otro archivo de captura/ se sirve (ni servidor.py)
ESTATICOS = {
    "/": "/index.html",
    "/index.html": "/index.html",
    "/styles.css": "/styles.css",
    "/app.js": "/app.js",
}

for c in CLASES:
    os.makedirs(os.path.join(DATASET, c), exist_ok=True)


def limpiar_autor(texto):
    texto = (texto or "anonimo").strip().lower()
    reemplazos = str.maketrans("áéíóúñü", "aeiounu")
    texto = texto.translate(reemplazos)
    texto = re.sub(r"[^a-z0-9]+", "-", texto).strip("-")
    return texto[:30] or "anonimo"


def ruta_segura(clase, archivo):
    """Devuelve la ruta del archivo solo si es válida (evita borrar fuera del dataset)."""
    if clase not in CLASES:
        return None
    archivo = os.path.basename(archivo or "")
    if not re.fullmatch(r"[a-z0-9_\-]+\.png", archivo):
        return None
    return os.path.join(DATASET, clase, archivo)


def conteos():
    total, por_autor = {}, {}
    for c in CLASES:
        archivos = [f for f in os.listdir(os.path.join(DATASET, c)) if f.endswith(".png")]
        total[c] = len(archivos)
        for f in archivos:
            partes = f.split("_")
            autor = partes[1] if len(partes) >= 3 else "?"
            por_autor.setdefault(autor, {k: 0 for k in CLASES})[c] += 1
    return {"clases": CLASES, "total": total, "por_autor": por_autor}


class Handler(SimpleHTTPRequestHandler):
    # Explícito porque el registro de Windows puede cambiar el MIME de .js
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
    }

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=AQUI, **kw)

    def log_message(self, fmt, *args):  # consola más limpia
        pass

    def _json(self, data, code=200):
        cuerpo = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def _leer_json(self):
        n = int(self.headers.get("Content-Length", 0))
        if n <= 0 or n > 5_000_000:
            return None
        try:
            return json.loads(self.rfile.read(n))
        except Exception:
            return None

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/stats":
            return self._json(conteos())
        if url.path == "/api/lista":
            clase = parse_qs(url.query).get("clase", [""])[0]
            if clase not in CLASES:
                return self._json({"error": "clase invalida"}, 400)
            archivos = sorted(
                (f for f in os.listdir(os.path.join(DATASET, clase)) if f.endswith(".png")),
                reverse=True,
            )
            return self._json({"clase": clase, "archivos": archivos})
        if url.path.startswith("/img/"):
            partes = url.path.split("/")
            ruta = ruta_segura(partes[2], partes[3]) if len(partes) == 4 else None
            if not ruta or not os.path.exists(ruta):
                return self._json({"error": "no existe"}, 404)
            with open(ruta, "rb") as fh:
                datos = fh.read()
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(datos)))
            self.end_headers()
            self.wfile.write(datos)
            return
        if url.path in ESTATICOS:
            self.path = ESTATICOS[url.path]
            return super().do_GET()
        return self._json({"error": "no encontrado"}, 404)

    def do_HEAD(self):  # el heredado se saltaría la lista blanca de do_GET
        self.send_error(405)

    def do_POST(self):
        url = urlparse(self.path)
        datos = self._leer_json()
        if datos is None:
            return self._json({"error": "json invalido"}, 400)

        if url.path == "/api/guardar":
            clase = datos.get("clase")
            if clase not in CLASES:
                return self._json({"error": "clase invalida"}, 400)
            imagen = str(datos.get("imagen", ""))
            if "," in imagen:
                imagen = imagen.split(",", 1)[1]
            try:
                png = base64.b64decode(imagen)
            except Exception:
                return self._json({"error": "imagen invalida"}, 400)
            if not png.startswith(PNG_HEADER):
                return self._json({"error": "no es PNG"}, 400)
            autor = limpiar_autor(datos.get("autor")).replace("_", "-")
            sello = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
            nombre = f"{clase}_{autor}_{sello}.png"
            with open(os.path.join(DATASET, clase, nombre), "wb") as fh:
                fh.write(png)
            print(f"  + {clase:<9} {nombre}")
            return self._json({"ok": True, "archivo": nombre, **conteos()})

        if url.path == "/api/borrar":
            ruta = ruta_segura(datos.get("clase"), datos.get("archivo"))
            if not ruta or not os.path.exists(ruta):
                return self._json({"error": "archivo no encontrado"}, 404)
            os.remove(ruta)
            print(f"  - borrado {os.path.basename(ruta)}")
            return self._json({"ok": True, **conteos()})

        return self._json({"error": "no encontrado"}, 404)


class Servidor(ThreadingHTTPServer):
    # En Windows SO_REUSEADDR deja abrir dos servidores en el mismo puerto sin error
    allow_reuse_address = os.name != "nt"

    def server_bind(self):
        if os.name == "nt":
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def puerto_ocupado(puerto):
    """El bind exclusivo no detecta un servidor en 0.0.0.0 abierto con SO_REUSEADDR."""
    with socket.socket() as s:
        s.settimeout(0.5)  # en Windows un puerto libre tarda ~2 s en rechazar
        return s.connect_ex(("127.0.0.1", puerto)) == 0


def ip_local():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Servidor de captura de dibujos")
    parser.add_argument("puerto", nargs="?", type=int, default=8000)
    parser.add_argument("--lan", action="store_true",
                        help="escuchar en toda la red local (para capturar desde el celular)")
    args = parser.parse_args()
    puerto = args.puerto
    en_uso = f"el puerto {puerto} ya está en uso, cierra el otro servidor"
    if puerto_ocupado(puerto):
        raise SystemExit(en_uso)
    # /api/borrar no tiene autenticación: la red solo se abre a pedido
    try:
        servidor = Servidor(("0.0.0.0" if args.lan else "127.0.0.1", puerto), Handler)
    except OSError as e:
        if e.errno != errno.EADDRINUSE:
            raise
        raise SystemExit(en_uso)
    print("=" * 58)
    print("  PC03 - CAPTCHA de dibujo | Captura de dataset")
    print("=" * 58)
    print(f"  Esta PC:    http://localhost:{puerto}")
    if args.lan:
        ip = ip_local()
        if ip:
            print(f"  Red local:  http://{ip}:{puerto}  (celular en la misma WiFi)")
        print("  AVISO: /api/borrar no tiene autenticacion; cualquiera en esta")
        print("  red puede borrar dibujos. Usa --lan solo en una red de confianza.")
    print(f"  Dataset en: {DATASET}")
    print("  Ctrl + C para detener")
    print("=" * 58)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
