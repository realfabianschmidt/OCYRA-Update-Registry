'use strict';

window.FileFormatRegistry?.registerFormatHandler({
    id: 'vttp-project',
    name: 'XYRA Project',
    description: 'Native XYRA Captions project file',
    target: 'project',
    directions: ['import', 'export'],
    extensions: ['vttp', 'json'],
    icon: 'folder',

    parseImportFile({ content }) {
        return {
            type: 'project',
            projectData: JSON.parse(String(content || '{}'))
        };
    },

    validateImportPayload({ payload, helpers }) {
        return helpers.validateProjectShape(payload?.projectData);
    },

    serializeExport({ project, filename, includeHistory, helpers }) {
        const exportData = helpers.buildProjectExportData(project, { includeHistory });
        return {
            content: JSON.stringify(exportData, null, 2),
            mimeType: 'application/json',
            filename: filename || helpers.buildProjectFilename(helpers.getProjectName(project), 'vttp')
        };
    }
});
