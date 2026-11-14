# AGENTS.md · instrucciones para agentes (Codex, Claude, etc.)

Leé primero `README.md` (estructura, controles, Blender/Mixamo, pendientes).

## Objetivo del proyecto
Experiencia musical 3D jugable en navegador y VR (A-Frame 1.6, HTML/CSS/JS estático, sin build).
Recorrido: bienvenida → estudio (llevar cada instrumento a su personaje) → "YOU JUST CREATED YOUR HYPEO BEAT!".
Referencia visual del estudio: `estudio-referencia.png` (1672×941). Hoja de personajes: ver README.

## Reglas
- Sitio estático con **rutas relativas**; nada de CDNs (A-Frame está en `vendor/`).
- No modificar los `.glb` a mano: se regeneran con `blender/hypeo_characters.py`
  (`pip install bpy` en Python 3.13 funciona sin Blender instalado:
  `python -c "import sys; sys.argv=['x','--','--out','assets/models']; exec(open('blender/hypeo_characters.py').read())"`).
- Audio: `python3 tools/make_audio.py assets/audio` (numpy). Todos los loops: 120 BPM, 4/4, 4 compases = 8,000 s.
- Pedido explícito del usuario: los personajes **sin instrumento quedan quietos**; con instrumento bailan **al ritmo del beat**
  (clip `Dance` de 1 compás, tiempo calculado desde `engine.position` en `script.js` → `tick`).
- Textos de la interfaz en español rioplatense (vos), salvo los rótulos del diseño (PLAY, RESET, FINISH MIX, BEATS…).

## Cómo probar
```bash
python3 -m http.server 8080          # http://127.0.0.1:8080 (local)
W=1672 H=941 OUT=captures node tools/capture.js   # requiere playwright; guarda welcome.png y studio.png
```
`window.__hypeo` expone el componente del juego (estado `S`, `engine`, `bases`, `chars`, `button(id)`, `assign(id, from)`)
para automatizar pruebas. Para hacer clic en un objeto 3D, proyectá su posición con `.project(__hypeo.el.camera)`
(ver `tools/capture.js`).

## Próximos pasos (en orden)
1. Comparar `captures/studio.png` con `estudio-referencia.png` (ver `docs/comparacion-referencia.png`) y ajustar
   `js/config.js` (LAYOUT) hasta que coincidan proporciones; revisar también 1280×720.
2. Test E2E con Playwright: asignar las 5 pistas, quitar una, pausa/reanudar, soltar en personaje incorrecto,
   FINISH MIX, volver al estudio, NUEVA MEZCLA, RESET. Verificar sin errores en consola y que el visualizador se mueva.
3. Revisar en visor real (Meta Quest) agarre/soltar con gatillo y grip, mano translúcida, entrar/salir de VR.
4. Publicar en GitHub Pages (HTTPS) y verificar que cargan modelos, audio y fuentes.
