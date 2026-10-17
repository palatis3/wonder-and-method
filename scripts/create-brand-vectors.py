"""Rebuild vector brand variants from the approved hand-drawn Bezier master.

Requires fonttools + brotli. Raster exports are a separate explicit step.
The master preserves the selected raster silhouette; no raster is embedded.
"""
from pathlib import Path
import re
import shutil
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/brand'
MASTER = (OUT / 'emblem.svg').read_text()
SHAPE = re.search(r'd="([^"]+)"', MASTER).group(1)
INK, SAGE, PAPER = '#0e1b2a', '#334739', '#f8f7f2'
def svg(width, height, body, label):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="{label}">{body}</svg>\n'
def mark(x,y,width,fill=SAGE):
    scale=width/1144
    return f'<path fill="{fill}" transform="translate({x} {y}) scale({scale}) translate(-60 -286)" d="{SHAPE}"/>'
def font(name, opsz=48):
    f=TTFont(ROOT / f'src/assets/premium/{name}.woff2')
    if 'fvar' in f:
        values={a.axisTag:(400 if a.axisTag=='wght' else opsz if a.axisTag=='opsz' else a.defaultValue) for a in f['fvar'].axes}
        f=instantiateVariableFont(f,values,inplace=True)
    return f
NEWS, UI = font('newsreader'), font('manrope')
def text_paths(text, x, baseline, size, face=NEWS, fill=INK, tracking=-.015):
    scale=size/face['head'].unitsPerEm
    cmap=face.getBestCmap(); glyphs=face.getGlyphSet(); out=[]
    for ch in text:
        name=cmap[ord(ch)]
        pen=SVGPathPen(glyphs); glyphs[name].draw(pen)
        if pen.getCommands():
            out.append(f'<path transform="translate({x:.3f} {baseline}) scale({scale:.6f} {-scale:.6f})" d="{pen.getCommands()}"/>')
        x += face['hmtx'][name][0]*scale + size*tracking
    return f'<g fill="{fill}">'+''.join(out)+'</g>'

for name,color in [('emblem-ink',INK),('emblem-reverse',PAPER)]:
    (OUT/f'{name}.svg').write_text(MASTER.replace(SAGE,color))
for name,fg,bg in [('logo-square',SAGE,PAPER),('logo-square-dark',PAPER,INK)]:
    (OUT/f'{name}.svg').write_text(svg(512,512,f'<path fill="{bg}" d="M0 0h512v512H0z"/>'+mark(68,134,376,fg),'Wonder and Method brush emblem'))
# Stable favicon URI has a generous opaque square behind the expressive silhouette.
(OUT/'favicon.svg').write_text((OUT/'logo-square.svg').read_text())
(ROOT/'src/assets/mark.svg').write_text((OUT/'favicon.svg').read_text())
for name,foreground,background in [('wordmark-light',INK,None),('wordmark-reverse',PAPER,None),('wordmark-dark',PAPER,INK)]:
    body=(f'<path fill="{background}" d="M0 0h1120v210H0z"/>' if background else '')
    body += mark(28,52,150,SAGE if foreground==INK else PAPER)
    body += text_paths('Wonder & Method',210,136,96,fill=foreground)
    (OUT/f'{name}.svg').write_text(svg(1120,210,body,'Wonder and Method'))
body=f'<path fill="{PAPER}" d="M0 0h1200v630H0z"/>'
body+=mark(440,72,320)
body+=text_paths('Wonder & Method',186,389,102)
body+=f'<path stroke="#c5cbbf" stroke-width="2" d="M478 443h244"/>'
body+=text_paths('Distinctive websites.',415,501,32,face=UI,fill=SAGE,tracking=0)
(OUT/'social-card.svg').write_text(svg(1200,630,body,'Wonder and Method. Distinctive websites.'))
print('Created clean vector emblem, wordmarks, square icons and social card.')
