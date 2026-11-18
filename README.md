# HYPEO BEATS · estudio musical 3D / VR

Experiencia web (A-Frame 1.6, HTML/CSS/JS estático): bienvenida → selección de género → estudio → "Tu creación".
Tocá **JUGAR** y elegí Reggaeton, Trap, R&B, Detroit, Dembow, Drill, Rkt, House, Bachata, Guaracha o Jazz. Cada género tiene su propio tempo, armonía y sonidos.
Arrastrá cualquiera de los nueve instrumentos a cualquiera de los cinco personajes. Cada personaje toca una variante rítmica distinta. Podés reemplazar el instrumento de un personaje sin detener la mezcla.

## Ejecutar en local

```bash
python3 -m http.server 8080
```

Abrir http://localhost:8080/ (URL **local**). No hay dependencias remotas: A-Frame está en `vendor/`, fuentes en `assets/fonts/`.

## Controles

- **Mouse**: arrastrar un instrumento flotante y soltarlo sobre cualquier personaje, o clic en el instrumento + clic en el personaje.
  Clic en un personaje/pedestal asignado = quitar la pista. Botones 3D: PLAY/PAUSE, RESET, FINISH MIX (aparece con ≥1 pista).
- **VR**: botón "Entrar en VR" (solo si el navegador soporta `immersive-vr`). Rayo del mando + gatillo o grip para agarrar/soltar y para los botones.

## Estructura

| Ruta | Qué es |
| --- | --- |
| `index.html`, `style.css` | Escena A-Frame (rig en y=0, cámara a 1,6 m, mandos con `laser-controls`) |
| `script.js` | Lógica del juego: estados, interacción mouse/VR, animación sincronizada, flujo bienvenida/estudio/resultado |
| `js/config.js` | Instrumentos, colores y posiciones de cámara, personajes y consola |
| `js/genre-music.js` | Sintetiza loops de cuatro compases por género, instrumento y personaje |
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
