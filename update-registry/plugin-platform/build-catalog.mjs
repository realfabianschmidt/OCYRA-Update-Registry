import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, createHash, sign as signBuffer } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = resolve(__dirname);
const pluginsRoot = join(baseDir, 'plugins');
const dependenciesRoot = join(baseDir, 'dependencies');
const dependencyRegistryPath = join(dependenciesRoot, 'registry.json');
const catalogPath = join(baseDir, 'catalog.json');
const catalogSignaturePath = join(baseDir, 'catalog.sig');
const appReleasePath = join(baseDir, 'app-release.json');
const defaultKeyId =
    process.env.OCYRA_MANIFEST_KEY_ID
    || 'ocyra-registry-rsa-2026-03';

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256OfFile(path) {
    return createHash('sha256')
        .update(readFileSync(path))
        .digest('hex')
        .toUpperCase();
}

function normalizeCatalogPath(path) {
    return path.replace(/\\/gu, '/');
}

function normalizeLocaleCode(value) {
    return String(value || '').trim().toLowerCase().replace(/_/gu, '-');
}

function findSigningKeyPair() {
    const candidateDirs = [
        resolve(baseDir, '..', '..', '.signing'),
        resolve(baseDir, '..', '..', '..', 'OCYRA-Update-Registry', '.signing')
    ];

    for (const dir of candidateDirs) {
        const privateKeyPath = join(dir, 'manifest-signing-private.pem');
        const publicKeyPath = join(dir, 'manifest-signing-public.pem');
        if (!existsSync(privateKeyPath) || !existsSync(publicKeyPath)) continue;
        return {
            privateKeyPem: readFileSync(privateKeyPath, 'utf8'),
            sourceDir: dir
        };
    }

    return null;
}

function listDirectories(path) {
    return readdirSync(path, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => join(path, entry.name))
        .sort((left, right) => left.localeCompare(right));
}

function collectPluginPackageFiles(plugin, pluginDir) {
    const seen = new Set();
    const specs = [];
    const addFile = (relativePath, kind) => {
        const normalizedRelativePath = normalizeCatalogPath(String(relativePath || '').trim());
        if (!normalizedRelativePath) return;
        const key = normalizedRelativePath.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        const absolutePath = join(pluginDir, normalizedRelativePath);
        if (!existsSync(absolutePath)) return;

        const catalogRelativePath = normalizeCatalogPath(
            absolutePath.slice(baseDir.length + 1)
        );

        specs.push({
            kind,
            path: catalogRelativePath,
            package_path: normalizedRelativePath,
            sha256: sha256OfFile(absolutePath),
            size_bytes: readFileSync(absolutePath).length
        });
    };

    addFile('plugin.json', 'manifest');
    addFile(String(plugin?.runtime?.entry || '').trim(), 'runtime-entry');
    if (typeof plugin?.settings_schema === 'string') {
        addFile(plugin.settings_schema, 'settings-schema');
    }
    if (typeof plugin?.policy_file === 'string') {
        addFile(plugin.policy_file, 'policy-file');
    }
    for (const file of Array.isArray(plugin?.data_files) ? plugin.data_files : []) {
        addFile(file, 'data-file');
    }

    const localesDir = join(pluginDir, 'locales');
    if (existsSync(localesDir)) {
        for (const entry of readdirSync(localesDir, { withFileTypes: true })) {
            if (!entry.isFile()) continue;
            if (!entry.name.toLowerCase().endsWith('.json')) continue;
            addFile(`locales/${entry.name}`, 'locale-bundle');
        }
    }

    return specs.sort((left, right) => left.package_path.localeCompare(right.package_path));
}

function collectPluginLocaleBundles(pluginDir) {
    const localesDir = join(pluginDir, 'locales');
    if (!existsSync(localesDir)) {
        return {};
    }

    const bundles = {};
    for (const entry of readdirSync(localesDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (!entry.name.toLowerCase().endsWith('.json')) continue;
        const locale = normalizeLocaleCode(entry.name.slice(0, -5));
        if (!locale) continue;
        const bundlePath = join(localesDir, entry.name);
        const bundle = readJson(bundlePath);
        if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
            continue;
        }
        bundles[locale] = bundle;
    }

    return bundles;
}

function collectPlugins() {
    const plugins = [];
    for (const familyDir of listDirectories(pluginsRoot)) {
        for (const pluginDir of listDirectories(familyDir)) {
            const pluginPath = join(pluginDir, 'plugin.json');
            if (!existsSync(pluginPath)) continue;
            const plugin = readJson(pluginPath);
            const localeBundles = collectPluginLocaleBundles(pluginDir);
            const pluginRelativeDir = normalizeCatalogPath(pluginDir.slice(baseDir.length + 1));
            plugins.push({
                ...plugin,
                ...(Object.keys(localeBundles).length > 0 ? { locale_bundles: localeBundles } : {}),
                package_root_path: pluginRelativeDir,
                package_files: collectPluginPackageFiles(plugin, pluginDir)
            });
        }
    }

    return plugins.sort((left, right) => String(left.id || '').localeCompare(String(right.id || '')));
}

function collectDependencyPackages() {
    const dependencyRegistry = readJson(dependencyRegistryPath);
    const entries = Array.isArray(dependencyRegistry.dependencies) ? dependencyRegistry.dependencies : [];

    return entries.map(entry => {
        const manifestPath = String(entry.manifest_path || '').trim();
        const absoluteManifestPath = join(dependenciesRoot, manifestPath);
        const manifest = existsSync(absoluteManifestPath) ? readJson(absoluteManifestPath) : null;

        return {
            registry_entry: entry,
            manifest,
            dependency_json_path: manifestPath ? `dependencies/${manifestPath.replace(/\\/gu, '/')}` : ''
        };
    });
}

function readAppRelease() {
    if (!existsSync(appReleasePath)) {
        return {};
    }
    return readJson(appReleasePath);
}

function buildListings(plugins) {
    return plugins.map(plugin => {
        const tags = [...new Set([
            String(plugin.family || '').trim(),
            ...(Array.isArray(plugin.capabilities) ? plugin.capabilities : [])
        ].filter(Boolean))];

        return {
            id: `listing-${plugin.id}`,
            kind: 'plugin',
            name: plugin.name,
            summary: plugin.summary,
            publisher_id: 'ocyra-core',
            channel: 'stable',
            target_ref: {
                type: 'plugin',
                id: plugin.id,
                version: plugin.version
            },
            permissions: Array.isArray(plugin.permissions) ? plugin.permissions : [],
            compatibility: plugin.compatibility || {},
            tags
        };
    });
}

const plugins = collectPlugins();
const dependencyPackages = collectDependencyPackages();
const appRelease = readAppRelease();
const catalog = {
    catalog_version: '1',
    published_at: new Date().toISOString(),
    app_release: appRelease,
    channels: ['stable'],
    publishers: [
        {
            id: 'ocyra-core',
            name: 'OCYRA Core',
            verified: true,
            website: 'https://github.com/realfabianschmidt/OCYRA',
            support_url: 'https://github.com/realfabianschmidt/OCYRA/issues',
            key_ids: ['ocyra-registry-rsa-2026-03']
        }
    ],
    listings: buildListings(plugins),
    plugins,
    dependency_packages: dependencyPackages
};

const catalogRaw = `${JSON.stringify(catalog, null, 2)}\n`;
writeFileSync(catalogPath, catalogRaw, 'utf8');
console.log(`Wrote ${catalogPath}`);

const signingKeyPair = findSigningKeyPair();
if (signingKeyPair) {
    const signature = signBuffer('sha256', Buffer.from(catalogRaw, 'utf8'), {
        key: signingKeyPair.privateKeyPem,
        padding: constants.RSA_PKCS1_PADDING
    }).toString('hex').toUpperCase();

    writeFileSync(catalogSignaturePath, `${JSON.stringify({
        key_id: defaultKeyId,
        algorithm: 'RSA-SHA256',
        catalog_version: String(catalog.catalog_version || '').trim(),
        signed_at: new Date().toISOString(),
        signature
    }, null, 2)}\n`, 'utf8');
    console.log(`Signed ${catalogSignaturePath} using ${signingKeyPair.sourceDir}`);
} else {
    console.warn(`No signing key pair found for ${catalogPath}; catalog.sig was not updated.`);
}


