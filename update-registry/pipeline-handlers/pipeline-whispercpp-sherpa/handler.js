'use strict';

window.AIPipelineRegistry?.register({
    id: 'pipeline-whispercpp-sherpa',
    apiVersion: '1',
    name: 'whisper.cpp + Sherpa-ONNX',
    packageIds: ['pipeline-whispercpp-sherpa'],
    priority: 190,
    matchesSettings(context) {
        return context.transcriptionProvider === 'whispercpp'
            && context.diarizationEnabled
            && context.diarizationProvider === 'sherpa-onnx';
    },
    buildExecutionPlan(context) {
        const providerLabel = context.activePipelineName || 'whisper.cpp + Sherpa-ONNX';
        const detailText = context.activePipeline
            ? 'Active offline bundle handler. Stages include provider-specific preparation and word-level midpoint merge.'
            : 'Stages include audio extraction, speaker diarization, transcription, and word-level midpoint merge.';

        return {
            command: 'transcribe_with_diarization',
            providerLabel,
            detailText,
            introMessage: `Preparing ${providerLabel}...`
        };
    }
});
