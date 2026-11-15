import test from "node:test";
import assert from "node:assert/strict";

import { decryptSharePayload, encryptSharePayload } from "../src/lib/crypto.ts";

const JSON_BODY = JSON.stringify({ firstName: "志远", note: "加密分享 🚀" });
const PASSPHRASE = "正确的口令 passphrase 123";

test("encrypt → decrypt round-trips the payload", async () => {
	const envelope = await encryptSharePayload(JSON_BODY, PASSPHRASE);
	assert.ok(envelope, "WebCrypto is available in Node");
	const json = await decryptSharePayload(envelope!, PASSPHRASE);
	assert.equal(json, JSON_BODY);
});

test("the envelope is salt(16) | iv(12) | ciphertext and never carries plaintext", async () => {
	const envelope = (await encryptSharePayload(JSON_BODY, PASSPHRASE))!;
	assert.ok(envelope.length > 28 + 16, "envelope includes salt, iv, tag and ciphertext");
	const bytes = Buffer.from(envelope).toString("latin1");
	assert.ok(!bytes.includes("志远"), "plaintext must not leak into the envelope");
	// Two encryptions of the same payload differ (fresh salt + iv each time).
	const envelope2 = (await encryptSharePayload(JSON_BODY, PASSPHRASE))!;
	assert.notDeepEqual(Buffer.from(envelope).toString("base64"), Buffer.from(envelope2).toString("base64"));
});

test("a wrong passphrase fails to open the envelope", async () => {
	const envelope = (await encryptSharePayload(JSON_BODY, PASSPHRASE))!;
	assert.equal(await decryptSharePayload(envelope, "错误的口令"), null);
});

test("a tampered envelope fails authentication", async () => {
	const envelope = (await encryptSharePayload(JSON_BODY, PASSPHRASE))!;
	const corrupted = Uint8Array.from(envelope);
	corrupted[corrupted.length - 1] ^= 0xff;
	assert.equal(await decryptSharePayload(corrupted, PASSPHRASE), null);
	const truncated = envelope.slice(0, 10);
	assert.equal(await decryptSharePayload(truncated, PASSPHRASE), null);
});

test("ciphertext bytes differ from any text of the passphrase length", async () => {
	const envelope = (await encryptSharePayload(JSON_BODY, PASSPHRASE))!;
	const text = Buffer.from(envelope).toString("utf8");
	assert.ok(!text.includes(PASSPHRASE), "passphrase must not be stored anywhere");
});
