export async function run(request, context) {
  if (!context?.host?.runSpeechBackend) {
    throw new Error('XYRA plugin host context is missing host.runSpeechBackend().');
  }

  return context.host.runSpeechBackend(
    {
      command: 'transcribe_with_diarization',
      providerId: 'speech-plugin-whispercpp-sherpa',
      providerLabel: 'whisper.cpp + Sherpa-ONNX',
      diarizationEnabled: true
    },
    request
  );
}
