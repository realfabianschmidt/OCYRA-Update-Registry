# XYRA Plugin Publish Surface

This folder contains the runtime-downloadable plugin-platform artifacts used by the XYRA desktop app.

## Active Publish Surface

- `plugin-platform/catalog.json`
- `plugin-platform/catalog.sig`
- `plugin-platform/app-release.json`
- `plugin-platform/plugins/...`
- `plugin-platform/dependencies/...`

The active desktop runtime no longer depends on:

- `manifest.json`
- `manifest.sig`
- `pipeline-handlers/`
- `accessibility-profiles/`
- `file-formats/`

Those legacy artifacts have been removed from this publish repository on purpose.

## Publish Rules

1. Only publish files that the active plugin runtime actually consumes.
2. Never hand-edit `catalog.json` or `catalog.sig` unless you are debugging.
3. Edit plugin and dependency source files first, then rebuild the catalog.
4. Keep publisher trust and file hashes accurate.
5. Prefer mirroring the full `plugin-platform/` tree from the private app repo instead of copying individual files ad hoc.

## Important Paths

- public plugin catalog:
  `update-registry/plugin-platform/catalog.json`
- detached catalog signature:
  `update-registry/plugin-platform/catalog.sig`
- plugin release metadata:
  `update-registry/plugin-platform/app-release.json`
- reusable plugin template:
  `update-registry/plugin-platform/templates/plugin-template/`

## Maintainer References

- publish checklist:
  [../PUSH.md](H:/VisionVault/01_Projekte/19_CodingProjects/01_XYRA-Captions/XYRA-Captions-Update-Registry/PUSH.md)
- plugin tree and catalog rules:
  [plugin-platform/README.md](H:/VisionVault/01_Projekte/19_CodingProjects/01_XYRA-Captions/XYRA-Captions-Update-Registry/update-registry/plugin-platform/README.md)
