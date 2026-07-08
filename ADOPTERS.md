# Adopters

Norma is young and, honestly, has **no external adopters yet**. It starts by dogfooding itself: the
reference site [`index.html`](index.html) is built to the standard and gated in CI by its own linter
(`npm run lint:self`) plus a Playwright + axe browser test across theme × language.

If you adopt Norma — wire [`norma-design-lint`](packages/design-lint) into CI, or point your AI coding
agent at the generated rule files — please open a PR adding a row below. One real green Norma check on a
third-party repository is worth more than any badge.

| Project | How they use Norma | Link |
|---------|--------------------|------|
| Norma (this repo) | Dogfoods every statically checkable rule (agent-verified rules are enforced in review); CI gates the reference site on its own linter + axe self-test | [index.html](index.html) |
