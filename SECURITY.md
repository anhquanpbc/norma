# Security Policy

## Supported versions

The latest `main` of this repository — and, once it is published to npm, the current release of
`@norma/design-lint` — receive security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Instead:

- Use GitHub's [private vulnerability reporting](https://github.com/anhquanpbc/norma/security/advisories/new), or
- Email **anhquanc3k43pbc@gmail.com** with details and reproduction steps.

We aim to acknowledge reports within 7 days and to provide a fix or mitigation timeline after triage.

## Scope

The tooling (`@norma/design-lint`, scripts) is the primary security surface. The reference site
`index.html` makes **zero network requests** and ships no third-party code, so its attack surface is
limited to the browser rendering static, self-contained HTML/CSS/JS.
