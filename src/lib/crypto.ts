/**
 * Client-side encryption for share links (WebCrypto only — no dependencies).
 *
 * Threat model: the share link travels through chat apps and QR codes; the
 * payload sits in the URL fragment, which browsers never send to the host, but
 * anyone who sees the link can read it. With a passphrase, the link carries
 * only ciphertext — it stays unreadable unless the passphrase leaks through the
 * same channel, which is why the UI insists it is shared out-of-band.
 *
 * Envelope: `salt(16) | iv(12) | AES-256-GCM(deflate-raw JSON)`.
 * The key comes from PBKDF2-HMAC-SHA256 (310k iterations, OWASP-aligned) so a
 * low-entropy passphrase is not instantly brute-forceable; GCM adds tamper
 * detection, so a wrong passphrase or a modified link simply fails to open.
 */

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function subtleAvailable(): boolean {
	return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

/** Encrypt a JSON string into the share envelope, or null without WebCrypto. */
export async function encryptSharePayload(json: string, password: string): Promise<Uint8Array | null> {
	if (!subtleAvailable()) return null;
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	const key = await deriveKey(password, salt);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv as BufferSource },
		key,
		new TextEncoder().encode(json) as BufferSource,
	);
	const envelope = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.byteLength);
	envelope.set(salt, 0);
	envelope.set(iv, SALT_BYTES);
	envelope.set(new Uint8Array(ciphertext), SALT_BYTES + IV_BYTES);
	return envelope;
}

/** Open a share envelope back into its JSON string; null for a wrong passphrase or a tampered link. */
export async function decryptSharePayload(envelope: Uint8Array, password: string): Promise<string | null> {
	if (!subtleAvailable()) return null;
	if (envelope.length <= SALT_BYTES + IV_BYTES) return null;
	const salt = envelope.slice(0, SALT_BYTES);
	const iv = envelope.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
	const ciphertext = envelope.slice(SALT_BYTES + IV_BYTES);
	try {
		const key = await deriveKey(password, salt);
		const plain = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: iv as BufferSource },
			key,
			ciphertext as BufferSource,
		);
		return new TextDecoder().decode(plain);
	} catch {
		// Wrong passphrase and tampered ciphertext both fail GCM authentication.
		return null;
	}
}
