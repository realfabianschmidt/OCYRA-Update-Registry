'use strict';

window.AccessibilityProfileRegistry?.register({
    id: 'easy-reading',
    apiVersion: '1',
    buildTranscriptionPolicy(context) {
        return {
            preferredPacing: 'slow',
            shortSegmentBias: true,
            ...context.policy
        };
    },
    evaluateChecklist(context) {
        return context.baseChecklist.map(item => {
            if (item.evaluation !== 'easy_reading_comfort') {
                return item;
            }

            const comfortViolations = context.results.reduce((sum, result) => {
                const issueCount = (result.issues || []).filter(issue =>
                    (issue.checks || []).some(check =>
                        check.rule === 'MAX_CPS' || check.rule === 'MAX_LINE_LENGTH'
                    )
                ).length;
                return sum + issueCount;
            }, 0);

            return {
                ...item,
                status: comfortViolations === 0 ? 'pass' : comfortViolations <= 3 ? 'warn' : 'fail',
                note: comfortViolations === 0
                    ? 'Subtitles stay within the easy-reading comfort limits.'
                    : `${comfortViolations} segment(s) exceed the easy-reading comfort limits.`
            };
        });
    }
});
