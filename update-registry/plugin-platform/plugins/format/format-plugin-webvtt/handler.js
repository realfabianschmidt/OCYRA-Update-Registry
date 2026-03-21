function getPluginInfo(context) {
  return {
    pluginId: String(context?.plugin?.id || 'format-plugin-webvtt').trim() || 'format-plugin-webvtt',
    providerLabel: String(context?.plugin?.manifest?.name || 'WebVTT').trim() || 'WebVTT'
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
        formatId: 'webvtt',
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
          formatId: 'webvtt',
          target: 'subtitle',
          data: artifact
        }
      ]
      : []
  };
}

function normalizeHelpers(context) {
  if (!context?.host?.getFileFormatHelpers) {
    throw new Error('XYRA plugin host context is missing host.getFileFormatHelpers().');
  }

  return context.host.getFileFormatHelpers();
}

function parseTimestamp(timeString) {
  const parts = String(timeString || '').split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const secondParts = parts[2].split('.');
  const seconds = parseInt(secondParts[0], 10) || 0;
  const milliseconds = parseInt(secondParts[1], 10) || 0;

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function parseImportPayload(rawFile, helpers) {
  const value = String(rawFile?.content || '');
  if (!value.trimStart().startsWith('WEBVTT')) {
    return {
      type: 'subtitle-track',
      subtitles: []
    };
  }

  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const subtitles = [];
  let currentSubtitle = null;
  let lineIndex = 0;

  while (lineIndex < lines.length && !lines[lineIndex].startsWith('WEBVTT')) {
    lineIndex += 1;
  }
  lineIndex += 1;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex].trim();
    if (!line || line.startsWith('NOTE')) {
      lineIndex += 1;
      continue;
    }

    if (line.includes('-->')) {
      const timingParts = line.split('-->');
      if (timingParts.length === 2) {
        const startTime = parseTimestamp(timingParts[0].trim());
        const endTime = parseTimestamp(timingParts[1].trim());
        currentSubtitle = {
          id: helpers.generateId('subtitle'),
          startTime,
          endTime,
          text: ''
        };
      }
    } else if (currentSubtitle) {
      currentSubtitle.text = currentSubtitle.text
        ? `${currentSubtitle.text}\n${line}`
        : line;
      if (lineIndex + 1 >= lines.length || !lines[lineIndex + 1].trim()) {
        if (currentSubtitle.text.trim()) {
          subtitles.push(currentSubtitle);
        }
        currentSubtitle = null;
      }
    }

    lineIndex += 1;
  }

  return {
    type: 'subtitle-track',
    subtitles: helpers.sortSubtitles(subtitles)
  };
}

function validateImportPayload(payload) {
  const subtitles = Array.isArray(payload?.subtitles) ? payload.subtitles : [];
  const errors = [];
  const warnings = [];

  if (subtitles.length === 0) {
    errors.push('No valid subtitles found in the WebVTT file.');
  }

  for (let index = 0; index < subtitles.length - 1; index += 1) {
    const current = subtitles[index];
    const next = subtitles[index + 1];
    if (current.endTime > next.startTime) {
      warnings.push(`Subtitle ${index + 1} overlaps with subtitle ${index + 2}.`);
    }
  }

  subtitles.forEach((subtitle, index) => {
    const duration = subtitle.endTime - subtitle.startTime;
    if (duration < 0.5) {
      warnings.push(`Subtitle ${index + 1} is very short (${duration.toFixed(1)}s).`);
    }
    if (duration > 10) {
      warnings.push(`Subtitle ${index + 1} is very long (${duration.toFixed(1)}s).`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
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
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

  let content = 'WEBVTT\n\n';
  content += 'NOTE\n';
  content += 'Exported by: XYRA Captions\n';
  content += `Date: ${formattedDate} (${timezone})\n`;
  if (languageData?.name) {
    content += `Language: ${languageData.name} (${languageCode})\n`;
  }
  content += '\n';

  subtitles.forEach((subtitle, index) => {
    const text = helpers.getSubtitleText(subtitle, languageCode);
    content += `${index + 1}\n`;
    content += `${helpers.formatVTTTime(subtitle.startTime)} --> ${helpers.formatVTTTime(subtitle.endTime)}\n`;
    content += `${helpers.sanitizeVTTText(text)}\n\n`;
  });

  return {
    content,
    mimeType: 'text/vtt',
    filename: helpers.buildLanguageFilename(projectName, languageCode, 'vtt'),
    successMessage: `${languageData?.name || languageCode} subtitles exported as VTT`
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

  throw new Error('format-plugin-webvtt expected RawFileArtifact or FormatExportArtifact.');
}
