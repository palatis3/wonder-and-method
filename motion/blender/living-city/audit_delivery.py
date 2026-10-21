"""Check delivered files and make a visual review of the decoded final films.

Run after encode_delivery.py. Metrics describe compression and frame differences;
they do not replace inspection of the contact sheets and actual motion.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'output/living-city'
PUBLIC = ROOT / 'public/living-city'
REVIEW = OUT / 'final-review'
REVIEW.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--view', choices=['both', 'desktop', 'portrait'], default='both')
parser.add_argument('--partial', action='store_true')
args = parser.parse_args()
if args.partial and args.view == 'both':
    raise RuntimeError('A partial audit must name one camera view')
manifest_path = OUT / (args.view + '-delivery-verification.json') if args.partial else PUBLIC / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
verification = json.loads((OUT / 'scene-verification.json').read_text())
if not args.partial and manifest['status'] != 'ready':
    raise RuntimeError('Delivery is not ready')

for record in manifest['files'].values():
    path = PUBLIC / Path(record['path']).name
    if path.stat().st_size != record['bytes']:
        raise RuntimeError('Byte count mismatch: ' + str(path))
    if hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
        raise RuntimeError('Checksum mismatch: ' + str(path))

report = {'manifestChecksumsMatch': True, 'partial': args.partial, 'views': {}}
for view, label, selected in [
    ('desktop', 'desktop', [1, 20, 37, 51, 65, 77, 89, 101]),
    ('portrait', 'mobile', [1, 9, 20, 29, 39, 49, 59, 72]),
]:
    if args.view != 'both' and args.view != view:
        continue
    settings = verification['cameras'][view]
    rows = []
    previous = None
    for entry in settings['frameMap']:
        decoded_path = OUT / 'decoded-delivery' / label / f"{entry['frame']:04d}.png"
        raw_path = OUT / 'final-frames' / f"{view}-{entry['renderFrame']:04d}.png"
        raw = np.asarray(Image.open(raw_path).convert('RGB'), dtype=np.float32)
        decoded = np.asarray(Image.open(decoded_path).convert('RGB'), dtype=np.float32)
        if raw.shape != decoded.shape:
            raise RuntimeError('Decoded frame dimensions changed')
        mse = float(np.mean((raw - decoded) ** 2))
        psnr = 10 * math.log10(255 ** 2 / mse) if mse else 100.0
        adjacent = float(np.mean(np.abs(decoded - previous))) if previous is not None else None
        rows.append({
            'frame': entry['frame'],
            'renderFrame': entry['renderFrame'],
            'compressionPSNR': round(psnr, 3),
            'adjacentDecodedMeanAbsoluteDifference': round(adjacent, 4) if adjacent is not None else None,
        })
        previous = decoded

    matches = {}
    still_psnr = {}
    for suffix, frame in [('poster', 1), ('end', settings['frames'])]:
        still = Image.open(PUBLIC / f'{label}-{suffix}.webp').convert('RGB')
        decoded = Image.open(OUT / 'decoded-delivery' / label / f'{frame:04d}.png').convert('RGB')
        record = manifest['files'][label + ('Poster' if suffix == 'poster' else 'End')]
        matches[suffix] = still.size == decoded.size and hashlib.sha256(decoded.tobytes()).hexdigest() == record['sourceDecodedRgbSha256'] and record['decodedVideoFrame'] == frame and record['pixelIdenticalToDecodedFrame'] is False
        mse = float(np.mean((np.asarray(still, dtype=np.float32) - np.asarray(decoded, dtype=np.float32)) ** 2))
        still_psnr[suffix] = round(10 * math.log10(255 ** 2 / mse), 3) if mse else 100.0
        if abs(still_psnr[suffix] - record['psnrToDecodedFrame']) > .002:
            raise RuntimeError('Public still quality metadata does not match the file')
    if not all(matches.values()):
        raise RuntimeError('Still source frame or lossy-encoding declaration is incorrect')

    tile_width = 480 if view == 'desktop' else 276
    tile_height = 320 if view == 'desktop' else 405
    label_height = 28
    columns = 4
    canvas = Image.new('RGB', (columns * tile_width, 2 * (tile_height + label_height)), (244, 241, 233))
    draw = ImageDraw.Draw(canvas)
    for index, frame in enumerate(selected):
        image = Image.open(OUT / 'decoded-delivery' / label / f'{frame:04d}.png').convert('RGB')
        image = image.resize((tile_width, tile_height), Image.Resampling.LANCZOS)
        x = (index % columns) * tile_width
        y = (index // columns) * (tile_height + label_height)
        draw.text((x + 8, y + 7), f'{label} frame {frame} / {settings["frames"]}', fill=(28, 41, 42))
        canvas.paste(image, (x, y + label_height))
    sheet = REVIEW / f'{label}-decoded-contact.jpg'
    canvas.save(sheet, quality=95)

    decoded_first = Image.open(OUT / 'decoded-delivery' / label / '0001.png').convert('RGB')
    public_first = Image.open(PUBLIC / f'{label}-poster.webp').convert('RGB')
    amplified_difference = ImageEnhance.Brightness(ImageChops.difference(decoded_first, public_first)).enhance(8)
    comparison = Image.new('RGB', (3 * tile_width, tile_height + label_height), (244, 241, 233))
    comparison_draw = ImageDraw.Draw(comparison)
    for column, (title, image) in enumerate([('Decoded film opening', decoded_first), ('Public WebP opening', public_first), ('Absolute difference x8', amplified_difference)]):
        comparison_draw.text((column * tile_width + 8, 7), title, fill=(28, 41, 42))
        comparison.paste(image.resize((tile_width, tile_height), Image.Resampling.LANCZOS), (column * tile_width, label_height))
    comparison.save(REVIEW / f'{label}-poster-comparison.png')

    hold_differences = [row['adjacentDecodedMeanAbsoluteDifference'] for row in rows if row['frame'] > settings['settledFrame']]
    report['views'][view] = {
        'framesChecked': len(rows),
        'minimumCompressionPSNR': min(row['compressionPSNR'] for row in rows),
        'meanCompressionPSNR': round(sum(row['compressionPSNR'] for row in rows) / len(rows), 3),
        'maximumHoldAdjacentMeanDifference': max(hold_differences),
        'stillSourceFrameMatches': matches,
        'publicStillsPixelIdentical': False,
        'publicStillCompressionPSNR': still_psnr,
        'contactSheet': str(sheet.relative_to(ROOT)).replace('\\', '/'),
        'frameMetrics': rows,
    }

report['scope'] = 'All decoded frames checked against their approved rendered sources. Compression and adjacent-frame metrics require visual interpretation; static source holds may have tiny encoding differences.'
(REVIEW / (args.view + '-audit.json' if args.partial else 'audit.json')).write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: value if key != 'views' else {view: {k: v for k, v in data.items() if k != 'frameMetrics'} for view, data in value.items()} for key, value in report.items()}, indent=2))
