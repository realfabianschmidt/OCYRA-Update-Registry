# OCYRA Plugin Template

This folder is a reusable starting point for new OCYRA plugins.

## How To Use

1. Copy this folder.
2. Rename it to the real plugin id, for example `translation-plugin-example`.
3. Move it into the correct family folder under `plugins/`.
4. Update `plugin.json`.
5. Implement the real runtime logic in `handler.js`.
6. Adjust `locales/en.json`, `locales/de.json`, and `locales/fr.json` if the
   plugin is first-party and should ship localized display/config copy.
7. Rebuild the catalog.

## Included Files

- `plugin.json`
- `handler.js`
- `settings.schema.json`
- `locales/en.json`
- `locales/de.json`
- `locales/fr.json`

## Notes

- This template is intentionally outside `plugins/`, so it is not published as a real plugin.
- The sample shape is a `translation` plugin because it is the simplest plugin family to copy and adapt.
- For `audit` plugins, add `policy.json`.
- For shared runtimes or models, declare entries in `dependencies/` and reference them from `plugin.json`.
- Keep `plugin.json` as canonical English fallback copy; localized variants belong
  in the optional locale bundle files.
- Run `node .\scripts\check-registry-structure.mjs` before rebuilding the catalog.
