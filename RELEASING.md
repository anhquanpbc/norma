# Releasing

Publishing is one tag away. The [`publish.yml`](.github/workflows/publish.yml) workflow runs the full
verify suite (build + unit tests + anti-drift + dogfood + the Playwright/axe browser test) and only then
runs `npm publish --provenance --access public` for [`norma-design-lint`](packages/design-lint).

## One-time setup (maintainer)

Add an npm **automation** token as the `NPM_TOKEN` repository secret
(GitHub → Settings → Secrets and variables → Actions → New repository secret). `norma-design-lint` is an
**unscoped public package**, so no npm org/scope is required — the token only needs publish permission on
your npm account (an *automation* token so it isn't blocked by 2FA in CI).

## Cut a release

1. **Confirm versions agree.** `standard/VERSION`, `standard/rules.json` `version`, the root and CLI
   `package.json` `version`, the README `standard-vX.Y.Z` badges, and the `index.html` footer must all
   match. `npm run check:drift` enforces the standard/badge/footer trio; the CLI package version is the
   one to bump by hand when only the linter changes (semver: bug fix → patch, new rule → minor).
2. **Update the changelog.** Move `CHANGELOG.md`'s `[Unreleased]` items under a dated
   `[X.Y.Z] — YYYY-MM-DD` heading.
3. **Tag and push** (the tag must match the CLI `package.json` version — it only triggers the workflow;
   the published version comes from `package.json`):
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
   The workflow verifies, then publishes with provenance. Watch it under the repo's Actions tab.

## After it lands

The README npm badge is the live shields.io version badge, so it updates on its own. Confirm the
publish landed and works end-to-end:

```bash
npm view norma-design-lint version                     # the new version
npx norma-design-lint@latest examples/minimal-pass/index.html   # runs clean
```
