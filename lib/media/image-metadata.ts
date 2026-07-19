import { isValidImageDimensions } from "./validation";

function u16(buffer: Buffer, offset: number, littleEndian = false) {
  return littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
}

export function readImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  try {
    let dimensions: { width: number; height: number } | null = null;
    if (mimeType === "image/png" && buffer.subarray(1, 4).toString() === "PNG") dimensions = { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    else if (mimeType === "image/gif" && buffer.subarray(0, 3).toString() === "GIF") dimensions = { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    else if (mimeType === "image/webp" && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") {
      const kind = buffer.subarray(12, 16).toString();
      if (kind === "VP8X") dimensions = { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
      else if (kind === "VP8L") { const bits = buffer.readUInt32LE(21); dimensions = { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
    } else if (mimeType === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset += 1; continue; }
        const marker = buffer[offset + 1];
        const length = u16(buffer, offset + 2);
        if (marker >= 0xc0 && marker <= 0xc3) { dimensions = { height: u16(buffer, offset + 5), width: u16(buffer, offset + 7) }; break; }
        if (length < 2) break;
        offset += length + 2;
      }
    } else if (mimeType === "image/avif" && buffer.includes(Buffer.from("ftypavif"))) {
      const marker = buffer.indexOf(Buffer.from("ispe"));
      if (marker >= 0 && marker + 12 <= buffer.length) dimensions = { width: buffer.readUInt32BE(marker + 4), height: buffer.readUInt32BE(marker + 8) };
    }
    return dimensions && isValidImageDimensions(dimensions.width, dimensions.height) ? dimensions : null;
  } catch { return null; }
}
