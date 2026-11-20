# HYPEO BEATS · estudio musical 3D / VR

Experiencia web (A-Frame 1.6, HTML/CSS/JS estático): bienvenida → selección de género → estudio → "Tu creación".
Tocá **JUGAR** y elegí Reggaeton, Trap, House o Bachata. Cada género tiene su propio BPM, arreglo y paleta de instrumentos. Las pistas se preparan individualmente y se sincronizan al reloj de la mezcla.
Girá la plataforma y arrastrá cualquier instrumento a cualquiera de los cinco personajes. Cada personaje toca una variante rítmica distinta. Podés reemplazar el instrumento de un personaje sin detener la mezcla.

## Ejecutar en local

```bash
python3 -m http.server 8080
```

Abrir http://localhost:8080/ (URL **local**). No hay dependencias remotas: A-Frame está en `vendor/`, fuentes en `assets/fonts/`.

## Controles

- **Mouse**: arrastrar un instrumento flotante y soltarlo sobre cualquier personaje, o clic en el instrumento + clic en el personaje.
  Clic en un personaje/pedestal asignado = quitar la pista. Botones 3D: PLAY/PAUSE, RESET, FINISH MIX (aparece con ≥1 pista).
- **VR**: botón "Entrar en VR" (solo si el navegador soporta `immersive-vr`). Rayo del mando + gatillo o grip para agarrar/soltar y para los botones.

- **Plataforma**. Tocá ◀ o ▶ con el mouse o los mandos. Con mouse o trackpad también podés usar la rueda. Los instrumentos aparecen de a tres al frente. Cada género empieza con tres sonidos representativos en la plataforma.
- **Géneros**. Volvé al selector desde el estudio. Si volvés al mismo género recuperás tu mezcla. Si elegís otro se inicia una mezcla nueva.
- **MEZCLADOR**. Usá − o + para ajustar el volumen de cada personaje con instrumento. Tocá MUTE para silenciarlo y ACTIVAR para volver a oírlo con el volumen que tenía. Funciona con mouse y mandos VR.
- **FINISH MIX**. Escribí un título con el teclado o usá el teclado 3D en VR. Podés editarlo desde el resultado.

## Paletas y tempo

Cada instrumento tiene su propio buffer y cinco interpretaciones, una por personaje. Las pistas son sintetizadas, con la excepción de la batería de Reggaeton, que usa los WAV aportados.

| Género | BPM | Sonidos del estudio |
| --- | ---: | --- |
| Reggaeton | 82, 85, 91, 96, 100 (98 inicial) | Batería, bajo sub, keys, sinte rítmico, lead, pad, guitarra y hi-hats |
| Trap | 145 | 808, keys oscuras, sinte, guitarra, clap / caja, hi-hat rolls y pad oscuro |
| House | 126 | Batería, bajo al contratiempo, keys de apoyo, sinte y pad |
| Bachata | 128 | Requinto, guitarra segunda, bongó, güira y bajo |

### Batería de Reggaeton

Al asignar la batería de izquierda a derecha en el escenario suenan Moscow Mule, Perro Negro, VeLDÁ, La Noche de Anoche y Lo Siento BB. La mezcla sigue el BPM indicado en cada WAV (100, 96, 91, 82 y 85, respectivamente). Al cambiar de batería se vuelven a generar las demás pistas al tempo nuevo y se reanudan juntas en la misma posición musical. Si quitás la batería, el último BPM se mantiene hasta elegir otra o pulsar RESET. Los loops de dos compases se repiten para completar los cuatro compases de la mezcla.

### Arreglo de Reggaeton

Las partes de cuatro compases comparten **C–Am–Em–D (VI–iv–i–VII en mi menor)**. El pad conserva las inversiones de la pista de acordes del MIDI de referencia. Las keys y el sinte rítmico acentúan el dembow, mientras que la guitarra entra a contratiempo, el bajo alterna fundamentales y respuestas, y el lead tiene una frase propia. Cada personaje interpreta una variante fija. [The Sonic Secrets](https://thesonicsecrets.com/songwriting/latin-chord-progressions/) · [Native Instruments](https://www.native-instruments.com/blogs/blog/reggaeton) · [Splice](https://splice.com/blog/how-to-make-basslines/)

### Arreglo de Trap

El tempo queda fijo en **145 BPM**. La guitarra toca arpegios con un timbre de nylon y un eco corto, inspirados en la producción acústica de Turbo para Gunna. Las otras melodías usan un motivo de piano y campana, respuestas de sinte y un pad discreto inspirado en las texturas de Metro Boomin. Comparten la progresión **Fm–Dbmaj7–Bbm–C**. [Turbo sobre su producción para Gunna](https://hypebeast.com/2024/8/turbo-producer-series-interview-gunna) · [Metro Boomin trabajando en el estudio](https://www.thefader.com/2016/04/12/metro-boomin-cover-story-interview)

Los hi-hats conservan un golpe cada dos steps, con rolls distintos por personaje. Clap / caja suena solo en el tercer tiempo de cada compás, junto al quinto y al decimotercer hi-hat base en dos compases. El personaje cambia el timbre.

### Arreglo de House

El loop de ocho compases comparte dos progresiones entre bajo, sinte, pad y keys. Arranca con **Em7–Bm7–Cmaj7–D7**, una versión con séptimas de i–v–VI–VII, y pasa a **Em7–Am7–Bm7–Dm7**, séptimas menores paralelas. El pad sostiene los acordes, el sinte los acentúa y las keys acompañan con golpes cortos. [Future house de Native Instruments](https://blog.native-instruments.com/future-house-music/) · [Armonía paralela de Ableton](https://makingmusic.ableton.com/parallel-harmony)

Una sola batería toca el kick en las cuatro negras, el clap en 2 y 4 y el hi-hat abierto a contratiempo. Los personajes tienen cinco variantes con distintos timbres, hi-hats cerrados y remates. [Patrones de batería de Native Instruments](https://www.native-instruments.com/blogs/blog/drum-patterns)

## Estructura

| Ruta | Qué es |
| --- | --- |
| `index.html`, `style.css` | Escena A-Frame (rig en y=0, cámara a 1,6 m, mandos con `laser-controls`) |
| `script.js` | Lógica del juego: estados, interacción mouse/VR, animación sincronizada, flujo bienvenida/estudio/resultado |
| `js/config.js` | Instrumentos, colores y posiciones de cámara, personajes y consola |
| `js/reggaeton-patterns.js` | Secuencias de notas MIDI fijas y voicings de Reggaeton |
| `js/trap-patterns.js` | Partes MIDI, rolls de hi-hat y timbres de clap para Trap |
| `js/house-patterns.js` | Acordes, acompañamientos y cinco kits de House |
| `js/genre-music.js` | Sintetiza loops de cuatro u ocho compases por género, instrumento y personaje |
| `js/audio-engine.js` | Web Audio: reloj musical común, loops en fase, ganancias por pista, analizador para el visualizador |
| `js/builders.js` | Geometría 3D: sala, escenario, pedestales, consola, pantallas, botones, parlantes, mano VR |
| `assets/models/*.glb` | Personajes (rig con nombres Mixamo + clips `Idle` y `Dance`), `props.glb` (instrumentos), `logo.glb` |
| `assets/models/*_tpose.fbx` | Mallas en T-pose sin rig, para subir a Mixamo |
| `assets/audio/*.wav` | Loops de la versión original |
| `blender/hypeo_characters.py` | Genera todos los modelos desde Blender (bpy) |
| `tools/make_audio.py` | Genera los loops de la versión original (numpy) |

## Personajes: comportamiento

- Sin instrumento: **quietos** (clip `Idle`, pose fija).
- Con instrumento y la mezcla sonando: clip `Dance` (1 compás) cuyo tiempo se calcula a partir de la posición del reloj de audio → baila **en fase con el beat**.
- Asignado pero en pausa: aro iluminado, sin movimiento.

## Regenerar modelos con Blender (y Mixamo)

```bash
blender -b -P blender/hypeo_characters.py -- --out assets/models
```

(`--only beats,fx,props,logo` para regenerar solo algunos, `--preview` para renders de control en `blender/preview/`.)

Para conectar Claude/Codex con Blender en tu PC podés usar el addon **blender-mcp** (servidor MCP que expone Blender al agente);
también alcanza con correr el script anterior en modo batch.

**Flujo Mixamo**: subir `assets/models/<personaje>_tpose.fbx` a mixamo.com → auto-rig → elegir animación → descargar FBX
("With Skin", 30 fps) → en Blender: File > Import > FBX → File > Export > glTF 2.0 con:

- Format: **glTF Binary (.glb)**
- Include: Selected Objects (malla + armature) · Data: Mesh ✔ UVs ✔ Normals ✔ · Apply Modifiers ✔
- Material: **Materials: Export**, **Images: Automatic** (las texturas quedan incrustadas en el .glb). Si la textura sale blanca, verificar que el nodo Image Texture esté conectado al Base Color del Principled BSDF y que la imagen esté empaquetada (File > External Data > Pack Resources).
- Animation ✔ · Mode: **Actions** · Skinning ✔ · Shape keys ✔ · Always Sample Animations ✔ · Export Deformation Bones Only ✔
- +Y Up ✔

Los esqueletos de este proyecto ya usan los nombres `mixamorig:*`, así que una animación de Mixamo descargada "Without Skin" se puede aplicar al mismo rig.
En `script.js` (`mountCharacter`) se buscan los clips por nombre (`Idle`, `Dance`): renombrar la acción importada o ajustar ese código.

## Regenerar los archivos de audio originales

El estudio actual genera sus loops en el navegador con `js/genre-music.js`.

```bash
python3 tools/make_audio.py assets/audio
```

## Publicar con HTTPS

Es un sitio estático con rutas relativas: sirve en una subcarpeta. Ej. GitHub Pages (Settings > Pages > branch `main`, carpeta raíz)
o Netlify/Vercel arrastrando la carpeta. WebXR requiere HTTPS (o localhost).

## Pruebas de escritorio y VR

Con el servidor local en marcha, instalá Playwright y su Chromium para ejecutar el recorrido de escritorio:

```bash
npm install --no-save --no-package-lock playwright
npx playwright install chromium
W=1280 H=720 node tools/studio-test.js
W=1672 H=941 node tools/capture.js
```

Podés pasar `URL` para probar el sitio servido desde una subcarpeta o una URL de despliegue.
Las capturas se guardan en `captures/` por defecto.
La [comparación con la referencia](docs/comparacion-referencia.png) muestra ambos tamaños de escritorio.

En un visor WebXR, verificá que podés entrar y salir de VR, ver las manos translúcidas, agarrar
y soltar con gatillo y grip, y conservar la mezcla al volver a escritorio.

Atribuciones: A-Frame (MIT), Poppins (SIL OFL), Permanent Marker (Apache 2.0). Audio y modelos: generados por los scripts de este repo.
