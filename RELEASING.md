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

## The `@vN` major tag (reusable action)

The GitHub Action is consumed as `uses: anhquanpbc/norma@v1` — a **moving major tag** that must always point
at the latest `v1.x.y` release. After each successful publish, `publish.yml`'s `major-tag` job
**automatically** fast-forwards `vN` (derived from the pushed tag) to that release commit, so `@v1` stays
current with no manual step. It was bootstrapped once with `git tag v1 <latest-release> && git push origin v1`;
a `ci.yml` smoke-test (`uses: anhquanpbc/norma@v1`) guards that the published action path keeps resolving.

## After it lands

The README npm badge is the live shields.io version badge, so it updates on its own. Confirm the
publish landed and works end-to-end:

```bash
npm view norma-design-lint version                     # the new version
npx norma-design-lint@latest examples/minimal-pass/index.html   # runs clean
```

## Publishing to the MCP Registry

`norma-mcp` can be listed on the [official MCP Registry](https://registry.modelcontextprotocol.io) so agents
discover it. `packages/design-lint/package.json` already carries the ownership marker
`"mcpName": "io.github.anhquanpbc/norma"`, which the registry verifies against the **published** npm package
— so publish the CLI first (the marker ships from 1.23.2 on).

Then, from a machine authenticated as the `anhquanpbc` GitHub owner (device flow proves ownership of the
`io.github.anhquanpbc/` namespace):

```bash
# 1. install the publisher CLI — https://github.com/modelcontextprotocol/registry
brew install mcp-publisher                       # or the release binary

# 2. generate server.json from package.json
mcp-publisher init
```

**Important — `norma-mcp` is the package's SECONDARY bin.** The default launch `mcp-publisher init` generates
(`npx norma-design-lint`) runs the *linter*, not the server. Edit `server.json` so the npm package launches
the `norma-mcp` bin — the working invocation is `npx -y -p norma-design-lint norma-mcp` (verified). Then:

```bash
# 3. validate + launch-test BEFORE publishing (the launch must return tools/list, not lint output)
mcp-publisher publish --dry-run
printf '{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n' | npx -y -p norma-design-lint norma-mcp

# 4. authenticate + publish
mcp-publisher login github
mcp-publisher publish
```

`server.json`'s `name` must equal `mcpName` (`io.github.anhquanpbc/norma`) and its `version` the CLI version.
Verify the listing: `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.anhquanpbc/norma"`.
