"""
HYPEO BEATS · generador de modelos en Blender (probado con Blender 5.3 / bpy 5.3)

Genera, desde cero y por código:
  * 5 personajes (beats, bass, melody, vocals, fx) con malla en T-pose, esqueleto con
    nombres de huesos de Mixamo ("mixamorig:Hips", ...), pesos de piel y dos clips:
      - "Idle"  : pose quieta (brazos relajados), sin movimiento.
      - "Dance" : 1 compás (4 tiempos) en loop, con un gesto propio de cada categoría.
    Se exportan como .glb (web), .blend (edición) y *_tpose.fbx (malla sin rig para Mixamo).
  * props.glb : los 5 instrumentos flotantes de la consola.
  * logo.glb  : logo 3D "HYPEO" + "BEATS" + destello de cuatro puntas.

Todos los colores salen de una textura atlas (palette.png, 256x256) que se incrusta en
cada .glb, así el pipeline exporta texturas reales y no solo colores de material.

Uso:
  blender -b -P blender/hypeo_characters.py -- --out assets/models [--fonts DIR] [--only beats,fx]
  (o en el editor de texto de Blender: Run Script; exporta en //../assets/models)
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Quaternion, Matrix

# ---------------------------------------------------------------- argumentos
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
OUT = os.path.abspath(arg("--out", os.path.join(HERE, "..", "assets", "models")))
FONTS = arg("--fonts", os.path.join(HERE, "fonts"))
ONLY = arg("--only", "")
PREVIEW = "--preview" in argv          # render Cycles de control (lento)
os.makedirs(OUT, exist_ok=True)

FPS = 30
BAR_FRAMES = 60                        # 1 compás = 60 frames = 2 s a 30 fps (120 BPM)
BEAT = BAR_FRAMES / 4

# ---------------------------------------------------------------- paleta / atlas
PALETTE = {
    # BEATS
    "beats_skin": "#5b3cf2", "beats_dark": "#4428c9", "beats_phone": "#7a3df0",
    "beats_cup": "#6a2fe0", "beats_pad": "#2f1a7a",
    # BASS
    "bass_skin": "#f45cbc", "bass_dark": "#d13c9c", "bass_cap": "#f23ea8",
    "bass_hair": "#e0479f", "bass_lid": "#e04ea8",
    # MELODY
    "mel_skin": "#f7b437", "mel_dark": "#e09a22", "mel_hair": "#f5a81f", "mel_lid": "#e8a02c",
    # VOCALS
    "voc_skin": "#41bdf2", "voc_dark": "#2a9fd8", "voc_hair": "#2489cf", "voc_cloth": "#2a63d8",
    # FX
    "fx_skin": "#52c83c", "fx_dark": "#3ba92c", "fx_hat": "#2f9a38", "fx_lid": "#44b032",
    # comunes
    "black": "#121018", "black_soft": "#24202e", "white": "#f7f5ff", "mouth": "#3a1530",
    "lens": "#0c0d1a", "rim": "#1a1726",
    # props
    "drum": "#7d3cf5", "drum_rim": "#c9a4ff", "drum_head": "#efe6ff", "drum_rod": "#e4d6ff",
    "note": "#ff3fc4", "keys_body": "#f2e3c4", "keys_white": "#fbf4e6", "keys_black": "#17131f",
    "mic": "#8b46f7", "mic_grill": "#c7a8ff", "mic_dark": "#4a2b99", "star": "#ffc23a",
    # logo
    "logo": "#a54bff", "logo2": "#c86bff", "spark": "#e4c2ff",
}
CELL = 32
NAMES = list(PALETTE.keys())

def hex_lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

def uv_of(name):
    i = NAMES.index(name)
    gx, gy = i % 8, i // 8
    return ((gx + 0.5) * CELL / 256, 1 - (gy + 0.5) * CELL / 256)

def build_palette_image():
    img = bpy.data.images.get("HYPEO_Palette")
    if img:
        return img
    img = bpy.data.images.new("HYPEO_Palette", 256, 256, alpha=False)
    px = [0.0] * (256 * 256 * 4)
    for i, name in enumerate(NAMES):
        h = PALETTE[name].lstrip("#")
        srgb = [int(h[k:k + 2], 16) / 255 for k in (0, 2, 4)]
        gx, gy = i % 8, i // 8
        for y in range(CELL):
            row = 255 - (gy * CELL + y)          # imagen con origen abajo
            for x in range(CELL):
                o = (row * 256 + gx * CELL + x) * 4
                px[o:o + 4] = [srgb[0], srgb[1], srgb[2], 1.0]
    img.pixels = px
    img.filepath_raw = os.path.join(OUT, "palette.png")
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img

def atlas_material(kind):
    """kind: matte | gloss | emit"""
    name = "HYPEO_" + kind
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = build_palette_image()
    tex.interpolation = "Closest"           # glTF sampler NEAREST: colores planos sin sangrado
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = {"matte": 0.55, "gloss": 0.12, "emit": 0.35}[kind]
    bsdf.inputs["Metallic"].default_value = 0.0
    if kind == "emit":
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 1.4
    return m

# ---------------------------------------------------------------- utilidades de malla
def finish(obj, color, mat="matte", bone=None, smooth=True, sharp_angle=50):
    obj.data.materials.clear()
    obj.data.materials.append(atlas_material(mat))
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    uv = uv_of(color)
    for loop in me.uv_layers.active.data:
        loop.uv = uv
    for p in me.polygons:
        p.use_smooth = smooth
    if smooth and sharp_angle:
        try:
            me.set_sharpness_by_angle(angle=math.radians(sharp_angle))
        except Exception:
            pass
    if bone:
        vg = obj.vertex_groups.new(name=bone)
        vg.add(list(range(len(me.vertices))), 1.0, "REPLACE")
    obj["hy_color"] = color
    return obj

def _active():
    return bpy.context.view_layer.objects.active

def sphere(loc, r, scale=(1, 1, 1), rot=(0, 0, 0), seg=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc, rotation=rot)
    o = _active(); o.scale = scale; return o

def cylinder(loc, r, depth, scale=(1, 1, 1), rot=(0, 0, 0), verts=32, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = _active(); o.scale = scale
    if bevel:
        apply_bevel(o, bevel)
    return o

def cone(loc, r1, r2, depth, scale=(1, 1, 1), rot=(0, 0, 0), verts=32, bevel=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = _active(); o.scale = scale
    if bevel:
        apply_bevel(o, bevel)
    return o

def torus(loc, R, r, rot=(0, 0, 0), scale=(1, 1, 1), major_seg=48, minor_seg=12):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=major_seg,
                                     minor_segments=minor_seg, location=loc, rotation=rot)
    o = _active(); o.scale = scale; return o

def box(loc, size, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = _active(); o.scale = size
    if bevel:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        apply_bevel(o, bevel)
    return o

def apply_bevel(o, width, segments=3):
    bpy.context.view_layer.objects.active = o
    m = o.modifiers.new("bevel", "BEVEL")
    m.width = width; m.segments = segments; m.limit_method = "ANGLE"
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.modifier_apply(modifier=m.name)

def cut(o, keep="z+", offset=0.0, fill=True):
    """Corta la malla por un plano local y conserva un lado (útil para domos, visera, sonrisa)."""
    axis = {"x": 0, "y": 1, "z": 2}[keep[0]]
    sign = 1 if keep[1] == "+" else -1
    me = o.data
    bm = bmesh.new(); bm.from_mesh(me)
    no = Vector((0, 0, 0)); no[axis] = sign
    co = Vector((0, 0, 0)); co[axis] = offset
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_inner=True)
    if fill:
        edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        if edges:
            bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    bm.to_mesh(me); bm.free()
    return o

def orient_to(o, direction, up=(0, 0, 1), extra=None):
    """Hace que el -Y local del objeto mire en `direction` (frente de una pieza de la cara)."""
    q = Vector(direction).to_track_quat("-Y", "Z")
    if extra:
        q = q @ extra
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = q
    return o

def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = _active(); o.name = name; o.data.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o

def weight_blend(obj, axis_fn, bones, width):
    """Reasigna pesos por posición: bones = [(nombre, centro)], mezcla lineal de ancho `width`."""
    for b, _ in bones:
        if obj.vertex_groups.get(b) is None:
            obj.vertex_groups.new(name=b)
    groups = {b: obj.vertex_groups[b] for b, _ in bones}
    for v in obj.data.vertices:
        t = axis_fn(obj.matrix_world @ v.co)
        ws = [(b, max(0.0, 1 - abs(t - c) / width)) for b, c in bones]
        tot = sum(w for _, w in ws)
        if tot == 0:
            nearest = min(bones, key=lambda bc: abs(t - bc[1]))[0]
            ws = [(b, 1.0 if b == nearest else 0.0) for b, _ in bones]; tot = 1
        for b, w in ws:
            if w > 0:
                groups[b].add([v.index], w / tot, "REPLACE")
    return obj

# ---------------------------------------------------------------- proporciones comunes
HC = Vector((0, 0, 1.12))      # centro de la cabeza
HR = 0.44                      # radio de la cabeza
MX = "mixamorig:"

def surf(h, v, off=0.0):
    """Punto sobre la cabeza: h = grados horizontales (+ = izquierda del personaje), v = vertical."""
    h, v = math.radians(h), math.radians(v)
    d = Vector((math.sin(h) * math.cos(v), -math.cos(h) * math.cos(v), math.sin(v)))
    return HC + d * (HR + off), d

BONES = [
    # nombre, cabeza, cola, padre
    ("Hips", (0, 0, 0.36), (0, 0, 0.46), None),
    ("Spine", (0, 0, 0.46), (0, 0, 0.56), "Hips"),
    ("Spine1", (0, 0, 0.56), (0, 0, 0.64), "Spine"),
    ("Spine2", (0, 0, 0.64), (0, 0, 0.74), "Spine1"),
    ("Neck", (0, 0, 0.74), (0, 0, 0.82), "Spine2"),
    ("Head", (0, 0, 0.82), (0, 0, 1.45), "Neck"),
    ("HeadTop_End", (0, 0, 1.45), (0, 0, 1.6), "Head"),
]
for side, s in (("Left", 1), ("Right", -1)):
    BONES += [
        (f"{side}Shoulder", (0.04 * s, 0, 0.66), (0.17 * s, 0, 0.66), "Spine2"),
        (f"{side}Arm", (0.17 * s, 0, 0.66), (0.36 * s, 0, 0.66), f"{side}Shoulder"),
        (f"{side}ForeArm", (0.36 * s, 0, 0.66), (0.52 * s, 0, 0.66), f"{side}Arm"),
        (f"{side}Hand", (0.52 * s, 0, 0.66), (0.62 * s, 0, 0.66), f"{side}ForeArm"),
        (f"{side}UpLeg", (0.1 * s, 0, 0.34), (0.1 * s, 0, 0.17), "Hips"),
        (f"{side}Leg", (0.1 * s, 0, 0.17), (0.1 * s, 0, 0.06), f"{side}UpLeg"),
        (f"{side}Foot", (0.1 * s, 0, 0.06), (0.1 * s, -0.1, 0.02), f"{side}Leg"),
        (f"{side}ToeBase", (0.1 * s, -0.1, 0.02), (0.1 * s, -0.16, 0.02), f"{side}Foot"),
    ]

def build_body(c):
    """Cuerpo base de figura coleccionable (T-pose). c = prefijo de color."""
    parts = []
    skin, dark = f"{c}_skin", f"{c}_dark"
    torso_col = "voc_cloth" if c == "voc" else skin
    t = finish(sphere((0, 0, 0.52), 1, (0.24, 0.19, 0.27)), torso_col)
    weight_blend(t, lambda p: p.z, [(MX + "Hips", 0.36), (MX + "Spine", 0.48), (MX + "Spine1", 0.6), (MX + "Spine2", 0.72)], 0.13)
    parts.append(t)
    if c == "voc":   # cuello en V
        v = finish(cone((0, -0.175, 0.62), 0.075, 0.0, 0.14, (1, 0.25, 1), rot=(math.pi, 0, 0), verts=3), skin, bone=MX + "Spine2")
        v.rotation_euler = (math.radians(180 + 14), 0, math.radians(90))
        parts.append(v)
    for s in (1, -1):
        side = "Left" if s > 0 else "Right"
        a = finish(sphere((0.355 * s, 0, 0.66), 1, (0.185, 0.072, 0.075), seg=24, rings=24), skin)
        a.rotation_euler = (0, 0, 0)
        weight_blend(a, lambda p: abs(p.x), [(MX + side + "Arm", 0.26), (MX + side + "ForeArm", 0.46)], 0.12)
        parts.append(a)
        parts.append(finish(sphere((0.565 * s, -0.005, 0.66), 0.068, (1, 0.9, 1.05)), skin, bone=MX + side + "Hand"))
        # pulgar: da lectura de "mano" en la silueta
        parts.append(finish(sphere((0.545 * s, -0.05, 0.69), 0.03, (1, 1, 1)), skin, bone=MX + side + "Hand"))
        l = finish(sphere((0.1 * s, 0, 0.2), 1, (0.095, 0.095, 0.17)), dark)
        weight_blend(l, lambda p: p.z, [(MX + side + "UpLeg", 0.27), (MX + side + "Leg", 0.1)], 0.12)
        parts.append(l)
        parts.append(finish(sphere((0.1 * s, -0.04, 0.045), 1, (0.095, 0.13, 0.055)), dark, bone=MX + side + "Foot"))
    # cabeza + orejas
    parts.append(finish(sphere(HC, HR, (1.0, 0.97, 0.96), seg=48, rings=24), skin, bone=MX + "Head"))
    for s in (1, -1):
        p, d = surf(88 * s, -4, -0.02)
        parts.append(finish(orient_to(sphere(p, 0.075, (1, 0.45, 1.0)), (d.x, d.y, 0)), skin, bone=MX + "Head"))
    return parts

H = MX + "Head"

def eye_white(h, v, r=0.075, sy=0.45, sz=1.1):
    p, d = surf(h, v, -0.012)
    return finish(orient_to(sphere(p, r, (1, sy, sz)), d), "white", "gloss", H)

def pupil(h, v, r=0.045, look=(0, 0)):
    p, d = surf(h + look[0], v + look[1], 0.012)
    return finish(orient_to(sphere(p, r, (1, 0.45, 1.15)), d), "black", "gloss", H)

def lid(h, v, color, close=0.0, r=0.084, tilt=0.0):
    """Párpado: domo del color de piel que tapa la parte superior del ojo (close 0..1)."""
    p, d = surf(h, v, -0.006)
    o = sphere((0, 0, 0), r, (1.08, 0.62, 1.18), seg=32, rings=16)
    cut(o, "z+", offset=-r * close * 0.9)
    q = d.to_track_quat("-Y", "Z") @ Quaternion((0, 1, 0), math.radians(tilt))
    o.location = p; o.rotation_mode = "QUATERNION"; o.rotation_quaternion = q
    return finish(o, color, "matte", H)

def mouth_line(h, v, w=0.055, color="mouth", rot=0.0):
    p, d = surf(h, v, -0.004)
    o = sphere(p, 1, (w, 0.02, 0.014))
    return finish(orient_to(o, d, extra=Quaternion((0, 1, 0), math.radians(rot))), color, "matte", H)

def smile(h, v, R=0.05, color="mouth"):
    p, d = surf(h, v, -0.004)
    o = torus((0, 0, 0), R, 0.011, rot=(math.radians(90), 0, 0), major_seg=32, minor_seg=8)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    cut(o, "z-", offset=-R * 0.25, fill=False)
    o.location = p
    return finish(orient_to(o, d), color, "matte", H)

def sleepy_eyes(c, lidcol, close=0.45, look=(0, -3)):
    parts = []
    for s in (1, -1):
        parts += [eye_white(23 * s, -2), pupil(21 * s, -5, look=(look[0] * s, look[1])),
                  lid(23 * s, -2, lidcol, close=close, tilt=-6 * s)]
    return parts

# ---------------------------------------------------------------- accesorios por personaje
def acc_beats():
    P = []
    # diadema: medio toro sobre la cabeza
    band = torus((0, 0, 0), HR + 0.07, 0.045, rot=(math.radians(90), 0, 0), major_seg=64)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    cut(band, "z+", offset=-0.02, fill=False)
    band.location = HC + Vector((0, 0.02, 0.0)); band.scale = (1.06, 1, 1.0)
    P.append(finish(band, "beats_phone", "gloss", H))
    for s in (1, -1):
        x = (HR + 0.035) * s
        P.append(finish(cylinder(HC + Vector((x, 0.02, -0.03)), 0.14, 0.1, rot=(0, math.radians(90), 0), bevel=0.02), "beats_cup", "gloss", H))
        P.append(finish(torus(HC + Vector((x + 0.055 * s, 0.02, -0.03)), 0.1, 0.03, rot=(0, math.radians(90), 0)), "beats_phone", "gloss", H))
        P.append(finish(cylinder(HC + Vector((x - 0.055 * s, 0.02, -0.03)), 0.125, 0.04, rot=(0, math.radians(90), 0), bevel=0.015), "beats_pad", "matte", H))
    # anteojos de sol: dos lentes rectangulares redondeados + puente + patillas
    for s in (1, -1):
        p, d = surf(21 * s, 2, 0.02)
        lens = cylinder((0, 0, 0), 0.1, 0.035, rot=(math.radians(90), 0, 0))
        bpy.ops.object.transform_apply(rotation=True)
        lens.scale = (1.28, 1, 0.74); apply_bevel(lens, 0.012)
        lens.location = p; orient_to(lens, d)
        P.append(finish(lens, "lens", "gloss", H, sharp_angle=0))
        q, dq = surf(60 * s, 4, 0.0)
        P.append(finish(box(q + Vector((0, 0.05, 0)), (0.02, 0.22, 0.025)), "black", "gloss", H))
    p, d = surf(0, 4, 0.03)
    P.append(finish(orient_to(box(p, (0.09, 0.03, 0.03)), d), "black", "gloss", H))
    P.append(smile(0, -22, 0.045))
    return P

def acc_bass():
    P = sleepy_eyes("bass", "bass_lid", close=0.5)
    P.append(mouth_line(4, -24, 0.05, rot=6))
    # pelo: mechones a los costados y atrás, debajo de la gorra
    for h, v, sc in [(62, -2, (0.13, 0.1, 0.2)), (-62, -2, (0.13, 0.1, 0.2)), (78, -18, (0.1, 0.1, 0.16)),
                     (-78, -18, (0.1, 0.1, 0.16)), (150, -5, (0.2, 0.12, 0.22)), (-150, -5, (0.2, 0.12, 0.22)),
                     (180, -20, (0.2, 0.12, 0.2)), (115, -12, (0.15, 0.12, 0.2)), (-115, -12, (0.15, 0.12, 0.2))]:
        p, d = surf(h, v, -0.01)
        P.append(finish(orient_to(sphere(p, 1, sc), d), "bass_hair", "matte", H))
    # flequillo
    for h in (-22, -8, 10):
        p, d = surf(h, 22, 0.0)
        P.append(finish(orient_to(sphere(p, 1, (0.08, 0.05, 0.08)), d), "bass_hair", "matte", H))
    cap = sphere((0, 0, 0), HR + 0.035, (1.03, 1.03, 0.92), seg=48, rings=24)
    cut(cap, "z+", offset=0.02)
    cap.location = HC + Vector((0, 0.01, 0.1)); cap.rotation_euler = (math.radians(-8), 0, math.radians(18))
    P.append(finish(cap, "bass_cap", "matte", H))
    visor = cylinder((0, 0, 0), 0.32, 0.03, verts=48, bevel=0.012)
    cut(visor, "y-", offset=-0.02)
    visor.scale = (0.95, 1.0, 1)
    visor.location = HC + Vector((0, 0, 0.13))
    visor.rotation_euler = (math.radians(12), 0, math.radians(18))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # desplazar la visera hacia adelante en su eje local
    visor.location += Matrix.Rotation(math.radians(18), 3, "Z") @ Vector((0, -0.37, 0))
    P.append(finish(visor, "bass_cap", "matte", H))
    P.append(finish(sphere(HC + Vector((0, 0.02, HR + 0.1)), 0.035), "bass_cap", "matte", H))
    return P

def acc_melody():
    P = []
    for s in (1, -1):
        P += [eye_white(23 * s, -4), pupil(21 * s, -6, look=(0, -1)), lid(23 * s, -4, "mel_lid", close=0.25, tilt=-4 * s)]
        # cejas marcadas
        p, d = surf(24 * s, 11, 0.012)
        b = box(p, (0.12, 0.03, 0.028), bevel=0.008)
        orient_to(b, d, extra=Quaternion((0, 1, 0), math.radians(-14 * s)))
        P.append(finish(b, "black", "matte", H))
    P.append(mouth_line(0, -24, 0.05))
    # casquete de pelo
    capo = sphere((0, 0, 0), HR + 0.025, (1.02, 1.02, 1.0), seg=48, rings=24)
    cut(capo, "z+", offset=0.14)
    capo.location = HC + Vector((0, 0.01, 0.0))
    P.append(finish(capo, "mel_hair", "matte", H))
    # puntas: conos orientados hacia afuera
    spikes = [(0, 78, 0.42), (40, 62, 0.36), (-40, 62, 0.36), (90, 50, 0.33), (-90, 50, 0.33),
              (140, 55, 0.33), (-140, 55, 0.33), (180, 60, 0.35), (0, 52, 0.3), (65, 70, 0.33),
              (-65, 70, 0.33), (120, 30, 0.26), (-120, 30, 0.26), (160, 30, 0.28), (-160, 30, 0.28),
              (100, 18, 0.22), (-100, 18, 0.22)]
    for h, v, L in spikes:
        p, d = surf(h, v, -0.03)
        c = cone((0, 0, 0), 0.12, 0.0, L, verts=16)
        bpy.ops.object.transform_apply(scale=True)
        c.location = p + d * (L * 0.42)
        c.rotation_mode = "QUATERNION"; c.rotation_quaternion = d.to_track_quat("Z", "Y")
        P.append(finish(c, "mel_hair", "matte", H, sharp_angle=0))
    # vincha negra
    hb = torus((0, 0, 0), 0.425, 0.045, major_seg=64)
    hb.location = HC + Vector((0, 0.005, 0.15))
    P.append(finish(hb, "black", "matte", H))
    return P

def acc_vocals():
    P = []
    for s in (1, -1):
        P += [eye_white(22 * s, 0, r=0.06), pupil(22 * s, -1, r=0.04)]
        p, d = surf(22 * s, 0, 0.035)
        rim = torus((0, 0, 0), 0.088, 0.017, rot=(math.radians(90), 0, 0), major_seg=40)
        bpy.ops.object.transform_apply(rotation=True)
        rim.location = p; orient_to(rim, d)
        P.append(finish(rim, "rim", "gloss", H))
        lens = cylinder((0, 0, 0), 0.08, 0.012, rot=(math.radians(90), 0, 0), verts=32)
        bpy.ops.object.transform_apply(rotation=True)
        lens.location = p - d * 0.004; orient_to(lens, d)
        P.append(finish(lens, "lens", "gloss", H, sharp_angle=0))
        q, _ = surf(62 * s, 3, 0.01)
        P.append(finish(box(q + Vector((0, 0.06, 0)), (0.018, 0.24, 0.022)), "rim", "gloss", H))
    p, d = surf(0, 3, 0.05)
    P.append(finish(orient_to(box(p, (0.06, 0.02, 0.018)), d), "rim", "gloss", H))
    P.append(mouth_line(0, -24, 0.045))
    # pelo de costado: casquete inclinado + mechón barrido
    capo = sphere((0, 0, 0), HR + 0.03, (1.03, 1.03, 1.0), seg=48, rings=24)
    cut(capo, "z+", offset=0.12)
    capo.location = HC + Vector((0, 0.03, 0.0)); capo.rotation_euler = (math.radians(-8), math.radians(-14), 0)
    P.append(finish(capo, "voc_hair", "matte", H))
    for h, v, sc, roll in [(30, 42, (0.2, 0.09, 0.12), -30), (55, 30, (0.16, 0.09, 0.12), -45),
                           (-10, 50, (0.2, 0.09, 0.1), -20), (75, 20, (0.1, 0.08, 0.13), -60)]:
        p, d = surf(h, v, 0.0)
        P.append(finish(orient_to(sphere(p, 1, sc), d, extra=Quaternion((0, 1, 0), math.radians(roll))), "voc_hair", "matte", H))
    return P

def acc_fx():
    P = sleepy_eyes("fx", "fx_lid", close=0.55, look=(0, -2))
    P.append(mouth_line(0, -26, 0.05))
    crown = cone(HC + Vector((0, 0.01, 0.26)), 0.42, 0.34, 0.3, verts=48, bevel=0.05)
    P.append(finish(crown, "fx_hat", "matte", H))
    brim = cone(HC + Vector((0, 0.01, 0.1)), 0.6, 0.42, 0.11, verts=64, bevel=0.025)
    P.append(finish(brim, "fx_hat", "matte", H))
    band = torus(HC + Vector((0, 0.01, 0.16)), 0.405, 0.022, major_seg=64)
    P.append(finish(band, "fx_dark", "matte", H))
    return P

CHARACTERS = {
    "beats": ("beats", acc_beats),
    "bass": ("bass", acc_bass),
    "melody": ("mel", acc_melody),
    "vocals": ("voc", acc_vocals),
    "fx": ("fx", acc_fx),
}

# ---------------------------------------------------------------- esqueleto y animación
def build_armature():
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm = _active(); arm.name = "Armature"; arm.data.name = "HYPEO_Rig"
    eb = arm.data.edit_bones
    for b in list(eb):
        eb.remove(b)
    for name, head, tail, parent in BONES:
        b = eb.new(MX + name); b.head = head; b.tail = tail; b.roll = 0
        if parent:
            b.parent = eb[MX + parent]; b.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm

AX = {"X": Vector((1, 0, 0)), "Y": Vector((0, 1, 0)), "Z": Vector((0, 0, 1))}

def pose_quat(arm, bone, rots):
    """rots = [(eje, grados)] en ejes del armature, aplicados en orden."""
    rest = arm.data.bones[MX + bone].matrix_local.to_3x3()
    inv = rest.inverted()
    q = Quaternion()
    for axis, deg in rots:
        q = Quaternion(inv @ AX[axis], math.radians(deg)) @ q
    return q

def relaxed():
    """Pose base quieta: brazos abajo y apenas hacia adelante."""
    return {
        "LeftArm": [("Y", 74), ("Z", -8)], "RightArm": [("Y", -74), ("Z", 8)],
        "LeftForeArm": [("Z", -12)], "RightForeArm": [("Z", 12)],
        "LeftHand": [("Y", 6)], "RightHand": [("Y", -6)],
    }

def merge(*dicts):
    out = {}
    for d in dicts:
        for k, v in d.items():
            if k.startswith("_"):
                out[k] = out.get(k, 0.0) + v
            else:
                out[k] = out.get(k, []) + v
    return out

S = lambda x: math.sin(2 * math.pi * x)
C = lambda x: math.cos(2 * math.pi * x)
def hit(p, sharp=3.0):
    """Pulso que vale 1 en cada tiempo y cae rápido (acento en el beat)."""
    f = p % 1.0
    return math.exp(-sharp * f) * (1 - f) ** 0.5 + math.exp(-sharp * (1 - f)) * 0.15

def dance_beats(p):
    """DJ: cabeceo marcado en cada tiempo y 'scratch' con la mano derecha en corcheas."""
    k = hit(p)
    lr = S(p / 2)
    scr = S(p * 2)
    return {
        "_bounce": -0.03 * k,
        "Spine1": [("X", 4 * k)], "Spine2": [("Y", 3 * lr)],
        "Head": [("X", 16 * k - 4), ("Y", 4 * lr)],
        "LeftArm": [("Y", 58), ("Z", -38)], "RightArm": [("Y", -58), ("Z", 38 + 16 * scr)],
        "LeftForeArm": [("Z", -62 - 10 * k)], "RightForeArm": [("Z", 62)],
        "LeftHand": [("Y", 25)], "RightHand": [("Y", -25), ("X", 10 * scr)],
    }

def dance_bass(p):
    sway = S(p / 2)
    k = hit(p, 2.5)
    return merge(relaxed(), {
        "_bounce": -0.02 * k,
        "Hips": [("Y", 5 * sway)], "Spine": [("Y", -3 * sway)], "Spine2": [("Y", -3 * sway), ("X", 3 * k)],
        "Head": [("Y", -7 * sway), ("X", 8 * k)],
        "LeftArm": [("X", -14 * sway), ("Y", -6 * k)], "RightArm": [("X", 14 * sway), ("Y", 6 * k)],
        "LeftForeArm": [("Z", -25 - 15 * k)], "RightForeArm": [("Z", 25 + 15 * k)],
    })

def dance_melody(p):
    e8 = S(p * 2)            # corcheas: manos alternadas
    tilt = S(p / 2)
    k = hit(p)
    return {
        "_bounce": -0.018 * k,
        "Spine2": [("X", 5)], "Head": [("Y", 9 * tilt), ("X", 6 + 5 * k)],
        "LeftArm": [("Y", 52), ("Z", -46)], "RightArm": [("Y", -52), ("Z", 46)],
        "LeftForeArm": [("Z", -34 - 14 * max(0, e8))], "RightForeArm": [("Z", 34 + 14 * max(0, -e8))],
        "LeftHand": [("Y", 16 + 18 * max(0, e8))], "RightHand": [("Y", -16 - 18 * max(0, -e8))],
    }

def dance_vocals(p):
    k = hit(p, 2.0)
    open_arm = max(0.0, S((p - 2) / 4)) if p >= 2 else 0.0   # abre el brazo en los tiempos 3-4
    return {
        "_bounce": -0.02 * k,
        "Spine2": [("X", -4 * open_arm)], "Head": [("X", 6 * k - 8 * open_arm), ("Y", 5 * S(p / 4))],
        # mano derecha al micrófono imaginario frente a la boca
        "RightArm": [("Y", 42), ("Z", 62)], "RightForeArm": [("Z", 118 + 6 * k)], "RightHand": [("X", -20)],
        "LeftArm": [("Y", 70 - 85 * open_arm), ("Z", -10 - 20 * open_arm)],
        "LeftForeArm": [("Z", -15 - 25 * open_arm)], "LeftHand": [("Y", -10 * open_arm)],
    }

def dance_fx(p):
    k = hit(p)
    alt = 1 if int(p) % 2 == 0 else -1
    tw = S(p / 2)
    return {
        "_bounce": -0.035 * k,
        "Hips": [("Z", 10 * tw)], "Spine2": [("Z", -6 * tw)], "Head": [("Z", -6 * tw), ("X", 8 * k), ("Y", 6 * alt * k)],
        # "raise the roof": brazos arriba bombeando en cada tiempo
        "LeftArm": [("Y", -40 + 18 * k), ("Z", -10)], "RightArm": [("Y", 40 - 18 * k), ("Z", 10)],
        "LeftForeArm": [("Y", -70 + 25 * k)], "RightForeArm": [("Y", 70 - 25 * k)],
        "LeftHand": [("Y", -20)], "RightHand": [("Y", 20)],
    }

DANCES = {"beats": dance_beats, "bass": dance_bass, "melody": dance_melody, "vocals": dance_vocals, "fx": dance_fx}
ALL_POSE_BONES = [b[0] for b in BONES]

def key_pose(arm, frame, pose):
    for name in ALL_POSE_BONES:
        pb = arm.pose.bones[MX + name]
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = pose_quat(arm, name, pose.get(name, []))
        pb.keyframe_insert("rotation_quaternion", frame=frame, group=pb.name)
    hips = arm.pose.bones[MX + "Hips"]
    hips.location = (0, pose.get("_bounce", 0.0), 0)     # Y local del hueso = arriba
    hips.keyframe_insert("location", frame=frame, group=hips.name)

def make_action(arm, name, frames_poses):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data.action = act
    for f, pose in frames_poses:
        key_pose(arm, f, pose)
    return act

def build_animations(arm, key):
    arm.animation_data_create()
    base = relaxed()
    make_action(arm, "Idle", [(0, base), (BAR_FRAMES, base)])
    fn = DANCES[key]
    frames = [(f, fn(f / BEAT)) for f in range(0, BAR_FRAMES + 1, 2)]
    frames[-1] = (BAR_FRAMES, fn(0.0))     # loop perfecto: último frame = primero
    dance = make_action(arm, "Dance", frames)
    arm.animation_data.action = bpy.data.actions["Idle"]
    return dance

# ---------------------------------------------------------------- export
def export_glb(path, selection=None, animations=True):
    if selection is not None:
        bpy.ops.object.select_all(action="DESELECT")
        for o in selection:
            o.select_set(True)
    kw = dict(
        filepath=path, export_format="GLB",
        use_selection=selection is not None,
        export_apply=True,                 # aplica modificadores
        export_texcoords=True, export_normals=True,
        export_materials="EXPORT", export_image_format="AUTO",
        export_yup=True,
        export_animations=animations,
        export_skins=True, export_def_bones=False,
    )
    if animations:
        kw.update(export_animation_mode="ACTIONS", export_force_sampling=True,
                  export_frame_range=False, export_anim_single_armature=True)
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        # versiones viejas de Blender no tienen algunas opciones
        for k in ("export_animation_mode", "export_anim_single_armature", "export_def_bones"):
            kw.pop(k, None)
        bpy.ops.export_scene.gltf(**kw)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 0, BAR_FRAMES

def build_character(key):
    reset_scene()
    prefix, acc = CHARACTERS[key]
    parts = build_body(prefix) + acc()
    mesh = join(parts, f"{key}_body")
    # malla en T-pose para Mixamo (sin esqueleto)
    bpy.ops.object.select_all(action="DESELECT"); mesh.select_set(True)
    bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, f"{key}_tpose.fbx"), use_selection=True,
                             path_mode="COPY", embed_textures=True, add_leaf_bones=False)
    arm = build_armature()
    mesh.parent = arm
    mod = mesh.modifiers.new("Armature", "ARMATURE"); mod.object = arm
    build_animations(arm, key)
    arm.name = f"HYPEO_{key}"
    export_glb(os.path.join(OUT, f"{key}.glb"))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "..", "..", "blender", f"{key}.blend"), compress=True)
    if PREVIEW:
        preview(key, arm)
    print(f"[HYPEO] {key}: {len(mesh.data.vertices)} vértices")

def preview(key, arm):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.cycles.device = "CPU"
    sc.render.resolution_x = sc.render.resolution_y = 420
    world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.03, 0.08, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    bpy.ops.object.light_add(type="AREA", location=(1.5, -3, 3)); _active().data.energy = 400
    bpy.ops.object.camera_add(location=(0.0, -3.4, 0.85), rotation=(math.radians(90), 0, 0))
    sc.camera = _active(); _active().data.lens = 62
    for act, fr, tag in (("Idle", 0, "idle"), ("Dance", 0, "d0"), ("Dance", 38, "d1")):
        arm.animation_data.action = bpy.data.actions[act]
        sc.frame_set(fr)
        sc.render.filepath = os.path.join(OUT, "..", "..", "blender", "preview", f"{key}_{tag}.png")
        bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- instrumentos
def star_mesh(name, R=0.16, r=0.075, depth=0.06):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        rad = R if i % 2 == 0 else r
        pts.append(bm.verts.new((rad * math.cos(a), 0, rad * math.sin(a))))
    f = bm.faces.new(pts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]:
        v.co.y += depth
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=(0, -depth / 2, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    m = o.modifiers.new("bevel", "BEVEL"); m.width = 0.02; m.segments = 4; m.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def build_props():
    reset_scene()
    roots = []
    def group(name, parts):
        o = join(parts, name); roots.append(o); return o
    # BEATS: tambor con parches y tensores
    P = [finish(cylinder((0, 0, 0.1), 0.17, 0.15, verts=48), "drum"),
         finish(torus((0, 0, 0.175), 0.172, 0.016, major_seg=48), "drum_rim", "gloss"),
         finish(torus((0, 0, 0.025), 0.172, 0.016, major_seg=48), "drum_rim", "gloss"),
         finish(cylinder((0, 0, 0.18), 0.162, 0.008, verts=48), "drum_head", "matte", sharp_angle=0)]
    for i in range(8):
        a = i * math.pi / 4
        P.append(finish(cylinder((0.178 * math.cos(a), 0.178 * math.sin(a), 0.1), 0.007, 0.15, verts=8), "drum_rod", "gloss"))
        P.append(finish(sphere((0.18 * math.cos(a), 0.18 * math.sin(a), 0.1), 0.014), "drum_rim", "gloss"))
    group("prop_beats", P)
    # BASS: dos corcheas unidas (nota musical 3D)
    P = []
    for x, z in ((-0.08, 0.05), (0.08, 0.09)):
        P.append(finish(sphere((x, 0, z), 0.06, (1.25, 0.8, 0.9), rot=(0, math.radians(-25), 0)), "note", "gloss"))
        P.append(finish(cylinder((x + 0.06, 0, z + 0.13), 0.014, 0.26, verts=12), "note", "gloss"))
    P.append(finish(box((0.06, 0, 0.27), (0.18, 0.035, 0.045), rot=(0, math.radians(-14), 0), bevel=0.012), "note", "gloss"))
    group("prop_bass", P)
    # MELODY: mini teclado crema con teclas negras separadas
    P = [finish(box((0, 0, 0.035), (0.36, 0.2, 0.07), bevel=0.02), "keys_body")]
    for i in range(7):
        P.append(finish(box((-0.15 + i * 0.05, -0.025, 0.077), (0.044, 0.14, 0.022), bevel=0.006), "keys_white", "gloss"))
    for i in (0, 1, 3, 4, 5):
        P.append(finish(box((-0.125 + i * 0.05, 0.005, 0.097), (0.026, 0.085, 0.024), bevel=0.006), "keys_black", "gloss"))
    group("prop_melody", P)
    # VOCALS: micrófono violeta con rejilla y mango
    P = [finish(cone((0, 0, 0.1), 0.025, 0.034, 0.2, verts=24, bevel=0.006), "mic"),
         finish(cylinder((0, 0, 0.21), 0.042, 0.03, verts=32, bevel=0.008), "mic_dark", "gloss"),
         finish(sphere((0, 0, 0.27), 0.065, seg=32, rings=16), "mic_grill", "matte"),
         finish(cylinder((0, 0, 0.008), 0.06, 0.016, verts=32, bevel=0.006), "mic_dark", "gloss")]
    for z in (0.245, 0.27, 0.295):
        rr = math.sqrt(max(0.0, 0.066 ** 2 - (z - 0.27) ** 2)) + 0.002
        P.append(finish(torus((0, 0, z), rr, 0.004, major_seg=40, minor_seg=6), "mic", "gloss"))
    P.append(finish(torus((0, 0, 0.27), 0.066, 0.004, rot=(math.radians(90), 0, 0), major_seg=40, minor_seg=6), "mic", "gloss"))
    group("prop_vocals", P)
    # FX: estrella dorada de cinco puntas con grosor y bordes redondeados
    s = star_mesh("star"); s.location = (0, 0, 0.17)
    group("prop_fx", [finish(s, "star", "gloss", sharp_angle=0)])
    for o in roots:
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    export_glb(os.path.join(OUT, "props.glb"), animations=False)

# ---------------------------------------------------------------- logo
def text_obj(body, font_path, size, extrude, bevel, shear=0.0, loc=(0, 0, 0)):
    bpy.ops.object.text_add(location=loc, rotation=(math.radians(90), 0, 0))
    t = _active(); t.data.body = body
    if font_path and os.path.exists(font_path):
        t.data.font = bpy.data.fonts.load(font_path)
    t.data.size = size; t.data.extrude = extrude
    t.data.bevel_depth = bevel; t.data.bevel_resolution = 2
    t.data.shear = shear; t.data.align_x = "CENTER"; t.data.align_y = "CENTER"
    t.data.resolution_u = 6
    bpy.ops.object.convert(target="MESH")
    return _active()

def build_logo():
    reset_scene()
    hy = text_obj("HYPEO", os.path.join(FONTS, "pop800.ttf"), 1.0, 0.07, 0.012, shear=0.12, loc=(0, 0, 0.18))
    finish(hy, "logo", "emit", sharp_angle=30)
    bt = text_obj("BEATS", os.path.join(FONTS, "pm.ttf"), 0.92, 0.05, 0.008, shear=0.18, loc=(0.36, -0.09, -0.5))
    bt.rotation_euler = (math.radians(90), math.radians(-6), 0)
    finish(bt, "logo2", "emit", sharp_angle=30)
    # destello de cuatro puntas sobre la Y
    me = bpy.data.meshes.new("spark"); bm = bmesh.new(); pts = []
    for i in range(8):
        a = i * math.pi / 4; rad = 0.26 if i % 2 == 0 else 0.045
        pts.append(bm.verts.new((rad * math.cos(a) * (0.55 if i in (0, 4) else 1), 0, rad * math.sin(a))))
    f = bm.faces.new(pts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]:
        v.co.y += 0.03
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    sp = bpy.data.objects.new("spark", me); bpy.context.collection.objects.link(sp)
    sp.location = (-0.32, -0.03, 0.86); sp.rotation_euler = (0, math.radians(-12), 0)
    finish(sp, "spark", "emit", sharp_angle=0)
    for o, n in ((hy, "logo_hypeo"), (bt, "logo_beats"), (sp, "logo_spark")):
        o.name = n
    export_glb(os.path.join(OUT, "logo.glb"), animations=False)

# ---------------------------------------------------------------- main
if __name__ == "__main__":
    keys = [k for k in CHARACTERS if not ONLY or k in ONLY.split(",")]
    for k in keys:
        build_character(k)
    if not ONLY or "props" in ONLY:
        build_props()
    if not ONLY or "logo" in ONLY:
        build_logo()
    print("[HYPEO] listo ->", OUT)
