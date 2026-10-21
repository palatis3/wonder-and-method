"""Record the final encoded seam diagnosis and portable-source visual check."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/living-city-refinement'
FFPROBE=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe'
summary={'reviewedDecodedFrames':[1,13,25,37,49,61,73,96],'views':{}}
for view,name,top in [('desktop','desktop',528),('portrait','mobile',852)]:
    folder=OUT/'delivery'/view
    result={}
    for kind,a,b in [('raw','composited/0095.png','composited/0000.png'),('decoded','decoded/0096.png','decoded/0001.png')]:
        previous=np.array(Image.open(folder/a),dtype=np.float32)
        first=np.array(Image.open(folder/b),dtype=np.float32)
        signed=first-previous
        absolute=np.abs(signed)
        luminance=signed@np.array([.2126,.7152,.0722],dtype=np.float32)
        result[kind]={'wholeImageMeanAbsoluteChannelDelta255':float(absolute.mean()),
            'staticUpperMeanAbsoluteChannelDelta255':float(absolute[:top].mean()),
            'movingLowerMeanAbsoluteChannelDelta255':float(absolute[top:].mean()),
            'staticUpperPixelsWithAnyChannelChangeAbove5Percent':float((absolute[:top].max(axis=2)>5).mean()*100),
            'signedMeanLuminanceChange255':float(luminance.mean()),
            'staticUpperSignedMeanLuminanceChange255':float(luminance[:top].mean())}
    video=ROOT/'public/living-city'/f'{name}-film.mp4'
    probe=subprocess.run([str(FFPROBE),'-v','error','-select_streams','v:0','-show_frames',
        '-show_entries','frame=key_frame,pict_type','-of','json',str(video)],capture_output=True,text=True,check=True)
    frames=json.loads(probe.stdout)['frames']
    result['firstEncodedFrame']=frames[0]
    result['lastEncodedFrame']=frames[-1]
    result['videoSha256']=hashlib.sha256(video.read_bytes()).hexdigest()
    result['visualReview']='Decoded full-resolution frames 96 and 1 retain camera, crop and architectural positions. Full-loop contacts show restrained local water/leaf/light changes with no coherent brightness or positional jump.'
    result['interpretation']='The raw source has no static-region discontinuity. The compressed boundary adds very small spatial quantization differences when returning to the opening I-frame; this explains the elevated ratio to quiet adjacent frames.'
    summary['views'][view]=result
source_check=json.loads((OUT/'portable-source-render.json').read_text())
a=np.array(Image.open(source_check['crop']),dtype=np.float32)
b=np.array(Image.open(source_check['reference']),dtype=np.float32)
diff=np.abs(a-b)
mse=float(np.mean((a-b)**2))
source_check['comparison'].update({'psnrDb':float(10*np.log10(255*255/mse)) if mse else 100.0,
    'p99ChannelDelta255':float(np.percentile(diff,99)),
    'pixelsWithAnyChannelChangeAbove2Percent':float((diff.max(axis=2)>2).mean()*100)})
(OUT/'portable-source-render.json').write_text(json.dumps(source_check,indent=2),encoding='utf-8')
summary['portableSourceRenderComparison']=source_check
for path in [OUT/'source-bundle-verification.json',Path(__file__).parent/'source-bundle.json']:
    bundle=json.loads(path.read_text())
    bundle['renderSpotCheck']=source_check
    path.write_text(json.dumps(bundle,indent=2),encoding='utf-8')
verification_path=OUT/'delivery/verification.json'
verification=json.loads(verification_path.read_text())
verification['finalVisualReview']=summary
verification_path.write_text(json.dumps(verification,indent=2),encoding='utf-8')
(OUT/'delivery/final-visual-review.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({'sourceComparison':source_check['comparison'],
    'seams':{view:{'frameTypes':[r['lastEncodedFrame']['pict_type'],r['firstEncodedFrame']['pict_type']],
                   'signedMeanLuminanceChange255':r['decoded']['signedMeanLuminanceChange255'],
                   'staticUpperMeanAbsoluteChannelDelta255':r['decoded']['staticUpperMeanAbsoluteChannelDelta255']}
             for view,r in summary['views'].items()}},indent=2))
