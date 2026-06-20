# Security Policy

## Supported Versions

Dream2Play AI is currently maintained from the default branch. Security fixes are prioritized for the latest released version and the active development branch.

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Please do not create a public issue for suspected vulnerabilities.

Use the project's private GitLab vulnerability reporting flow when available. If private reporting is not available, contact the maintainers through the repository owner or project group and include:

- A clear description of the issue.
- Steps to reproduce or a minimal proof of concept.
- The affected component, route, dependency, or configuration.
- Potential impact and any known mitigations.

## Response Targets

The maintainers aim to acknowledge valid reports within 3 business days, provide an initial triage update within 7 business days, and coordinate remediation based on severity and exploitability.

## Disclosure

Public disclosure should wait until a fix, mitigation, or maintainer-approved advisory is available. Reporters will be credited when requested and when disclosure is safe for users.

## Security Expectations

- Never commit secrets, API keys, JWT secrets, tokens, private keys, or production environment files.
- Use `.env.example` for documented configuration only.
- Set `JWT_SECRET` in all non-local deployments.
- Rotate exposed credentials immediately.
- Run dependency, lint, type-check, secret-scan, and coverage checks before release.
