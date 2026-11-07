# DrawCAPTCHA · PC03 (Procesamiento de Imágenes, UPC)

Proyecto académico grupal (hasta 4 personas). Un CAPTCHA que pide dibujar una figura al azar; una CNN verifica que el dibujo corresponde.
Clases: **exactamente 5** (`estrella`, `rayo`, `espiral`, `corazon`, `nube`). No agregar ni quitar clases.

## Lo que exige la consigna (no romper)
- Máximo 5 categorías de dibujo.
- Sitio web de captura de datos, local o desplegado → `captura/`.
- Red de clasificación con ≥3 mejoras (entrada 64×64, más épocas, más capas, Dropout, skip connections). Hoy aplica las 5.
- Matriz de confusión sobre el conjunto de **prueba**.
- Entregables por integrante: `PC03_Codigo_Nombre_Apellido.ipynb` y `.docx`. El informe lo escriben las personas: no lo generes ni inventes resultados.
- Rúbrica: exposición 8 · informe y código 8 · problema y creatividad 4.

## Estructura
```
captura/
  servidor.py    servidor local, SOLO librería estándar (sin dependencias)
  index.html     estructura de la página
  styles.css     estilos
  app.js         lógica: lienzo, flujo de captura, revisar, progreso
dataset/         dibujos reales, se crea solo. NO versionar
scripts/         utilidades (dataset sintético para pruebas de humo, normalizar el notebook)
docs/            guía y notas
PC03_Codigo_Nombre_Apellido.ipynb   notebook entregable (Colab)
requirements.txt  README.md  .gitignore  CLAUDE.md
```

## Entorno y comandos (Windows / PowerShell)
```
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python captura\servidor.py                    # http://localhost:8000
python scripts\crear_dataset_sintetico.py     # solo prueba de humo
```
- VS Code: seleccionar el intérprete `.venv` (Python: Select Interpreter) y el kernel `.venv` en el notebook.
- Usar una versión de Python que TensorFlow soporte; verifícalo antes de crear el venv.
- El entrenamiento real se hace en Google Colab (GPU T4), no aquí.

## Reglas del notebook
- **Autocontenido**: debe correr en Colab con solo `dataset.zip`. No importar módulos locales ni mover lógica a `src/`.
- Editar por celdas (NotebookEdit). Nunca reescribir el JSON completo a mano.
- Después de NotebookEdit, ejecutar `python scripts\normalizar_notebook.py PC03_Codigo_Nombre_Apellido.ipynb`: devuelve `source` a lista de líneas y mantiene el diff pequeño. Es el único rewrite permitido y no cambia el contenido de las celdas.
- En el repo, el notebook va sin salidas (mantiene los diffs pequeños). Las salidas se generan en Colab para el informe.
- Constantes al inicio (`SIZE`, `EPOCAS`, `SEED`, `SPLIT_POR_AUTOR`). Semillas fijas.
- No ejecutes entrenamientos largos salvo que se pida.

## Consistencia que no se puede romper
- Lienzo 280×280, trazo negro de 9 px sobre fondo blanco, igual en `captura/app.js` y en la demo del notebook. `preprocesar()` depende de ello.
- Las clases y su orden son los mismos en servidor, JS y notebook.

## Gotchas conocidos
- `servidor.py` solo sirve `/` y `/index.html`. Al separar CSS y JS hay que permitir `/styles.css` y `/app.js` con lista blanca explícita (sin path traversal).
- `/api/borrar` no tiene autenticación: el servidor debe escuchar en `127.0.0.1` por defecto y abrir la red solo con `--lan` (para capturar desde el celular).
- Las capas `Random*` de Keras rellenan por reflejo: usar `fill_mode='constant', fill_value=0.0`.
- El dataset contiene nombres de autores: no subirlo a git ni mostrarlo en el informe sin anonimizar.
- El dataset sintético es solo para probar que el notebook corre. Nunca va en `dataset/` y sus métricas nunca se reportan.

## Estilo de código
- Comentarios, textos de UI y mensajes de commit en español.
- Python: librería estándar en el servidor. JS vanilla (ES2020), sin frameworks, sin CDN, sin paso de build.
- Cambios mínimos y enfocados: una tarea por rama, sin refactors no pedidos.

## Git
- `main`: estable y entregable. `develop`: integración. Trabajo en ramas desde `develop`: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/` + nombre-corto-en-kebab.
- Commits pequeños con Conventional Commits (`fix(notebook): ...`). PR hacia `develop`; `develop → main` solo al final.
- Nunca commits directos a `main` ni `develop`. Nunca `--force`.
- Agrega archivos por ruta explícita, no con `git add -A` (podría capturar `dataset/`). Revisa `git status` antes de cada commit.
- **Pide confirmación antes de `git push`, de abrir un PR y de cualquier operación destructiva.**
- Las ramas que tocan el notebook se integran en serie (un PR a la vez) para evitar conflictos en el JSON.

## Definición de terminado
- `python captura\servidor.py` arranca y `/`, `/styles.css` y `/app.js` responden 200.
- El notebook corre de punta a punta con el dataset sintético y pocas épocas (por ejemplo `jupyter nbconvert --execute` con `PC03_EPOCAS=2`).
- Pylance sin avisos de imports tras instalar el venv.
- Nada de `dataset/`, `.venv/`, modelos ni zips en el commit.

## No hacer
- No redactar el informe ni escribir conclusiones con números inventados.
- No cambiar las clases, no agregar dependencias al servidor, no tocar `dataset/`.
- No afinar la arquitectura "a ojo": toda mejora se mide con la ablación sobre datos reales.