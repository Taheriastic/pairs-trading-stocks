"""Generate deterministic dated examples for Vercel fallback and Azure package."""
import json
import shutil
from pathlib import Path
from src.research import PAIRS, analyze, load_prices

ROOT = Path(__file__).resolve().parents[1]
for pair in PAIRS:
    data = analyze(load_prices(ROOT / 'data/prices.csv', pair))
    encoded = json.dumps(data, separators=(',', ':'), allow_nan=False)
    target = ROOT / 'web/public/data' / f'{pair}.json'
    target.write_text(encoded)
    azure_target = ROOT / 'azure/data' / f'{pair}.json'
    azure_target.parent.mkdir(parents=True, exist_ok=True)
    azure_target.write_text(encoded)
    print(pair, len(data['signals']), len(data['strategy']['trades']), len(encoded), data['strategy']['total_return_pct'])

for name in ('financials.json', 'manifest.json'):
    shutil.copyfile(ROOT / 'data' / name, ROOT / 'web/public/data' / name)
    shutil.copyfile(ROOT / 'data' / name, ROOT / 'azure/data' / name)

# The long-horizon study is aggregate-only; its underlying candidate archive is
# intentionally excluded from the public app until data display rights clear.
shutil.copyfile(ROOT / 'data/strategy_study.json', ROOT / 'web/public/data/strategy_study.json')
