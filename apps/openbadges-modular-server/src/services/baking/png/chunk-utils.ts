/**
 * PNG chunk manipulation utilities
 *
 * Provides functions for extracting, encoding, and creating PNG chunks,
 * specifically for embedding Open Badges credentials in iTXt chunks.
 */

import extract from "png-chunks-extract";
import encode from "png-chunks-encode";

/**
 * PNG chunk structure
 */
export interface Chunk {
	name: string;
	data: Uint8Array;
}

/**
 * Extract all chunks from a PNG buffer
 *
 * @param buffer - PNG image buffer
 * @returns Array of PNG chunks
 */
export function extractChunks(buffer: Buffer): Chunk[] {
	return extract(buffer);
}

/**
 * Encode chunks back to a PNG buffer
 *
 * @param chunks - Array of PNG chunks
 * @returns PNG image buffer
 */
export function encodeChunks(chunks: Chunk[]): Buffer {
	return Buffer.from(encode(chunks));
}

/**
 * Find an iTXt chunk by keyword
 *
 * @param chunks - Array of PNG chunks
 * @param keyword - iTXt chunk keyword to search for
 * @returns The matching chunk or null if not found
 */
export function findiTXtChunk(chunks: Chunk[], keyword: string): Chunk | null {
	for (const chunk of chunks) {
		if (chunk.name !== "iTXt") {
			continue;
		}

		// iTXt format: keyword + null byte + ...
		const keywordEndIndex = chunk.data.indexOf(0);
		if (keywordEndIndex === -1) {
			continue;
		}

		const chunkKeyword = Buffer.from(
			chunk.data.slice(0, keywordEndIndex),
		).toString("utf-8");
		if (chunkKeyword === keyword) {
			return chunk;
		}
	}

	return null;
}
