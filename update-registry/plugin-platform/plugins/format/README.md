# Format Plugins

This family contains import and export providers for project, subtitle, review-package, and localization formats.

Current first-party plugins:

- `format-plugin-ebu-tt`
- `format-plugin-ocyra-project`
- `format-plugin-plain-text`
- `format-plugin-rocyra-review`
- `format-plugin-subrip`
- `format-plugin-ttml`
- `format-plugin-webvtt`
- `format-plugin-xliff-localization`

Contract notes:

- keep format metadata in the `format` section of `plugin.json`
- declare the correct `target`, `directions`, and file `extensions`
- keep import/export logic inside `handler.js`
- use locale bundles for first-party shipped plugin copy when needed
- format plugins describe data boundaries, not workspace placement; OCYRA's
  app-owned capability resolver decides where installed formats appear
- localization-oriented document formats, including future DOCX/PDF importers,
  should use `format.target: "localization"` and normalize text into the shared
  localization project model
- future page-preview data for DOCX/PDF should be returned as optional preview
  or context artifacts alongside the localization payload, without changing the
  XLIFF/WebVTT contracts
