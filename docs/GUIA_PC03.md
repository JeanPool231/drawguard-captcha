# Guía PC03: DrawCAPTCHA (CAPTCHA de dibujo)

## Archivos del proyecto
```
drawguard-captcha/
├── captura/
│   ├── servidor.py      ← servidor local (no necesita instalar nada)
│   ├── index.html       ← página de captura estilo CAPTCHA
│   ├── styles.css       ← estilos
│   └── app.js           ← lógica de la página
├── docs/GUIA_PC03.md    ← esta guía
├── dataset/             ← aquí se guardan los dibujos (se crea solo)
│   ├── estrella/  rayo/  espiral/  corazon/  nube/
└── PC03_Codigo_Nombre_Apellido.ipynb   ← notebook (Colab)
```

## Paso 1: crear el dataset

1. Abrir una terminal en la carpeta `captura` del repositorio y ejecutar:
   ```
   python servidor.py
   ```
2. Abrir http://localhost:8000 en el navegador.
3. Escribir el nombre, elegir la meta (se recomiendan 40 por figura) y pulsar *Empezar*.
4. La página pide una figura al azar. Se dibuja y se guarda con `Enter` o con *Guardar y siguiente*.
   * `C` limpia, `Z` deshace un trazo, `S` salta la figura y *Borrar último* elimina el último dibujo guardado.
5. Al terminar, la PC o el celular pasa a otra persona con el enlace *Cambiar*, junto al nombre.
6. En la pestaña *Revisar* se marcan los dibujos vacíos, cortados o equivocados y se borran juntos. El borrado no se puede deshacer.
7. La pestaña *Progreso* muestra cuántas imágenes hay por figura y por autor.

Por defecto el servidor solo responde en esta PC. Para capturar desde el celular se inicia con `python servidor.py --lan` y la consola muestra una dirección *Red local* (ej. `http://192.168.1.5:8000`), que se abre en un celular conectado a la misma WiFi. Dibujar con el dedo da más variedad. Si la página no carga, hay que permitir Python en el Firewall de Windows. `--lan` solo debe usarse en una red de confianza: `/api/borrar` no tiene autenticación y cualquiera en esa red podría borrar dibujos.

### Cantidad de dibujos
| Nivel | Por figura | Total |
|---|---|---|
| Mínimo aceptable | 150 | 750 |
| Recomendado | 250+ | 1250+ |

Por ejemplo, 4 integrantes × 40 por figura = 160 por figura. Si 2 o 3 familiares o amigos dibujan 20–30 cada uno se llega a 250. Con más personas distintas la red es más robusta, y es un dato que se puede contar en la exposición.

### Juntar el dataset del equipo
Si cada integrante capturó en su PC, las carpetas `dataset/<clase>/` se copian en una sola (los nombres de archivo no chocan porque llevan autor y fecha). Luego se comprime `dataset` como `dataset.zip`. Todo el equipo usa el mismo `dataset.zip`.

## Paso 2: entrenar la red (Google Colab)
1. En colab.research.google.com, *Subir* → `PC03_Codigo_Nombre_Apellido.ipynb`.
2. *Entorno de ejecución → Cambiar tipo de entorno → T4 GPU*.
3. *Entorno de ejecución → Ejecutar todas*. Cuando lo pida, subir `dataset.zip`.
4. Al final, en la sección 10.2, dibujar en el recuadro para probar el CAPTCHA.
5. Completar la sección 12 (Conclusiones) con los números reales.
6. *Archivo → Descargar .ipynb* y renombrarlo como `PC03_<Código>_<Nombre>_<Apellido>.ipynb`.

Si la exactitud sale baja (<85 %), hay que revisar el dataset en la pestaña *Revisar*, agregar más dibujos o subir `EPOCAS`.

### Qué cumple el notebook de la consigna
| Requisito | Dónde |
|---|---|
| Entrada 64×64 | `SIZE = 64` (base: 28×28) |
| Más épocas | 80 con EarlyStopping (base: 10) |
| Modificar capas | BatchNorm, 32→256 filtros, GlobalAvgPool, augmentation |
| Dropout | 0.2 / 0.3 / 0.5 / 0.3 |
| Skip connections (ResNet) | función `bloque_residual` |
| Matriz de confusión | sección 9 (base y mejorada, conteos y %) |
| Ablación | sección 9.2: base → +64×64 → +Dropout → +capas → +skip connections |
| Extra | comparación base vs. mejorada, errores, FAR/FRR, FAR con garabatos, demo interactiva |

Aplica las 5 mejoras (la consigna pide 3) y el modelo base sirve para medir cuánto aportan.

## Paso 3: informe (`PC03_Codigo_Nombre_Apellido.docx`), uno por integrante
1. Carátula (curso, PC03, integrantes, nombre y código).
2. Planteamiento del problema: los CAPTCHA de texto ya los resuelven bots con OCR; proponemos verificar humanos pidiendo dibujar una figura aleatoria.
3. Justificación: ciberseguridad/autenticación, usabilidad en celular, métricas FAR/FRR como en biometría.
4. Objetivos (general y 2–3 específicos).
5. Captura de datos: captura de la página web, cómo funciona, número de imágenes, autores, gráfico de distribución.
6. Preprocesamiento: inversión, recorte al contenido, 64×64, augmentation.
7. Arquitectura: modelo base vs. ResNet; tabla de las 5 mejoras; diagrama del bloque residual.
8. Resultados: capturas del notebook: curvas, matriz de confusión, classification report, tabla comparativa, tabla de ablación, errores, curva FAR/FRR, demo con ACCESO CONCEDIDO/DENEGADO.
9. Discusión: qué clases se confunden y por qué; efecto del Dropout y de las skip connections.
10. Conclusiones y trabajo futuro.
11. Referencias (He et al. 2016 *Deep Residual Learning*; Srivastava et al. 2014 *Dropout*; von Ahn et al. 2003 *CAPTCHA*; Google Quick, Draw!).

Para diferenciar los informes, cada integrante puede probar una variante (por ejemplo `SIZE=32` o `128`, `SPLIT_POR_AUTOR=False` u otro `FAR_MAX`) y comentarla.

## Paso 4: exposición (8 pts, unos 10 min)
| Min | Quién | Contenido |
|---|---|---|
| 0–1:30 | Integrante 1 | Problema: CAPTCHA tradicional roto por bots e idea de DrawCAPTCHA |
| 1:30–3 | Integrante 2 | Demo en vivo de la web de captura (dibujar desde el celular) y dataset |
| 3–6 | Integrante 3 | Preprocesamiento, red base vs. ResNet, las 5 mejoras |
| 6–8:30 | Integrante 4 | Matriz de confusión, comparación, FAR/FRR |
| 8:30–10 | Todos | Demo final: alguien del público dibuja en Colab y ve ACCESO CONCEDIDO o DENEGADO |

Puntos a cuidar para el puntaje completo:
* Hacer la demo en vivo e invitar al profesor a dibujar.
* Mostrar un intento fallido a propósito (pide estrella, se dibuja un corazón) que termine en ACCESO DENEGADO.
* Explicar una confusión de la matriz con ejemplos reales de errores.
* Ensayar y llevar el notebook ya ejecutado por si falla internet.

## Lista final
- [ ] Dataset con 150–250+ por figura, varias personas, revisado
- [ ] Notebook ejecutado completo, conclusiones con los números reales
- [ ] `PC03_Codigo_Nombre_Apellido.ipynb` con código y nombre del integrante
- [ ] `PC03_Codigo_Nombre_Apellido.docx` con planteamiento, justificación y capturas
- [ ] Presentación y demo ensayadas
