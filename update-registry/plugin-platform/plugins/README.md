# Plugin Families

This directory contains all publishable OCYRA plugin packages.

## Family Layout

```text
plugins/
  audit/
  format/
  speech/
  translation/
```

Each plugin package lives in exactly one family folder:

```text
plugins/<family>/<plugin-id>/
  plugin.json
  handler.js
  settings.schema.json        optional
  policy.json                 optional
  locales/<locale>.json       optional
  data files                  optional
```

Rules:

- keep one folder per published plugin
- keep `plugin.json` and `handler.js` present for every package
- keep plugin-owned localized UI copy in `locales/*.json`
- keep family-specific notes in the family README files
