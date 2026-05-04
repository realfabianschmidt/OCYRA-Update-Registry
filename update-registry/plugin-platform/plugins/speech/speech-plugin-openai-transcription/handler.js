export async function run(request, context) {
  if (!context?.host?.speech?.transcribe) {
    throw new Error('OCYRA plugin host context is missing host.speech.transcribe().');
  }

  return context.host.speech.transcribe(
    {
      command: 'transcribe_video',
      providerId: 'speech-plugin-openai-transcription',
      providerLabel: 'OpenAI Whisper',
      diarizationEnabled: false
    },
    request
  );
}
