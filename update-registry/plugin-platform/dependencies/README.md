# Dependency Packages

This directory contains shared runtimes, provider payloads, and model manifests that plugins reference by ID.

## Layout

```text
dependencies/
  registry.json
  <dependency-id>/
    dependency.json
```

## Current Categories

- provider/runtime packages such as `provider-whispercpp-core`, `provider-sherpa-core`, and `provider-ollama-runtime`
- model packages such as `model-whisper-base`, `model-sherpa-segmentation`, and `model-sherpa-embedding`

Rules:

- add every publishable dependency to `registry.json`
- keep each package self-contained under its own folder
- update `sha256` values when downloadable artifacts change
- do not commit downloaded archives, extracted payloads, or scratch files here
- `provider-ollama-runtime` resolves the OCYRA app-bundled Ollama binary; plugins only declare model dependencies such as `model-ollama-qwen2.5-7b`
