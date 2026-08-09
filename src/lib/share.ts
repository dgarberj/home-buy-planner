const HASH_PREFIX = "#share=";

/**
Native gzip streams, not a polyfill -- Safari only gained these in 16.4
(March 2023), so this can be false on an old browser.
*/
export function isShareSupported(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

export function isShareHash(hash: string): boolean {
  return hash.startsWith(HASH_PREFIX);
}

const BASE64_CHUNK_SIZE = 0x8000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    binary += String.fromCodePoint(
      ...bytes.subarray(index, index + BASE64_CHUNK_SIZE),
    );
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.codePointAt(index)!;
  }
  return bytes;
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
Gzip + base64url-encode an exportData() payload into a URL hash value
(without the leading "#"). Lives in the hash, never the query string or
server, since it's a plaintext-decodable copy of real financial data.
*/
export async function encodeShareHash(json: string): Promise<string> {
  const compressed = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const bytes = await readAll(compressed);
  return `${HASH_PREFIX.slice(1)}${toBase64Url(bytes)}`;
}

/**
Reverse of encodeShareHash. `hash` is the full `location.hash` (with the
leading "#share="). Returns null on any malformed or corrupt input so the
caller can flash an error instead of throwing.
*/
export async function decodeShareHash(hash: string): Promise<string | null> {
  if (!isShareHash(hash)) return null;
  try {
    const bytes = fromBase64Url(hash.slice(HASH_PREFIX.length));
    const decompressed = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    const out = await readAll(decompressed);
    return new TextDecoder().decode(out);
  } catch {
    return null;
  }
}
