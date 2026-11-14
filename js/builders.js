/* HYPEO BEATS · construcción 3D del estudio, bienvenida y cierre (THREE dentro de A-Frame) */
(function () {
  const THREE = AFRAME.THREE;
  const C = HY.COLORS, L = HY.LAYOUT;
  const B = HY.B = {};

  // ------------------------------------------------------------ materiales
  B.mat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.0 }, o));
  B.neon = (color, k = 1) => {
    const c = new THREE.Color(color).multiplyScalar(k);
    return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  };
  B.halo = (color, opacity = 0.22) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  });

  // ------------------------------------------------------------ formas
  B.roundedShape = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  B.roundedBox = (w, h, d, r, bevel = 0.012) => {
    const g = new THREE.ExtrudeGeometry(B.roundedShape(w - bevel * 2, h - bevel * 2, r), {
      depth: Math.max(0.001, d - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10
    });
    g.translate(0, 0, -d / 2 + bevel);
    return g;
  };
  B.roundedRing = (w, h, r, t, d = 0.01) => {
    const s = B.roundedShape(w, h, r);
    s.holes.push(B.roundedShape(w - t * 2, h - t * 2, Math.max(0.001, r - t)));
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -d / 2);
    return g;
  };

  /** Tubo de neón: núcleo emisivo + halo aditivo (funciona bien en VR, sin post-proceso). */
  B.neonTorus = (radius, tube, color, arc = Math.PI * 2, k = 1.25, halo = 3.2, haloOp = 0.16) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 160, arc), B.neon(color, k)));
    const h = new THREE.Mesh(new THREE.TorusGeometry(radius, tube * halo, 10, 160, arc), B.halo(color, haloOp));
    h.renderOrder = 2; g.add(h);
    g.userData.core = g.children[0]; g.userData.halo = h;
    return g;
  };
  B.neonBar = (len, tube, color, k = 1.25, haloOp = 0.16) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(tube, tube, len, 10), B.neon(color, k)));
    const h = new THREE.Mesh(new THREE.CylinderGeometry(tube * 3.2, tube * 3.2, len, 10, 1, true), B.halo(color, haloOp));
    h.renderOrder = 2; g.add(h);
    return g;
  };
  /** Contorno de neón con forma de rectángulo redondeado. */
  B.neonFrame = (w, h, r, t, color, k = 1.3) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(B.roundedRing(w, h, r, t, 0.012), B.neon(color, k)));
    const halo = new THREE.Mesh(B.roundedRing(w + t * 3, h + t * 3, r + t * 1.5, t * 4, 0.004), B.halo(color, 0.18));
    halo.position.z = -0.004; halo.renderOrder = 2; g.add(halo);
    return g;
  };

  // ------------------------------------------------------------ texturas de texto
  B.canvasTex = (w, h, draw) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const api = { canvas: cv, ctx, tex, draw, redraw(...a) { ctx.clearRect(0, 0, w, h); api.draw(ctx, w, h, ...a); tex.needsUpdate = true; } };
    api.redraw();
    return api;
  };
  B.font = (weight, px, fam = 'Poppins') => `${weight} ${px}px ${fam}, "Arial Rounded MT Bold", Arial, sans-serif`;
  B.glowText = (ctx, text, x, y, font, color, glow, blur = 18) => {
    ctx.font = font; ctx.fillStyle = color;
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = blur; ctx.fillText(text, x, y); }
    ctx.shadowBlur = 0; ctx.fillText(text, x, y);
  };
  B.wrap = (ctx, text, maxW) => {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  /** Plano con texto (transparente). */
  B.textPlane = (w, h, px, draw, opts = {}) => {
    const t = B.canvasTex(px, Math.round(px * h / w), draw);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      map: t.tex, transparent: true, depthWrite: false, toneMapped: false, opacity: opts.opacity ?? 1
    }));
    m.renderOrder = opts.renderOrder ?? 3; m.userData.canvas = t;
    return m;
  };

  B.radialTex = (inner = 'rgba(0,0,0,0.75)', outer = 'rgba(0,0,0,0)') => B.canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, inner); g.addColorStop(1, outer); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }).tex;
  B.contactShadow = (r, opacity = 0.7) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({
      map: B.radialTex(`rgba(0,0,0,${opacity})`), transparent: true, depthWrite: false
    }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
    return m;
  };

  /** Mapa de entorno suave (violeta/rosa) para reflejos satinados. */
  B.makeEnvironment = (renderer) => {
    const sc = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: '#120a1c', side: THREE.BackSide }));
    sc.add(sky);
    const spots = [['#a64dff', 0, 4, -6, 3], ['#ff3fb4', -6, 1, 0, 2], ['#7b3fe0', 6, 1, 0, 2], ['#ffffff', 0, 8, 3, 1.5], ['#5b6cff', 0, -3, -5, 2]];
    for (const [c, x, y, z, s] of spots) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 8), new THREE.MeshBasicMaterial({ color: c }));
      m.position.set(x, y, z); sc.add(m);
    }
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromScene(sc, 0.04).texture;
    pm.dispose();
    return env;
  };

  // ------------------------------------------------------------ sala
  B.buildRoom = (root) => {
    const room = new THREE.Group(); root.add(room);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), B.mat('#0d0814', { roughness: 0.35, metalness: 0.2 }));
    floor.rotation.x = -Math.PI / 2; room.add(floor);
    // pared curva
    const R = 6.2, cz = 1.2, H = 7;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true, Math.PI * 0.5, Math.PI * 1.25),
      B.mat('#0f0817', { side: THREE.BackSide, roughness: 0.85 }));
    wall.position.set(0, H / 2, cz); wall.rotation.y = -Math.PI * 0.125; room.add(wall);
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(R, 64), B.mat('#0b0611', { side: THREE.DoubleSide }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, cz); room.add(ceil);
    const ang = a => ({ x: Math.sin(a) * (R - 0.05), z: cz - Math.cos(a) * (R - 0.05) });
    // molduras horizontales con profundidad
    for (const [y, h, d] of [[0.55, 0.18, 0.22], [2.15, 0.1, 0.14], [5.6, 0.16, 0.2]]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R - d / 2, R - d / 2, h, 96, 1, true, Math.PI * 0.5, Math.PI * 1.25),
        B.mat(C.trim, { side: THREE.DoubleSide, roughness: 0.5 }));
      m.position.set(0, y, cz); m.rotation.y = -Math.PI * 0.125; room.add(m);
    }
    // pilastras con tira de neón
    for (const deg of [-80, -58, -34, 34, 58, 80]) {
      const a = THREE.MathUtils.degToRad(deg), p = ang(a);
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.42, H, 0.3), B.mat('#1a0f26', { roughness: 0.55 }));
      pil.position.set(p.x, H / 2, p.z); pil.rotation.y = -a; room.add(pil);
      const bar = B.neonBar(H - 1.2, 0.018, Math.abs(deg) > 50 ? C.neonSoft : C.neon, 1.1, 0.12);
      bar.position.set(p.x * 0.985, H / 2 + 0.3, cz + (p.z - cz) * 0.985); room.add(bar);
    }
    // arcos de neón que siguen la forma del estudio (enmarcan el logo)
    const arcs = [[4.2, C.neon, 0.03, 1.3], [4.9, C.neonSoft, 0.022, 1.0], [5.6, C.magenta, 0.015, 0.7]];
    for (const [r, col, t, k] of arcs) {
      const a = B.neonTorus(r, t, col, Math.PI, k, 3.2, 0.13);
      a.position.set(0, 1.1, -4.6 + (r - 4.2) * 0.12); room.add(a);
    }
    // arco con moldura oscura detrás del logo

    // diagonales del techo (como las líneas de la referencia)
    for (const s of [-1, 1]) {
      const bar = B.neonBar(5.2, 0.02, C.neon, 1.1, 0.14);
      bar.position.set(s * 3.0, 6.0, -2.4); bar.rotation.set(0.5, 0, s * 1.05); room.add(bar);
      const bar2 = B.neonBar(4.2, 0.018, C.neonSoft, 1.0, 0.12);
      bar2.position.set(s * 4.7, 4.1, -1.6); bar2.rotation.set(0, 0, s * 0.16); room.add(bar2);
    }
    // anillo de techo
    const top = B.neonTorus(3.4, 0.025, C.neon, Math.PI * 2, 1.0, 3, 0.1);
    top.rotation.x = Math.PI / 2; top.position.set(0, 6.6, -0.6); room.add(top);
    return room;
  };

  // ------------------------------------------------------------ escenario y pedestales
  B.buildStage = (root) => {
    const g = new THREE.Group(); root.add(g);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.95, L.stageTop, 96), B.mat('#120a1a', { roughness: 0.4, metalness: 0.15 }));
    st.scale.set(1.32, 1, 1); st.position.set(0, L.stageTop / 2, -3.55); g.add(st);
    const edge = B.neonTorus(2.92, 0.018, C.neon, Math.PI * 2, 1.25, 3.2, 0.18);
    edge.rotation.x = Math.PI / 2; edge.scale.set(1.32, 1, 1); edge.position.set(0, L.stageTop + 0.005, -3.55); g.add(edge);
    const edge2 = B.neonTorus(2.94, 0.012, C.magenta, Math.PI * 2, 1.1, 3, 0.12);
    edge2.rotation.x = Math.PI / 2; edge2.scale.set(1.32, 1, 1); edge2.position.set(0, 0.25, -3.55); g.add(edge2);
    return g;
  };

  B.buildPedestal = (cat, pos, faceYaw) => {
    const g = new THREE.Group(); g.position.set(pos.x, L.stageTop, pos.z); g.rotation.y = faceYaw;
    const h = L.pedestalTop - L.stageTop;
    const satin = B.mat('#0e0a13', { roughness: 0.32, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.53, 0.08, 64), satin); base.position.y = 0.04; g.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.43, h - 0.04, 64), satin); body.position.y = (h + 0.04) / 2; g.add(body);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.022, 10, 64), B.mat('#2a2233', { roughness: 0.3, metalness: 0.4 }));
    lip.rotation.x = Math.PI / 2; lip.position.y = h; g.add(lip);
    // aro inferior iluminado (coral en reposo, color de la categoría al activarse)
    const ring = B.neonTorus(0.535, 0.014, C.coral, Math.PI * 2, 1.15, 3.6, 0.16);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.085; g.add(ring);
    const shadow = B.contactShadow(0.9, 0.85); shadow.position.y = 0.004; g.add(shadow);
    // placa frontal legible
    const plate = new THREE.Group(); plate.position.set(0, h - 0.13, 0.43); plate.rotation.x = -0.12; g.add(plate);
    const plateBody = new THREE.Mesh(B.roundedBox(0.56, 0.16, 0.05, 0.035, 0.01), B.mat('#16121c', { roughness: 0.35, metalness: 0.2 }));
    plate.add(plateBody);
    const label = B.textPlane(0.52, 0.13, 512, (ctx, w, hh, on) => {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      B.glowText(ctx, cat.label, w / 2, hh / 2 + 4, B.font(800, 84), on ? '#ffffff' : '#e9e2f5', on ? cat.color : null, 26);
    });
    label.position.z = 0.027; plate.add(label);
    const plateGlow = B.neonFrame(0.58, 0.18, 0.045, 0.008, cat.color, 1.3);
    plateGlow.position.z = 0.02; plateGlow.visible = false; plate.add(plateGlow);
    // zona de interacción ampliada: cuerpo del personaje + pedestal
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.0, 16), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 1.0; g.add(hit);
    // disco de destino válido
    const target = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.72, 64), B.halo(cat.glow, 0.0));
    target.rotation.x = -Math.PI / 2; target.position.y = 0.01; g.add(target);
    return { group: g, ring, label, plateGlow, plateBody, hit, target, top: h };
  };

  // ------------------------------------------------------------ consola
  B.buildConsole = (root) => {
    const g = new THREE.Group(); root.add(g);
    const c = L.consoleCenter, R = L.consoleRadius, top = L.consoleTop;
    g.position.set(c.x, 0, c.z);
    const satin = B.mat('#120c19', { roughness: 0.28, metalness: 0.35 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R - 0.04, 0.1, 128), satin); disc.position.y = top - 0.05; g.add(disc);
    const bevel = new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.035, 12, 128), satin); bevel.rotation.x = Math.PI / 2; bevel.position.y = top - 0.02; g.add(bevel);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.55, R * 0.62, top - 0.1, 64), B.mat('#0a0710', { roughness: 0.6 }));
    column.position.y = (top - 0.1) / 2; g.add(column);
    const outer = B.neonTorus(R - 0.01, 0.016, C.coral, Math.PI * 2, 1.15, 3.4, 0.2);
    outer.rotation.x = Math.PI / 2; outer.position.y = top + 0.012; g.add(outer);
    const inner = B.neonTorus(0.86, 0.009, C.magenta, Math.PI * 2, 1.0, 3.4, 0.14);
    inner.rotation.x = Math.PI / 2; inner.position.y = top + 0.004; g.add(inner);
    const groove = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.93, 128), B.mat('#05030a', { roughness: 0.9 }));
    groove.rotation.x = -Math.PI / 2; groove.position.y = top + 0.002; g.add(groove);
    return g;
  };

  B.buildPropBase = (cat) => {
    const g = new THREE.Group();
    const satin = B.mat('#14101c', { roughness: 0.3, metalness: 0.35 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.05, 64), satin); base.position.y = 0.025; g.add(base);
    const ring = B.neonTorus(0.245, 0.01, C.blue, Math.PI * 2, 1.3, 3.6, 0.22);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), B.halo('#6d5cff', 0.12)); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.052; g.add(pad);
    const shadow = B.contactShadow(0.34, 0.8); shadow.position.y = 0.002; g.add(shadow);
    // indicador "en el mix": un tilde en el color de la categoría
    const check = B.textPlane(0.16, 0.16, 128, (ctx, w, h) => {
      ctx.strokeStyle = cat.glow; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = cat.color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(w * 0.24, h * 0.52); ctx.lineTo(w * 0.43, h * 0.7); ctx.lineTo(w * 0.78, h * 0.3); ctx.stroke();
    });
    check.rotation.x = -Math.PI / 2; check.position.y = 0.056; check.visible = false; g.add(check);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.5, 16), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.22; g.add(hit);
    return { group: g, ring, pad, check, hit };
  };

  // ------------------------------------------------------------ pantallas laterales
  B.buildScreen = (w, h) => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(B.roundedBox(w + 0.36, h + 0.32, 0.22, 0.18, 0.05), B.mat('#120d18', { roughness: 0.42, metalness: 0.25 }));
    frame.position.z = -0.08; g.add(frame);
    const panel = new THREE.Mesh(new THREE.ShapeGeometry(B.roundedShape(w + 0.04, h + 0.04, 0.1), 12), B.mat('#0b0712', { roughness: 0.25 }));
    panel.position.z = 0.032; g.add(panel);
    const border = B.neonFrame(w - 0.04, h - 0.04, 0.09, 0.012, C.neon, 1.35);
    border.position.z = 0.04; g.add(border);
    return g;
  };

  // ------------------------------------------------------------ botones
  B.buildButton = (w, h, opts) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(B.roundedBox(w, h, 0.05, h / 2, 0.016),
      B.mat(opts.fill, { roughness: 0.35, metalness: 0.1, emissive: new THREE.Color(opts.emissive || '#000000'), emissiveIntensity: opts.emissiveIntensity ?? 0.6 }));
    g.add(body);
    const rim = B.neonFrame(w + 0.006, h + 0.006, h / 2 + 0.003, 0.009, opts.rim, 1.35);
    rim.position.z = 0.027; g.add(rim);
    const label = B.textPlane(w * 0.94, h * 0.8, 512, (ctx, cw, ch, text, icon) => {
      ctx.textBaseline = 'middle';
      const tx = text || opts.text, ic = icon || opts.icon;
      ctx.font = B.font(800, Math.round(ch * 0.5));
      const tw = ctx.measureText(tx).width, iw = ic ? ch * 0.5 : 0, gap = ic ? ch * 0.22 : 0;
      let x = (cw - tw - iw - gap) / 2;
      if (ic) { B.drawIcon(ctx, ic, x + iw / 2, ch / 2, iw, opts.textColor); x += iw + gap; }
      ctx.textAlign = 'left';
      B.glowText(ctx, tx, x, ch / 2 + ch * 0.03, B.font(800, Math.round(ch * 0.5)), opts.textColor, opts.textGlow, 14);
    });
    label.position.z = 0.03; g.add(label);
    g.userData = { body, rim, label, w, h };
    return g;
  };
  B.drawIcon = (ctx, kind, cx, cy, s, color) => {
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round';
    if (kind === 'play') {
      ctx.beginPath(); ctx.moveTo(cx - s * 0.32, cy - s * 0.42); ctx.lineTo(cx + s * 0.42, cy); ctx.lineTo(cx - s * 0.32, cy + s * 0.42); ctx.closePath();
      ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.1; ctx.fill(); ctx.stroke();
    } else if (kind === 'pause') {
      ctx.fillRect(cx - s * 0.34, cy - s * 0.4, s * 0.24, s * 0.8); ctx.fillRect(cx + s * 0.1, cy - s * 0.4, s * 0.24, s * 0.8);
    } else if (kind === 'reset') {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, -Math.PI * 0.2, Math.PI * 1.45); ctx.stroke();
      const a = -Math.PI * 0.2, ex = cx + Math.cos(a) * s * 0.38, ey = cy + Math.sin(a) * s * 0.38;
      ctx.beginPath(); ctx.moveTo(ex + s * 0.16, ey - s * 0.18); ctx.lineTo(ex + s * 0.02, ey + s * 0.08); ctx.lineTo(ex - s * 0.22, ey - s * 0.08); ctx.closePath(); ctx.fill();
    } else if (kind === 'flag') {
      ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy + s * 0.45); ctx.lineTo(cx - s * 0.3, cy - s * 0.42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.26, cy - s * 0.42); ctx.lineTo(cx + s * 0.4, cy - s * 0.22); ctx.lineTo(cx - s * 0.26, cy - s * 0.02); ctx.closePath(); ctx.fill();
    } else if (kind === 'back') {
      ctx.beginPath(); ctx.moveTo(cx + s * 0.35, cy); ctx.lineTo(cx - s * 0.3, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.05, cy - s * 0.3); ctx.lineTo(cx - s * 0.35, cy); ctx.lineTo(cx - s * 0.05, cy + s * 0.3); ctx.stroke();
    } else if (kind === 'plus') {
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.38); ctx.lineTo(cx, cy + s * 0.38); ctx.moveTo(cx - s * 0.38, cy); ctx.lineTo(cx + s * 0.38, cy); ctx.stroke();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------ parlantes
  B.buildSpeaker = () => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(B.roundedBox(1.15, 2.0, 0.9, 0.12, 0.04), B.mat('#120c17', { roughness: 0.5, metalness: 0.2 }));
    box.position.y = 1.0; g.add(box);
    for (const [y, r] of [[1.42, 0.3], [0.68, 0.42]]) {
      const surround = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 12, 48), B.mat('#1c1524', { roughness: 0.4 }));
      surround.position.set(0, y, 0.46); g.add(surround);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, 0.16, 48, 1, true), B.mat('#0a080d', { roughness: 0.8, side: THREE.DoubleSide }));
      cone.rotation.x = -Math.PI / 2; cone.position.set(0, y, 0.38); g.add(cone);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), B.mat('#1e1826', { roughness: 0.3, metalness: 0.4 }));
      cap.rotation.x = Math.PI / 2; cap.position.set(0, y, 0.36); g.add(cap);
      const glow = B.neonTorus(r + 0.06, 0.006, C.neonSoft, Math.PI * 2, 0.9, 3, 0.12);
      glow.position.set(0, y, 0.47); g.add(glow);
      g.userData['cone' + y] = cap;
    }
    const sh = B.contactShadow(1.0, 0.8); sh.position.y = 0.004; g.add(sh);
    return g;
  };

  // ------------------------------------------------------------ mano translúcida (VR)
  B.buildHand = (side) => {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: '#c8b8ff', emissive: '#6b55d9', emissiveIntensity: 0.35, roughness: 0.3, transparent: true, opacity: 0.55, depthWrite: false });
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 12), m); palm.scale.set(1.0, 0.45, 1.2); g.add(palm);
    const s = side === 'left' ? -1 : 1;
    const fingers = [[-0.03, 0.05, 0.75], [-0.01, 0.06, 0.82], [0.012, 0.058, 0.8], [0.032, 0.05, 0.7]];
    fingers.forEach(([x, len, k]) => {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, len * k, 4, 10), m);
      f.rotation.x = -Math.PI / 2 + 0.35; f.position.set(x * s, 0.008, -0.05 - len * k * 0.45); g.add(f);
    });
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.035, 4, 10), m);
    th.rotation.set(-Math.PI / 2, 0, -0.9 * s); th.position.set(-0.05 * s, 0.0, -0.01); g.add(th);
    g.rotation.x = -0.5;
    return g;
  };
})();
