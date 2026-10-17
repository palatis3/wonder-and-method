"""Reproduce Newsreader's lossless Latin / Latin Extended delivery subsets.

Requires the already-installed fontTools 4.67.0 and Brotli 1.2.0.
Run `python scripts/subset-premium-font.py` from any directory. No downloads.
The original is hash-checked and never overwritten; all subsets derive from it.
CSS unicode-range declarations must match the generated evidence report.
"""
from hashlib import sha256
from html import unescape
from io import BytesIO
from pathlib import Path
import json
import stat

import brotli
import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'src/assets/premium'
EVIDENCE = ROOT / 'evidence/competitive-offers-20261015'
ORIGINAL = EVIDENCE / 'newsreader-original.woff2'
ORIGINAL_SHA256 = '36491e9d777a0c176acfc6f529685beea26d7296ac68d084c5e38e4d460bdf7f'


def digest(data):
    return sha256(data).hexdigest()


def ranges(codepoints):
    runs = []
    for cp in sorted(codepoints):
        if runs and cp == runs[-1][1] + 1:
            runs[-1][1] = cp
        else:
            runs.append([cp, cp])
    return ','.join(f'U+{a:04X}' + (f'-{b:04X}' if b != a else '') for a, b in runs)


def axes(font):
    return [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in font['fvar'].axes]


def device_value(device, font):
    if device.DeltaFormat != 0x8000:
        return (device.StartSize, device.EndSize, device.DeltaFormat, tuple(device.DeltaValue))
    return variation_value(font['GDEF'].table.VarStore, device.StartSize, device.EndSize)


def variation_value(store, outer, inner):
    data = store.VarData[outer]
    result = []
    for index, delta in zip(data.VarRegionIndex, data.Item[inner]):
        if delta:
            region = store.VarRegionList.Region[index]
            support = tuple((a.StartCoord, a.PeakCoord, a.EndCoord) for a in region.VarRegionAxis)
            result.append((support, delta))
    return tuple(sorted(result))


def value(record, font):
    if record is None:
        return ()
    return tuple(sorted((key, device_value(val, font) if key.endswith('Device') else val)
                        for key, val in vars(record).items() if val))


def pair_lookups(font):
    """Expand PairPos without changing first-matching-subtable semantics."""
    lookups = []
    for lookup in font['GPOS'].table.LookupList.Lookup:
        subtables = []
        for sub in lookup.SubTable:
            kind = lookup.LookupType
            if kind == 9:
                kind, sub = sub.ExtensionLookupType, sub.ExtSubTable
            assert kind == 2, 'Unexpected GPOS type; extend validation before proceeding'
            if sub.Format == 1:
                pairs = {}
                for first, pairset in zip(sub.Coverage.glyphs, sub.PairSet):
                    for pair in pairset.PairValueRecord:
                        pairs[first, pair.SecondGlyph] = (value(pair.Value1, font), value(pair.Value2, font))
                subtables.append(('pairs', pairs))
            else:
                assert sub.Format == 2
                cells = [[(value(c.Value1, font), value(c.Value2, font)) for c in r.Class2Record]
                         for r in sub.Class1Record]
                subtables.append(('classes', set(sub.Coverage.glyphs), sub.ClassDef1.classDefs,
                                  sub.ClassDef2.classDefs, cells))
        lookups.append(subtables)
    return lookups


def pair_result(lookups, first, second):
    result = []
    for subtables in lookups:
        found = ((), ())
        for sub in subtables:
            if sub[0] == 'pairs':
                if (first, second) in sub[1]:
                    found = sub[1][first, second]
                    break
            elif first in sub[1]:
                found = sub[4][sub[2].get(first, 0)][sub[3].get(second, 0)]
                break
        result.append(found)
    return result


def validate(original, candidate, retained_names):
    correspondence = dict(zip(retained_names, candidate.getGlyphOrder()))
    assert axes(original) == axes(candidate)
    for table in ['fvar', 'avar', 'STAT', 'name']:
        assert original.getTableData(table) == candidate.getTableData(table), table
    for metric in ['ascent', 'descent', 'lineGap']:
        assert getattr(original['hhea'], metric) == getattr(candidate['hhea'], metric)
    for old, new in correspondence.items():
        assert original['hmtx'][old] == candidate['hmtx'][new], old
        left, lc = original['glyf']._getCoordinatesAndControls(old, original['hmtx'].metrics)
        right, rc = candidate['glyf']._getCoordinatesAndControls(new, candidate['hmtx'].metrics)
        assert left == right and lc.endPts == rc.endPts, old
        lg, rg = original['glyf'][old], candidate['glyf'][new]
        assert lg.numberOfContours == rg.numberOfContours, old
        if lg.isComposite():
            assert [(correspondence[c.glyphName], c.getComponentInfo()[1]) for c in lg.components] == [c.getComponentInfo() for c in rg.components], old
        elif lg.numberOfContours > 0:
            assert lg.flags == rg.flags, old
        lv = original['gvar'].variations.get(old, [])
        rv = candidate['gvar'].variations.get(new, [])
        assert [(v.axes, v.coordinates) for v in lv] == [(v.axes, v.coordinates) for v in rv], old
        lh, rh = original['HVAR'].table, candidate['HVAR'].table
        for field in ['AdvWidthMap', 'LsbMap', 'RsbMap']:
            lm, rm = getattr(lh, field), getattr(rh, field)
            if lm is None or rm is None:
                assert lm is rm and field != 'AdvWidthMap', field
                continue
            li, ri = lm.mapping[old], rm.mapping[new]
            assert variation_value(lh.VarStore, li >> 16, li & 0xFFFF) == variation_value(rh.VarStore, ri >> 16, ri & 0xFFFF), old
    left_pairs, right_pairs = pair_lookups(original), pair_lookups(candidate)
    encoded = set(candidate.getBestCmap().values())
    encoded_correspondence = {old: new for old, new in correspondence.items() if new in encoded}
    for old_first, new_first in encoded_correspondence.items():
        for old_second, new_second in encoded_correspondence.items():
            assert pair_result(left_pairs, old_first, old_second) == pair_result(right_pairs, new_first, new_second), (old_first, old_second)
    return {'retainedGlyphsWithIdenticalOutlinesMetricsAndVariableDeltas': len(correspondence),
            'orderedEncodedGlyphPairsWithIdenticalVariableKerning': len(encoded_correspondence) ** 2,
            'axesAndNamesIdentical': True,
            'horizontalMetricVariationValuesIdentical': True,
            'gsubFeatures': [r.FeatureTag for r in candidate['GSUB'].table.FeatureList.FeatureRecord]}


def main():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    if not ORIGINAL.exists():
        data = (ASSETS / 'newsreader.woff2').read_bytes()
        assert digest(data) == ORIGINAL_SHA256, 'Refusing to archive an unexpected source font'
        with ORIGINAL.open('xb') as handle:
            handle.write(data)
    original_bytes = ORIGINAL.read_bytes()
    assert digest(original_bytes) == ORIGINAL_SHA256, 'Original backup changed'
    ORIGINAL.chmod(stat.S_IREAD)
    original = TTFont(BytesIO(original_bytes), recalcTimestamp=False)
    coverage = set(original.getBestCmap())
    base = {cp for cp in coverage if cp <= 0xFF or cp >= 0x2000}
    extended = coverage - base
    assert base.isdisjoint(extended) and base | extended == coverage
    source_chars, source_paths = set(), []
    for path in sorted((ROOT / 'src').rglob('*')):
        if path.suffix in {'.html', '.njk', '.js', '.mjs', '.json', '.md', '.css', '.txt'}:
            data = path.read_bytes()
            source_chars.update(map(ord, unescape(data.decode('utf-8', errors='replace'))))
            source_paths.append({'path': path.relative_to(ROOT).as_posix(), 'sha256': digest(data)})
    assert (source_chars & coverage) <= base, 'Current source needs companion; reassess initial-byte claim'
    outputs = []
    for filename, codepoints in [('newsreader.woff2', base), ('newsreader-latin-ext.woff2', extended)]:
        font = TTFont(BytesIO(original_bytes), recalcTimestamp=False)
        options = subset.Options()
        options.flavor = 'woff2'
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.name_languages = ['*']
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=codepoints)
        sub.subset(font)
        retained_names = font.getGlyphOrder()
        buffer = BytesIO()
        font.save(buffer)
        result = buffer.getvalue()
        candidate = TTFont(BytesIO(result), recalcTimestamp=False)
        assert set(candidate.getBestCmap()) == codepoints
        validation = validate(original, candidate, retained_names)
        outputs.append({'filename': filename, 'bytes': len(result), 'sha256': digest(result),
                        'codepoints': len(codepoints), 'unicodeRange': ranges(codepoints),
                        'validation': validation, '_bytes': result})
    for output in outputs:
        (ASSETS / output['filename']).write_bytes(output.pop('_bytes'))
    report = {'original': {'bytes': len(original_bytes), 'sha256': ORIGINAL_SHA256,
                          'codepoints': len(coverage), 'glyphs': len(original.getGlyphOrder()),
                          'backup': ORIGINAL.relative_to(ROOT).as_posix()},
              'tools': {'fontTools': fontTools.__version__, 'brotli': brotli.__version__},
              'axes': axes(original), 'outputs': outputs,
              'currentSource': {'files': source_paths, 'coveredCodepoints': len(source_chars & coverage),
                                'allPreviouslySupportedCharactersInDefaultSubset': True,
                                'alreadyUnsupportedNonAscii': ranges({cp for cp in source_chars - coverage if cp > 127})},
              'defaultBytesSaved': len(original_bytes) - outputs[0]['bytes'],
              'combinedBytes': sum(output['bytes'] for output in outputs),
              'license': 'SIL OFL 1.1; existing newsreader-OFL.txt retained unchanged; no reserved font name declared in its copyright header.',
              'limitations': ['No measured browser performance claim; main agent owns visual and network QA.',
                              'Future pages using both subsets download more combined bytes.',
                              'Kerning is identical within each subset. Browser shaping across a Latin / Latin Extended font boundary can differ.',
                              'Coverage is preserved from the input, not expanded; unsupported combining marks and scripts remain unsupported.']}
    (EVIDENCE / 'font-optimization.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in ['defaultBytesSaved', 'combinedBytes', 'axes']}))
    for output in outputs:
        print(output['filename'], output['bytes'], output['unicodeRange'])


if __name__ == '__main__':
    main()
