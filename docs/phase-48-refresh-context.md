# Phase 48: Refresh Context

This phase defines the refresh workflow for existing projects.

## Goal

Let users refresh previously saved project context and compare new files with the stored project state.

## Planned behavior

- Start from an existing project URL.
- Run the same safe import flow.
- Compare saved files against newly selected files.
- Show added, changed, missing, and skipped files.
- Keep the current project unchanged until the user confirms the refresh.

## Why this matters

Codebases change. Codebase Brain needs a refresh workflow so project context does not become stale after the first import.
