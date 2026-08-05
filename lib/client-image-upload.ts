type PresignedUploadResponse = {
  url: string;
  headers: Record<string, string>;
  key: string;
};

type VerifiedImageResponse = {
  token: string;
};

export async function uploadImage(
  file: File,
  signal?: AbortSignal,
): Promise<VerifiedImageResponse> {
  const checksum = await sha256Base64(file);
  const signResponse = await fetch("/api/s3-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
      checksum,
    }),
    signal,
  });

  if (!signResponse.ok) {
    throw new Error(
      await getErrorMessage(signResponse, "Image is not allowed"),
    );
  }

  const upload = (await signResponse.json()) as PresignedUploadResponse;

  const uploadResponse = await fetch(upload.url, {
    method: "PUT",
    headers: upload.headers,
    body: file,
    signal,
  });
  if (!uploadResponse.ok) {
    throw new Error(
      uploadResponse.status === 412
        ? "This image upload was already used"
        : "Failed to upload image",
    );
  }

  const completeResponse = await fetch("/api/s3-upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: upload.key }),
    signal,
  });
  if (!completeResponse.ok) {
    throw new Error(
      await getErrorMessage(completeResponse, "Image verification failed"),
    );
  }

  return (await completeResponse.json()) as VerifiedImageResponse;
}

async function sha256Base64(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}
