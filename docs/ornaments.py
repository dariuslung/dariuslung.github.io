"""Generates the hand-inked ornament shapes: jittered curves, tapered strokes, wobbly rings.
Run: python3 ornaments.py <repo-root> <scratch-dir>"""
import math, random, sys

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

def ring(cx, cy, r, rng, wobble, turns=1.05, n=40, start=None):
    """A hand-drawn circle: radius wobbles smoothly, and the stroke overshoots where it closes."""
    start = rng.uniform(0, 2 * math.pi) if start is None else start
    ks = [(k, rng.uniform(0.4, 1.0) / k, rng.uniform(0, 2 * math.pi)) for k in (2, 3, 5)]
    pts = []
    for i in range(int(n * turns) + 1):
        t = i / n
        th = start + 2 * math.pi * t
        rr = r + wobble * sum(a * math.sin(k * th + ph) for k, a, ph in ks)
        rr += 0.35 * t  # spiral out slightly so the overshoot doesn't retrace the start
        pts.append((cx + rr * math.cos(th), cy + rr * math.sin(th)))
    return catmull(pts)

def svg(w, h, body, extra=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"{extra}>{body}</svg>\n'

def corner(colour='#000'):
    rng = random.Random(11)
    outer = jitter([(1.4, 22), (1.7, 15), (1.9, 9), (3.6, 4.6), (8.2, 2.0), (14, 1.6), (22, 1.4)], rng, 0.25)
    inner = jitter([(5.8, 16), (6.1, 11), (9.6, 6.6), (15, 5.9)], rng, 0.2)
    st = f'fill="none" stroke="{colour}" stroke-linecap="round" stroke-linejoin="round"'
    body = (f'<path d="{catmull(outer)}" {st} stroke-width="1.5"/><path d="{catmull(inner)}" {st} stroke-width="0.9"/>'
            f'<path d="{catmull([(4.2, 7.6), (6.6, 10.1), (4.0, 12.6), (1.9, 10.0)], closed=True)}" fill="{colour}" transform="translate(0.1 -3.4) scale(0.9)"/>'
            f'<circle cx="12.5" cy="3.7" r="0.85" fill="{colour}"/><circle cx="3.7" cy="12.5" r="0.85" fill="{colour}"/>')
    return svg(24, 24, body)

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

def divider_gem(colour='#000'):
    """A small hollow shard with a core, flanked by dots and dashes."""
    rng = random.Random(23)
    shell = jitter([(22, 1.2), (30.6, 10.1), (21.9, 18.9), (13.4, 9.9)], rng, 0.3)
    core = jitter([(22, 6.1), (25.6, 10), (22, 13.8), (18.4, 10)], rng, 0.2)
    body = (f'<path d="{catmull(shell, closed=True)}" fill="none" stroke="{colour}" stroke-width="1.5" stroke-linejoin="round"/>'
            f'<path d="{catmull(core, closed=True)}" fill="{colour}"/>'
            f'<path d="M7.2 10.1 L11.4 9.9" fill="none" stroke="{colour}" stroke-width="1.2" stroke-linecap="round"/>'
            f'<path d="M32.6 10.0 L36.9 10.2" fill="none" stroke="{colour}" stroke-width="1.2" stroke-linecap="round"/>'
            f'<circle cx="3.9" cy="10.1" r="1.25" fill="{colour}"/><circle cx="40.2" cy="9.9" r="1.25" fill="{colour}"/>')
    return svg(44, 20, body)

def avatar_ring():
    """Two overlapping hand-drawn circles for the avatar frame (inline in index.html, stroked in currentColor)."""
    rng = random.Random(3)
    a = ring(50, 50, 47.2, rng, 0.9, turns=1.06)
    b = ring(50, 50, 44.6, rng, 0.8, turns=1.04)
    return (f'<path d="{a}" stroke-width="1.6"/><path d="{b}" stroke-width="0.9" opacity="0.7"/>')

def avatar_ring_standalone(colour, size):
    """Same ring as a self-contained SVG with explicit attributes (for rasterising)."""
    paths = avatar_ring().replace('<path ', f'<path fill="none" stroke="{colour}" stroke-linecap="round" ')
    return svg(100, 100, paths, f' width="{size}" height="{size}"')

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

def filigree(colour='#000', sw=2.4, flip=False, centre='arch'):
    """sw scales the stroke weights (2.4 is the web default). flip mirrors vertically, for the bottom ornament."""
    k = sw / 2.4
    Y = (lambda y: FH - y) if flip else (lambda y: y)
    rng = random.Random(8)
    jit = lambda pts: [(x + rng.uniform(-0.12, 0.12), y + rng.uniform(-0.12, 0.12)) for x, y in pts]
    half = []   # right-hand elements as ('path', d) or ('raw', svg-string-with-x-placeholders)

    # A: the main arc that rises from the centre, then turns down and in to a scroll
    A = jit([(205, 27), (221, 22), (244, 15), (270, 12), (294, 14.5), (312, 21), (321, 30), (316, 38.5),
             (305, 38.5), (298.5, 31), (302.5, 24.5), (310, 25.5), (312.5, 29.5)])
    polyA = _spline(A)
    half.append(('path', _taper(polyA, lambda t: (0.5 + 2.3 * math.sin(math.pi * min(t * 1.18, 1)) ** 0.8) * k if t < 0.85 else (1.5 * (1 - (t - 0.85) / 0.15) + 0.3) * k)))
    # B: the lower arc that sweeps out past the scroll and ends in an upturned thorn
    B = jit([(206, 31), (232, 38), (270, 43.5), (318, 44.5), (352, 39), (371, 30), (378, 21)])
    half.append(('path', _taper(_spline(B), lambda t: (0.4 + 2.0 * math.sin(math.pi * t) ** 0.9) * k)))
    # C: a thin outer hairline that leaves the top of A and tapers to a point
    C = jit([(311, 21.5), (332, 16.5), (356, 17.5), (376, 22), (392, 25)])
    half.append(('path', _taper(_spline(C), lambda t: (1.5 * (1 - t) ** 0.8 + 0.1) * k)))
    # D: a small inner scroll that curls away from the base of the centre motif
    D = jit([(206, 26), (214, 28.5), (221, 26.5), (221, 20.5), (216, 18.5), (213, 21.5), (216, 23.5)])
    half.append(('path', _taper(_spline(D), lambda t: (0.4 + 1.7 * math.sin(math.pi * t) ** 0.8) * k)))
    # thorns along A
    for frac, h, b in ((0.17, 6.2, 3.6), (0.29, 7.4, 3.8), (0.41, 6.4, 3.6)):
        half.append(('path', _thorn(polyA, frac, h * k ** 0.5, b * k ** 0.5, -1)))
    # small diamonds and a dot in the scroll
    half.append(('raw', _diamond(386, 25, 2.9 * k ** 0.5, colour)))
    half.append(('raw', f'<circle cx="308" cy="30" r="{fmt(1.25 * k ** 0.5)}" fill="{colour}"/>'))

    out = []
    for mirror in (False, True):
        for kind, data in half:
            if kind == 'path':
                d = data
                if flip or mirror:
                    import re
                    def tf(m):
                        x, y = float(m.group(1)), float(m.group(2))
                        return f'{fmt((FW - x) if mirror else x)} {fmt(Y(y))}'
                    d = re.sub(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', tf, d)
                out.append(f'<path d="{d}" fill="{colour}"/>')
            else:
                import re
                def tf2(m):
                    attr, v = m.group(1), float(m.group(2))
                    return f'{attr}="{fmt(FW - v)}"' if mirror and attr == 'cx' else f'{attr}="{fmt(Y(v))}"' if attr == 'cy' else m.group(0)
                svgs = data
                if mirror or flip:
                    if svgs.startswith('<circle'):
                        svgs = re.sub(r'(cx|cy)="(-?\d+\.?\d*)"', tf2, svgs)
                    else:
                        svgs = re.sub(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', lambda m: f'{fmt((FW - float(m.group(1))) if mirror else float(m.group(1)))} {fmt(Y(float(m.group(2))))}', svgs)
                out.append(svgs)

    # centre motif
    if centre == 'arch':
        for mirror in (False, True):
            arc = jit([(191.5, 27), (192.6, 19.5), (195.8, 12.5), (200, 5.8)])
            pts = [((FW - x) if mirror else x, Y(y)) for x, y in _spline(arc)]
            out.append(f'<path d="{_taper(pts, lambda t: (0.5 + 2.1 * math.sin(math.pi * t) ** 0.8) * k)}" fill="{colour}"/>')
        out.append(_diamond(200, Y(17.5), 3.6 * k ** 0.5, colour))
        out.append(f'<circle cx="200" cy="{fmt(Y(2.6))}" r="{fmt(1.15 * k ** 0.5)}" fill="{colour}"/>')
    else:
        for mirror in (False, True):
            arc = jit([(200, 5), (205.5, 13), (208, 24), (205.5, 35), (200, 43)])
            pts = [((FW - x) if mirror else x, Y(y)) for x, y in _spline(arc)]
            out.append(f'<path d="{_taper(pts, lambda t: (0.4 + 2.2 * math.sin(math.pi * t) ** 0.9) * k)}" fill="{colour}"/>')
        out.append(_diamond(200, 24, 6.2 * k ** 0.5, colour))
        out.append(_diamond(200, 3.2, 1.9 * k ** 0.5, colour))
        out.append(_diamond(200, 44.8, 1.9 * k ** 0.5, colour))
    return svg(FW, FH, ''.join(out))

if __name__ == '__main__':
    root, scratch = sys.argv[1], sys.argv[2]
    out = f'{root}/assets/img/ornaments'
    open(f'{out}/corner.svg', 'w').write(corner())
    open(f'{out}/divider-line.svg', 'w').write(divider_line())
    open(f'{out}/divider-gem.svg', 'w').write(divider_gem())
    open(f'{out}/filigree-top.svg', 'w').write(filigree(sw=3.4, flip=False, centre='arch'))
    open(f'{out}/filigree-bottom.svg', 'w').write(filigree(sw=3.4, flip=True, centre='shard'))
    open(f'{scratch}/avatar-ring.txt', 'w').write(avatar_ring())
    # coloured copies for previews and the share image
    for name, fn in (('corner', corner), ('divider-line', divider_line), ('divider-gem', divider_gem)):
        open(f'{scratch}/{name}-bone.svg', 'w').write(fn('#E4DFD0'))
    for name, fn in (('corner', corner), ('divider-line', divider_line), ('divider-gem', divider_gem)):
        open(f'{scratch}/{name}-soul.svg', 'w').write(fn('#8EC9E8'))
    open(f'{scratch}/ring-strong.svg', 'w').write(avatar_ring_standalone('#5B6A82', 324))
    for name, kw in (('top', dict(flip=False, centre='arch')), ('bottom', dict(flip=True, centre='shard'))):
        open(f'{scratch}/filigree-{name}-og.svg', 'w').write(filigree(colour='#E4DFD0', sw=2.4, **kw))
    print('ok')
