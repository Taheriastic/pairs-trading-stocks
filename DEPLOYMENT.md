# Deployment guide

## Vercel

The site is deployed at [pairs-trading-stocks.vercel.app](https://pairs-trading-stocks.vercel.app/) on Vercel Hobby. The Vercel project is `pairs-trading-stocks` in the `taheriastics-projects` scope. Git auto-deployment is not connected; publish from `web/` with:

```bash
vercel --prod --yes --scope taheriastics-projects
```

The production app uses the committed, dated price and financial-statement snapshots. It requires no cloud credentials or live market feed. It has no Azure deployment. Azure Functions integration code remains in the repository from earlier exploration, but the public Vercel app does not depend on it.

## Release checks

1. Regenerate the dated pair JSON when `src/research.py` or `data/prices.csv` changes: `PYTHONPATH=. .venv/bin/python scripts/build_analysis.py`. Review the trade counts and sample end date.
2. Run `PYTHONPATH=. .venv/bin/python -m pytest -q tests`, `npm run format:check --prefix web`, `npm run lint --prefix web`, `npm run typecheck --prefix web`, and `npm run build --prefix web`.
3. After deployment, open both pairs on the production URL. Confirm prices and financial statement source links, the 2024-12-20 data cutoff, and the last actual trade dates. Try a qualified historical trade and a no-signal 2024 divergence on each pair. Check both what-if directions, the trade decision note and workbook formulas, changed FP&A assumptions, its brief and Excel export, and mobile width.
4. Keep the model's actual performance and visitor what-if results visibly separate. Research prices are adjusted series, not executable quotes. Do not publish a résumé claim based on an unverified deployment.

## Repository visibility

The GitHub repository may be private. The public dashboard does not require it to be public. Review files and Git history before changing visibility.
