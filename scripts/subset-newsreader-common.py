"""Reproduce the regular Newsreader face used for common page text.

Requires fontTools 4.67.0 and Brotli 1.2.0. Run with --check to compare
without writing assets. The full regular face remains a CSS companion.
"""
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

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'src/assets/premium'
SOURCE_HASH = '5224a611a53ccb8c65857bb8a0de79ee34d9989ca9f29f83d7cd18bd05614607'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    assert fontTools.__version__ == '4.67.0' and brotli.__version__ == '1.2.0'
    sys.dont_write_bytecode = True
    spec = spec_from_file_location('validation', ROOT / 'scripts/subset-premium-font.py')
    validation = module_from_spec(spec)
    spec.loader.exec_module(validation)
    original_variation_value = validation.variation_value

    def variation_value(store, outer, inner):
        # OpenType NO_VARIATION_INDEX: an explicit zero adjustment.
        if outer == 0xffff and inner == 0xffff:
            return ()
        return original_variation_value(store, outer, inner)

    validation.variation_value = variation_value
    data = (ASSETS / 'newsreader-regular.woff2').read_bytes()
    assert sha256(data).hexdigest() == SOURCE_HASH
    original = TTFont(BytesIO(data), recalcTimestamp=False)
    coverage = set(original.getBestCmap())
    common = {cp for cp in coverage if cp <= 0x7e or cp >= 0x2000 or cp in {0xa0, 0xb7}}
    remainder = coverage - common
    assert common.isdisjoint(remainder) and common | remainder == coverage
    font = TTFont(BytesIO(data), recalcTimestamp=False)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=common)
    sub.subset(font)
    retained_names = font.getGlyphOrder()
    buffer = BytesIO()
    font.save(buffer)
    result = buffer.getvalue()
    candidate = TTFont(BytesIO(result), recalcTimestamp=False)
    assert set(candidate.getBestCmap()) == common
    proof = validation.validate(original, candidate, retained_names)
    assert proof['gsubFeatures'] == [r.FeatureTag for r in original['GSUB'].table.FeatureList.FeatureRecord]
    target = ASSETS / 'newsreader-regular-common.woff2'
    if args.check:
        assert target.read_bytes() == result, 'Generated font differs'
    else:
        target.write_bytes(result)
    report = {
        'source': {'path': 'src/assets/premium/newsreader-regular.woff2', 'sha256': SOURCE_HASH, 'bytes': len(data)},
        'output': {'path': target.relative_to(ROOT).as_posix(), 'sha256': sha256(result).hexdigest(), 'bytes': len(result)},
        'commonUnicodeRange': validation.ranges(common),
        'companionUnicodeRange': validation.ranges(remainder),
        'initialBytesSaved': len(data) - len(result), 'validation': proof,
        'tools': {'fontTools': fontTools.__version__, 'brotli': brotli.__version__},
        'limitations': ['The full original remains available for other Latin characters.',
                       'Pages using both faces download both files; shaping across the face boundary can differ.',
                       'This report proves retained glyph data, not browser performance.'],
        'license': 'SIL OFL 1.1; newsreader-OFL.txt remains unchanged.'}
    evidence = ROOT / 'evidence/ms-al-expansion-20261024/font-optimization.json'
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_bytes((json.dumps(report, indent=2) + '\n').encode())
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
