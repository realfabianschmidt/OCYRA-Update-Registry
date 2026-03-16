#!/usr/bin/env node

import { constants, createPublicKey, generateKeyPairSync, sign as signBuffer } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryRepoRoot = resolve(__dirname, '..');
const defaultKeyDir = resolve(registryRepoRoot, '.signing');
const defaultPrivateKeyPath = resolve(defaultKeyDir, 'manifest-signing-private.pem');
const defaultPublicKeyPath = resolve(defaultKeyDir, 'manifest-signing-public.pem');
const defaultKeyId = process.env.XYRA_MANIFEST_KEY_ID || 'xyra-registry-rsa-2026-03';

function getPublicKeyHex(publicKeyPem) {
    return createPublicKey(publicKeyPem)
        .export({ format: 'der', type: 'spki' })
        .toString('hex')
        .toUpperCase();
}

function ensureSigningKeyPair({ generateIfMissing }) {
    if (!existsSync(defaultPrivateKeyPath) || !existsSync(defaultPublicKeyPath)) {
        if (!generateIfMissing) {
            throw new Error(
                `Missing signing key pair. Run "node scripts/sign-manifest.mjs generate-keypair" first.`
            );
        }

        mkdirSync(defaultKeyDir, { recursive: true });
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 3072,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        writeFileSync(defaultPrivateKeyPath, privateKey, 'utf8');
        writeFileSync(defaultPublicKeyPath, publicKey, 'utf8');
    }

    const privateKeyPem = readFileSync(defaultPrivateKeyPath, 'utf8');
    const publicKeyPem = readFileSync(defaultPublicKeyPath, 'utf8');
    return {
        privateKeyPem,
        publicKeyPem,
        publicKeyHex: getPublicKeyHex(publicKeyPem)
    };
}

function readManifestVersion(manifestPath) {
    const raw = readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
        raw,
        manifestVersion: String(parsed.manifest_version || '').trim()
    };
}

function signManifest(manifestPath, keyPair, keyId) {
    const resolvedManifestPath = resolve(manifestPath);
    const { raw, manifestVersion } = readManifestVersion(resolvedManifestPath);
    const signature = signBuffer('sha256', Buffer.from(raw, 'utf8'), {
        key: keyPair.privateKeyPem,
        padding: constants.RSA_PKCS1_PADDING
    })
        .toString('hex')
        .toUpperCase();

    const envelope = {
        key_id: keyId,
        algorithm: 'RSA-SHA256',
        manifest_version: manifestVersion,
        signed_at: new Date().toISOString(),
        signature
    };

    const signaturePath = resolve(dirname(resolvedManifestPath), 'manifest.sig');
    writeFileSync(signaturePath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
    return { signaturePath, manifestVersion };
}

function printUsage() {
    console.log('Usage:');
    console.log('  node scripts/sign-manifest.mjs generate-keypair');
    console.log('  node scripts/sign-manifest.mjs sign <manifest-path> [more-manifest-paths...]');
}

const [command = 'sign', ...args] = process.argv.slice(2);

if (command === 'generate-keypair') {
    const keyPair = ensureSigningKeyPair({ generateIfMissing: true });
    console.log(`Key ID: ${defaultKeyId}`);
    console.log(`Public key hex: ${keyPair.publicKeyHex}`);
    console.log(`Private key: ${defaultPrivateKeyPath}`);
    console.log(`Public key: ${defaultPublicKeyPath}`);
    process.exit(0);
}

if (command !== 'sign' || args.length === 0) {
    printUsage();
    process.exit(command === 'sign' ? 1 : 0);
}

const keyPair = ensureSigningKeyPair({ generateIfMissing: false });
for (const manifestPath of args) {
    const { signaturePath, manifestVersion } = signManifest(manifestPath, keyPair, defaultKeyId);
    console.log(`${resolve(manifestPath)} -> ${signaturePath} (${manifestVersion || 'no manifest_version'})`);
}
