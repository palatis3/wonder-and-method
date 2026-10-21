"""Assemble exact rendered gate images and measured costs for primary review."""
from __future__ import annotations
import json
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT/'output/living-city-refinement'
BASE = ROOT/'output/living-city/final-frames'
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)


def build_comparison(view, records, crop=None):
    paths = [('Original Cycles / 64 samples',BASE/f'{view}-0001.png')]
    for r in records:
        if r['view']==view:
            paths.append((f"{r['renderer']['engine'].upper()} / {r['renderer']['samples']} samples / {r['renderSeconds']:.1f}s",Path(r['imagePath'])))
    width = 720 if view=='desktop' else 414
    height = 480 if view=='desktop' else 608
    margin,head = 16,50
    canvas = Image.new('RGB',(len(paths)*width+(len(paths)+1)*margin,height+head+margin),(248,246,239))
    draw = ImageDraw.Draw(canvas)
    for idx,(title,path) in enumerate(paths):
        img=Image.open(path).convert('RGB')
        if crop:
            img=img.crop(crop)
        img=img.resize((width,height),Image.Resampling.LANCZOS)
        x=margin+(width+margin)*idx
        draw.text((x,15),title,font=FONT if view=='desktop' else SMALL,fill=(9,45,59))
        canvas.paste(img,(x,head))
    suffix='-detail' if crop else ''
    path=OUT/f'{view}{suffix}-gate-comparison.jpg'
    canvas.save(path,quality=95,subsampling=0)
    return str(path)


def main():
    paths=sorted(OUT.glob('*-s*-f0001.json'))
    records=[json.loads(p.read_text(encoding='utf-8')) for p in paths]
    records=[r for r in records if 'imagePath' in r]
    comparison={view:build_comparison(view,records) for view in ['desktop','portrait']}
    comparison['desktopDetail']=build_comparison('desktop',records,(540,300,1440,900))
    timing={}
    for engine in ['cycles','eevee']:
        rows=[r for r in records if r['renderer']['engine']==engine]
        by_view={r['view']:r['renderSeconds'] for r in rows}
        timing[engine]={'observedColdRenderSecondsByView':by_view,'loopEstimates':{}}
        if len(by_view)==2:
            per_pair=sum(by_view.values())
            for duration in [2,4,6]:
                seconds=duration*24*per_pair
                timing[engine]['loopEstimates'][str(duration)]={'secondsPerView':duration,'fps':24,'totalUniqueFrames':duration*24*2,'estimatedRenderSecondsBothViews':round(seconds,1),'estimatedRenderMinutesBothViews':round(seconds/60,1)}
    source=json.loads((BASE/'desktop-render-source.json').read_text())
    manifest={
        'gateStatus':'awaiting_primary_visual_and_budget_review',
        'fullDeliveryStarted':False,
        'renderedGateImages':len(records),
        'refinementScript':str(ROOT/'motion/blender/living-city-refinement/refine_scene.py'),
        'refinedBlend':str(OUT/'living-city-refined-loop4.blend'),
        'baselineMatchesReferenceFrames':all(r['baselineSha256']==source['blendSha256'] for r in records),
        'comparisons':comparison,
        'benchmarks':[{k:r[k] for k in ['view','width','height','renderer','imagePath','renderSeconds','prepareSeconds','totalSeconds','loopSeconds','loopFrames','baselineSha256','scriptSha256']} for r in records],
        'timing':timing,
        'estimateLimits':['Measured one full-resolution gate frame per camera/renderer. Includes renderer initialization and scene sync within render call.','Steady-state persistent animation may be faster; no warm animation benchmark has been authorized or measured.','Single GPU job at a time. Estimates exclude encoding and visual review.'],
        'principleChanges':records[0]['principleChanges'] if records else [],
        'periodicity':records[0]['ambient']['periodicity'] if records else None,
        'unverified':['Actual rendered seam','Temporal denoiser stability','Visual motion amplitude over a complete loop','Native HTML overlay safe areas in current build'],
        'documentation':['https://docs.blender.org/api/5.2/bpy.types.SceneEEVEE.html','https://docs.blender.org/api/5.2/bpy.types.RaytraceEEVEE.html','https://docs.blender.org/api/5.2/bpy.types.Material.html']
    }
    manifest['rendererDecision']={'selected':'cycles','eevee':'rejected',
        'reason':'Desktop EEVEE took294.459s, reported repeated shadow-buffer exhaustion, and the inspected result has blurred interiors/refraction, harsher contact shadows, and weaker water reflections. Phone EEVEE was skipped after this failed gate.',
        'qualityGate':'Cycles static desktop composition and lighting approved by primary; temporal approval pending.'}
    manifest['proposedPlayback']={'mode':'seamless-loop','introductionSeconds':12,'loopSeconds':4,'fps':24,'uniqueFramesPerView':96,'cameraArrival':False,'nativeStory':'Fieldwork, Northline, Hearthside; primary owns HTML/runtime.'}
    crop_rows=[]
    for view in ['desktop','portrait']:
        crop_path=OUT/'crop-benchmark'/view/'render-manifest.json'
        if crop_path.is_file():
            c=json.loads(crop_path.read_text())
            times=[t['seconds'] for t in c['timings']]
            crop_rows.append({'view':view,'samples':c['samples'],'adaptiveThreshold':c['adaptiveThreshold'],
                'bottomFraction':c['borderBottomFraction'],'coldFrameSeconds':times[0],
                'warmFrameSeconds':times[-1] if len(times)>1 else None,'manifest':str(crop_path)})
    manifest['cropBenchmarks']=crop_rows
    if len(crop_rows)==2 and all(r['warmFrameSeconds'] for r in crop_rows):
        estimated=sum(r['coldFrameSeconds']+95*r['warmFrameSeconds'] for r in crop_rows)
        manifest['recommendedStrategy']={'renderer':'CYCLES','samples':64,'adaptiveThreshold':.025,
            'method':'Full static clean-city beauty plus padded true-3D lower-city crop, composited offline with a16px top-edge feather into ordinary full-frame PNGs/MP4. Full scene remains available for all reflection/shadow rays.',
            'estimatedBothViews96FramesSeconds':round(estimated,1),'estimatedBothViews96FramesMinutes':round(estimated/60,1),
            'scope':'Do not start the full96-frame-per-view delivery until primary approves the seam sample.'}
    integrity=OUT/'crop-integrity.json'
    if integrity.is_file():
        manifest['cropIntegrity']=json.loads(integrity.read_text())
    manifest['seamSamples']={}
    for view in ['desktop','portrait']:
        sample=OUT/'seam-sample'/view/'composite-manifest.json'
        if sample.is_file():
            manifest['seamSamples'][view]=json.loads(sample.read_text())
    approval=OUT/'delivery-approval.json'
    if approval.is_file():
        manifest['deliveryApproval']=json.loads(approval.read_text())
        manifest['gateStatus']='static_and_compressed_temporal_gates_approved_by_primary'
        manifest['fullDeliveryStarted']=(OUT/'delivery/desktop/render-manifest.json').is_file()
        manifest['rendererDecision']['qualityGate']='Desktop and phone static, crop-integrity and compressed loop-seam gates approved by primary.'
        manifest['unverified']=['Visual motion across full 4-second loop','Native HTML overlays with final public assets']
        manifest['estimateLimits']=['Static timings include cold initialization. Approved 24-frame temporal samples also measure steady-state render cost.','Single GPU job at a time. Estimates exclude encoding and visual review.']
        if 'recommendedStrategy' in manifest:
            manifest['recommendedStrategy']['scope']='Full 96-frame-per-view delivery approved; reuse source-identical gate frames.'
    delivery=OUT/'delivery/verification.json'
    if delivery.is_file():
        manifest['deliveryVerification']=json.loads(delivery.read_text())
        manifest['gateStatus']='full_delivery_encoded_and_all_frames_verified'
        manifest['unverified']=['Native HTML overlays and playback with final public assets']
    path=OUT/'gate-manifest.json'
    path.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps({'manifest':str(path),'images':len(records),'comparisons':comparison,'timing':timing},indent=2))


if __name__=='__main__':
    main()
