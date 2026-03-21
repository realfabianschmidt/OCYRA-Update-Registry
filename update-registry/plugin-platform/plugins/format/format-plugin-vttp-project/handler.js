function getPluginInfo(context) {
  return {
    pluginId: String(context?.plugin?.id || 'format-plugin-vttp-project').trim() || 'format-plugin-vttp-project',
    providerLabel: String(context?.plugin?.manifest?.name || 'XYRA Project').trim() || 'XYRA Project'
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
    throw new Error('XYRA plugin host context is missing host.getFileFormatHelpers().');
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
        formatId: 'vttp-project',
        target: 'project',
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
          formatId: 'vttp-project',
          target: 'project',
          data: artifact
        }
      ]
      : []
  };
}

function parseImportPayload(rawFile, helpers) {
  const parsed = helpers.safeParseJson(rawFile?.content, 'Project file');
  return {
    type: 'project',
    projectData: parsed.value,
    parseError: parsed.error
  };
}

function validateImportPayload(payload, helpers) {
  if (payload?.parseError) {
    return {
      isValid: false,
      errors: [payload.parseError],
      warnings: []
    };
  }

  const validation = helpers.validateProjectShape(payload?.projectData);
  return {
    isValid: Boolean(validation?.isValid),
    errors: Array.isArray(validation?.errors) ? validation.errors : [],
    warnings: Array.isArray(validation?.warnings) ? validation.warnings : []
  };
}

function serializeExport(exportData, helpers) {
  const project = exportData?.project;
  const filename = String(exportData?.filename || '').trim();
  const includeHistory = exportData?.includeHistory !== false;
  const exportPayload = helpers.buildProjectExportData(project, { includeHistory });

  return {
    content: JSON.stringify(exportPayload, null, 2),
    mimeType: 'application/json',
    filename: filename || helpers.buildProjectFilename(helpers.getProjectName(project), 'vttp')
  };
}

export async function run(request, context) {
  const helpers = normalizeHelpers(context);
  const rawFile = findInputArtifact(request, 'RawFileArtifact')?.data || null;
  if (rawFile) {
    const payload = parseImportPayload(rawFile, helpers);
    const validation = validateImportPayload(payload, helpers);
    return buildImportResult(context, payload, validation);
  }

  const exportArtifact = findInputArtifact(request, 'FormatExportArtifact')?.data || null;
  if (exportArtifact) {
    return buildExportResult(context, serializeExport(exportArtifact, helpers));
  }

  throw new Error('format-plugin-vttp-project expected RawFileArtifact or FormatExportArtifact.');
}
