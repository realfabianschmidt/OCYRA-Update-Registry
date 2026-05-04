export async function run(request, context) {
  if (!context?.host?.speech?.transcribe) {
    throw new Error('OCYRA plugin host context is missing host.speech.transcribe().');
  }

  return context.host.speech.transcribe(
    {
      command: 'transcribe_video_local',
      providerId: 'speech-plugin-whispercpp-local',
      providerLabel: 'whisper.cpp',
      diarizationEnabled: false
    },
    request
  );
}
