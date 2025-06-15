Before running tests, ensure `NODE_ENV=test` so the in‑memory SQLite DB is used.
Use `npm run lint:fix` to automatically fix standard style issues.
Refer to docs/llm-library-spec.md, docs/table_manager_spec.md, and
docs/patch_curation_spec.md when implementing library or DB features.

If you need to run lint or tests, first install dependencies with:

```
npm install --ignore-scripts
```

Then run:

```
npm run lint
npm test
```

Do not attempt a regular `npm install`.
