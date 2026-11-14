"""Rebuilds the share image (assets/img/og-image.png, 1200x630): the name between the two filigrees on the
abyss background, a label below, inside a framed border. The filigrees come from ornaments.py, so re-run this
after changing them. Needs Google Chrome or Chromium (headless) and, optionally, ImageMagick to strip metadata.
Run: python3 og-card.py <repo-root> <scratch-dir>"""
import importlib.util, os, shutil, subprocess, sys

root, scratch = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
spec = importlib.util.spec_from_file_location('ornaments', f'{root}/docs/ornaments.py')
orn = importlib.util.module_from_spec(spec); spec.loader.exec_module(orn)

BONE, MUTED, PAPER, RULE = '#E4DFD0', '#98A0B0', '#090B10', '#2A3445'
work = f'{scratch}/og'
os.makedirs(work, exist_ok=True)
for f in os.listdir(f'{root}/assets/fonts'):
    if f.endswith('.woff2'):
        shutil.copy(f'{root}/assets/fonts/{f}', work)
# same shapes as the site's ornaments, in bone, at the lighter 2.4 stroke weight
open(f'{work}/top.svg', 'w').write(orn.filigree(colour=BONE, sw=2.4, flip=False, centre='arch'))
open(f'{work}/bottom.svg', 'w').write(orn.filigree(colour=BONE, sw=2.4, flip=True, centre='shard'))

open(f'{work}/card.html', 'w').write(f'''<!doctype html><meta charset="utf-8"><style>
@font-face{{font-family:Cinzel;src:url(cinzel-latin-wght-normal.woff2);font-weight:400 900}}
@font-face{{font-family:Mono;src:url(jetbrains-mono-latin-400-normal.woff2)}}
html,body{{margin:0;width:1200px;height:630px;background:{PAPER};overflow:hidden;position:relative}}
.b{{position:absolute;left:40px;top:40px;width:1116px;height:546px;border:2px solid {RULE}}}
img{{position:absolute;left:160px;width:880px;height:auto}}
#t{{top:121px}}#u{{top:340px}}
h1{{position:absolute;left:0;width:1200px;top:242px;margin:0;text-align:center;font:600 92px/1 Cinzel,serif;letter-spacing:.06em;color:{BONE};text-transform:uppercase}}
p{{position:absolute;left:0;width:1200px;top:468px;margin:0;text-align:center;font:25.5px/32px Mono,monospace;letter-spacing:.06em;color:{MUTED};text-transform:uppercase}}
</style><div class="b"></div><img id="t" src="top.svg"><h1>Darius Lung</h1><img id="u" src="bottom.svg"><p>Networked systems &middot; Computer science</p>
''')

chrome = next((c for c in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser') if shutil.which(c)), None)
if not chrome:
    sys.exit('Chrome or Chromium not found')
png = f'{work}/card.png'
subprocess.run([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                '--window-size=1200,630', '--virtual-time-budget=3000', f'--screenshot={png}', f'file://{work}/card.html'],
               check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
dest = f'{root}/assets/img/og-image.png'
if shutil.which('magick'):
    subprocess.run(['magick', png, '-strip', dest], check=True)
else:
    shutil.copy(png, dest)
print('ok')
