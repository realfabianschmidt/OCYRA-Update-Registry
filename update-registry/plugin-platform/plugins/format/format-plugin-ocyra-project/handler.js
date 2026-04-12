function getPluginInfo(context) {
  return {
    pluginId: String(context?.plugin?.id || 'format-plugin-ocyra-project').trim() || 'format-plugin-ocyra-project',
    providerLabel: String(context?.plugin?.manifest?.name || 'OCYRA Project').trim() || 'OCYRA Project'
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
        formatId: 'ocyra-project',
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
          formatId: 'ocyra-project',
          target: 'project',
          data: artifact
        }
      ]
      : []
  };
}

async function parseImportPayload(rawFile, helpers) {
  const parsed = await helpers.safeParseJson(rawFile?.content, 'Project file');
  return {
    type: 'project',
    projectData: parsed.value,
    parseError: parsed.error
  };
}

async function validateImportPayload(payload, helpers) {
  if (payload?.parseError) {
    return {
      isValid: false,
      errors: [payload.parseError],
      warnings: []
    };
  }

  const validation = await helpers.validateProjectShape(payload?.projectData);
  return {
    isValid: Boolean(validation?.isValid),
    errors: Array.isArray(validation?.errors) ? validation.errors : [],
    warnings: Array.isArray(validation?.warnings) ? validation.warnings : []
  };
}

async function serializeExport(exportData, helpers) {
  const project = exportData?.project;
  const filename = String(exportData?.filename || '').trim();
  const includeHistory = exportData?.includeHistory !== false;
  const exportPayload = await helpers.buildProjectExportData(project, { includeHistory });
  const finalFilename = filename || await helpers.buildProjectFilename(await helpers.getProjectName(project), 'ocyra');

  return {
    content: JSON.stringify(exportPayload, null, 2),
    mimeType: 'application/json',
    filename: finalFilename
  };
}

export async function run(request, context) {
  const helpers = normalizeHelpers(context);
  const rawFile = findInputArtifact(request, 'RawFileArtifact')?.data || null;
  if (rawFile) {
    const payload = await parseImportPayload(rawFile, helpers);
    const validation = await validateImportPayload(payload, helpers);
    return buildImportResult(context, payload, validation);
  }

  const exportArtifact = findInputArtifact(request, 'FormatExportArtifact')?.data || null;
  if (exportArtifact) {
    return buildExportResult(context, await serializeExport(exportArtifact, helpers));
  }

  throw new Error('format-plugin-ocyra-project expected RawFileArtifact or FormatExportArtifact.');
}

