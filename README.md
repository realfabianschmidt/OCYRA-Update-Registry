# XYRA Captions Plugin Registry

This repository is the public publish surface for the XYRA plugin platform.

The desktop app loads the signed plugin catalog from:

`https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/plugin-platform/catalog.json`

It verifies the detached signature from:

`https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/plugin-platform/catalog.sig`

## What belongs here

- `update-registry/plugin-platform/catalog.json`
- `update-registry/plugin-platform/catalog.sig`
- `update-registry/plugin-platform/app-release.json`
- `update-registry/plugin-platform/plugins/...`
- `update-registry/plugin-platform/dependencies/...`
- plugin-platform publish docs and templates

## What does not belong here

- desktop app source code
- Rust/Tauri runtime changes
- old manifest-based registry artifacts
- legacy pipeline handlers
- legacy accessibility profile folders
- legacy file-format handler folders

## Source Of Truth

Treat the private app repository as the implementation source of truth:

- source repo:
  `H:\VisionVault\01_Projekte\19_CodingProjects\01_XYRA-Captions\XYRA-Captions`
- publish repo:
  `H:\VisionVault\01_Projekte\19_CodingProjects\01_XYRA-Captions\XYRA-Captions-Update-Registry`

The normal maintainer flow is:

1. change plugin or dependency metadata in the private app repo
2. rebuild the plugin catalog there
3. mirror the publishable `plugin-platform/` tree into this repository
4. validate JSON and signatures
5. commit and push to `main`

## Maintainer Docs

- push workflow:
  [PUSH.md](H:/VisionVault/01_Projekte/19_CodingProjects/01_XYRA-Captions/XYRA-Captions-Update-Registry/PUSH.md)
- publish tree details:
  [plugin-platform/README.md](H:/VisionVault/01_Projekte/19_CodingProjects/01_XYRA-Captions/XYRA-Captions-Update-Registry/update-registry/plugin-platform/README.md)
- plugin authoring:
  [MODULE_AUTHORING_GUIDE.md](H:/VisionVault/01_Projekte/19_CodingProjects/01_XYRA-Captions/XYRA-Captions-Update-Registry/MODULE_AUTHORING_GUIDE.md)

## Branch Strategy

Use one canonical publish branch, normally `main`.

Do not split speech, translation, audit, format, import, or export into separate Git branches.

Keep domain separation in folders under:

- `update-registry/plugin-platform/plugins/speech/`
- `update-registry/plugin-platform/plugins/translation/`
- `update-registry/plugin-platform/plugins/audit/`
- `update-registry/plugin-platform/plugins/format/`

If you later need staging or enterprise variants, prefer separate catalogs or channels over domain-specific branches.
