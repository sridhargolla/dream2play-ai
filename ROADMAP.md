# Roadmap

Dream2Play AI converts dream descriptions into playable browser games. This roadmap is intentionally high level and may change as maintainers validate user needs, security requirements, and implementation complexity.

## Current Focus

- Maintain a stable React, Express, OpenAI, and Phaser 3 baseline.
- Keep AI prompt logic separated from game runtime logic.
- Improve repository compliance, security posture, and automated quality checks.
- Preserve a smooth dream-to-blueprint-to-game workflow.

## Near Term

- Expand unit and integration coverage around dream analysis and blueprint generation boundaries.
- Add baseline accessibility checks for major user flows.
- Improve release documentation and changelog automation.
- Harden local development and container deployment documentation.

## Mid Term

- Add structured evaluation fixtures for dream analysis output.
- Improve asset generation prompt validation and failure handling.
- Add optional observability hooks for backend health and AI provider failures.
- Introduce stronger quality gates for dependency hygiene and unused code detection.

## Long Term

- Explore Dream Fusion Agent workflows.
- Explore NPC Dialogue Agent and Story Expansion Agent capabilities.
- Evaluate multiplayer session architecture.
- Add achievements and richer progression systems.

## Non-Goals

- This roadmap does not guarantee delivery dates.
- Compliance and documentation updates should not change application behavior.
- Game generation changes should remain isolated from repository quality tooling.
