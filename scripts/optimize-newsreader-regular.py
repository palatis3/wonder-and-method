"""Create exact-outline weight-400 Newsreader faces, retaining the opsz axis.

Run: python scripts/optimize-newsreader-regular.py [--check]
Requires fontTools 4.67.0 and Brotli 1.2.0. No download or CSS/build change.
Existing variable faces and their OFL license are read-only inputs.

Plain partial instancing can round inferred IUP deltas. At the original default
weight we can avoid that: keep glyf/hmtx and every surviving optical-size tuple
unchanged, and remove only weight tuples whose support is exactly zero there.
fontTools handles the non-outline variable tables and the remaining opsz axis.
"""
from copy import deepcopy
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from io import BytesIO
from pathlib import Path
import argparse
import json
import sys

import brotli
import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.varLib.models import supportScalar

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'src/assets/premium'
EVIDENCE = ROOT / 'evidence/full-site-audit-20261016'
ORIGINAL = ROOT / 'evidence/competitive-offers-20261015/newsreader-original.woff2'
ORIGINAL_HASH = '36491e9d777a0c176acfc6f529685beea26d7296ac68d084c5e38e4d460bdf7f'
LICENSE_HASH = 'fdfad38143ec470553cae82a1e45320bdd1b9ec70415d37bd0171051d8a4ded8'
SOURCES = [
    ('newsreader.woff2', 'newsreader-regular.woff2',
     '3528f72208844413a9c8b7eb644e85eaff108b7d46b336514f00b132670af9db'),
    ('newsreader-latin-ext.woff2', 'newsreader-regular-latin-ext.woff2',
     'ba1830bb3ff2404580f9104471b1e8d2088d1028f6b2b415e75867631c7c7230'),
]
OPTICAL_SIZES = [6, 8, 10, 12, 13.5, 18, 20, 24, 32, 40, 48, 60, 72]
STATIC_TABLES = ['glyf', 'hmtx', 'GPOS', 'GSUB', 'GDEF', 'prep', 'gasp']


def digest(data):
    return sha256(data).hexdigest()


def read_font(data):
    return TTFont(BytesIO(data), recalcTimestamp=False)


def serialize(font):
    font.recalcTimestamp = False
    output = BytesIO()
    font.save(output)
    return output.getvalue()


def axes(font):
    return [(a.axisTag, a.minValue, a.defaultValue, a.maxValue)
            for a in font['fvar'].axes]


def instantiate_losslessly(source_bytes):
    source = read_font(source_bytes)
    assert axes(source) == [('wght', 200, 400, 800), ('opsz', 6, 18, 72)]
    assert source['avar'].segments['wght'][0] == 0
    assert 'cvar' not in source and 'CFF2' not in source
    candidate = instantiateVariableFont(source, {'wght': 400},
                                        inplace=False, optimize=True)
    # Do not retain rounded inferred deltas from ordinary partial instancing.
    candidate['glyf'] = deepcopy(source['glyf'])
    candidate['hmtx'] = deepcopy(source['hmtx'])
    candidate['gvar'] = deepcopy(source['gvar'])
    dropped = kept = 0
    for glyph, variations in candidate['gvar'].variations.items():
        surviving = []
        for variation in variations:
            if 'wght' in variation.axes:
                scalar = supportScalar({'wght': 0},
                                       {'wght': variation.axes['wght']})
                assert scalar == 0, ('Nonzero weight tuple needs a new proof', glyph)
                dropped += 1
            else:
                assert set(variation.axes) <= {'opsz'}
                surviving.append(variation)
                kept += 1
        candidate['gvar'].variations[glyph] = surviving
    return serialize(candidate), {'droppedZeroSupportWeightTuples': dropped,
                                  'unchangedOpticalSizeTuples': kept}


def validate_lossless(source_bytes, output_bytes):
    source, candidate = read_font(source_bytes), read_font(output_bytes)
    assert axes(candidate) == [('opsz', 6, 18, 72)]
    assert candidate['OS/2'].usWeightClass == 400
    assert source.getBestCmap() == candidate.getBestCmap()
    assert source.getGlyphOrder() == candidate.getGlyphOrder()
    assert source.getTableData('glyf') == candidate.getTableData('glyf')
    assert source.getTableData('hmtx') == candidate.getTableData('hmtx')
    assert source['avar'].segments['opsz'] == candidate['avar'].segments['opsz']
    for name_id in [0, 13, 14]:
        old = sorted((n.platformID, n.platEncID, n.langID, n.string.hex())
                     for n in source['name'].names if n.nameID == name_id)
        new = sorted((n.platformID, n.platEncID, n.langID, n.string.hex())
                     for n in candidate['name'].names if n.nameID == name_id)
        assert old == new, ('Copyright/license name record changed', name_id)
    for glyph in source.getGlyphOrder():
        expected = [v for v in source['gvar'].variations.get(glyph, [])
                    if 'wght' not in v.axes]
        actual = candidate['gvar'].variations.get(glyph, [])
        assert [(v.axes, v.coordinates) for v in expected] == [
            (v.axes, v.coordinates) for v in actual], glyph
    records = []
    for optical_size in OPTICAL_SIZES:
        # Resolve in one step from the unchanged current variable source, and
        # separately from the serialized delivery candidate. Binary equality of
        # full GPOS covers every lookup/pair/class/feature, not a sample string.
        expected = instantiateVariableFont(source, {'wght': 400, 'opsz': optical_size},
                                           inplace=False, optimize=True)
        actual = instantiateVariableFont(candidate, {'opsz': optical_size},
                                         inplace=False, optimize=True)
        tables = {}
        for table in STATIC_TABLES:
            left, right = expected.getTableData(table), actual.getTableData(table)
            assert left == right, ('Resolved table mismatch', optical_size, table)
            tables[table] = digest(left)
        for table, fields in [('hhea', ['ascent', 'descent', 'lineGap']),
                              ('OS/2', ['sTypoAscender', 'sTypoDescender',
                                        'sTypoLineGap', 'usWinAscent', 'usWinDescent'])]:
            for field in fields:
                assert getattr(expected[table], field) == getattr(actual[table], field)
        records.append({'opsz': optical_size, 'identicalResolvedTableHashes': tables})
    return {'codepoints': len(candidate.getBestCmap()),
            'glyphs': len(candidate.getGlyphOrder()),
            'baseOutlinesAndAdvancesByteIdentical': True,
            'survivingVariableOutlineTuplesExactlyIdentical': True,
            'opticalAxisAndMappingUnchanged': True,
            'copyrightAndLicenseRecordsUnchanged': True,
            'allKerningAndSubstitutionTablesIdenticalAtSamples': True,
            'samples': records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true',
                        help='Rebuild/validate in memory and compare existing outputs; write nothing')
    args = parser.parse_args()
    assert fontTools.__version__ == '4.67.0' and brotli.__version__ == '1.2.0', \
        'Use documented tool versions for byte-for-byte reproduction'
    original_bytes = ORIGINAL.read_bytes()
    assert digest(original_bytes) == ORIGINAL_HASH
    license_path = ASSETS / 'newsreader-OFL.txt'
    assert digest(license_path.read_bytes()) == LICENSE_HASH
    helper_path = ROOT / 'scripts/subset-premium-font.py'
    sys.dont_write_bytecode = True
    spec = spec_from_file_location('existing_lossless_subset_validation', helper_path)
    helper = module_from_spec(spec)
    spec.loader.exec_module(helper)
    outputs = []
    for source_name, output_name, expected_hash in SOURCES:
        source_bytes = (ASSETS / source_name).read_bytes()
        assert digest(source_bytes) == expected_hash, ('Source changed', source_name)
        source = read_font(source_bytes)
        # Establish the name mapping to the archived full original using the
        # existing lossless subset algorithm, without writing a subset file.
        rebuilt = read_font(original_bytes)
        options = subset.Options()
        options.flavor = 'woff2'
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.name_languages = ['*']
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=set(source.getBestCmap()))
        sub.subset(rebuilt)
        retained_names = rebuilt.getGlyphOrder()
        assert digest(serialize(rebuilt)) == expected_hash
        original_validation = helper.validate(read_font(original_bytes), source,
                                               retained_names)
        output_bytes, removal = instantiate_losslessly(source_bytes)
        repeated_bytes, _ = instantiate_losslessly(source_bytes)
        assert output_bytes == repeated_bytes, 'Nondeterministic output'
        validation = validate_lossless(source_bytes, output_bytes)
        if args.check:
            assert (ASSETS / output_name).read_bytes() == output_bytes, output_name
        outputs.append({'source': source_name, 'filename': output_name,
                        'sourceSha256': expected_hash, 'sourceBytes': len(source_bytes),
                        'sha256': digest(output_bytes), 'bytes': len(output_bytes),
                        'bytesSaved': len(source_bytes) - len(output_bytes),
                        'reductionPercent': round(100 * (1-len(output_bytes)/len(source_bytes)), 2),
                        'unicodeRange': helper.ranges(set(source.getBestCmap())),
                        'originalToCurrentSubsetValidation': original_validation,
                        'tupleRemoval': removal, 'validation': validation,
                        '_bytes': output_bytes})
    if args.check:
        print(json.dumps({'passed': True, 'mode': 'check',
                          'outputs': [{k: o[k] for k in ['filename', 'bytes', 'sha256']}
                                      for o in outputs]}, indent=2))
        return
    # Only write the newly owned files after every validation has succeeded.
    for output in outputs:
        (ASSETS / output['filename']).write_bytes(output.pop('_bytes'))
    report = {'method': 'Pin original default wght=400; preserve exact original optical-size tuples',
              'tools': {'fontTools': fontTools.__version__, 'brotli': brotli.__version__},
              'scriptSha256': digest(Path(__file__).read_bytes()),
              'subsetValidationHelperSha256': digest(helper_path.read_bytes()),
              'original': {'path': ORIGINAL.relative_to(ROOT).as_posix(),
                           'sha256': ORIGINAL_HASH, 'bytes': len(original_bytes)},
              'license': {'path': license_path.relative_to(ROOT).as_posix(),
                          'sha256': LICENSE_HASH, 'unchanged': True,
                          'copyrightAndLicenseNameRecordsPreserved': True},
              'outputs': outputs, 'repeatBuildByteIdentical': True,
              'existingFontsUnchanged': all(digest((ASSETS / name).read_bytes()) == h
                                             for name, _, h in SOURCES),
              'remainingAxis': {'tag': 'opsz', 'minimum': 6, 'default': 18, 'maximum': 72},
              'limitations': ['No browser appearance or Lighthouse measurement performed by this worker.',
                              'Requires explicit CSS weight-400 face and matching Unicode ranges; keep original variable faces for other weights.',
                              'Existing Latin/Latin Extended split is retained; this does not introduce a new shaping boundary.',
                              'Coverage is preserved, not expanded; existing unsupported characters remain unsupported.',
                              'Automatic optical sizing is retained. Do not disable font-optical-sizing or hard-code opsz.']}
    assert report['existingFontsUnchanged']
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / 'font-optimization.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    lines = ['# Newsreader weight-400 delivery optimization', '',
             'Two new faces retain the original optical-size axis (6–72, default 18), glyph coverage, OFL notices and exact outline variation data. Existing variable fonts and CSS were not modified.', '',
             '| New file | Before | After | Saved | SHA-256 |',
             '|---|---:|---:|---:|---|']
    for output in outputs:
        lines.append(f"| {output['filename']} | {output['sourceBytes']:,} B | {output['bytes']:,} B | {output['reductionPercent']}% | {output['sha256']} |")
    lines += ['', '## Exactness checks', '',
              'The current Latin subsets were independently rebuilt in memory from the hash-checked full original. The existing validator confirmed matching outlines, advances, variable deltas and ordered encoded-glyph kerning against that original. Every surviving opsz tuple in the new faces is exactly identical to the current variable font; every removed weight tuple has zero support at weight 400.', '',
              'Ordinary partial instancing was rejected because it rounded inferred outline deltas at some optical sizes. The script restores the unchanged base glyph and advance tables and retains original inferred-delta representations. It uses fontTools for non-outline variation tables and asserts all assumptions.', '',
              'At opsz '+', '.join(map(str, OPTICAL_SIZES))+', the complete resolved glyf, hmtx, GPOS, GSUB, GDEF, prep and gasp tables are byte-identical to a direct full instance of the unchanged current variable source at wght=400. This checks all outlines, advances, kerning lookups and substitutions at each sample. Vertical layout metrics also match. The script builds each output twice and requires byte equality.', '',
              '## Integration and validation', '',
              'Use separate CSS faces at font-weight:400 with the same Unicode ranges reported in font-optimization.json. Keep the existing variable 200–800 faces for other weights; place/order the regular declarations so the regular faces win weight-400 matching, and verify the network selects the new file. Preserve font-optical-sizing:auto. Update only the intended preload to newsreader-regular.woff2. Serve the unchanged newsreader-OFL.txt with the font assets.', '',
              'Run `python scripts/optimize-newsreader-regular.py --check` to rebuild and compare without writes. Run without --check to reproduce the two new font files and this evidence. Versions are pinned to fontTools 4.67.0 and Brotli 1.2.0. No network downloads occur.', '',
              'The primary agent should compare representative large headings and smaller serif text at mobile/desktop widths, confirm Latin Extended and fallback weight coverage, inspect font requests, then run the relevant performance measurements. Byte savings are verified; no score gain or browser visual result is claimed here.', '']
    (EVIDENCE / 'font-optimization.md').write_text('\n'.join(lines), encoding='utf-8')
    print(json.dumps({'passed': True, 'outputs': [{k: o[k] for k in ['filename', 'bytes', 'bytesSaved', 'sha256']}
                                               for o in outputs]}, indent=2))


if __name__ == '__main__':
    main()
