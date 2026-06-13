# Project Metadata and Compliance Notes

## Description
Dream2Play AI transforms dream descriptions into playable browser games using AI and Phaser 3.

## Git Tags
Current repository tags:
- v1.0.0
- v1.0.1
- v1.0.2

## Pre-commit Hook Analysis
The repository currently configures 3 hook repositories with 12 hooks in total.

Configured hook sources:
- pre-commit-hooks: trailing whitespace, EOF fixing, YAML validation, large-file checks
- gitleaks: secret scanning
- local: eslint, oxlint, biome, prettier, TypeScript type-check via the type-check hook (npm run typecheck / tsc --noEmit), Knip, npm audit
