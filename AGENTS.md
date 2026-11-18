# AGENTS.md · instrucciones para agentes (Codex, Claude, etc.)

Leé primero `README.md` (estructura, controles, Blender/Mixamo, pendientes).

## Objetivo del proyecto
Experiencia musical 3D jugable en navegador y VR (A-Frame 1.6, HTML/CSS/JS estático, sin build).
Recorrido: bienvenida → selección de género → estudio (llevar cualquier instrumento a cualquier personaje) → "YOU JUST CREATED YOUR HYPEO BEAT!".
Referencia visual del estudio: `estudio-referencia.png` (1672×941). Hoja de personajes: ver README.

## Reglas
- Sitio estático con **rutas relativas**; nada de CDNs (A-Frame está en `vendor/`).
- No modificar los `.glb` a mano: se regeneran con `blender/hypeo_characters.py`
  (`pip install bpy` en Python 3.13 funciona sin Blender instalado:
  `python -c "import sys; sys.argv=['x','--','--out','assets/models']; exec(open('blender/hypeo_characters.py').read())"`).
- Audio: `js/genre-music.js` genera loops de 4 compases al BPM de cada género, en 4/4 o 5/4 según el estilo. `tools/make_audio.py` regenera los WAV de la versión original.
- Pedido explícito del usuario: los personajes **sin instrumento quedan quietos**; con instrumento bailan **al ritmo del beat**
  (clip `Dance` de 1 compás, tiempo calculado desde `engine.position` en `script.js` → `tick`).
- Textos de la interfaz en español rioplatense (vos), salvo los rótulos del diseño (PLAY, RESET, FINISH MIX, BEATS…).

## Cómo probar
```bash
python3 -m http.server 8080          # http://127.0.0.1:8080 (local)
W=1672 H=941 OUT=captures node tools/capture.js   # requiere playwright; guarda welcome.png y studio.png
```
`window.__hypeo` expone el componente del juego (estado `S`, `engine`, `bases`, `chars`, `button(id)`, `assign(id, from, charId)`)
para automatizar pruebas. Para hacer clic en un objeto 3D, proyectá su posición con `.project(__hypeo.el.camera)`
(ver `tools/capture.js`).

## Verificación

- `W=1280 H=720 node tools/studio-test.js` prueba el flujo con mouse, el carrusel, el cambio de género, la asignación libre,
  el nombre de la mezcla, el visualizador y la carga de recursos.
- `W=1672 H=941 node tools/capture.js` captura la bienvenida y el estudio para revisar
  el encuadre contra `estudio-referencia.png`.
- Pendiente en Meta Quest: agarre y soltado con gatillo y grip, manos translúcidas,
  entrada y salida de VR conservando la mezcla.
- Pendiente en GitHub Pages: publicar por HTTPS y verificar modelos, audio y fuentes
  usando la URL del sitio.
