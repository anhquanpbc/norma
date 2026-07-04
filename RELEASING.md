# Releasing

Publishing is one tag away. The [`publish.yml`](.github/workflows/publish.yml) workflow runs the full
verify suite (build + unit tests + anti-drift + dogfood + the Playwright/axe browser test) and only then
runs `npm publish --provenance --access public` for [`@norma/design-lint`](packages/design-lint).

## One-time setup (maintainer)

Add an npm **automation** token as the `NPM_TOKEN` repository secret
(GitHub → Settings → Secrets and variables → Actions → New repository secret). The `@norma` scope must
exist and the token must be allowed to publish to it.

## Cut a release

1. **Confirm versions agree.** `standard/VERSION`, `standard/rules.json` `version`, the root and CLI
   `package.json` `version`, the README `standard-vX.Y.Z` badges, and the `index.html` footer must all
   match. `npm run check:drift` enforces the standard/badge/footer trio; the CLI package version is the
   one to bump by hand when only the linter changes (semver: bug fix → patch, new rule → minor).
2. **Update the changelog.** Move `CHANGELOG.md`'s `[Unreleased]` items under a dated
   `[X.Y.Z] — YYYY-MM-DD` heading. (The first publish is **v1.5.0** — the CLI has never shipped, so the
   `v1.0.0` tag published nothing.)
3. **Tag and push.**
   ```bash
   git tag v1.5.0
   git push origin v1.5.0
   ```
   The workflow verifies, then publishes with provenance. Watch it under the repo's Actions tab.

## After it lands

Swap the npm badge in `README.md` and `README.vi.md` back to the live version badge (it reads
`coming soon` until the first publish):

```md
[![npm](https://img.shields.io/npm/v/@norma/design-lint?label=%40norma%2Fdesign-lint)](https://www.npmjs.com/package/@norma/design-lint)
```

Then `npx @norma/design-lint` and every `npx` quickstart in the docs work as written.
