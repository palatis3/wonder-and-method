"""Compare a worst-phase full Cycles image with the padded offline composite."""
import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/living-city-refinement'
rows=[]

def statistics(delta):
    return {'meanChannelDelta255':float(delta.mean()),'p99ChannelDelta255':float(np.percentile(delta,99)),
            'p999ChannelDelta255':float(np.percentile(delta,99.9)),'maxChannelDelta255':int(delta.max())}

for view in ['desktop','portrait']:
    full=OUT/'gate'/f'cycles-{view}-s64-f0025.png'
    composite=OUT/'crop-benchmark'/view/'composited/0001.png'
    if not full.is_file() or not composite.is_file():
        continue
    report=json.loads((OUT/'crop-benchmark'/view/'composite-manifest.json').read_text())
    row=next(r for r in report['frames'] if r['sourceFrame']==25)
    full_img=Image.open(full).convert('RGB')
    comp_img=Image.open(composite).convert('RGB')
    a=np.array(full_img,dtype=np.int16)
    b=np.array(comp_img,dtype=np.int16)
    delta=np.abs(a-b)
    y=row['cropTopPixel']
    f=row['featherPixels']
    results={'view':view,'sourceFrame':25,'phaseDescription':'Quarter cycle, maximum negative oven-light variation',
             'fullFrameReference':str(full),'offlineComposite':str(composite),'cropTopPixel':y,'featherPixels':f,
             'wholeImage':statistics(delta),'outsideRenderedCrop':statistics(delta[:y]),
             'featherBand':statistics(delta[y:y+f]),'insideRenderedCrop':statistics(delta[y+f:])}
    # Bounds are a review guard, not a perceptual/compliance claim.
    results['numericalReviewGuardPassed']=results['outsideRenderedCrop']['meanChannelDelta255']<.25 and results['outsideRenderedCrop']['p99ChannelDelta255']<=2 and results['wholeImage']['meanChannelDelta255']<.5
    label_font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
    tw=720 if view=='desktop' else 414
    th=round(full_img.height*tw/full_img.width)
    canvas=Image.new('RGB',(tw*2,th+40),(248,246,239))
    draw=ImageDraw.Draw(canvas)
    draw.text((12,10),'Full Cycles reference / frame25',font=label_font,fill=(9,45,59))
    draw.text((tw+12,10),'Offline composite / same frame',font=label_font,fill=(9,45,59))
    canvas.paste(full_img.resize((tw,th),Image.Resampling.LANCZOS),(0,40))
    canvas.paste(comp_img.resize((tw,th),Image.Resampling.LANCZOS),(tw,40))
    comparison=OUT/f'{view}-crop-integrity.jpg'
    canvas.save(comparison,quality=96,subsampling=0)
    results['comparison']=str(comparison)
    rows.append(results)
path=OUT/'crop-integrity.json'
path.write_text(json.dumps({'views':rows,'scope':'Independent full-render comparison at one deliberately changed phase; temporal seam inspected separately.'},indent=2),encoding='utf-8')
print(json.dumps({'report':str(path),'results':rows},indent=2))
