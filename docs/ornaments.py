"""Generates the hand-inked ornament shapes: tapered strokes, pointed arches, diamonds and thorns.
Run: python3 ornaments.py <repo-root> <scratch-dir>"""
import math, random, re, sys

def fmt(v): return f'{v:.2f}'.rstrip('0').rstrip('.')

def catmull(points, closed=False):
    """Smooth path through points (Catmull-Rom -> cubic Bezier)."""
    n = len(points)
    P = lambda i: points[i % n] if closed else points[max(0, min(n - 1, i))]
    d = f'M{fmt(points[0][0])} {fmt(points[0][1])}'
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f'C{fmt(c1[0])} {fmt(c1[1])} {fmt(c2[0])} {fmt(c2[1])} {fmt(p2[0])} {fmt(p2[1])}'
    return d + ('Z' if closed else '')

def jitter(points, rng, amt):
    return [(x + rng.uniform(-amt, amt), y + rng.uniform(-amt, amt)) for x, y in points]

def svg(w, h, body, extra=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"{extra}>{body}</svg>\n'

def corner(colour='#000'):
    """Angular double bracket: two tapered legs meeting at a sharp corner, an inner pair, and a diamond."""
    legs = []
    def leg(pts, wmax, rising):
        w = (lambda t: wmax * t ** 0.9) if rising else (lambda t: wmax * (1 - t) ** 0.9)
        legs.append(f'<path d="{_taper(_spline(pts, per=4), w)}" fill="{colour}"/>')
    leg([(1.4, 22.5), (1.4, 1.4)], 2.0, True); leg([(1.4, 1.4), (22.5, 1.4)], 2.0, False)
    leg([(4.9, 15.5), (4.9, 4.9)], 1.0, True); leg([(4.9, 4.9), (15.5, 4.9)], 1.0, False)
    legs.append(_diamond(8.6, 8.6, 2.1, colour))
    return svg(24, 24, ''.join(legs))

def divider_line(colour='#000'):
    """A stroke that tapers to nothing at both ends, with a faint wobble."""
    rng = random.Random(5)
    xs = [i * 10 for i in range(21)]
    top, bot = [], []
    for x in xs:
        t = x / 200
        half = 1.15 * (math.sin(math.pi * t) ** 0.7) + 0.05
        mid = 4 + 0.35 * math.sin(t * 9.0) + rng.uniform(-0.12, 0.12)
        top.append((x, mid - half))
        bot.append((x, mid + half))
    pts = top + bot[::-1]
    return svg(200, 8, f'<path d="{catmull(pts, closed=True)}" fill="{colour}"/>', ' preserveAspectRatio="none"')

def divider_gem(colour='#000', core=None):
    """The bottom filigree's centre in miniature: a pointed oval (vesica) around a diamond, with a diamond at
    each tip and a small scroll curling up and down off each side (symmetrical on both axes)."""
    parts = []
    curl = [(25.9, 9.4), (28.3, 9.2), (31.2, 8.8), (33.6, 7.4), (34.2, 5.2), (32.6, 3.7), (30.6, 4.3), (30.2, 6.1), (31.7, 6.8), (32.5, 5.8)]
    for mirror in (False, True):
        mx = (lambda x: 44 - x) if mirror else (lambda x: x)
        arc = [(22 + (x - 12), y) for x, y in [(12, 1.8), (14.7, 5.4), (15.9, 10), (14.7, 14.6), (12, 18.2)]]
        pts = [(mx(x), y) for x, y in _spline(arc, per=6)]
        parts.append(f'<path d="{_taper(pts, lambda t: 0.4 + 1.5 * math.sin(math.pi * t) ** 0.9)}" fill="{colour}"/>')
        for flip in (False, True):
            my = (lambda y: 20 - y) if flip else (lambda y: y)
            poly = [(mx(x), my(y)) for x, y in _spline(curl, per=6)]
            parts.append(f'<path d="{_taper(poly, lambda t: 0.28 + 0.85 * (1 - t) ** 0.8)}" fill="{colour}"/>')
            parts.append(f'<circle cx="{fmt(mx(31.9))}" cy="{fmt(my(5.5))}" r="0.62" fill="{colour}"/>')
    parts.append(_diamond(22, 10, 3.7, core or colour))
    parts.append(_diamond(22, 0.9, 1.3, colour)); parts.append(_diamond(22, 19.1, 1.3, colour))
    return svg(44, 20, ''.join(parts))

def favicon_shard(bone='#E4DFD0', soul='#8EC9E8', tile='#090B10'):
    """The shard simplified for 16-48px: a bold pointed oval round a diamond, on the dark tile. No curls or tips."""
    parts = [f'<rect width="32" height="32" fill="{tile}"/>']
    for mirror in (False, True):
        mx = (lambda x: 32 - x) if mirror else (lambda x: x)
        arc = [(16, 2.8), (21.8, 8.6), (24.4, 16), (21.8, 23.4), (16, 29.2)]
        pts = [(mx(x), y) for x, y in _spline(arc, per=8)]
        parts.append(f'<path d="{_taper(pts, lambda t: 0.9 + 3.3 * math.sin(math.pi * t) ** 0.9)}" fill="{bone}"/>')
    parts.append(_diamond(16, 16, 6.6, soul))
    return svg(32, 32, ''.join(parts))

def apple_icon_svg(bone='#E4DFD0', soul='#8EC9E8', tile='#090B10', size=180, width=160):
    """The full shard with its scrolls, centred on the dark tile, for the 180px Apple touch icon."""
    h = width * 20 / 44
    gem = divider_gem(bone, soul)
    gem = re.sub(r'<svg [^>]*>', f'<svg x="{fmt((size - width) / 2)}" y="{fmt((size - h) / 2)}" width="{fmt(width)}" height="{fmt(h)}" viewBox="0 0 44 20">', gem, count=1)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<rect width="{size}" height="{size}" fill="{tile}"/>{gem}</svg>')

# ---- filigree: heraldic scrollwork on a 400x48 canvas, mirrored about x=200 ----
# Built from tapered strokes (filled outlines that swell and end in points), a strong centre motif,
# two big sweeping arcs ending in inward scrolls, a thin outer hairline, and a few thorns.
FW, FH = 400, 48

def _spline(points, per=7):
    """Dense polyline through points (uniform Catmull-Rom)."""
    n = len(points)
    P = lambda i: points[max(0, min(n - 1, i))]
    out = []
    for i in range(n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        for k in range(per):
            t = k / per
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(points[-1])
    return out

def _taper(poly, width):
    """Filled outline around a centreline; width(t) is the full stroke width at fraction t of the length."""
    seg = [math.dist(poly[i], poly[i + 1]) for i in range(len(poly) - 1)]
    total = sum(seg) or 1
    left, right, run = [], [], 0.0
    for i, (x, y) in enumerate(poly):
        a, b = poly[max(0, i - 1)], poly[min(len(poly) - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        norm = math.hypot(tx, ty) or 1
        nx, ny = -ty / norm, tx / norm
        half = max(width(min(max(run / total, 0.0), 1.0)), 0.0) / 2
        left.append((x + nx * half, y + ny * half)); right.append((x - nx * half, y - ny * half))
        if i < len(seg): run += seg[i]
    pts = left + right[::-1]
    return 'M' + 'L'.join(f'{fmt(x)} {fmt(y)}' for x, y in pts) + 'Z'

def _thorn(poly, frac, height, base, side):
    """A sharp spike growing off the centreline at fraction frac; side=-1 grows toward -y (up) for a rising arc."""
    i = int(frac * (len(poly) - 1))
    (x, y), (x2, y2) = poly[i], poly[min(i + 2, len(poly) - 1)]
    tx, ty = x2 - x, y2 - y
    norm = math.hypot(tx, ty) or 1
    tx, ty = tx / norm, ty / norm
    nx, ny = -ty * side * -1, tx * side * -1
    ax, ay = x - tx * base / 2, y - ty * base / 2
    bx, by = x + tx * base / 2, y + ty * base / 2
    tip = (x + nx * height + tx * base * 0.9, y + ny * height + ty * base * 0.9)
    c = lambda p, q, k: (p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k)
    return (f'M{fmt(ax)} {fmt(ay)}Q{fmt(c((ax, ay), tip, 0.7)[0] - nx * 0.6)} {fmt(c((ax, ay), tip, 0.7)[1] - ny * 0.6)} {fmt(tip[0])} {fmt(tip[1])}'
            f'Q{fmt(c(tip, (bx, by), 0.35)[0])} {fmt(c(tip, (bx, by), 0.35)[1])} {fmt(bx)} {fmt(by)}Z')

def _diamond(x, y, r, colour):
    return f'<path d="M{fmt(x)} {fmt(y - r)}L{fmt(x + r * 0.7)} {fmt(y)}L{fmt(x)} {fmt(y + r)}L{fmt(x - r * 0.7)} {fmt(y)}Z" fill="{colour}"/>'

def _dpath(x, y, r):
    """Path data for a small diamond (used where the shape is transformed later)."""
    return f'M{fmt(x)} {fmt(y - r)}L{fmt(x + r * 0.7)} {fmt(y)}L{fmt(x)} {fmt(y + r)}L{fmt(x - r * 0.7)} {fmt(y)}Z'

_PAIR = re.compile(r'(-?\d+\.?\d*) (-?\d+\.?\d*)')

def _xf(d, mirror, flip):
    """Mirror about x=200 and/or flip vertically every coordinate pair in a path."""
    def f(m):
        x, y = float(m.group(1)), float(m.group(2))
        return f'{fmt((FW - x) if mirror else x)} {fmt((FH - y) if flip else y)}'
    return _PAIR.sub(f, d)

def _vines(rng, k, level):
    """Tapered tendrils that grow from the centre motif into the empty spaces: level 1 adds a long curl through
    the pocket between the two big arcs and a hairline over the top arc; level 2 adds a short curled spur and a
    hairline off the inner scroll. Pointed and thorned, never leafy (see the design plan)."""
    j = lambda pts, a=0.45: [(x + rng.uniform(-a, a), y + rng.uniform(-a, a)) for x, y in pts]
    P = []
    T1 = j([(206.5, 29), (216, 32.5), (230, 31.5), (244, 33.5), (257, 31.5), (266, 27.5), (268, 23.5), (264.5, 22), (262, 25)])
    p1 = _spline(T1)
    P.append(_taper(p1, lambda t: (0.25 + 1.9 * max(0.0, math.sin(math.pi * min(t * 1.1, 1))) ** 1.1) * k if t < 0.9
                    else (0.9 * (1 - t) / 0.1 + 0.1) * k))
    T2 = j([(205, 12.8), (213, 8.5), (226, 5.8), (242, 4.8), (256, 6.2), (266, 9)])
    P.append(_taper(_spline(T2), lambda t: (0.25 + 1.5 * math.sin(math.pi * min(t * 1.05, 1)) ** 1.1) * k))
    P.append(_thorn(p1, 0.30, 4.6 * k ** 0.5, 2.6 * k ** 0.5, 1))
    if level >= 2:
        T3 = j([(232, 31.3), (236, 27.2), (242.5, 25.3), (248, 27), (247, 30), (243.5, 29.4)])
        P.append(_taper(_spline(T3), lambda t: (0.2 + 1.3 * math.sin(math.pi * t) ** 0.9) * k))
        T4 = j([(214, 19.5), (217, 14.5), (223, 11.2), (230, 10.5)])
        P.append(_taper(_spline(T4), lambda t: (1.2 * (1 - t) ** 0.9 + 0.12) * k))
        P.append(_thorn(p1, 0.55, 4.0 * k ** 0.5, 2.4 * k ** 0.5, 1))
    return P

def _half(rng, k, vines=0):
    """One side's scrollwork as path data in right-hand coordinates. Each side gets its own rng, so the
    two halves are mirrored in structure but differ by a hand's worth of wobble."""
    j = lambda pts: [(x + rng.uniform(-0.5, 0.5), y + rng.uniform(-0.5, 0.5)) for x, y in pts]
    P = []
    # A: the main arc that rises from the centre, turns down and in to a scroll (thin parts thin, swells fat)
    A = j([(205, 27), (221, 22), (244, 15), (270, 12), (294, 14.5), (312, 21), (321, 30), (316, 38.5),
           (305, 38.5), (298.5, 31), (302.5, 24.5), (310, 25.5), (312.5, 29.5)])
    polyA = _spline(A)
    P.append(_taper(polyA, lambda t: (0.22 + 2.7 * max(0.0, math.sin(math.pi * min(t * 1.18, 1))) ** 1.25) * k if t < 0.85
                    else (1.4 * max(0.0, 1 - (t - 0.85) / 0.15) ** 1.3 + 0.12) * k))
    # B: the lower arc that sweeps out past the scroll and ends in an upturned thorn
    B = j([(206, 31), (232, 38), (270, 43.5), (318, 44.5), (352, 39), (371, 30), (378, 21)])
    P.append(_taper(_spline(B), lambda t: (0.3 + 2.2 * math.sin(math.pi * t) ** 1.1) * k))
    # C: a thin outer hairline that leaves the top of A and tapers to a point
    C = j([(311, 21.5), (332, 16.5), (356, 17.5), (376, 22), (392, 25)])
    P.append(_taper(_spline(C), lambda t: (1.5 * (1 - t) ** 0.8 + 0.1) * k))
    # D: a small inner scroll that curls away from the base of the centre motif
    D = j([(206, 26), (214, 28.5), (221, 26.5), (221, 20.5), (216, 18.5), (213, 21.5), (216, 23.5)])
    P.append(_taper(_spline(D), lambda t: (0.3 + 1.9 * math.sin(math.pi * t) ** 0.9) * k))
    # thorns along A, uneven and shrinking toward the tip
    for frac, h, b in ((0.15, 7.8, 3.8), (0.30, 6.0, 3.4), (0.45, 3.8, 2.8)):
        P.append(_thorn(polyA, frac, h * k ** 0.5, b * k ** 0.5, -1))
    P.append(_dpath(386, 25, 2.9 * k ** 0.5))
    if vines:
        P += _vines(random.Random(rng.random()), k, vines)
    return P

def _centre(kind, k, rng):
    """Centre motif as (path data list, dot): 'arch' is a pointed lancet with horns (top), 'shard' a
    double-ringed pointed oval round a diamond with horns on both tips (bottom). Mirrored about x=200."""
    jt = lambda pts: [(x + rng.uniform(-0.3, 0.3), y + rng.uniform(-0.3, 0.3)) for x, y in pts]
    both = lambda pts: [[((FW - x) if m else x, y) for x, y in _spline(pts)] for m in (False, True)]
    P = []
    def stroke(pts, w):
        P.append(_taper(pts, w))
    if kind == 'arch':
        for pts in both(jt([(191.5, 27), (192.6, 19.5), (195.8, 12.5), (200, 5.8)])):
            stroke(pts, lambda t: (0.4 + 2.3 * math.sin(math.pi * t) ** 0.9) * k)
        for pts in both(jt([(191.5, 27), (193, 31.5), (196.4, 35), (200, 37.5)])):      # closes the lancet
            stroke(pts, lambda t: (0.5 + 1.9 * math.sin(math.pi * t) ** 0.9) * k)
        for pts in both(jt([(193.4, 15.5), (190.5, 11.5), (186.5, 9.5)])):              # horns off the arch
            stroke(pts, lambda t: (2.0 * (1 - t) ** 0.9 + 0.1) * k)
        for pts in both(jt([(193.2, 33), (190, 37.5), (185.5, 40)])):                   # and off the foot
            stroke(pts, lambda t: (1.8 * (1 - t) ** 0.9 + 0.1) * k)
        P.append(_dpath(200, 17.5, 3.6 * k ** 0.5))
        P.append(_dpath(200, 30.5, 1.9 * k ** 0.5))
        return P, (200, 2.6, 1.15 * k ** 0.5)
    for pts in both(jt([(200, 5), (205.5, 13), (208, 24), (205.5, 35), (200, 43)])):
        stroke(pts, lambda t: (0.4 + 2.2 * math.sin(math.pi * t) ** 0.9) * k)
    for pts in both(jt([(200, 11), (203.6, 17), (204.8, 24), (203.6, 31), (200, 37)])):   # inner hairline ring
        stroke(pts, lambda t: (0.2 + 0.8 * math.sin(math.pi * t) ** 0.9) * k)
    for yy, d in ((7, -1), (41, 1)):                                                      # horns off both tips
        for pts in both(jt([(199.2, yy), (195.2, yy + d * 3.6), (189.5, yy + d * 4.6)])):
            stroke(pts, lambda t: (1.9 * (1 - t) ** 0.9 + 0.1) * k)
    P.append(_dpath(200, 24, 5.4 * k ** 0.5))
    P.append(_dpath(200, 3.2, 1.9 * k ** 0.5))
    P.append(_dpath(200, 44.8, 1.9 * k ** 0.5))
    return P, None

def filigree(colour='#000', sw=2.4, flip=False, centre='arch', seed=1, vines=0):
    """sw scales the stroke weights (2.4 is the base). flip mirrors vertically, for the bottom ornament.
    seed varies the hand wobble, so the top and bottom ornaments are not copies of each other.
    vines (0-2) grows tendrils from the centre; the web bottom ornament is the denser one."""
    k = sw / 2.4
    out = []
    for mirror, off in ((False, 0), (True, 7)):       # each half drawn with its own wobble
        for d in _half(random.Random(seed + off), k, vines):
            out.append(f'<path d="{_xf(d, mirror, flip)}" fill="{colour}"/>')
    paths, dot = _centre(centre, k, random.Random(seed + 3))
    for d in paths:
        out.append(f'<path d="{_xf(d, False, flip)}" fill="{colour}"/>')
    if dot:
        cx, cy, r = dot
        out.append(f'<circle cx="{fmt(cx)}" cy="{fmt(FH - cy if flip else cy)}" r="{fmt(r)}" fill="{colour}"/>')
    return svg(FW, FH, ''.join(out))

if __name__ == '__main__':
    root, scratch = sys.argv[1], sys.argv[2]
    out = f'{root}/assets/img/ornaments'
    open(f'{out}/corner.svg', 'w').write(corner())
    open(f'{out}/divider-line.svg', 'w').write(divider_line())
    open(f'{out}/divider-gem.svg', 'w').write(divider_gem())
    open(f'{root}/assets/img/favicon.svg', 'w').write(favicon_shard())
    open(f'{scratch}/apple-touch-icon.svg', 'w').write(apple_icon_svg())
    open(f'{out}/filigree-top.svg', 'w').write(filigree(sw=3.4, flip=False, centre='arch'))
    open(f'{out}/filigree-bottom.svg', 'w').write(filigree(sw=3.4, flip=True, centre='shard', seed=21, vines=2))
    # coloured copies for previews and the share image
    for name, fn in (('corner', corner), ('divider-line', divider_line), ('divider-gem', divider_gem)):
        open(f'{scratch}/{name}-bone.svg', 'w').write(fn('#E4DFD0'))
    for name, fn in (('corner', corner), ('divider-line', divider_line), ('divider-gem', divider_gem)):
        open(f'{scratch}/{name}-soul.svg', 'w').write(fn('#8EC9E8'))
    for name, kw in (('top', dict(flip=False, centre='arch')), ('bottom', dict(flip=True, centre='shard', seed=21, vines=2))):
        open(f'{scratch}/filigree-{name}-og.svg', 'w').write(filigree(colour='#E4DFD0', sw=2.4, **kw))
    print('ok')
