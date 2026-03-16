'use strict';

window.FileFormatRegistry?.registerFormatHandler({
    id: 'ttml',
    name: 'Export TTML',
    description: 'Timed Text Markup for broadcast and OTT delivery',
    target: 'subtitle',
    directions: ['export'],
    extensions: ['ttml'],
    icon: 'code-brackets',
    export_order: 40,
    quality_gate: 'timed-subtitle',

    serializeExport({ subtitles, languageCode, projectName, helpers }) {
        const sortedSubtitles = helpers.sortSubtitles(subtitles);
        if (sortedSubtitles.length === 0) {
            return null;
        }

        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        content += `<tt xml:lang="${languageCode}"\n`;
        content += `    xmlns="http://www.w3.org/ns/ttml"\n`;
        content += `    xmlns:tts="http://www.w3.org/ns/ttml#styling"\n`;
        content += `    xmlns:ttm="http://www.w3.org/ns/ttml#metadata">\n`;
        content += `  <head>\n`;
        content += `    <metadata>\n`;
        content += `      <ttm:title>${helpers.escapeXML(projectName)}</ttm:title>\n`;
        content += `      <ttm:desc>Exported by XYRA Captions on ${now}</ttm:desc>\n`;
        content += `    </metadata>\n`;
        content += `    <styling>\n`;
        content += `      <style xml:id="s1" tts:fontFamily="Arial,Helvetica,sans-serif"\n`;
        content += `             tts:fontSize="100%" tts:color="white"\n`;
        content += `             tts:backgroundColor="rgba(0,0,0,0.8)"\n`;
        content += `             tts:textAlign="center"/>\n`;
        content += `    </styling>\n`;
        content += `    <layout>\n`;
        content += `      <region xml:id="r1" tts:origin="10% 80%" tts:extent="80% 15%"\n`;
        content += `              tts:displayAlign="after"/>\n`;
        content += `    </layout>\n`;
        content += `  </head>\n`;
        content += `  <body>\n`;
        content += `    <div region="r1">\n`;

        sortedSubtitles.forEach((subtitle, index) => {
            const text = helpers.escapeXML(helpers.getSubtitleText(subtitle, languageCode).trim()).replace(/\n/g, '<br/>');
            content += `      <p xml:id="p${index + 1}" begin="${helpers.formatXMLTime(subtitle.startTime)}" end="${helpers.formatXMLTime(subtitle.endTime)}" style="s1">${text}</p>\n`;
        });

        content += `    </div>\n`;
        content += `  </body>\n`;
        content += `</tt>\n`;

        return {
            content,
            mimeType: 'application/ttml+xml',
            filename: helpers.buildLanguageFilename(projectName, languageCode, 'ttml'),
            successMessage: `${languageCode} subtitles exported as TTML`
        };
    }
});
