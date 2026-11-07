# GUÍA PC03 · DrawCAPTCHA (CAPTCHA de dibujo)

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

---

## PASO 1 · Crear el dataset (sí, lo crean ustedes)

1. Abre una terminal en la carpeta `captura` del repositorio y ejecuta:
   ```
   python servidor.py
   ```
2. Abre **http://localhost:8000** en el navegador.
3. Escribe tu nombre, elige la meta (recomendado **40 por figura**) y pulsa **Empezar**.
4. La página te pide una figura al azar → dibújala → **Enter** (o *Guardar y siguiente*).
   * `C` limpiar · `Z` deshacer trazo · `S` saltar · *Borrar último* si guardaste algo mal.
5. Cuando termines, pasa la PC/celular a otra persona (botón *Cambiar persona*).
6. Pestaña **Revisar**: borra dibujos vacíos, cortados o equivocados.
7. Pestaña **Progreso**: mira cuántas imágenes hay por figura y por autor.

**Desde el celular:** por defecto el servidor solo responde en esta PC. Inícialo con `python servidor.py --lan` y la consola mostrará una dirección *Red local* (ej. `http://192.168.1.5:8000`). Ábrela en un celular conectado a la misma WiFi. Dibujar con el dedo da más variedad. Si no carga, permite Python en el Firewall de Windows. Usa `--lan` solo en una red de confianza: `/api/borrar` no tiene autenticación y cualquiera en esa red podría borrar dibujos.

### ¿Cuántos dibujos?
| Nivel | Por figura | Total |
|---|---|---|
| Mínimo aceptable | 150 | 750 |
| **Recomendado (para el 20)** | **250+** | **1250+** |

Ejemplo: 4 integrantes × 40 por figura = 160 por figura. Pidan a 2 o 3 familiares/amigos que dibujen 20–30 cada uno y llegan a 250. **Más personas distintas = red más robusta** (y lo pueden contar en la exposición).

### Juntar el dataset del equipo
Si cada uno capturó en su PC: copien las carpetas `dataset/<clase>/` de todos en una sola (los nombres de archivo no chocan porque llevan autor y fecha). Luego, clic derecho en `dataset` → *Comprimir en ZIP* → **dataset.zip**. Todos usan el **mismo dataset.zip**.

---

## PASO 2 · Entrenar la red (Google Colab)
1. Entra a colab.research.google.com → *Subir* → `PC03_Codigo_Nombre_Apellido.ipynb`.
2. *Entorno de ejecución → Cambiar tipo de entorno → T4 GPU*.
3. *Entorno de ejecución → Ejecutar todas*. Cuando lo pida, sube **dataset.zip**.
4. Al final, en la sección 10.2, **dibuja en el recuadro** y prueba el CAPTCHA.
5. Completa la sección **12. Conclusiones** con tus números reales.
6. *Archivo → Descargar .ipynb*. Renómbralo: `PC03_<TuCódigo>_<Nombre>_<Apellido>.ipynb`.

Si la exactitud sale baja (<85 %): revisa el dataset (pestaña *Revisar*), agrega más dibujos o sube `EPOCAS`.

### Qué cumple el notebook de la consigna
| Requisito | Dónde |
|---|---|
| Entrada 64×64 | `SIZE = 64` (base: 28×28) |
| Más épocas | 80 con EarlyStopping (base: 10) |
| Modificar capas | BatchNorm, 32→256 filtros, GlobalAvgPool, augmentation |
| Dropout | 0.2 / 0.3 / 0.5 / 0.3 |
| Skip connections (ResNet) | función `bloque_residual` |
| Matriz de confusión | sección 9 (base y mejorada, conteos y %) |
| Extra | comparación base vs. mejorada, errores, FAR/FRR, FAR con garabatos, demo interactiva |

Son **5 de 5 mejoras** (piden 3) y el modelo base demuestra que mejoran.

---

## PASO 3 · Informe (`PC03_Codigo_Nombre_Apellido.docx`) — cada integrante el suyo
1. **Carátula** (curso, PC03, integrantes, tu nombre y código).
2. **Planteamiento del problema**: los CAPTCHA de texto ya los resuelven bots con OCR; proponemos verificar humanos pidiendo dibujar una figura aleatoria.
3. **Justificación**: ciberseguridad/autenticación, usabilidad en celular, métricas FAR/FRR como en biometría.
4. **Objetivos** (general y 2–3 específicos).
5. **Captura de datos**: captura de la página web, cómo funciona, número de imágenes, autores, gráfico de distribución.
6. **Preprocesamiento**: inversión, recorte al contenido, 64×64, augmentation.
7. **Arquitectura**: modelo base vs. ResNet; tabla de las 5 mejoras; diagrama del bloque residual.
8. **Resultados**: capturas del notebook: curvas, **matriz de confusión**, classification report, tabla comparativa, errores, curva FAR/FRR, demo con ACCESO CONCEDIDO/DENEGADO.
9. **Discusión**: qué clases se confunden y por qué; efecto del Dropout y de las skip connections.
10. **Conclusiones y trabajo futuro**.
11. **Referencias** (He et al. 2016 *Deep Residual Learning*; Srivastava et al. 2014 *Dropout*; von Ahn et al. 2003 *CAPTCHA*; Google Quick, Draw!).

Para diferenciar los informes de cada integrante: cada uno puede probar una variante (por ejemplo `SIZE=32` o `128`, `SPLIT_POR_AUTOR=False` u otro `FAR_MAX`) y comentarla.

---

## PASO 4 · Exposición (8 pts) — ~10 min
| Min | Quién | Contenido |
|---|---|---|
| 0–1:30 | Integrante 1 | Problema: CAPTCHA tradicional roto por bots → idea DrawCAPTCHA |
| 1:30–3 | Integrante 2 | **Demo en vivo de la web de captura** (dibujar desde el celular) + dataset |
| 3–6 | Integrante 3 | Preprocesamiento, red base vs. ResNet, las 5 mejoras |
| 6–8:30 | Integrante 4 | Matriz de confusión, comparación, FAR/FRR |
| 8:30–10 | Todos | **Demo final:** alguien del público dibuja en Colab → ACCESO CONCEDIDO / DENEGADO |

Claves para el puntaje completo:
* **La demo en vivo** compensa que el proyecto sea "menos vistoso": invita al profesor a dibujar.
* Muestra un intento fallido a propósito (pide estrella, dibuja un corazón) → *ACCESO DENEGADO*.
* Explica **una** confusión de la matriz con ejemplos reales de errores.
* Ensayen y tengan el notebook **ya ejecutado** por si falla internet.

## Checklist final
- [ ] dataset con 150–250+ por figura, varias personas, revisado
- [ ] Notebook ejecutado completo, conclusiones con tus números
- [ ] `PC03_Codigo_Nombre_Apellido.ipynb` con tu código y nombre
- [ ] `PC03_Codigo_Nombre_Apellido.docx` con planteamiento, justificación y capturas
- [ ] Presentación + demo ensayada
