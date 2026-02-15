export async function compressToURL<T extends object>(obj: T): Promise<string> {
    const str = JSON.stringify(obj);
    const stream = new Blob([str]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream("deflate"));
    const buffer = await new Response(compressedStream).arrayBuffer();

    // Convert buffer to Base64 (using btoa or a buffer helper)
    return encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(buffer))));
}

export async function decompressFromURL<T extends object>(base64UriComponent: string): Promise<T> {
    // Restore padding and standard Base64 characters
    const standardBase64 = decodeURIComponent(base64UriComponent);
    const binary = atob(standardBase64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(bytes);
            controller.close();
        },
    });

    const decompressedStream = stream.pipeThrough(new DecompressionStream("deflate"));
    const result = await new Response(decompressedStream).text();
    return JSON.parse(result) as T;
}

export class CompressedDecompressedPair<T extends object> {
    compressed: string | null = null;
    decompressed: T | null = null;

    constructor(
        private compress: (decompressed: T) => Promise<string> = compressToURL,
        private decompress: (compressed: string) => Promise<T> = decompressFromURL
    ) { }

    async decompressIfNeeded(compressed: string | null): Promise<T | null> {
        if (!compressed) {
            this.compressed = null;
            this.decompressed = null;

            return null;
        }

        if (compressed === this.compressed && this.decompressed) {
            return this.decompressed;
        }

        const decompressed = await this.decompress(compressed);
        this.compressed = compressed;
        this.decompressed = decompressed;
        return decompressed;
    }

    async compressIfNeeded(decompressed: T | null): Promise<string | null> {
        if (!decompressed) {
            this.compressed = null;
            this.decompressed = null;
            return null;
        }

        if (this.decompressed && JSON.stringify(this.decompressed) === JSON.stringify(decompressed) && this.compressed) {
            return this.compressed;
        }

        const compressed = await this.compress(decompressed);
        this.compressed = compressed;
        this.decompressed = decompressed;
        return compressed;
    }
}