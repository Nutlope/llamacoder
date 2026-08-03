# S3 image-upload setup

LlamaCoder uses one S3 bucket for direct screenshot uploads. The application
creates unique keys under `next-s3-uploads/uploads/`; it does not quarantine,
copy, move, or delete objects.

## Application credentials

Configure these environment variables:

- `S3_UPLOAD_KEY`
- `S3_UPLOAD_SECRET`
- `S3_UPLOAD_BUCKET`
- `S3_UPLOAD_REGION`
- `IMAGE_UPLOAD_TOKEN_SECRET`

The S3 principal needs `s3:PutObject` and `s3:GetObject` for the upload prefix.
It does not need `s3:DeleteObject`. Every signed PUT includes
`If-None-Match: *`, so S3 rejects reuse of an existing key instead of
overwriting it.

## Bucket CORS

The browser sends the image directly to S3. Configure the bucket to allow the
application origins, `PUT`, and the signed request headers:

```json
[
  {
    "AllowedOrigins": [
      "https://llamacoder.together.ai",
      "https://www.llamacoder.io"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": [
      "Cache-Control",
      "Content-Disposition",
      "Content-Type",
      "If-None-Match",
      "x-amz-checksum-sha256"
    ],
    "ExposeHeaders": ["ETag", "x-amz-checksum-sha256"],
    "MaxAgeSeconds": 300
  }
]
```

Add preview and local origins only where they are needed.

## One-day expiration

Uploads that are abandoned or fail byte validation are intentionally left for
S3 lifecycle cleanup because the application principal cannot delete objects.
A bucket administrator with `s3:PutLifecycleConfiguration` must apply this
rule to the existing bucket:

```json
{
  "Rules": [
    {
      "ID": "ExpireLlamaCoderImageUploadsAfterOneDay",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "next-s3-uploads/uploads/"
      },
      "Expiration": {
        "Days": 1
      }
    }
  ]
}
```

Verify the installed rule with `aws s3api get-bucket-lifecycle-configuration`.
The application credentials are expected to receive `403 AccessDenied` for
lifecycle administration.

## Live verification

After loading the deployment environment, run:

```sh
IMAGE_UPLOAD_E2E=1 node --env-file=.env --env-file=.env.local --import tsx --test lib/image-upload.e2e.test.ts
```

The test uploads one small PNG, confirms that replaying the signed PUT is
rejected with `412`, verifies the stored bytes, and downloads them through the
validated capability. The lifecycle rule removes the test object after one
day.
