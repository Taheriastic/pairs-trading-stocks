# Deployment guide

## Vercel

The site is deployed at [pairs-trading-stocks.vercel.app](https://pairs-trading-stocks.vercel.app/) on Vercel Hobby. The Vercel project is `pairs-trading-stocks` in the `taheriastics-projects` scope. Git auto-deployment is not connected; publish from `web/` with:

```bash
vercel --prod --yes --scope taheriastics-projects
```

The production app uses the committed, dated price and financial-statement snapshots. It requires no cloud credentials or live market feed. It has no Azure deployment. Azure Functions integration code remains in the repository from earlier exploration, but the public Vercel app does not depend on it.

## Release checks

1. For the current lab, regenerate research results with `node --experimental-strip-types scripts/summarize_daily_lab.mjs`. If source data changes, run the pinned-archive audit in `scripts/build_daily_lab.py`. Review the exact 5,032-session period, archive checksum, rule descriptions and result figures. The former `scripts/build_analysis.py` regenerates only legacy 2024 URLs.
2. Run `PYTHONPATH=. .venv/bin/python -m pytest -q tests`, `npm run format:check --prefix web`, `npm run lint --prefix web`, `npm run typecheck --prefix web`, and `npm run build --prefix web`.
3. After deployment, open both pairs on the production URL. Confirm 2006-10-16 to 2026-10-16 and 5,032 displayed sessions. Complete and skip/restart the six-step tour; test chart selection, range controls, cost changes, pair/strategy switching, long/short and long-only replays, the method comparison and ledger. Check the new report and study workbook against engine results and Excel formulas. Test SEC scenario changes and their separately labeled 2024 filing cutoff. Check mobile width and restore temporary viewport overrides.
4. Keep the model's actual performance and visitor what-if results visibly separate. Research prices are adjusted series, not executable quotes. Do not publish a résumé claim based on an unverified deployment.

## Repository visibility

The GitHub repository may be private. The public dashboard does not require it to be public. Review files and Git history before changing visibility.
