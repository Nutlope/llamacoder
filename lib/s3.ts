import { S3Client } from "@aws-sdk/client-s3";

export function getS3() {
  const accessKeyId = process.env.S3_UPLOAD_KEY;
  const secretAccessKey = process.env.S3_UPLOAD_SECRET;
  const bucket = process.env.S3_UPLOAD_BUCKET;
  const region = process.env.S3_UPLOAD_REGION;

  if (!accessKeyId || !secretAccessKey || !bucket || !region) {
    throw new Error("Missing S3 upload configuration");
  }

  return {
    bucket,
    client: new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  };
}
