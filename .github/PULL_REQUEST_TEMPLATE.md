## Summary

<!-- What does this change and why? -->

## Type

- [ ] Standard rule change (edited `standard/rules.yaml` / `tokens.tokens.json`)
- [ ] Linter (`norma-design-lint`)
- [ ] Reference site (`index.html`) / docs
- [ ] Agent spec (`agents/norma-design-agent.md`)
- [ ] CI / tooling

## Checklist

- [ ] I edited **source** files, not generated ones.
- [ ] Ran `npm run build:rules && npm run gen` if I changed rules or the agent spec.
- [ ] `npm test` passes (incl. the `index.html` dogfood).
- [ ] `npm run check:drift` passes.
- [ ] New/changed rules keep EN + VI parity and, for SPEC, include a primary-source URL.
- [ ] The site stays zero-dependency and offline.
