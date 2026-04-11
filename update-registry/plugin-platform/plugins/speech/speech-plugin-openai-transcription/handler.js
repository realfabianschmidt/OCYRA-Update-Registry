export async function run(request, context) {
  if (!context?.host?.runSpeechBackend) {
    throw new Error('OCYRA plugin host context is missing host.runSpeechBackend().');
  }

  return context.host.runSpeechBackend(
    {
      command: 'transcribe_video',
      providerId: 'speech-plugin-openai-transcription',
      providerLabel: 'OpenAI Whisper',
      diarizationEnabled: false
    },
    request
  );
}

