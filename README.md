XYRA Captions Update Registry

This repository publishes the update manifest consumed by the XYRA Captions desktop app.

Primary manifest URL:

`https://raw.githubusercontent.com/realfabianschmidt/XYRA-Captions-Update-Registry/main/update-registry/manifest.json`

Current registry concepts:

- provider packages via legacy-compatible `ai_models`
- `pipeline_packages` for combination-specific transcription tuning
- `pipeline-handlers/<package-id>/handler.js` for downloadable runtime bundle handlers
- `ai_bundles` for one-click installs
- `pipeline_profiles` for active runtime profiles

Publishing checklist:

1. Edit `update-registry/manifest.json`.
2. Bump `manifest_version` and `published_at`.
3. Update `update_title` and `update_text` if the release should show a UI notice.
4. Commit and push to `main`.

Do not rename published IDs once clients may have installed them.
