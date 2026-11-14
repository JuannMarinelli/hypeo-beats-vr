# HYPEO BEATS · estudio musical 3D / VR

Experiencia web (A-Frame 1.6, HTML/CSS/JS estático): bienvenida → estudio → "Tu creación".
El usuario arrastra cada instrumento hasta su personaje (BEATS, BASS, MELODY, VOCALS, FX) y arma una mezcla sincronizada.

## Ejecutar en local

```bash
python3 -m http.server 8080
```

Abrir http://localhost:8080/ (URL **local**). No hay dependencias remotas: A-Frame está en `vendor/`, fuentes en `assets/fonts/`.

## Controles

- **Mouse**: arrastrar un instrumento flotante y soltarlo sobre su personaje, o clic en el instrumento + clic en el personaje.
  Clic en un personaje/pedestal asignado = quitar la pista. Botones 3D: PLAY/PAUSE, RESET, FINISH MIX (aparece con ≥1 pista).
- **VR**: botón "Entrar en VR" (solo si el navegador soporta `immersive-vr`). Rayo del mando + gatillo o grip para agarrar/soltar y para los botones.

## Estructura

| Ruta | Qué es |
| --- | --- |
| `index.html`, `style.css` | Escena A-Frame (rig en y=0, cámara a 1,6 m, mandos con `laser-controls`) |
| `script.js` | Lógica del juego: estados, interacción mouse/VR, animación sincronizada, flujo bienvenida/estudio/resultado |
| `js/config.js` | Categorías, colores, BPM, layout (posiciones de cámara, personajes, consola) |
| `js/audio-engine.js` | Web Audio: reloj musical común, 5 loops en fase, ganancias por pista, analizador para el visualizador |
| `js/builders.js` | Geometría 3D: sala, escenario, pedestales, consola, pantallas, botones, parlantes, mano VR |
| `assets/models/*.glb` | Personajes (rig con nombres Mixamo + clips `Idle` y `Dance`), `props.glb` (instrumentos), `logo.glb` |
| `assets/models/*_tpose.fbx` | Mallas en T-pose sin rig, para subir a Mixamo |
| `assets/audio/*.wav` | 5 loops propios: 120 BPM, 4/4, 4 compases (8,000 s), La menor (Am–F–C–G) |
| `blender/hypeo_characters.py` | Genera todos los modelos desde Blender (bpy) |
| `tools/make_audio.py` | Genera los 5 loops (numpy) |

## Personajes: comportamiento

- Sin instrumento: **quietos** (clip `Idle`, pose fija).
- Con instrumento y la mezcla sonando: clip `Dance` (1 compás) cuyo tiempo se calcula a partir de la posición del reloj de audio → baila **en fase con el beat**.
- Asignado pero en pausa: aro y placa iluminados, sin movimiento.

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

## Regenerar audio

```bash
python3 tools/make_audio.py assets/audio
```

## Publicar con HTTPS

Es un sitio estático con rutas relativas: sirve en una subcarpeta. Ej. GitHub Pages (Settings > Pages > branch `main`, carpeta raíz)
o Netlify/Vercel arrastrando la carpeta. WebXR requiere HTTPS (o localhost).

## Estado / pendientes (handoff)

Hecho y verificado en Chromium headless (escritorio): bienvenida, transición al estudio, composición 3D similar a `estudio-referencia.png`,
modelos/animaciones, carga de audio sin errores de consola.

Pendiente:
1. Seguir ajustando la composición contra `estudio-referencia.png` a 1672×941 y 1280×720 (último ajuste: personajes más chicos, consola más cerca, parlantes visibles).
2. Probar el recorrido completo con Playwright: asignar las 5 pistas, quitar una, pausar/reanudar, soltar en destino incorrecto, FINISH MIX, volver al estudio, RESET.
3. Probar en un visor real (Quest): agarre con gatillo/grip, mano translúcida, entrar/salir de VR conservando la mezcla.
4. Publicar (GitHub Pages) y verificar que cargan modelos, audio y fuentes.

Atribuciones: A-Frame (MIT), Poppins (SIL OFL), Permanent Marker (Apache 2.0). Audio y modelos: generados por los scripts de este repo.
