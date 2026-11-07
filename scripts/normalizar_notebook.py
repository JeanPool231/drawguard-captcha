"""
Devuelve `source` a lista de líneas tras usar NotebookEdit, que lo guarda como
una sola cadena e infla el diff. Solo cambia ese formato, no el contenido.

Uso:
    python scripts\\normalizar_notebook.py PC03_Codigo_Nombre_Apellido.ipynb
"""
import json
import sys


def texto(celda):
    return "".join(celda["source"])


ruta = sys.argv[1]
with open(ruta, encoding="utf-8", newline="") as fh:
    crudo = fh.read()
nl = "\r\n" if "\r\n" in crudo else "\n"
nb = json.loads(crudo)
antes = [texto(c) for c in nb["cells"]]

for celda in nb["cells"]:
    if isinstance(celda["source"], str):
        celda["source"] = celda["source"].splitlines(keepends=True)

assert [texto(c) for c in nb["cells"]] == antes, "cambió el contenido de una celda"

salida = json.dumps(nb, ensure_ascii=False, indent=1) + ("\n" if crudo.endswith("\n") else "")
with open(ruta, "w", encoding="utf-8", newline="") as fh:
    fh.write(salida.replace("\n", nl))
