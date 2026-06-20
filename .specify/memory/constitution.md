# Dream2Play AI Project Constitution

This document defines the core principles, rules, and architectural boundaries for all AI agents working on the Dream2Play AI codebase.

## 1. Project Motto & Goal

- **Motto**: Dream it. Generate it. Play it.
- **Goal**: Transform imagination into interactive gameplay using artificial intelligence.

## 2. Core Architectural Pillars

- **Phaser 3 Game Engine**: All client-side gameplay runs via Phaser 3, embedded inside a React canvas container.
- **Node.js/Express Backend**: Responsible for handling AI generations, session management, and game logic configurations.
- **OpenAI Integration**: Dream analysis, asset prompt generation, blueprint parsing, and game configuration are generated using OpenAI's API.
- **Strict Separation of Concerns**: Game logic (Phaser) is decoupled from UI shell logic (React) and AI middleware generation.

## 3. Agent Responsibilities

- **Dream Analysis Agent**: Analyzes dream descriptions to output a structured JSON schema containing: hero, world, enemy, boss, objective, mood, difficulty.
- **Blueprint Generator Agent**: Converts analyzed dream data into actionable level structure, objectives, and progression loops.
- **Asset Generation Agent**: Generates tailored prompts for backgrounds, characters, enemies, and UI art.
- **Game Generation Agent**: Translates the blueprint into executable Phaser configurations (e.g. boss placements, hazard coordinates, scaling coefficients).

## 4. Coding & Maintenance Rules

- **Non-destructive Damage Handling**: The boss/enemies should never be destroyed or disabled when simply taking damage. Only when health <= 0 can destroy logic run.
- **Modular Refactoring**: Keep files highly focused. Add clear jsdoc style inline comments when updating core Phaser logic.
- **Test Integrity**: Every major bug fix or feature addition must have an accompanying unit test inside the `spec/` folder. All tests must be executed with coverage reporting enabled.
- **No Direct Permission Requests**: Agents are authorized to make directory-wide fixes directly, committing compliance updates and bug fixes autonomously.
