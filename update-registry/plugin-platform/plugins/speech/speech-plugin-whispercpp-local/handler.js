export async function run(request, context) {
  if (!context?.host?.runSpeechBackend) {
    throw new Error('XYRA plugin host context is missing host.runSpeechBackend().');
  }

  return context.host.runSpeechBackend(
    {
      command: 'transcribe_video_local',
      providerId: 'speech-plugin-whispercpp-local',
      providerLabel: 'whisper.cpp',
      diarizationEnabled: false
    },
    request
  );
}
