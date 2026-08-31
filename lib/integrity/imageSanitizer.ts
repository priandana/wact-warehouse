// lib/integrity/imageSanitizer.ts
// Server-Side Zero-Dependency Image Metadata Sanitizer for WACT Integrity Center
// Strips 100% of EXIF, GPS, XMP, IPTC, timestamps, camera/device identifiers, and comments.

/**
 * Strips all metadata segments (APP1 EXIF/GPS/XMP, APP13 IPTC, COM comments) from a JPEG buffer.
 */
export function sanitizeJpegBuffer(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('Invalid JPEG format: missing SOI marker');
  }

  const chunks: Buffer[] = [Buffer.from([0xff, 0xd8])]; // Start with SOI
  let offset = 2;

  while (offset < buffer.length) {
    // Find next marker (must start with 0xFF)
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    // Skip fill bytes (0xFF)
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset++;
    }

    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset++;

    // End of Image (EOI)
    if (marker === 0xd9) {
      chunks.push(Buffer.from([0xff, 0xd9]));
      break;
    }

    // Restart markers (RST0-RST7: 0xD0 - 0xD7) or SOI (0xD8) have no length
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0xd8) {
      chunks.push(Buffer.from([0xff, marker]));
      continue;
    }

    // Markers without payload
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 1 >= buffer.length) break;

    // Read 2-byte segment length (big-endian, includes length bytes itself)
    const segmentLength = buffer.readUInt16BE(offset);
    const segmentStart = offset - 2; // includes 0xFF and marker
    const segmentEnd = offset + segmentLength;

    if (segmentEnd > buffer.length) {
      throw new Error('Malformed JPEG: segment exceeds buffer bounds');
    }

    // Check if marker should be STRIPPED:
    // 0xE1 = APP1 (EXIF, GPS, XMP)
    // 0xE2 = APP2 (FlashPix, ICC profile if unwanted)
    // 0xED = APP13 (Photoshop / IPTC metadata)
    // 0xFE = COM (Comment)
    // 0xE3-0xEF = Other vendor application markers
    const isMetadataSegment =
      marker === 0xe1 || // EXIF / GPS / XMP
      marker === 0xed || // IPTC / Photoshop
      marker === 0xfe || // Comment
      (marker >= 0xe2 && marker <= 0xef && marker !== 0xe0); // Other non-JFIF APP markers

    // Start of Scan (SOS - 0xDA): everything following is the entropy-coded scan data until EOI
    if (marker === 0xda) {
      // Include SOS segment header and all remaining image data
      chunks.push(buffer.subarray(segmentStart));
      break;
    }

    if (!isMetadataSegment) {
      // Retain essential image data segments (e.g. 0xE0 JFIF, 0xDB DQT, 0xC0-0xC3 SOF, 0xC4 DHT)
      chunks.push(buffer.subarray(segmentStart, segmentEnd));
    }

    offset = segmentEnd;
  }

  return Buffer.concat(chunks);
}

/**
 * Strips metadata chunks (eXIf, tEXt, zTXt, iTXt, tIME) from a PNG buffer.
 */
export function sanitizePngBuffer(buffer: Buffer): Buffer {
  // PNG Magic Header: 89 50 4E 47 0D 0A 1A 0A
  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('Invalid PNG format: missing magic header');
  }

  const chunks: Buffer[] = [PNG_MAGIC];
  let offset = 8;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const totalChunkLength = 12 + length; // 4 len + 4 type + data + 4 crc

    if (offset + totalChunkLength > buffer.length) {
      throw new Error('Malformed PNG: chunk exceeds buffer bounds');
    }

    // Metadata chunks to STRIP
    const isMetadataChunk =
      type === 'eXIf' ||
      type === 'tEXt' ||
      type === 'zTXt' ||
      type === 'iTXt' ||
      type === 'tIME' ||
      type === 'pHYs' ||
      type === 'dSIG';

    if (!isMetadataChunk) {
      chunks.push(buffer.subarray(offset, offset + totalChunkLength));
    }

    if (type === 'IEND') break;
    offset += totalChunkLength;
  }

  return Buffer.concat(chunks);
}

/**
 * Strips metadata chunks (EXIF, XMP, ICCP) from a WebP RIFF buffer.
 */
export function sanitizeWebpBuffer(buffer: Buffer): Buffer {
  if (buffer.length < 12) {
    throw new Error('Invalid WebP format: file too short');
  }
  if (
    buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
    buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    throw new Error('Invalid WebP format: missing RIFF/WEBP header');
  }

  const chunks: Buffer[] = [];
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.subarray(offset, offset + 4).toString('ascii');
    const chunkLen = buffer.readUInt32LE(offset + 4);
    const paddedLen = chunkLen + (chunkLen % 2); // RIFF chunks are 2-byte aligned
    const totalChunkLen = 8 + paddedLen;

    if (offset + totalChunkLen > buffer.length) {
      if (offset + 8 + chunkLen <= buffer.length) {
        // Last chunk without padding
      } else {
        throw new Error('Malformed WebP: chunk exceeds buffer bounds');
      }
    }

    const isMetadataChunk = chunkType === 'EXIF' || chunkType === 'XMP ' || chunkType === 'ICCP';

    if (chunkType === 'VP8X' && chunkLen >= 10) {
      // VP8X header payload starts at offset + 8. Flags byte is at offset + 8.
      // Flags: Bit 1 = Animation, Bit 2 = XMP, Bit 3 = EXIF, Bit 4 = Alpha, Bit 5 = ICCP
      const vp8xChunk = Buffer.from(buffer.subarray(offset, offset + totalChunkLen));
      // Clear bits 2 (XMP: 0x04), 3 (EXIF: 0x08), and 5 (ICCP: 0x20) => ~0x2c
      vp8xChunk[8] = vp8xChunk[8] & ~0x2c;
      chunks.push(vp8xChunk);
    } else if (!isMetadataChunk) {
      chunks.push(
        buffer.subarray(offset, offset + Math.min(totalChunkLen, buffer.length - offset))
      );
    }

    offset += totalChunkLen;
  }

  const payload = Buffer.concat(chunks);
  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 'ascii');
  riffHeader.writeUInt32LE(payload.length + 4, 4); // RIFF size = payload + 4 ('WEBP')
  riffHeader.write('WEBP', 8, 'ascii');

  return Buffer.concat([riffHeader, payload]);
}

/**
 * Universal Server-Side Image Sanitizer
 * Discards all EXIF, GPS, device fingerprints, and metadata across JPEG, PNG, and WebP.
 * Fails closed for any unsupported or unrecognized formats.
 */
export function sanitizeServerImage(
  buffer: Buffer,
  mimeType: string = 'image/jpeg'
): { sanitizedBuffer: Buffer; contentType: string; extension: string } {
  // Enforce 10MB limit
  if (buffer.length > 10485760) {
    throw new Error('Ukuran file melebihi batas 10MB.');
  }

  // Detect JPEG format by magic bytes (0xFF 0xD8)
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    const sanitized = sanitizeJpegBuffer(buffer);
    return { sanitizedBuffer: sanitized, contentType: 'image/jpeg', extension: 'jpg' };
  }

  // Detect PNG format by magic bytes (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    const sanitized = sanitizePngBuffer(buffer);
    return { sanitizedBuffer: sanitized, contentType: 'image/png', extension: 'png' };
  }

  // Detect WebP format by magic bytes (RIFF .... WEBP)
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    const sanitized = sanitizeWebpBuffer(buffer);
    return { sanitizedBuffer: sanitized, contentType: 'image/webp', extension: 'webp' };
  }

  throw new Error('Format gambar tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan.');
}
