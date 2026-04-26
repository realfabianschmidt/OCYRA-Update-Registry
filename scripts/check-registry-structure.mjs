import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const updateRegistryRoot = join(repoRoot, 'update-registry');
const pluginPlatformRoot = join(updateRegistryRoot, 'plugin-platform');
const violations = [];

function addViolation(message) {
    violations.push(message);
}

function pathExists(path) {
    return existsSync(path);
}

function readJson(path) {
    try {
        JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        addViolation(`Invalid JSON at ${relative(path)}: ${error.message}`);
    }
}

function relative(path) {
    return path.slice(repoRoot.length + 1).replace(/\\/gu, '/');
}

function listEntries(path) {
    if (!pathExists(path)) {
        addViolation(`Missing required path: ${relative(path)}`);
        return [];
    }

    return readdirSync(path, { withFileTypes: true })
        .filter(entry => !entry.name.startsWith('.git'))
        .sort((left, right) => left.name.localeCompare(right.name));
}

function assertAllowedChildren(path, allowedNames, contextLabel) {
    const allowed = new Set(allowedNames);
    for (const entry of listEntries(path)) {
        if (!allowed.has(entry.name)) {
            addViolation(`Unexpected ${contextLabel} entry: ${relative(join(path, entry.name))}`);
        }
    }
}

function validateJsonFile(path) {
    if (!pathExists(path)) {
        addViolation(`Missing required file: ${relative(path)}`);
        return;
    }
    readJson(path);
}

function validateReadmeOnlyDirectory(path) {
    assertAllowedChildren(path, ['README.md'], 'documentation');
}

function validateLocalesDirectory(path) {
    for (const entry of listEntries(path)) {
        if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.json') {
            addViolation(`Locale bundles must be JSON files only: ${relative(join(path, entry.name))}`);
        } else {
            readJson(join(path, entry.name));
        }
    }
}

function validatePluginDirectory(path, familyName) {
    const requiredFiles = ['plugin.json', 'handler.js'];
    for (const file of requiredFiles) {
        if (!pathExists(join(path, file))) {
            addViolation(`Plugin '${relative(path)}' is missing required file ${file}`);
        }
    }

    const allowedNames = new Set([
        'plugin.json',
        'handler.js',
        'settings.schema.json',
        'policy.json',
        'locales'
    ]);

    for (const entry of listEntries(path)) {
        const entryPath = join(path, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'locales') {
                addViolation(`Unexpected nested directory in plugin package: ${relative(entryPath)}`);
                continue;
            }
            validateLocalesDirectory(entryPath);
            continue;
        }

        if (allowedNames.has(entry.name)) {
            if (entry.name.endsWith('.json')) {
                readJson(entryPath);
            }
            continue;
        }

        const extension = extname(entry.name).toLowerCase();
        const isDataFile = ['.json', '.txt', '.md', '.csv', '.tsv', '.xml', '.xsd'].includes(extension);
        if (!isDataFile) {
            addViolation(`Unexpected plugin package file: ${relative(entryPath)}`);
            continue;
        }

        if (extension === '.json') {
            readJson(entryPath);
        }
    }

    if (familyName !== 'audit' && pathExists(join(path, 'policy.json'))) {
        addViolation(`Only audit plugins should ship policy.json: ${relative(path)}`);
    }
}

function validatePluginFamilyDirectory(path, familyName) {
    if (!pathExists(join(path, 'README.md'))) {
        addViolation(`Plugin family is missing README.md: ${relative(path)}`);
    }

    for (const entry of listEntries(path)) {
        if (entry.name === 'README.md') continue;
        const entryPath = join(path, entry.name);
        if (!entry.isDirectory()) {
            addViolation(`Unexpected file in plugin family '${familyName}': ${relative(entryPath)}`);
            continue;
        }
        validatePluginDirectory(entryPath, familyName);
    }
}

function validateDependenciesDirectory(path) {
    validateJsonFile(join(path, 'registry.json'));
    if (!pathExists(join(path, 'README.md'))) {
        addViolation(`Dependencies directory is missing README.md: ${relative(path)}`);
    }

    for (const entry of listEntries(path)) {
        if (entry.name === 'README.md' || entry.name === 'registry.json') continue;
        const entryPath = join(path, entry.name);
        if (!entry.isDirectory()) {
            addViolation(`Unexpected dependency entry: ${relative(entryPath)}`);
            continue;
        }
        assertAllowedChildren(entryPath, ['dependency.json'], 'dependency package');
        validateJsonFile(join(entryPath, 'dependency.json'));
    }
}

function validateTemplatesDirectory(path) {
    if (!pathExists(join(path, 'README.md'))) {
        addViolation(`Templates directory is missing README.md: ${relative(path)}`);
    }

    assertAllowedChildren(path, ['README.md', 'plugin-template'], 'template root');
    const templateRoot = join(path, 'plugin-template');
    if (!pathExists(templateRoot)) {
        addViolation(`Missing plugin template directory: ${relative(templateRoot)}`);
        return;
    }

    if (!pathExists(join(templateRoot, 'README.md'))) {
        addViolation(`Plugin template is missing README.md: ${relative(templateRoot)}`);
    }

    validatePluginDirectory(templateRoot, 'template');
}

function validatePublishRoot() {
    const allowedRootEntries = new Set([
        '.gitattributes',
        '.gitignore',
        'README.md',
        'PUSH.md',
        'MODULE_AUTHORING_GUIDE.md',
        'docs',
        'scripts',
        'update-registry'
    ]);

    for (const entry of listEntries(repoRoot)) {
        if (entry.name === '.signing') continue;
        if (!allowedRootEntries.has(entry.name)) {
            addViolation(`Unexpected repo-root entry: ${entry.name}`);
        }
    }

    assertAllowedChildren(updateRegistryRoot, ['README.md', 'plugin-platform'], 'update-registry');
    assertAllowedChildren(pluginPlatformRoot, [
        'README.md',
        'app-release.json',
        'build-catalog.mjs',
        'cache',
        'catalog.json',
        'catalog.sig',
        'dependencies',
        'locks',
        'plugins',
        'templates'
    ], 'plugin-platform');
}

function validatePluginPlatform() {
    validateJsonFile(join(pluginPlatformRoot, 'app-release.json'));
    validateJsonFile(join(pluginPlatformRoot, 'catalog.json'));
    validateJsonFile(join(pluginPlatformRoot, 'catalog.sig'));

    validateReadmeOnlyDirectory(join(pluginPlatformRoot, 'cache'));
    validateReadmeOnlyDirectory(join(pluginPlatformRoot, 'locks'));
    validateDependenciesDirectory(join(pluginPlatformRoot, 'dependencies'));
    validateTemplatesDirectory(join(pluginPlatformRoot, 'templates'));

    const pluginsRoot = join(pluginPlatformRoot, 'plugins');
    if (!pathExists(join(pluginsRoot, 'README.md'))) {
        addViolation(`Plugins root is missing README.md: ${relative(pluginsRoot)}`);
    }
    assertAllowedChildren(pluginsRoot, ['README.md', 'audit', 'format', 'speech', 'translation'], 'plugin family root');
    validatePluginFamilyDirectory(join(pluginsRoot, 'audit'), 'audit');
    validatePluginFamilyDirectory(join(pluginsRoot, 'format'), 'format');
    validatePluginFamilyDirectory(join(pluginsRoot, 'speech'), 'speech');
    validatePluginFamilyDirectory(join(pluginsRoot, 'translation'), 'translation');
}

function main() {
    if (!pathExists(repoRoot) || !statSync(repoRoot).isDirectory()) {
        console.error('Repository root could not be resolved.');
        process.exit(1);
    }

    validatePublishRoot();
    validatePluginPlatform();

    if (violations.length > 0) {
        console.error('Registry structure violations found:');
        for (const violation of violations) {
            console.error(`- ${violation}`);
        }
        process.exit(1);
    }

    console.log('Registry structure looks clean.');
}

main();
