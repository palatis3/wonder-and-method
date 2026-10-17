"""Trace transparent corridors between the seven glyphs; never edit the art."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
art = Image.open(root / 'public/buffalo-sage/word-source.png').convert('RGBA')
alpha = np.asarray(art)[:, :, 3]
height, width = alpha.shape
ranges = [(318, 343), (597, 621), (780, 808), (925, 1060), (1250, 1285), (1435, 1505)]
preferred = [334, 611, 792, None, 1270, 1453]

def simplify(points, tolerance=.35):
    if len(points) < 3:
        return points
    start, end = np.array(points[0]), np.array(points[-1])
    values = np.array(points[1:-1])
    line = end - start
    distances = np.abs(line[0] * (start[1] - values[:, 1]) - (start[0] - values[:, 0]) * line[1]) / np.linalg.norm(line)
    index = int(np.argmax(distances)) + 1
    if distances[index - 1] <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)

seams, evidence = [], []
for index, (left, right) in enumerate(ranges):
    columns = np.arange(left, right + .25, .25)
    # Pixel centers are n + .5. Trace the real subpixel cut, including a
    # quarter-pixel safety envelope; the opaque threshold remains 128.
    def alpha_at(xs):
        centers = xs - .5
        lo = np.floor(centers).astype(int)
        weight = centers - lo
        return alpha[:, lo] * (1 - weight) + alpha[:, lo + 1] * weight
    opacity = np.maximum.reduce([alpha_at(columns + offset) for offset in [-.125, 0, .125]])
    if index == 3:
        target = np.interp(np.arange(height), [0, 340, 550, height - 1], [1040, 1040, 944, 944])
    else:
        target = np.full(height, preferred[index])
    cost = (opacity / 255) ** 2 * 1000 + np.abs(columns[None, :] - target[:, None]) * .002
    previous = np.empty((height, len(columns)), dtype=np.int16)
    total = cost[0].copy()
    for y in range(1, height):
        candidates = np.vstack([np.r_[np.inf, total[:-1]], total, np.r_[total[1:], np.inf]])
        choice = candidates.argmin(axis=0)
        previous[y] = np.arange(len(columns)) + choice - 1
        total = cost[y] + candidates[choice, np.arange(len(columns))]
    column = int(total.argmin())
    route = []
    for y in range(height - 1, -1, -1):
        route.append([float(columns[column]), y])
        if y:
            column = int(previous[y, column])
    route.reverse()
    simplified = simplify(route, tolerance=.08)
    sampled = np.interp(np.arange(height), [p[1] for p in simplified], [p[0] for p in simplified])
    def samples(offset):
        centers = sampled + offset - .5
        lo = np.floor(centers).astype(int)
        weight = centers - lo
        return alpha[np.arange(height), lo] * (1 - weight) + alpha[np.arange(height), lo + 1] * weight
    crossed = np.maximum.reduce([samples(offset) for offset in [-.125, 0, .125]])
    opaque_count = int(np.count_nonzero(crossed >= 128))
    if opaque_count:
        raise ValueError(f'Boundary {index + 1} crosses {opaque_count} opaque rows; inspect the source before changing the corridor.')
    seams.append([[simplified[0][0], 0], *simplified[1:-1], [simplified[-1][0], height]])
    evidence.append({'boundary': index + 1, 'vertices': len(seams[-1]), 'opaqueCrossings': opaque_count, 'maxCutEnvelopeAlpha': float(crossed.max()), 'cutEnvelopePixels': .25})

boundaries = [[[0, 0], [0, height]], *seams, [[width, 0], [width, height]]]
polygons = [boundaries[i] + list(reversed(boundaries[i + 1])) for i in range(7)]
clips = [','.join(f'{x / width * 100:.6f}% {y / height * 100:.6f}%' for x, y in polygon) for polygon in polygons]
output = '// Generated transparent-corridor partitions. Adjacent letters share exact boundaries.\n'
output += 'export const letterClips = ' + json.dumps(clips, indent=2) + ';\n'
(root / 'motion/buffalo-letter-silhouettes.js').write_text(output, encoding='utf8')
(root / 'evidence/premium-audit-20261015/silhouette-check.json').write_text(json.dumps({'size': [width, height], 'sourceOpaquePixels': int(np.count_nonzero(alpha >= 128)), 'finalPartitionCoverage': '100%; seven shared-boundary regions partition the complete source rectangle', 'boundaries': evidence, 'polygons': polygons}, indent=2), encoding='utf8')
print(json.dumps({'letters': 7, 'opaquePixels': int(np.count_nonzero(alpha >= 128)), 'boundaryOpaqueCrossings': [e['opaqueCrossings'] for e in evidence]}))
