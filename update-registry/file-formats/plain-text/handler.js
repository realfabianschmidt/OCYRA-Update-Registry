'use strict';

window.FileFormatRegistry?.registerFormatHandler({
    id: 'plain-text',
    name: 'Export Plain Text',
    description: 'Continuous text with smart paragraph breaks',
    target: 'subtitle',
    directions: ['export'],
    extensions: ['txt'],
    icon: 'page',
    export_order: 20,

    serializeExport({ subtitles, languageCode, languageData, projectName, helpers }) {
        const sortedSubtitles = helpers.sortSubtitles(subtitles);
        if (sortedSubtitles.length === 0) {
            return null;
        }

        let content = '';
        let previousEndTime = 0;
        let previousText = '';

        sortedSubtitles.forEach((subtitle, index) => {
            const text = helpers.getSubtitleText(subtitle, languageCode).trim();
            if (!text) return;

            const gap = subtitle.startTime - previousEndTime;
            const sentenceEnd = /[.!?][\s]*$/;
            const needsParagraphBreak = index > 0 && gap > 2.0 && sentenceEnd.test(previousText);

            if (content) {
                content += needsParagraphBreak ? '\n\n' : ' ';
            }
            content += text;
            previousEndTime = subtitle.endTime;
            previousText = text;
        });

        return {
            content,
            mimeType: 'text/plain',
            filename: helpers.buildLanguageFilename(projectName, languageCode, 'txt', { suffix: 'PLAIN' }),
            successMessage: `${languageData?.name || languageCode} subtitles exported as plain text`
        };
    }
});
