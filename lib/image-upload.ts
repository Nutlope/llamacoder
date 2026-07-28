export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_IMAGE_DIMENSION = 8_192;
export const IMAGE_UPLOAD_EXPIRY_SECONDS = 5 * 60;

export const UPLOADED_IMAGE_PREFIX = "next-s3-uploads/uploads/";

export type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

type ImageTypeSpec = {
  extension: "jpg" | "png" | "webp";
  acceptedExtensions: readonly string[];
  sharpFormat: "jpeg" | "png" | "webp";
};

const IMAGE_TYPES: Record<SupportedImageType, ImageTypeSpec> = {
  "image/jpeg": {
    extension: "jpg",
    acceptedExtensions: ["jpg", "jpeg"],
    sharpFormat: "jpeg",
  },
  "image/png": {
    extension: "png",
    acceptedExtensions: ["png"],
    sharpFormat: "png",
  },
  "image/webp": {
    extension: "webp",
    acceptedExtensions: ["webp"],
    sharpFormat: "webp",
  },
};

export class ImageUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export type ImageUploadRequest = {
  contentType: SupportedImageType;
  extension: ImageTypeSpec["extension"];
  size: number;
  checksum: string;
};

export function parseImageUploadRequest(input: unknown): ImageUploadRequest {
  if (!isRecord(input)) {
    throw new ImageUploadError("Invalid upload request", 400);
  }

  const filename = input.filename;
  const contentType = input.contentType;
  const size = input.size;
  const checksum = input.checksum;

  if (
    typeof filename !== "string" ||
    filename.length === 0 ||
    filename.length > 255 ||
    typeof contentType !== "string" ||
    typeof size !== "number" ||
    !Number.isSafeInteger(size)
  ) {
    throw new ImageUploadError("Invalid upload request", 400);
  }

  if (!isSupportedImageType(contentType)) {
    throw new ImageUploadError(
      "Only PNG, JPEG, and WebP images are allowed",
      415,
    );
  }

  if (size < 1) {
    throw new ImageUploadError("The image is empty", 400);
  }

  if (size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new ImageUploadError(
      `Images must be ${formatMegabytes(MAX_IMAGE_UPLOAD_BYTES)} or smaller`,
      413,
    );
  }

  const extension = filename.split(".").pop()?.toLowerCase();
  const spec = IMAGE_TYPES[contentType];
  if (!extension || !spec.acceptedExtensions.includes(extension)) {
    throw new ImageUploadError(
      "The filename extension does not match the image type",
      415,
    );
  }

  if (typeof checksum !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(checksum)) {
    throw new ImageUploadError("Invalid image checksum", 400);
  }

  return {
    contentType,
    extension: spec.extension,
    size,
    checksum,
  };
}

export function createUploadedImageKey(
  contentType: SupportedImageType,
): string {
  return `${UPLOADED_IMAGE_PREFIX}${crypto.randomUUID()}.${
    IMAGE_TYPES[contentType].extension
  }`;
}

export function parseUploadedImageKey(key: unknown): {
  contentType: SupportedImageType;
  key: string;
} {
  if (typeof key !== "string") {
    throw new ImageUploadError("Invalid upload key", 400);
  }

  const match = key.match(
    /^next-s3-uploads\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)$/i,
  );
  if (!match) {
    throw new ImageUploadError("Invalid upload key", 400);
  }

  const [, id, extension] = match;
  const contentType = contentTypeForExtension(extension);

  return {
    contentType,
    key: `${UPLOADED_IMAGE_PREFIX}${id.toLowerCase()}.${extension.toLowerCase()}`,
  };
}

export function getImageTypeSpec(contentType: SupportedImageType) {
  return IMAGE_TYPES[contentType];
}

export function imageContentDisposition(
  contentType: SupportedImageType,
): string {
  return `attachment; filename="upload.${IMAGE_TYPES[contentType].extension}"`;
}

function contentTypeForExtension(extension: string): SupportedImageType {
  switch (extension.toLowerCase()) {
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      throw new ImageUploadError("Invalid upload key", 400);
  }
}

function isSupportedImageType(value: string): value is SupportedImageType {
  return Object.hasOwn(IMAGE_TYPES, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatMegabytes(bytes: number) {
  return `${bytes / 1024 / 1024} MB`;
}
