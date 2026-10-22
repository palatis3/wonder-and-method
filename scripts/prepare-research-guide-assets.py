"""Reproduce the original diagrams, social cards and related-guide thumbnails."""
from pathlib import Path
import json, html, textwrap, sys, subprocess
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
source = (root / 'src/research-guides.mjs').read_text(encoding='utf-8')
longtail = '--longtail' in sys.argv
guides = json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {longtailGuideDetails} from './src/longtail-guides.mjs'; console.log(JSON.stringify(longtailGuideDetails));"],cwd=root,text=True,encoding='utf-8')) if longtail else json.loads(source.split(' = ', 1)[1].split('\n};', 1)[0] + '\n}')
assets = root / 'src/assets'
ink, paper, pale, line = '#193b30', '#f8f7f2', '#e6ecdf', '#b9c8b3'

def font(size, serif=False):
    candidates = [Path('C:/Windows/Fonts') / ('georgia.ttf' if serif else 'arial.ttf'), Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSerif.ttf' if serif else 'DejaVuSans.ttf')]
    return ImageFont.truetype(str(next(p for p in candidates if p.exists())), size)

def lines(draw, text, face, width):
    result, current = [], ''
    for word in text.split():
        test = (current + ' ' + word).strip()
        if current and draw.textlength(test, font=face) > width:
            result.append(current); current = word
        else: current = test
    return result + [current]

def card(title, steps, target):
    im = Image.new('RGB', (1200, 630), paper); d = ImageDraw.Draw(im)
    d.text((58, 34), 'WONDER AND METHOD  /  PRACTICAL WEBSITE GUIDES', fill=ink, font=font(18))
    face=font(49, True); heading=lines(d,title,face,1080)
    for i, text in enumerate(heading): d.text((58, 97+i*60),text,fill=ink,font=face)
    top=max(310,110+len(heading)*60)
    for i,(label,detail) in enumerate(steps):
        x=58+i*368
        d.rounded_rectangle((x,top,x+346,548),radius=13,fill=pale)
        d.text((x+20,top+19),f'0{i+1}',fill=ink,font=font(19))
        y=top+51
        for text in lines(d,label,font(23,True),300): d.text((x+20,y),text,fill=ink,font=font(23,True));y+=29
        y+=12
        for text in lines(d,detail,font(18),300):d.text((x+20,y),text,fill=ink,font=font(18));y+=24
        assert y<550,(title,label,'card overflow')
    d.line((58,581,1142,581),fill=line,width=1)
    d.text((58,598),'wonderandmethod.com',fill=ink,font=font(16))
    im.save(target,optimize=True)
    return im

for slug,item in guides.items():
    pieces=[f'<svg xmlns="http://www.w3.org/2000/svg" width="360" height="560" viewBox="0 0 360 560" role="img" aria-labelledby="title desc"><title id="title">{html.escape(item["indexTitle"])}</title><desc id="desc">{html.escape(". ".join(t+": "+s for t,s in item["steps"]))}</desc><rect width="360" height="560" rx="16" fill="{paper}"/><text x="24" y="32" font-family="Arial,sans-serif" font-size="12" fill="{ink}">WONDER AND METHOD · PRACTICAL GUIDE</text>']
    for i,(label,detail) in enumerate(item['steps']):
        y=55+i*164
        pieces.append(f'<rect x="20" y="{y}" width="320" height="140" rx="12" fill="{pale}"/><text x="38" y="{y+28}" font-family="Arial,sans-serif" font-size="13" fill="{ink}">0{i+1}</text>')
        label_lines=textwrap.wrap(label,25);text_y=y+58
        for s in label_lines:pieces.append(f'<text x="38" y="{text_y}" font-family="Georgia,serif" font-size="22" fill="{ink}">{html.escape(s)}</text>');text_y+=25
        text_y+=9
        for s in textwrap.wrap(detail,32):pieces.append(f'<text x="38" y="{text_y}" font-family="Arial,sans-serif" font-size="15" fill="{ink}">{html.escape(s)}</text>');text_y+=20
        assert text_y<=y+145,(slug,'diagram overflow')
        if i<2:pieces.append(f'<path d="M180 {y+144}v15m-5-5 5 5 5-5" fill="none" stroke="{ink}" stroke-width="1.5"/>')
    pieces.append('</svg>')
    (assets/'guides'/f'{slug}-flow.svg').write_text(''.join(pieces),encoding='utf-8')
    im=card(item['title'],item['steps'],assets/'social'/f'guides-{slug}.png')
    im.save(assets/'guides'/f'{slug}-flow-social.png',optimize=True)
    for width in [480,720,1080]:
        canvas=Image.new('RGB',(width,width*2//3),pale)
        scaled=im.resize((width,round(width*630/1200)),Image.Resampling.LANCZOS)
        canvas.paste(scaled,(0,(canvas.height-scaled.height)//2))
        canvas.save(assets/'guides'/f'{slug}-card-{width}.webp','WEBP',quality=88)

if not longtail:
    card('Website ROI calculator for small businesses',[('Set the assumptions','Cost, inquiries and contribution'),('Compare scenarios','See what changes the result'),('Check the decision','Break-even and simple payback')],assets/'social/tools-website-roi-calculator.png')
    card('Small business website and redesign costs: plan the full budget',[('Scope the build','Pages, writing and functionality'),('Include the move','Content, URLs and account access'),('Plan ongoing costs','Provider bills and optional help')],assets/'social/guides-website-project-cost.png')
    card('Website and SEO guides for small businesses',[('Solve a problem','Find the first missing step'),('Plan the work','Useful templates and checklists'),('Choose the next step','Costs, structure and ongoing care')],assets/'social/guides.png')
print(f'Created {len(guides)} original diagram sets and their social cards.')
