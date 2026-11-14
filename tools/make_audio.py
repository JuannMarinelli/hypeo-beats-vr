"""
HYPEO BEATS · generador de los 5 loops (síntesis propia, sin samples de terceros).

  * 120 BPM, compás 4/4, 4 compases = 8,000 s exactos (352 800 muestras a 44,1 kHz).
  * Tonalidad: La menor. Progresión Am – F – C – G (un acorde por compás).
  * Cada pista se sintetiza en un buffer circular: las colas (decay, delay, reverb por
    convolución FFT circular) que pasan del final vuelven a entrar al principio, así el loop
    no tiene silencios extra, clics ni costuras.

Uso:  python3 -I tools/make_audio.py assets/audio      (requiere numpy)
"""
import sys, os, wave
import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM                  # 0,5 s
BARS = 4
N = int(round(SR * BEAT * 4 * BARS))   # 352800
STEP = BEAT / 4                  # semicorchea
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/audio"
os.makedirs(OUT, exist_ok=True)

ROOTS = [57, 53, 48, 55]        # A3 F3 C3 G3 (MIDI) por compás
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def t_of(bar, step): return (bar * 16 + step) * STEP

class Track:
    def __init__(self):
        self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, start, sig, pan=0.0):
        """Suma `sig` (mono o (2,n)) en `start` segundos, envolviendo al principio del loop."""
        i0 = int(round(start * SR)) % N
        if sig.ndim == 1:
            gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            l, r = sig * gl * 1.414, sig * gr * 1.414
        else:
            l, r = sig[0], sig[1]
        idx = (i0 + np.arange(len(l))) % N
        np.add.at(self.L, idx, l); np.add.at(self.R, idx, r)
    def stereo(self): return np.stack([self.L, self.R])

def tt(dur): return np.arange(int(dur * SR)) / SR

def noise(dur): return rng.standard_normal(int(dur * SR))

def one_pole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x):
        s = (1 - a) * v + a * s; y[i] = s
    return y

def biquad_bp(x, f0, q):
    w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b0, b2 = al, -al; a0, a1, a2 = 1 + al, -2 * np.cos(w), 1 - al
    b0, b2, a1, a2 = b0 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.empty_like(x); x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        o = b0 * v + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, o; y[i] = o
    return y

def hp(x): return np.diff(x, prepend=0.0)

def circ_reverb(st, seconds=1.4, mix=0.25, damp=0.6, predelay=0.012):
    """Reverb por convolución circular (FFT) con respuesta al impulso sintética estéreo."""
    n = int(seconds * SR); t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        ir = one_pole_lp(ir, 3500 * damp + 1200)
        ir = np.concatenate([np.zeros(int(predelay * SR)), ir])[:n]
        ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
        h = np.zeros(N); h[:n] = ir
        wet = np.real(np.fft.ifft(np.fft.fft(st[ch]) * np.fft.fft(h)))
        out.append(st[ch] * (1 - mix) + wet * mix * 1.2)
    return np.stack(out)

def ping_pong(st, delay, fb=0.45, mix=0.3, repeats=6):
    d = int(round(delay * SR)); L, R = st[0].copy(), st[1].copy()
    mono = (st[0] + st[1]) / 2
    for k in range(1, repeats + 1):
        g = mix * fb ** (k - 1)
        sig = np.roll(mono, d * k) * g
        if k % 2: R += sig
        else: L += sig
    return np.stack([L, R])

def normalize(st, peak=0.5):
    st = st - st.mean(axis=1, keepdims=True)
    return st * (peak / (np.max(np.abs(st)) + 1e-9))

# ------------------------------------------------------------------ BEATS
def kick():
    t = tt(0.45); f = 48 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.22) + 0.25 * np.exp(-t / 0.004) * noise(0.45) * 0.3
    return np.tanh(s * 1.6) * 0.95

def snare():
    t = tt(0.3)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05)
    nz = biquad_bp(noise(0.3), 2200, 0.8) * np.exp(-t / 0.11)
    return body * 0.5 + nz * 1.1

def clap():
    t = tt(0.35); env = np.zeros_like(t)
    for o in (0, 0.009, 0.019):
        m = t >= o; env[m] += np.exp(-(t[m] - o) / (0.006 if o < 0.019 else 0.12))
    return biquad_bp(noise(0.35), 1300, 1.2) * env * 1.4

def hat(open_=False):
    d = 0.32 if open_ else 0.06; t = tt(d)
    return hp(hp(noise(d))) * np.exp(-t / (0.11 if open_ else 0.018)) * 0.25

def make_beats():
    tr = Track(); K, Sn, Cl, Hc, Ho = kick(), snare(), clap(), hat(), hat(True)
    for bar in range(BARS):
        kicks = [0, 7, 8, 10] if bar % 2 == 0 else [0, 3, 8, 11, 14]
        for s in kicks: tr.add(t_of(bar, s), K)
        for s in (4, 12):
            tr.add(t_of(bar, s), Sn * 0.8); tr.add(t_of(bar, s) + 0.002, Cl * 0.6, pan=0.1)
        for s in range(0, 16, 2):
            if bar % 2 == 1 and s == 14: tr.add(t_of(bar, s), Ho, pan=0.25); continue
            tr.add(t_of(bar, s), Hc * (1.0 if s % 4 == 2 else 0.7), pan=0.25)
        for s in (5, 13, 15): tr.add(t_of(bar, s), Hc * 0.35, pan=-0.2)   # ghost hats
        if bar == 3: tr.add(t_of(bar, 15), Sn * 0.35)                     # ghost snare
    return circ_reverb(tr.stereo(), 0.8, 0.12)

# ------------------------------------------------------------------ BASS
def bass_note(f, dur):
    t = tt(dur + 0.05); amp = np.minimum(1, t / 0.004) * np.exp(-t / 0.5)
    rel = np.clip((dur + 0.05 - t) / 0.05, 0, 1); amp *= rel
    fc = 220 + 900 * np.exp(-t / 0.09)
    s = np.sin(2 * np.pi * f * t) * 0.9                                   # sub
    for k in range(1, 24):
        if k * f > 8000: break
        resp = 1 / np.sqrt(1 + (k * f / fc) ** 4)
        s += (1 / k) * resp * np.sin(2 * np.pi * k * f * t) * 0.8 * (-1) ** (k + 1)
    return np.tanh(s * amp * 1.2)

def make_bass():
    tr = Track()
    pat = [(0, 3, 0), (3, 1, 12), (6, 2, 0), (8, 3, 0), (11, 1, 7), (14, 2, 12)]
    for bar in range(BARS):
        root = ROOTS[bar] - 24
        for s, ln, iv in pat:
            tr.add(t_of(bar, s), bass_note(hz(root + iv), ln * STEP * 0.92))
    return tr.stereo()

# ------------------------------------------------------------------ MELODY (keys)
def ep(f, dur=0.9):
    t = tt(dur); I = 1.8 * np.exp(-t / 0.18) + 0.3
    s = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * t))
    s += 0.18 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.05)       # "tine"
    env = np.minimum(1, t / 0.003) * np.exp(-t / 0.42) * np.clip((dur - t) / 0.08, 0, 1)
    return s * env

def make_melody():
    tr = Track()
    # gancho en pentatónica de La menor; (paso, nota MIDI)
    hook = [
        [(0, 76), (3, 72), (6, 69), (8, 72), (10, 74), (12, 76), (14, 79)],
        [(0, 77), (3, 72), (6, 69), (8, 72), (10, 76), (12, 74), (14, 72)],
        [(0, 76), (3, 72), (6, 67), (8, 72), (10, 74), (12, 76), (14, 79)],
        [(0, 79), (3, 74), (6, 71), (8, 74), (10, 79), (12, 81), (14, 83)],
    ]
    for bar, notes in enumerate(hook):
        for s, m in notes:
            tr.add(t_of(bar, s), ep(hz(m)) * 0.8, pan=-0.15)
            tr.add(t_of(bar, s), ep(hz(m - 12), 0.6) * 0.25, pan=0.15)
    st = ping_pong(tr.stereo(), STEP * 3, fb=0.4, mix=0.28)
    return circ_reverb(st, 1.6, 0.22)

# ------------------------------------------------------------------ VOCALS (chops)
VOW = {"a": (800, 1200, 2800), "o": (480, 850, 2700), "e": (500, 1800, 2600),
       "i": (300, 2300, 3000), "u": (330, 750, 2500), "y": (280, 2200, 3000)}
BW = (90, 120, 180)

def formant_gain(freq, F):
    g = np.zeros_like(freq)
    for (fc, bw, amp) in zip(F, BW, (1.0, 0.65, 0.3)):
        g += amp / (1 + ((freq - fc) / (bw * 0.8)) ** 2)
    return g

def sing(f0, dur, v_from, v_to=None, glide=0.07, h=False):
    """Voz sintética por formantes: fuente glótica armónica + 3 resonancias por vocal."""
    v_to = v_to or v_from
    t = tt(dur + 0.08)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.6 * t) * np.minimum(1, t / 0.25)
    scoop = 1 - 0.03 * np.exp(-t / 0.04)
    f = f0 * vib * scoop
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.clip(t / glide, 0, 1)[:, None] if v_to != v_from else np.zeros((len(t), 1))
    F = np.array(VOW[v_from])[None, :] * (1 - w) + np.array(VOW[v_to])[None, :] * w
    s = np.zeros_like(t)
    for k in range(1, 40):
        fk = k * f0
        if fk > 5500: break
        g = np.zeros_like(t)
        for j, (bw, amp) in enumerate(zip(BW, (1.0, 0.6, 0.28))):
            g += amp / (1 + ((fk - F[:, j]) / bw) ** 2)
        s += np.sin(k * ph) * g * (1 / k ** 0.7)
    breath = biquad_bp(noise(dur + 0.08), 2600, 0.7) * 0.02
    env = np.minimum(1, t / 0.025) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    out = (s + breath) * env
    if h:   # consonante aspirada "h" al comienzo
        hn = biquad_bp(noise(0.06), 1500, 0.6) * np.exp(-tt(0.06) / 0.02) * 0.6
        out[:len(hn)] += hn
    return out

def make_vocals():
    tr = Track()
    # frase "oh – yeah – ah – hey" en chops, siguiendo la armonía (paso, dur en pasos, MIDI, vocales)
    phrase = [
        [(0, 3, 76, "o", None), (4, 2, 72, "y", "e"), (7, 3, 69, "a", None), (12, 4, 72, "o", "u")],
        [(0, 3, 77, "o", None), (4, 2, 72, "y", "e"), (7, 3, 69, "a", None), (12, 2, 76, "e", None), (14, 2, 74, "a", None)],
        [(0, 3, 76, "o", None), (4, 2, 72, "y", "e"), (7, 3, 67, "a", None), (12, 4, 72, "o", "u")],
        [(0, 2, 79, "a", None), (2, 2, 79, "a", None), (4, 3, 74, "y", "e"), (8, 4, 71, "o", None), (13, 2, 76, "e", None, True)],
    ]
    for bar, notes in enumerate(phrase):
        for n in notes:
            s, ln, m, v1, v2 = n[:5]; h = len(n) > 5
            sig = sing(hz(m - 12 + 12), ln * STEP * 0.95, v1, v2, h=h)
            tr.add(t_of(bar, s), sig * 0.9, pan=0.0)
            tr.add(t_of(bar, s) + 0.012, sing(hz(m - 12 + 12) * 1.004, ln * STEP * 0.95, v1, v2) * 0.25, pan=0.6)
            tr.add(t_of(bar, s) + 0.018, sing(hz(m - 12 + 7), ln * STEP * 0.95, v1, v2) * 0.22, pan=-0.6)  # armonía a la 5ª
    st = ping_pong(tr.stereo(), STEP * 2, fb=0.35, mix=0.18)
    return circ_reverb(st, 2.0, 0.3)

# ------------------------------------------------------------------ FX
def zap(f1=2400, f2=260, dur=0.16):
    t = tt(dur); f = f2 + (f1 - f2) * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) * 0.7

def riser(dur):
    t = tt(dur); x = t / dur
    nz = noise(dur)
    out = np.zeros_like(t); seg = 2048
    for i in range(0, len(t), seg):   # barrido de band-pass ascendente
        fc = 400 + 7000 * x[i] ** 2
        out[i:i + seg] = biquad_bp(nz[i:i + seg], fc, 1.4)
    return out * x ** 2.2 * 0.9

def blip(f, dur=0.09):
    t = tt(dur); return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.025) * 0.5

def make_fx():
    tr = Track()
    # riser que desemboca en el compás 1 y en el 3 (ciclo de 2 compases)
    for bar in (1, 3):
        r = riser(BEAT * 4)
        tr.add(t_of(bar, 0), r * 0.55, pan=-0.3); tr.add(t_of(bar, 0) + 0.01, r * 0.55, pan=0.3)
    # zaps en contratiempo
    for bar in range(BARS):
        for s, p in ((3, -0.6), (11, 0.6)):
            tr.add(t_of(bar, s), zap(), pan=p)
        if bar % 2 == 1:
            tr.add(t_of(bar, 7), zap(3200, 500, 0.12) * 0.6, pan=0.0)
    # blips en semicorcheas con pentatónica aguda
    pent = [81, 84, 86, 88, 91, 93]
    for bar in range(BARS):
        for s in range(16):
            if (s + bar) % 3 == 0:
                tr.add(t_of(bar, s), blip(hz(pent[(s * 5 + bar * 2) % len(pent)])) * 0.5,
                       pan=0.7 if s % 2 else -0.7)
    # stutter en el último compás (ruido filtrado en semicorcheas, fill)
    for s in range(8, 16):
        d = STEP * 0.5; t = tt(d)
        g = biquad_bp(noise(d), 900 + s * 350, 2.0) * np.exp(-t / 0.03) * (0.25 + s * 0.04)
        tr.add(t_of(3, s), g, pan=0.0)
    st = ping_pong(tr.stereo(), STEP * 3, fb=0.4, mix=0.25)
    return circ_reverb(st, 1.8, 0.3)

def write_wav(path, st):
    data = (np.clip(st.T, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())

if __name__ == "__main__":
    makers = {"beats": make_beats, "bass": make_bass, "melody": make_melody, "vocals": make_vocals, "fx": make_fx}
    peaks = {"beats": 0.72, "bass": 0.62, "melody": 0.5, "vocals": 0.55, "fx": 0.42}
    mix = np.zeros((2, N)); tracks = {}
    for name, fn in makers.items():
        st = normalize(fn(), peaks[name]); tracks[name] = st
        write_wav(os.path.join(OUT, f"{name}.wav"), st)
        seam = np.max(np.abs(st[:, 0] - st[:, -1]))
        print(f"{name:7s} {N} muestras  pico={np.max(np.abs(st)):.2f}  rms={np.sqrt(np.mean(st**2)):.3f}  salto_en_costura={seam:.4f}")
        mix += st
    print(f"mezcla de las 5 (sin master): pico={np.max(np.abs(mix)):.2f}")
