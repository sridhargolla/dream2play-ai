# Implementation Plan: Boss Combat Mechanics

## Goal

Implement the boss combat phase mechanics and ensure health decreases properly without premature destruction.

## Proposed Changes

- Modify `PlayScene.js` to correct overlap handler.
- Update `GameCanvas.jsx` to show React overlay.

## Verification

- Test manually inside web browser and run unit tests under `spec/play_scene.spec.js`.
