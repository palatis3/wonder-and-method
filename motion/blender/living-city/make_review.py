"""Package low-resolution camera studies; these files never enter public/."""
from pathlib import Path
import argparse,json,subprocess,shutil
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/living-city';FF=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
P=argparse.ArgumentParser();P.add_argument('view',choices=['desktop','portrait']);args=P.parse_args()
files=sorted((OUT/'animatic').glob(args.view+'-*.png'));dest=OUT/'animatic'/args.view;dest.mkdir(exist_ok=True)
for i,p in enumerate(files):shutil.copyfile(p,dest/f'{i:04d}.png')
video=OUT/'animatic'/f'{args.view}-animatic.mp4'
subprocess.run([str(FF),'-y','-hide_banner','-loglevel','error','-framerate','6','-i',str(dest/'%04d.png'),'-r','24','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],check=True)
chosen=[files[i] for i in [0,len(files)//3,2*len(files)//3,len(files)-1]]
ims=[Image.open(p).convert('RGB') for p in chosen];w,h=ims[0].size;canvas=Image.new('RGB',(w*2,(h+34)*2),(245,243,236));draw=ImageDraw.Draw(canvas);font=ImageFont.truetype('C:/Windows/Fonts/calibri.ttf',20)
for i,(im,path) in enumerate(zip(ims,chosen)):
    x=(i%2)*w;y=(i//2)*(h+34);frame=int(path.stem.split('-')[-1]);draw.text((x+12,y+7),f'{args.view.title()} • {(frame-1)/24:.2f}s / frame {frame}',font=font,fill=(22,43,47));canvas.paste(im,(x,y+34))
canvas.save(OUT/'animatic'/f'{args.view}-contact-sheet.jpg',quality=93)
print(json.dumps({'video':str(video),'contactSheet':str(OUT/'animatic'/f'{args.view}-contact-sheet.jpg'),'studyFps':6,'frames':len(files)},indent=2))
