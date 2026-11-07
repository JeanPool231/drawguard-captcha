# DrawCAPTCHA · PC03

CAPTCHA que pide dibujar una figura al azar (estrella, rayo, espiral, corazón o nube); una CNN verifica que el dibujo corresponde.
Proyecto del curso Procesamiento de Imágenes (UPC). La guía completa está en [docs/GUIA_PC03.md](docs/GUIA_PC03.md).

## Instalación (Windows / PowerShell)
Requiere **Python 3.13**. Versiones más nuevas pueden no tener TensorFlow disponible; compruébalo con `py -0p`.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

En VS Code, selecciona el intérprete `.venv` (*Python: Select Interpreter*) y el kernel `.venv` en el notebook.

## Capturar dibujos
```powershell
python captura\servidor.py
```
Abre http://localhost:8000. Los dibujos se guardan en `dataset/`, que no se sube a git porque contiene nombres de autores.

El servidor solo responde en esta PC. Para capturar desde el celular, inícialo con `--lan` y abre la dirección *Red local* que muestra la consola, con el celular en la misma WiFi:
```powershell
python captura\servidor.py --lan
```
Úsalo solo en una red de confianza: `/api/borrar` no tiene autenticación y cualquiera en esa red podría borrar dibujos.

## Entrenar
El entrenamiento real se hace en Google Colab con GPU T4: comprime `dataset/` como `dataset.zip`, sube `PC03_Codigo_Nombre_Apellido.ipynb` y ejecuta todas las celdas. El notebook no necesita ningún otro archivo del repositorio. `requirements.txt` es solo para el entorno local; Colab usa sus propias versiones.
