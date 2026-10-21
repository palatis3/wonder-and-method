"""Inspect compressed consecutive phone frames and provide bounded visual evidence."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,math,argparse
P=argparse.ArgumentParser();P.add_argument('--prefix',default='temporal-phone');args=P.parse_args()
ROOT=Path(__file__).resolve().parents[3];d=ROOT/'output/living-city'/args.prefix
rows=[];decoded=[]
for j in range(12):
    raw=np.asarray(Image.open(d/f'portrait-{j+9:04d}.png').convert('RGB'),dtype=np.float32)
    out=np.asarray(Image.open(d/f'decoded/{j+1:04d}.png').convert('RGB'),dtype=np.float32);decoded.append(out)
    mse=float(np.mean((raw-out)**2));rows.append({'sourceFrame':j+9,'compressionPSNR':round(10*math.log10(255**2/mse),2),'adjacentDecodedMeanAbsoluteDifference':round(float(np.mean(abs(out-decoded[-2]))),3) if j else None})
canvas=Image.new('RGB',(828*2,540*2),(245,243,236));draw=ImageDraw.Draw(canvas)
for i,j in enumerate([0,3,6,9]):
    im=Image.fromarray(decoded[j].astype('uint8')).crop((0,700,828,1216));x=(i%2)*828;y=(i//2)*540;canvas.paste(im,(x,y+24));draw.text((x+12,y+5),f'Decoded phone frame {j+9} / 24fps',fill=(20,40,50))
canvas.save(d/'compressed-detail-contact.jpg',quality=94)
report={'clip':'phone-stability.mp4','width':828,'height':1216,'fps':24,'frames':12,'durationSeconds':.5,'samples':64,'crf':20,'videoBytes':(d/'phone-stability.mp4').stat().st_size,'frameChecks':rows,'scope':'Consecutive rendered geometry/encoding check. Adjacent frame differences include the true camera movement and panel reveal; these metrics do not alone establish perceptual stability.'}
(d/'quality-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
