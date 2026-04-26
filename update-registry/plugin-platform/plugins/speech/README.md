# Speech Plugins

This family contains transcription and combined speech-processing providers.

Current first-party plugins:

- `speech-plugin-openai-sherpa`
- `speech-plugin-openai-transcription`
- `speech-plugin-whispercpp-local`
- `speech-plugin-whispercpp-sherpa`

Contract notes:

- speech plugins consume `AudioArtifact`
- they produce transcript, word-timeline, and optional speaker-turn artifacts
- keep runtime dependencies explicit in `plugin.json`
- do not rely on user-managed runtimes through system `PATH`
