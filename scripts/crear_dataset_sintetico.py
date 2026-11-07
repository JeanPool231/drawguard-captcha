"""
Crea un dataset sintético para comprobar que el notebook corre de punta a punta.
Solo sirve para eso: sus métricas nunca se reportan y nunca va en dataset/.

Uso:
    python scripts\\crear_dataset_sintetico.py
    python scripts\\crear_dataset_sintetico.py --autores 2 --salida datos\\sintetico2
"""
import argparse
import glob
import math
import os
import random

from PIL import Image, ImageDraw

# Mismo orden que en captura/ y en el notebook
CLASES = ["estrella", "rayo", "espiral", "corazon", "nube"]
LADO, GROSOR = 280, 9  # mismo lienzo que captura/app.js
SEED = 42
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def estrella(rng):
    interior = rng.uniform(0.35, 0.5)
    return [((1 if i % 2 == 0 else interior) * math.sin(i * math.pi / 5),
             -(1 if i % 2 == 0 else interior) * math.cos(i * math.pi / 5)) for i in range(11)]


def rayo(rng):
    a, b = rng.uniform(0.15, 0.35), rng.uniform(0.35, 0.55)
    return [(a, -1), (-b, 0.1), (0.05, 0.1), (-a, 1), (b, -0.2), (-0.05, -0.2), (a, -1)]


def espiral(rng):
    vueltas, n = rng.uniform(2.5, 3.5), 90
    return [((i / n) * math.cos(i / n * vueltas * math.tau),
             (i / n) * math.sin(i / n * vueltas * math.tau)) for i in range(n + 1)]


def corazon(rng):
    return [(math.sin(t) ** 3,
             -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) / 16)
            for t in (i / 60 * math.tau for i in range(61))]


def nube(rng):
    bultos = rng.randint(5, 7)
    return [((0.75 + 0.2 * abs(math.sin(i / 90 * bultos * math.pi))) * math.cos(i / 90 * math.tau),
             (0.75 + 0.2 * abs(math.sin(i / 90 * bultos * math.pi))) * 0.65 * math.sin(i / 90 * math.tau))
            for i in range(91)]


FIGURAS = {"estrella": estrella, "rayo": rayo, "espiral": espiral, "corazon": corazon, "nube": nube}


def dibujar(clase, rng):
    """Dibuja la figura con rotación, tamaño, posición y temblor al azar."""
    giro, escala = math.radians(rng.uniform(-15, 15)), rng.uniform(70, 115)
    cx, cy = LADO / 2 + rng.uniform(-15, 15), LADO / 2 + rng.uniform(-15, 15)
    puntos = []
    for x, y in FIGURAS[clase](rng):
        x, y = x + rng.gauss(0, 0.012), y + rng.gauss(0, 0.012)
        puntos.append((cx + escala * (x * math.cos(giro) - y * math.sin(giro)),
                       cy + escala * (x * math.sin(giro) + y * math.cos(giro))))
    img = Image.new("RGB", (LADO, LADO), "white")
    ImageDraw.Draw(img).line(puntos, fill="black", width=GROSOR, joint="curve")
    return img


def main():
    parser = argparse.ArgumentParser(description="Dataset sintético para pruebas de humo")
    parser.add_argument("--salida", default=os.path.join(RAIZ, "datos", "sintetico"))
    parser.add_argument("--autores", type=int, default=6)
    parser.add_argument("--por-clase", type=int, default=20, help="dibujos por autor y clase")
    args = parser.parse_args()

    salida = os.path.normcase(os.path.abspath(args.salida))
    prohibido = os.path.normcase(os.path.join(RAIZ, "dataset"))
    if salida == prohibido or salida.startswith(prohibido + os.sep):
        raise SystemExit("el dataset sintético nunca va en dataset/, usa otra carpeta")

    rng = random.Random(SEED)
    for clase in CLASES:
        os.makedirs(os.path.join(salida, clase), exist_ok=True)
        for autor in range(1, args.autores + 1):
            for n in range(args.por_clase):
                # shortcut: repetir con otros argumentos deja los PNG anteriores, usa otra --salida
                nombre = f"{clase}_sintetico-{autor}_20260101-000000-{n:06d}.png"
                dibujar(clase, rng).save(os.path.join(salida, clase, nombre))

    esperado = args.autores * args.por_clase
    for clase in CLASES:
        png = glob.glob(os.path.join(salida, clase, "*.png"))
        assert len(png) >= esperado, f"{clase}: {len(png)} de {esperado}"
        assert Image.open(png[0]).size == (LADO, LADO)
    print(f"{esperado * len(CLASES)} imágenes en {salida} (solo para pruebas de humo)")


if __name__ == "__main__":
    main()
