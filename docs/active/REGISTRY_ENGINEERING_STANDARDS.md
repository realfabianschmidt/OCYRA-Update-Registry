# OCYRA Registry Engineering Standards

## Purpose

This document is the repository-specific engineering baseline for `OCYRA-Update-Registry`.

It applies to:

- maintainers editing plugin packages or dependency manifests
- AI coding agents operating in this repository
- reviewers checking whether the public publish surface is safe to ship

## 1. Repository Boundaries

- This repository owns publishable plugin packages, dependency manifests, locale bundles, catalog build logic, and catalog outputs.
- The sibling `../OCYRA` repository owns the desktop runtime: Tauri/Rust backend, renderer UI, plugin host logic, app tests, and installer packaging.
- If a change affects both repositories, keep the ownership split intact and land coordinated updates instead of copying runtime assets into the registry repo.

## 2. Structure Contracts

- The repo root should contain only maintainer docs, guardrail scripts, Git metadata files, and `update-registry/`.
- `update-registry/` should contain only `README.md` and `plugin-platform/`.
- `update-registry/plugin-platform/` should contain only publishable runtime artifacts and runtime-readable notes.
- Design plans, audits, and historical notes do not belong under `update-registry/plugin-platform/`; archive them under `docs/archive/`.

Forbidden examples:

- Tauri or WiX output
- `bundle/`, `deps/`, `_up_/`, `wix/`, `resources/`, or similar build folders
- loose binaries such as `ffmpeg.exe`
- accidental nested plugin copies or dependency download blobs

## 3. Plugin Package Contracts

- Every published plugin folder must contain `plugin.json` and `handler.js`.
- `settings.schema.json`, `policy.json`, `locales/*.json`, and explicit data files are optional and must match the manifest contract.
- Keep `plugin.json` as the canonical English fallback for plugin name and summary fields.
- First-party shipped localized plugin copy belongs in `locales/*.json`, not in the desktop app repo.
- Audit plugins should keep their policy payload in `policy.json` and declare the matching manifest fields.

## 4. Dependency Contracts

- Shared runtimes and models live under `update-registry/plugin-platform/dependencies/`.
- `dependencies/registry.json` is the index; each dependency package owns its `dependency.json`.
- Native local AI provider binaries and models must be shipped as signed dependency
  packages, not as desktop-app bundled resources.
- Speech plugins that call native backend commands must declare the exact provider
  and model dependencies they require.
- If a downloadable artifact changes, update the corresponding `sha256` value in the dependency manifest.
- Do not commit downloaded archives, extracted model payloads, or scratch hashes unless they are part of the deliberate published contract.

## 5. Catalog Rules

- Never hand-edit `catalog.json` or `catalog.sig` as normal workflow.
- Rebuild the catalog after every relevant plugin, dependency, locale bundle, or release-metadata change.
- Publish `catalog.json` and `catalog.sig` together.
- Keep signing keys under ignored local storage such as `.signing/`; never commit them.

## 6. Documentation Rules

- Active documentation must be written in English.
- Root-level maintainer docs should stay concise and operational.
- Historical plans, superseded notes, and one-off investigations belong in `docs/archive/<date>/`.
- When structure or ownership rules change, update the README and push workflow docs in the same change.

## 7. Verification

Run these checks before commit:

```powershell
node .\scripts\check-registry-structure.mjs
node .\update-registry\plugin-platform\build-catalog.mjs
Get-Content .\update-registry\plugin-platform\catalog.json | ConvertFrom-Json | Out-Null
Get-Content .\update-registry\plugin-platform\catalog.sig | ConvertFrom-Json | Out-Null
Get-Content .\update-registry\plugin-platform\dependencies\registry.json | ConvertFrom-Json | Out-Null
```

Definition of done:

- the publish tree is structurally clean
- the catalog and signature match the current plugin/dependency state
- docs reflect the actual repository boundary
- no desktop-runtime artifacts leaked into the public registry repo
