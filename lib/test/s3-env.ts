const S3_ENV = {
  S3_UPLOAD_KEY: "test-access-key",
  S3_UPLOAD_SECRET: "test-secret-key",
  S3_UPLOAD_BUCKET: "test-bucket",
  S3_UPLOAD_REGION: "us-east-1",
} as const;

export function setUpS3TestEnv() {
  const original = Object.fromEntries(
    Object.keys(S3_ENV).map((name) => [name, process.env[name]]),
  );

  Object.assign(process.env, S3_ENV);

  return () => {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  };
}
