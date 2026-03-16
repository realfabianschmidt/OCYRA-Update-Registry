'use strict';

window.FileFormatRegistry?.registerFormatHandler({
    id: 'rvvttp-review-package',
    name: 'XYRA Review Package',
    description: 'Review package with language-scoped subtitles and review metadata',
    target: 'review-package',
    directions: ['import', 'export'],
    extensions: ['rvvttp'],
    icon: 'package',

    parseImportFile({ content }) {
        return {
            type: 'review-package',
            reviewData: JSON.parse(String(content || '{}'))
        };
    },

    validateImportPayload({ payload, helpers }) {
        const reviewData = payload?.reviewData;
        const baseValidation = helpers.validateProjectShape(reviewData);
        const errors = [...(baseValidation.errors || [])];

        if (!reviewData?.meta?.reviewPackage?.isReview) {
            errors.push('This file is not a valid XYRA review package.');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    },

    serializeExport({ reviewData, filename, helpers }) {
        return {
            content: JSON.stringify(reviewData, null, 2),
            mimeType: 'application/json',
            filename: filename || helpers.buildProjectFilename(reviewData?.meta?.name || 'Review_Package', 'rvvttp', { suffix: 'review' })
        };
    }
});
