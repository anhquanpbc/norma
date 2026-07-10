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

1. **Confirm the versions agree.** Norma has **two independent version lines** — `npm run check:drift`
   enforces the standard line; the CLI line is enforced at publish time by `publish.yml`:
   - The **standard** — `standard/VERSION` == `standard/rules.json` `version` == the root (private)
     `package.json` `version` == both README `standard-vX.Y.Z` badges == the `index.html` footer. These move
     together and change only when a rule changes (edit `standard/rules.yaml`, then `npm run build:rules`).
   - The **CLI** (`norma-design-lint`) — `packages/design-lint/package.json` `version`, on its own line,
     bumped by hand when the linter changes (semver: bug fix → patch, new rule → minor). **This is the
     version the release tag must equal** — `publish.yml` refuses to publish a tag that doesn't match it.
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
