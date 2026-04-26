# Plugin Templates

This directory contains reusable authoring templates that are intentionally not published as real plugins.

Current template set:

- `plugin-template/`

Rules:

- start new first-party plugins by copying `plugin-template/`
- move the copied folder into the correct plugin family under `plugins/`
- keep templates outside `plugins/` so the catalog builder ignores them
- keep template locale bundles and schemas aligned with the current runtime contract
