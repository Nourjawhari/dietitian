export const MAX_REPORT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const REPORT_FILE_EXTENSIONS = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export type ReportContentType = keyof typeof REPORT_FILE_EXTENSIONS;

export type UploadedReportFile = {
  buffer: Buffer;
  contentType: ReportContentType;
};

/** Detects the real file type from its first bytes — the client's Content-Type is not trusted. */
export function detectReportContentType(buffer: Buffer): ReportContentType | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("latin1") === "%PDF") {
    return "application/pdf";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  return null;
}