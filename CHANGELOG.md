# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-11

### Added
- Created spec-kit structure and project constitution under `.specify/`.
- Configured pre-commit hooks using `.pre-commit-config.yaml` with Gitleaks for secret scanning.
- Setup Knip for dead code and type checking.
- Setup automated changelog generation using `cliff.toml`.
- Added GitLab CI pipeline `.gitlab-ci.yml` supporting lint, typecheck, audit, test, and coverage.
- Added full AGPLv3 `LICENSE` file.

### Fixed
- Fixed bug where the boss enemy would disappear on a single hit.
- Corrected parameter order overlap issue in Phaser colliders for boss damage.
- Scaled boss aggressiveness across 3 combat phases depending on HP.
- Added comprehensive unit tests for boss HP and collision handlers.

### Documentation
- Added project metadata notes including description, git tags, and pre-commit hook analysis.
