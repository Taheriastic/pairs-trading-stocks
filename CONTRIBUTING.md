# Contributing

1. Keep a fixed, sourced data snapshot. Never silently replace a CSV or regenerate analytics after source archives change. Update the manifest, cutoff, source caveats, and derived JSON together.
2. Preserve timing: the current daily rule uses information known through the decision close; formation means exclude the observed close, and orders fill at the next close. The legacy cointegration fit excludes the signal close. Add a meaningful test for any change to decisions, fills, or P/L.
3. Keep reported SEC facts separate from user scenarios, and label fiscal periods and assumptions wherever values appear.
4. Run `node --experimental-strip-types --test tests/daily_engine.test.mjs`, `PYTHONPATH=. .venv/bin/python -m pytest -q tests`, `npm run format:check --prefix web`, `npm run lint --prefix web`, `npm run typecheck --prefix web`, and `npm run build --prefix web` before proposing a change. Regenerate `data/daily_results.json` and `DAILY_STRATEGY_REPORT.md` with `node --experimental-strip-types scripts/summarize_daily_lab.mjs` after engine changes.
5. Do not add secrets to Git. Use environment variables for Azure credentials. Keep result claims tied to verified outputs.
