"""Compose, encode and verify the approved loop, then install its eight public assets.

All frames are decoded and compared before publication. The static beauty and
the padded Cycles crops are combined offline; browsers receive ordinary media.
"""
from __future__ import annotations
import argparse, hashlib, json, math, shutil, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/living-city-refinement'
SOURCE=Path(__file__).parent/'living-city-refined-loop4.blend'
MASTER_SOURCE=OUT/'living-city-refined-loop4.blend'
EXPECTED_SOURCE='7963732b4c6adcdd8788e5b9a6852213f3a66bd35fb03d27b11481a72084a945'
FFMPEG=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
FFPROBE=FFMPEG.with_name('ffprobe.exe')
PUBLIC=ROOT/'public/living-city'
STAGE=OUT/'delivery/assets'
FONT=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
P=argparse.ArgumentParser()
P.add_argument('--publish',action='store_true')
args=P.parse_args()

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def run(arguments):
    return subprocess.run([str(v) for v in arguments],check=True,capture_output=True,text=True)

def psnr(first,second):
    diff=np.array(first,dtype=np.float32)-np.array(second,dtype=np.float32)
    mse=float(np.mean(diff*diff))
    return 100.0 if mse==0 else 10*math.log10(255*255/mse)

def temporal(first,second):
    delta=np.abs(np.array(first,dtype=np.int16)-np.array(second,dtype=np.int16))
    return {'meanChannelDelta255':float(delta.mean()),'p99ChannelDelta255':float(np.percentile(delta,99))}

def source_frame_hash(image):
    return hashlib.sha256(np.array(image.convert('RGB'),dtype=np.uint8).tobytes()).hexdigest()

def asset_record(path,width,height,**extra):
    return {'path':'/living-city/'+path.name,'bytes':path.stat().st_size,'sha256':sha(path),
            'width':width,'height':height,**extra}

def compose(view):
    folder=OUT/'delivery'/view
    record=json.loads((folder/'render-manifest.json').read_text())
    if not record['complete'] or len(record['timings'])!=96 or record['sourceSha256']!=EXPECTED_SOURCE:
        raise RuntimeError(f'{view} does not have the approved complete sequence.')
    rows=sorted(record['timings'],key=lambda row:row['frame'])
    if [r['frame'] for r in rows]!=list(range(1,97)):
        raise RuntimeError('Sequence must contain each unique phase exactly once.')
    record['portableSourceSha256']=bundle['portableBlendSha256']
    record['sourceBundleManifest']=str(Path(__file__).parent/'source-bundle.json')
    if 'renderMasterDependencies' not in record:
        record['renderMasterDependencies']=record.pop('portableScene')
    record['portableScene']={'relativeImageDependencies':bundle['imageCount'],
                            'packedFonts':len(bundle['fonts']),'linkedLibraries':0}
    (folder/'render-manifest.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
    base_path=OUT/'gate'/f'cycles-{view}-s64-f0001.png'
    base=Image.open(base_path).convert('RGB')
    if base.size!=(record['baseWidth'],record['baseHeight']):
        raise RuntimeError('Static beauty dimensions changed.')
    target=folder/'composited'
    target.mkdir(exist_ok=True)
    original=np.array(base,dtype=np.float32)
    frames=[]
    for row in rows:
        if sha(row['path'])!=row['sha256']:
            raise RuntimeError(f'Crop hash changed at frame {row["frame"]}.')
        crop=Image.open(row['path']).convert('RGB')
        expected_height=432 if view=='desktop' else 364
        if crop.size!=(base.width,expected_height):
            raise RuntimeError(f'Crop dimensions changed at frame {row["frame"]}.')
        top=base.height-crop.height
        alpha=np.ones((crop.height,1,1),dtype=np.float32)
        t=np.linspace(0,1,16,dtype=np.float32)
        alpha[:16,0,0]=t*t*(3-2*t)
        composite=original.copy()
        composite[top:]=original[top:]*(1-alpha)+np.array(crop,dtype=np.float32)*alpha
        path=target/f'{row["frame"]-1:04d}.png'
        Image.fromarray(np.uint8(np.clip(np.rint(composite),0,255))).save(path)
        frames.append({'frame':row['frame'],'path':str(path),'sha256':sha(path),
                       'cropSha256':row['sha256'],'reusedApprovedFrame':row['reused']})
    return record,frames,{'staticBeautyPath':str(base_path),'staticBeautySha256':sha(base_path),
                         'cropTopPixel':top,'cropHeight':crop.height,'featherPixels':16}

def encode(view):
    record,frames,composition=compose(view)
    folder=OUT/'delivery'/view
    delivery_name='desktop' if view=='desktop' else 'mobile'
    video=STAGE/f'{delivery_name}-film.mp4'
    run([FFMPEG,'-hide_banner','-loglevel','error','-y','-framerate','24','-start_number','0',
         '-i',folder/'composited/%04d.png','-frames:v','96','-vf','scale=out_color_matrix=bt709:out_range=tv',
         '-c:v','libx264','-crf','16','-preset','medium','-g','96','-keyint_min','96','-sc_threshold','0',
         '-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',
         '-color_range','tv','-movflags','+faststart','-an',video])
    probe=json.loads(run([FFPROBE,'-v','error','-count_frames','-show_entries',
        'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames,duration,color_space,color_transfer,color_primaries,color_range:format=duration,size',
        '-of','json',video]).stdout)
    streams=probe['streams']
    if len(streams)!=1:
        raise RuntimeError('Delivery must have one video stream and no audio.')
    stream=streams[0]
    if (stream['codec_type'],stream['codec_name'],stream['r_frame_rate'],int(stream['nb_read_frames']),
        stream['width'],stream['height'],float(stream['duration']))!=('video','h264','24/1',96,record['baseWidth'],record['baseHeight'],4.0):
        raise RuntimeError(f'Encoded contract failed for {view}: {stream}')
    if video.stat().st_size>=5000000:
        raise RuntimeError('Film exceeds its five-megabyte budget.')
    decoded=folder/'decoded'
    decoded.mkdir(exist_ok=True)
    run([FFMPEG,'-hide_banner','-loglevel','error','-y','-i',video,decoded/'%04d.png'])
    if len(list(decoded.glob('*.png')))!=96:
        raise RuntimeError('All 96 frames must decode.')
    changes=[]
    qualities=[]
    previous=None
    first=None
    for row in frames:
        current=Image.open(decoded/f'{row["frame"]:04d}.png').convert('RGB')
        original=Image.open(row['path']).convert('RGB')
        qualities.append({'frame':row['frame'],'psnrDb':psnr(current,original),
                          'decodedRgbSha256':source_frame_hash(current)})
        if first is None:
            first=current.copy()
        if previous is not None:
            changes.append({'from':row['frame']-1,'to':row['frame'],**temporal(previous,current)})
        previous=current
    seam={'from':96,'to':1,**temporal(previous,first)}
    median=float(np.median([r['meanChannelDelta255'] for r in changes]))
    seam['ratioToMedianAdjacentChange']=seam['meanChannelDelta255']/median
    if seam['ratioToMedianAdjacentChange']>2.5 or min(q['psnrDb'] for q in qualities)<38:
        raise RuntimeError(f'Compressed temporal/quality gate failed for {view}.')
    chosen=[1,13,25,37,49,61,73,96]
    tile_width=480 if view=='desktop' else 276
    tile_height=round(record['baseHeight']*tile_width/record['baseWidth'])
    sheet=Image.new('RGB',(4*tile_width,2*(tile_height+34)),(248,246,239))
    draw=ImageDraw.Draw(sheet)
    for idx,frame in enumerate(chosen):
        x,y=(idx%4)*tile_width,(idx//4)*(tile_height+34)
        draw.text((x+10,y+8),f'Frame {frame} / {(frame-1)/24:.3f} s',font=FONT,fill=(9,45,59))
        sample=Image.open(decoded/f'{frame:04d}.png').resize((tile_width,tile_height),Image.Resampling.LANCZOS)
        sheet.paste(sample,(x,y+34))
    contact=folder/f'{delivery_name}-full-loop-contact.jpg'
    sheet.save(contact,quality=95)
    report={'view':view,'sourceSha256':EXPECTED_SOURCE,'renderManifest':str(folder/'render-manifest.json'),
            'composition':composition,'frames':frames,'encodedVideo':str(video),'encodedVideoSha256':sha(video),
            'probe':probe,'decodedFrames':96,'decodedFrameQuality':qualities,'adjacentFrameChanges':changes,
            'loopSeam':seam,'minimumPsnrDb':min(q['psnrDb'] for q in qualities),
            'meanPsnrDb':sum(q['psnrDb'] for q in qualities)/96,'contactSheet':str(contact),
            'contactSheetSource':'Freshly decoded frames of final MP4.'}
    (folder/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report

def posters(view,full_quality,small_quality):
    name='desktop' if view=='desktop' else 'mobile'
    decoded=OUT/'delivery'/view/'decoded'
    first=Image.open(decoded/'0001.png').convert('RGB')
    last=Image.open(decoded/'0096.png').convert('RGB')
    small_size=(960,640) if view=='desktop' else (414,608)
    records={}
    comparisons=[]
    for suffix,key,original,quality,frame in [
        ('poster','Poster',first,full_quality,1),('end','End',last,92,96),
        ('small-poster','SmallPoster',first.resize(small_size,Image.Resampling.LANCZOS),small_quality,1)]:
        path=STAGE/f'{name}-{suffix}.webp'
        original.save(path,format='WEBP',quality=quality,method=6)
        image=Image.open(path).convert('RGB')
        score=psnr(original,image)
        threshold=37 if key=='SmallPoster' else 39
        if score<threshold:
            raise RuntimeError(f'{name}-{suffix} quality fell below {threshold} dB: {score}')
        extra={'decodedVideoFrame':frame,'pixelIdenticalToDecodedFrame':False,'encoding':'webp-lossy',
               'quality':quality,'sourceDecodedRgbSha256':source_frame_hash(first if frame==1 else last),
               'psnrToResizedDecodedFrame' if key=='SmallPoster' else 'psnrToDecodedFrame':round(score,3)}
        records[name+key]=asset_record(path,*image.size,**extra)
        comparisons.append({'asset':str(path),'frame':frame,'comparison':'resized decoded frame' if key=='SmallPoster' else 'decoded frame',
                            'psnrDb':score,'sourceRgbSha256':source_frame_hash(original)})
    tile_width=720 if view=='desktop' else 414
    tile_height=round(first.height*tile_width/first.width)
    sheet=Image.new('RGB',(tile_width*2,tile_height+40),(248,246,239))
    draw=ImageDraw.Draw(sheet)
    draw.text((12,10),'Decoded MP4 opening frame',font=FONT,fill=(9,45,59))
    draw.text((tile_width+12,10),f'Opening WebP / {records[name+"Poster"]["psnrToDecodedFrame"]:.2f} dB',font=FONT,fill=(9,45,59))
    sheet.paste(first.resize((tile_width,tile_height),Image.Resampling.LANCZOS),(0,40))
    sheet.paste(Image.open(STAGE/f'{name}-poster.webp').resize((tile_width,tile_height),Image.Resampling.LANCZOS),(tile_width,40))
    comparison_path=OUT/'delivery'/view/f'{name}-poster-comparison.jpg'
    sheet.save(comparison_path,quality=95)
    return records,{'assets':comparisons,'comparisonImage':str(comparison_path)}

if sha(MASTER_SOURCE)!=EXPECTED_SOURCE:
    raise RuntimeError('Packed render master identity differs from approved source.')
bundle=json.loads((Path(__file__).parent/'source-bundle.json').read_text())
if (bundle['packedRenderMasterSha256']!=EXPECTED_SOURCE or sha(SOURCE)!=bundle['portableBlendSha256']
        or not bundle['structuralSnapshotBeforeEqualsAfter'] or not bundle['imageBytesPreservedExactly']):
    raise RuntimeError('Portable source bundle verification failed.')
for dependency in bundle['dependencies']:
    dependency_path=Path(__file__).parent/dependency['relativePath'].removeprefix('//')
    if sha(dependency_path)!=dependency['sha256']:
        raise RuntimeError('Portable source dependency identity changed.')
STAGE.mkdir(parents=True,exist_ok=True)
backup=OUT/'delivery/previous-public'
if not backup.exists():
    shutil.copytree(PUBLIC,backup)
previous=json.loads((backup/'manifest.json').read_text())
evidence={'desktop':encode('desktop'),'portrait':encode('portrait')}
assets={}
poster_evidence={}
for full_quality,small_quality in [(90,85),(89,84),(88,83)]:
    for view in ['desktop','portrait']:
        rows,proof=posters(view,full_quality,small_quality)
        assets.update(rows)
        poster_evidence[view]=proof
    opening_bytes=sum(v['bytes'] for key,v in assets.items() if key.endswith('Poster'))
    if opening_bytes<=365000:
        break
else:
    raise RuntimeError('The four opening posters exceed the accepted combined budget.')
for view,name in [('desktop','desktop'),('portrait','mobile')]:
    stream=evidence[view]['probe']['streams'][0]
    assets[name+'Video']=asset_record(STAGE/f'{name}-film.mp4',stream['width'],stream['height'],
        fps=24,frames=96,durationSeconds=4.0,hasAudio=False)
if set(assets)!=set(previous['files']):
    raise RuntimeError('Public asset keys changed.')
for key,value in assets.items():
    if value['path']!=previous['files'][key]['path']:
        raise RuntimeError('Public asset paths changed.')
manifest={'schemaVersion':1,'status':'ready','revision':'living-city-clean-loop-v2',
          'openingPosterBytes':opening_bytes,'playback':{'mode':'seamless-loop','introductionSeconds':12,'loopSeconds':4},
          'source':{'blendPath':'motion/blender/living-city-refinement/living-city-refined-loop4.blend',
                    'sha256':bundle['portableBlendSha256'],'packedRenderMasterSha256':EXPECTED_SOURCE,
                    'bundleManifest':'motion/blender/living-city-refinement/source-bundle.json',
                    'imageDependenciesPreservedExactly':True,
                    'baselineSha256':'64e1c1489458c22af03d28621050b9d49991873df4ec4978a1195d373fe8c27f',
                    'blenderVersion':'5.2.2 LTS','renderer':'CYCLES','samples':64,'fps':24,
                    'uniqueFramesPerView':96,'staticCamera':True,'offlineCropComposite':True},
          'files':{key:assets[key] for key in previous['files']}}
(STAGE/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
verification={'sourceSha256':EXPECTED_SOURCE,'portableSource':str(SOURCE),
    'portableSourceSha256':bundle['portableBlendSha256'],'sourceBundleManifest':str(Path(__file__).parent/'source-bundle.json'),
    'approvedFramesPerView':96,
    'allFrameDecodePassed':True,'noAudio':True,'views':{v:{k:r[k] for k in ['minimumPsnrDb','meanPsnrDb','loopSeam','contactSheet','encodedVideoSha256']} for v,r in evidence.items()},
    'posters':poster_evidence,'openingPosterBytes':opening_bytes,'openingPosterBudgetBytes':365000,
    'publicManifest':str(PUBLIC/'manifest.json'),'stagedManifest':str(STAGE/'manifest.json'),
    'publicAssetKeysAndPathsPreserved':True,'published':False}
if args.publish:
    for row in assets.values():
        src=STAGE/Path(row['path']).name
        shutil.copy2(src,PUBLIC/src.name)
        if sha(PUBLIC/src.name)!=row['sha256']:
            raise RuntimeError('Public copy failed identity verification.')
    shutil.copy2(STAGE/'manifest.json',PUBLIC/'manifest.json')
    verification['published']=True
(OUT/'delivery/verification.json').write_text(json.dumps(verification,indent=2),encoding='utf-8')
print(json.dumps({'published':verification['published'],'openingPosterBytes':opening_bytes,
    'films':{name:assets[name+'Video']['bytes'] for name in ['desktop','mobile']},
    'verification':str(OUT/'delivery/verification.json')},indent=2))
