# Contributing

1. Keep a fixed, sourced data snapshot. Never silently replace a CSV or regenerate analytics after source archives change. Update the manifest, cutoff, source caveats, and derived JSON together.
2. Preserve the signal timing rule: model fit uses prices strictly before the signal close; orders fill on the next close. Add a test for any change to signal or P/L logic.
3. Keep reported SEC facts separate from user scenarios, and label fiscal periods and assumptions wherever values appear.
4. Run `PYTHONPATH=. .venv/bin/python -m pytest -q tests`, `npm run format:check --prefix web`, `npm run lint --prefix web`, `npm run typecheck --prefix web`, and `npm run build --prefix web` before proposing a change.
5. Do not add secrets to Git. Use environment variables for Azure credentials. Keep result claims tied to verified outputs.
