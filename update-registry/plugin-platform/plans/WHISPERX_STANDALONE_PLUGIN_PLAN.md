# WhisperX Standalone Plugin Plan

## Goal

Add WhisperX as a standalone speech plugin without requiring users to install
their own Python runtime, CUDA stack, or ad-hoc package environments.

## Target Shape

- `speech-plugin-whisperx-local`
- runtime mode: `sidecar-process`
- entrypoint: bundled native launcher or packaged Python sidecar inside a
  shared dependency

## Dependency Split

- `provider-whisperx-core`
  Bundled WhisperX runtime payload with launcher, isolated runtime files, and
  bridge entrypoint
- `model-whisperx-large-v3`
  Primary Whisper model dependency
- `model-whisperx-align-<lang>`
  Optional alignment models when required by the chosen WhisperX package
- `provider-pyannote-core` or `provider-sherpa-core`
  Optional diarization/runtime dependency depending on the chosen combined
  plugin profile

## Engineering Rules

- No dependency may rely on a user-managed Python installation.
- No sidecar command may resolve through system `PATH`.
- The sidecar executable or launcher must live inside the plugin package or one
  of its declared dependencies so the active lock state can verify integrity.
- The plugin must emit canonical `TranscriptArtifact`,
  `WordTimelineArtifact`, and optional `SpeakerTurnsArtifact` outputs so the
  post-processing pipeline stays core-owned.

## Packaging Direction

- Preferred: a packaged standalone runtime bundle exposed through
  `provider-whisperx-core`
- Acceptable fallback: an isolated embedded Python runtime plus frozen
  dependencies inside the dependency payload
- Avoid: expecting users to install Python, pip packages, ffmpeg, or model
  weights manually

## Rollout

1. Prototype the sidecar bridge with a packaged runtime bundle.
2. Validate startup size, extraction size, and cold-start times on Windows.
3. Add a first transcription-only profile.
4. Add an optional combined WhisperX plus diarization profile after the core
   runtime bundle proves stable.
