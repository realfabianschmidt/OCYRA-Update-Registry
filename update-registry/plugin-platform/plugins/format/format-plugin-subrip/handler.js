function getPluginInfo(context) {
  return {
    pluginId: String(context?.plugin?.id || 'format-plugin-subrip').trim() || 'format-plugin-subrip',
    providerLabel: String(context?.plugin?.manifest?.name || 'SubRip (SRT)').trim() || 'SubRip (SRT)'
  };
}

function findInputArtifact(request, artifactType) {
  const artifacts = Array.isArray(request?.input_artifacts)
    ? request.input_artifacts
    : Array.isArray(request?.inputArtifacts)
      ? request.inputArtifacts
      : [];
  return artifacts.find(artifact => String(artifact?.artifactType || '').trim() === artifactType) || null;
}

function normalizeHelpers(context) {
  if (!context?.host?.getFileFormatHelpers) {
    throw new Error('OCYRA plugin host context is missing host.getFileFormatHelpers().');
  }
  return context.host.getFileFormatHelpers();
}

function buildImportResult(context, payload, validation) {
  const { pluginId, providerLabel } = getPluginInfo(context);
  return {
    ok: true,
    output_artifacts: [
      {
        artifactType: 'FormatImportArtifact',
        schemaVersion: '1',
        providerId: pluginId,
        providerLabel,
        formatId: 'subrip',
        target: 'subtitle',
        data: {
          payload,
          validation
        }
      }
    ]
  };
}

function buildExportResult(context, artifact) {
  const { pluginId, providerLabel } = getPluginInfo(context);
  return {
    ok: true,
    output_artifacts: artifact
      ? [
        {
          artifactType: 'RawFileArtifact',
          schemaVersion: '1',
          providerId: pluginId,
          providerLabel,
          formatId: 'subrip',
          target: 'subtitle',
          data: artifact
        }
      ]
      : []
  };
}

function parseTimestamp(timeString) {
  const parts = String(timeString || '').split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const secondParts = parts[2].split(',');
  const seconds = parseInt(secondParts[0], 10) || 0;
  const milliseconds = parseInt(secondParts[1], 10) || 0;

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function parseImportPayload(rawFile, helpers) {
  const blocks = String(rawFile?.content || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n\s*\n/g);

  const subtitles = [];
  blocks.forEach((block, index) => {
    const lines = block.split('\n').map(line => line.trimEnd());
    if (lines.length < 2) return;

    const timingLineIndex = lines[0].includes('-->') ? 0 : 1;
    const timingLine = lines[timingLineIndex];
    if (!timingLine || !timingLine.includes('-->')) return;

    const timingParts = timingLine.split('-->');
    if (timingParts.length !== 2) return;

    const startTime = parseTimestamp(timingParts[0].trim());
    const endTime = parseTimestamp(timingParts[1].trim());
    const textLines = lines.slice(timingLineIndex + 1).filter(Boolean);
    const text = textLines.join('\n').trim();
    if (!text) return;

    subtitles.push({
      id: helpers.generateId('srt'),
      startTime,
      endTime,
      text
    });
  });

  return {
    type: 'subtitle-track',
    subtitles: helpers.sortSubtitles(subtitles)
  };
}

function validateImportPayload(payload) {
  const subtitles = Array.isArray(payload?.subtitles) ? payload.subtitles : [];
  return {
    isValid: subtitles.length > 0,
    errors: subtitles.length > 0 ? [] : ['No valid subtitles found in the SRT file.'],
    warnings: []
  };
}

function serializeExport(exportData, helpers) {
  const subtitles = helpers.sortSubtitles(exportData?.subtitles || []);
  if (subtitles.length === 0) {
    return null;
  }

  const languageCode = String(exportData?.languageCode || 'und').trim() || 'und';
  const languageData = exportData?.languageData || {};
  const projectName = String(exportData?.projectName || 'Untitled_Project').trim() || 'Untitled_Project';
  let content = '';

  subtitles.forEach((subtitle, index) => {
    const text = helpers.getSubtitleText(subtitle, languageCode).trim();
    content += `${index + 1}\n`;
    content += `${helpers.formatSRTTime(subtitle.startTime)} --> ${helpers.formatSRTTime(subtitle.endTime)}\n`;
    content += `${text}\n\n`;
  });

  return {
    content,
    mimeType: 'text/plain',
    filename: helpers.buildLanguageFilename(projectName, languageCode, 'srt'),
    successMessage: `${languageData?.name || languageCode} subtitles exported as SRT`
  };
}

export async function run(request, context) {
  const helpers = normalizeHelpers(context);
  const rawFile = findInputArtifact(request, 'RawFileArtifact')?.data || null;
  if (rawFile) {
    const payload = parseImportPayload(rawFile, helpers);
    const validation = validateImportPayload(payload);
    return buildImportResult(context, payload, validation);
  }

  const exportArtifact = findInputArtifact(request, 'FormatExportArtifact')?.data || null;
  if (exportArtifact) {
    return buildExportResult(context, serializeExport(exportArtifact, helpers));
  }

  throw new Error('format-plugin-subrip expected RawFileArtifact or FormatExportArtifact.');
}

