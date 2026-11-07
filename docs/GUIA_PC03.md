# Guía técnica de DrawCAPTCHA

Complementa el [README](../README.md) con la estructura del proyecto y los pasos completos para capturar datos, entrenar y probar el notebook.

## Estructura del proyecto
```
drawguard-captcha/
├── captura/                    página web de captura de dibujos
│   ├── servidor.py             servidor local, solo usa la librería estándar de Python
│   ├── index.html              estructura de la página
│   ├── styles.css              estilos
│   └── app.js                  lienzo, flujo de captura, revisión y progreso
├── scripts/
│   ├── crear_dataset_sintetico.py   dataset falso para la prueba de humo
│   └── normalizar_notebook.py       deja el JSON del notebook en un formato estable
├── docs/
│   ├── GUIA_PC03.md            esta guía
│   └── PC03_Informe.docx       informe del trabajo
├── PC03_Codigo_Nombre_Apellido.ipynb   notebook de entrenamiento y evaluación (Colab)
├── requirements.txt            dependencias del entorno local
└── README.md
```

Estas rutas se crean al usar el proyecto y no se suben a git:

| Ruta | Contenido |
|---|---|
| `dataset/` | dibujos capturados, un PNG por dibujo |
| `datos/` | dataset sintético, resultados de la prueba de humo y el zip descomprimido |
| `dataset.zip` | dataset comprimido para subirlo a Colab |
| `drawcaptcha_resnet.keras` | modelo entrenado |
| `resultados.json` | métricas exportadas por el notebook |

`dataset/` queda fuera de git porque los nombres de archivo llevan el nombre de cada autor.

## Formato del dataset
```
dataset/
├── estrella/   estrella_<autor>_<fecha>.png
├── rayo/
├── espiral/
├── corazon/
└── nube/
```
Cada imagen mide 280×280 y tiene trazo negro de 9 px sobre fondo blanco. El notebook toma el autor del segundo campo del nombre de archivo y lo usa para dividir por persona, así que alguien que captura con dos nombres distintos cuenta como dos autores.

## Paso 1: preparar el entorno local
1. Instalar Python 3.13 (`py -0p` lista las versiones instaladas).
2. Crear el entorno e instalar las dependencias desde la raíz del repositorio:
   ```powershell
   py -3.13 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
3. En VS Code, elegir el intérprete `.venv` con *Python: Select Interpreter* y el kernel `.venv` en el notebook.

La página de captura no necesita el entorno, porque `servidor.py` no tiene dependencias externas.

## Paso 2: capturar dibujos
1. Iniciar el servidor:
   ```powershell
   python captura\servidor.py          # puerto 8000
   python captura\servidor.py 8080     # otro puerto
   ```
2. Abrir http://localhost:8000, escribir el nombre, elegir la meta por figura y pulsar *Empezar a dibujar*.
3. La página pide una figura al azar y prioriza la que tiene menos dibujos. Atajos: `Enter` guarda, `C` limpia, `Z` deshace un trazo y `S` salta la figura. *Borrar último* elimina el último dibujo guardado.
4. Para que dibuje otra persona se usa el enlace *Cambiar*, junto al nombre.
5. En *Revisar* se marcan los dibujos vacíos, cortados o equivocados y se borran juntos. El borrado no se puede deshacer.
6. *Progreso* muestra cuántas imágenes hay por figura y por autor.

Para capturar desde un celular conectado a la misma WiFi, el servidor se inicia con `--lan` y en el celular se abre la dirección *Red local* que muestra la consola. Si no carga, hay que permitir Python en el Firewall de Windows. `--lan` solo debe usarse en una red de confianza, porque `/api/borrar` no tiene autenticación.

Si cada integrante capturó en su PC, las carpetas `dataset/<clase>/` se copian en una sola. Los nombres de archivo no chocan porque llevan autor y fecha.

## Paso 3: entrenar en Google Colab
1. Comprimir la carpeta `dataset` completa, con las 5 subcarpetas dentro, como `dataset.zip`.
2. En colab.research.google.com, *Subir* → `PC03_Codigo_Nombre_Apellido.ipynb`.
3. *Entorno de ejecución → Cambiar tipo de entorno → T4 GPU*.
4. *Entorno de ejecución → Ejecutar todas*. Cuando la celda de carga lo pida, subir `dataset.zip`.
5. En la sección 10.2 aparece un recuadro para dibujar y probar el CAPTCHA.
6. Para conservar el modelo y las métricas, descargar `drawcaptcha_resnet.keras` y `resultados.json` desde el panel de archivos de Colab.

El notebook no importa ningún otro archivo del repositorio. Entrena el modelo base, la ResNet y las 5 variantes de la ablación en una sola ejecución.

### Constantes del notebook
Están al inicio, en la sección 4.

| Constante | Valor | Uso |
|---|---|---|
| `SIZE` | 64 | lado de la imagen de entrada |
| `EPOCAS` | 80 | máximo de épocas; *EarlyStopping* corta antes |
| `SEED` | 42 | semilla de Python, NumPy y TensorFlow |
| `SPLIT_POR_AUTOR` | `True` | cada persona queda en un solo conjunto; necesita 3 autores o más |
| `FAR_MAX` | 0.01 | FAR máximo en validación al elegir el umbral |
| `N_GARABATOS` | 500 | garabatos aleatorios para medir el FAR ante un bot |

## Paso 4: ejecutar el notebook en local
Sirve para comprobar cambios sin Colab. Se puede abrir en VS Code con el kernel `.venv` o ejecutar completo con `nbconvert`. El notebook busca, dentro del directorio actual, una carpeta que tenga las 5 subcarpetas de clases. Dos variables de entorno cambian su comportamiento:

| Variable | Efecto |
|---|---|
| `PC03_DATASET` | ruta del dataset; si no está definida, se busca automáticamente |
| `PC03_EPOCAS` | reemplaza las 80 épocas, por ejemplo `2` para una ejecución rápida |

Fuera de Colab, la demo de la sección 10.2 no muestra el recuadro: simula un intento genuino y uno impostor con imágenes de prueba.

### Prueba de humo
Comprueba que el notebook corre de punta a punta con datos falsos. Sus métricas no tienen significado.
```powershell
python scripts\crear_dataset_sintetico.py
$env:PC03_DATASET = "$PWD\datos\sintetico"; $env:PC03_EPOCAS = "2"
jupyter nbconvert --to notebook --execute PC03_Codigo_Nombre_Apellido.ipynb --output-dir datos\humo
Remove-Item Env:PC03_DATASET, Env:PC03_EPOCAS
```
`crear_dataset_sintetico.py` acepta `--autores` (6 por defecto), `--por-clase` (20 dibujos por autor y clase) y `--salida`. Si se repite con otros argumentos sobre la misma carpeta, quedan los PNG anteriores, así que conviene usar otra `--salida`.

### Editar el notebook
Después de editarlo hay que normalizar el JSON para que el diff quede pequeño:
```powershell
python scripts\normalizar_notebook.py PC03_Codigo_Nombre_Apellido.ipynb
```
El script solo cambia el formato de las celdas, no su contenido.
