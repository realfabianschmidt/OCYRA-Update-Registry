export async function run(_request, context) {
  if (!context?.host?.readPluginJsonFile) {
    throw new Error('OCYRA plugin host context is missing host.readPluginJsonFile().');
  }

  const policyFile = String(context?.plugin?.manifest?.policy_file || 'policy.json').trim() || 'policy.json';
  const policy = await context.host.readPluginJsonFile(policyFile);

  return {
    ok: true,
    output_artifacts: [
      {
        artifactType: 'PolicyConstraintsArtifact',
        schemaVersion: '1',
        providerId: 'audit-plugin-eu-accessibility',
        providerLabel: 'EU Accessibility Act / BFSG',
        policy
      }
    ],
    diagnostics: [
      {
        pluginId: 'audit-plugin-eu-accessibility',
        severity: 'info',
        code: 'AUDIT_POLICY_LOADED',
        message: 'Loaded accessibility policy from audit-plugin-eu-accessibility.'
      }
    ]
  };
}

