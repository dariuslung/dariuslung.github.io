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

if __name__ == '__main__':
    root, scratch = sys.argv[1], sys.argv[2]
    out = f'{root}/assets/img/ornaments'
    open(f'{out}/corner.svg', 'w').write(corner())
    open(f'{out}/divider-line.svg', 'w').write(divider_line())
    open(f'{out}/divider-gem.svg', 'w').write(divider_gem())
    open(f'{scratch}/avatar-ring.txt', 'w').write(avatar_ring())
    # coloured copies for previews and the share image
    for name, fn in (('corner', corner), ('divider-line', divider_line), ('divider-gem', divider_gem)):
        open(f'{scratch}/{name}-bone.svg', 'w').write(fn('#E4DFD0'))
    for name, fn in (('corner', corner), ('divider-line', divider_line), ('divider-gem', divider_gem)):
        open(f'{scratch}/{name}-soul.svg', 'w').write(fn('#8EC9E8'))
    open(f'{scratch}/ring-strong.svg', 'w').write(avatar_ring_standalone('#5B6A82', 324))
    print('ok')
