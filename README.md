# OCYRA Plugin Registry

This repository is the canonical source of truth for the publishable OCYRA plugin platform.

The desktop app loads the signed plugin catalog from:

`https://raw.githubusercontent.com/realfabianschmidt/OCYRA-Update-Registry/main/update-registry/plugin-platform/catalog.json`

It verifies the detached signature from:

`https://raw.githubusercontent.com/realfabianschmidt/OCYRA-Update-Registry/main/update-registry/plugin-platform/catalog.sig`

## What belongs here

- first-party plugin packages under `update-registry/plugin-platform/plugins/...`
- dependency manifests under `update-registry/plugin-platform/dependencies/...`
- `update-registry/plugin-platform/catalog.json`
- `update-registry/plugin-platform/catalog.sig`
- `update-registry/plugin-platform/app-release.json`
- `update-registry/plugin-platform/build-catalog.mjs`
- plugin-platform templates, maintainer docs, and structure checks

## What does not belong here

- desktop app source code
- Rust/Tauri runtime changes
- Tauri, WiX, or packaging build outputs
- bundled binaries copied out of the desktop app build
- local dependency download caches or scratch artifacts
- old manifest-based registry artifacts
- legacy pipeline handlers
- legacy accessibility profile folders
- legacy file-format handler folders

## Repository Split

OCYRA is split into two repositories with different responsibilities:

- `../OCYRA`
  Owns the desktop runtime: Tauri/Rust backend, renderer UI, plugin host, install logic, and app tests.
- `./OCYRA-Update-Registry`
  Owns the publishable plugin catalog: plugin packages, dependency manifests, catalog build/signing, and first-party plugin locale bundles.

If a feature changes both plugin metadata and app runtime behavior, land the runtime work in `OCYRA` and the publishable plugin changes in this repository as one coordinated change set.

## Maintainer Flow

The normal flow for plugin-platform work is:

1. change plugin or dependency files in this repository
2. rebuild the catalog here
3. run the local structure and JSON checks
4. validate the signature and publish surface
5. commit and push to `main`

## Maintainer Docs

- repository guardrails:
  [docs/active/REGISTRY_ENGINEERING_STANDARDS.md](./docs/active/REGISTRY_ENGINEERING_STANDARDS.md)
- push workflow:
  [PUSH.md](./PUSH.md)
- publish tree details:
  [plugin-platform/README.md](./update-registry/plugin-platform/README.md)
- plugin authoring:
  [MODULE_AUTHORING_GUIDE.md](./MODULE_AUTHORING_GUIDE.md)
- archive index:
  [docs/README.md](./docs/README.md)

## Branch Strategy

Use one canonical publish branch, normally `main`.

Do not split speech, translation, audit, format, import, or export into separate Git branches.

Keep domain separation in folders under:

- `update-registry/plugin-platform/plugins/speech/`
- `update-registry/plugin-platform/plugins/translation/`
- `update-registry/plugin-platform/plugins/audit/`
- `update-registry/plugin-platform/plugins/format/`

If you later need staging or enterprise variants, prefer separate catalogs or channels over domain-specific branches.
