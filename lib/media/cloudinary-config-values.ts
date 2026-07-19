export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export class CloudinaryConfigurationError extends Error {
  constructor(missingVariables: string[]) {
    super(`Cloudinary is not configured. Missing required environment variables: ${missingVariables.join(", ")}.`);
    this.name = "CloudinaryConfigurationError";
  }
}

export function parseCloudinaryConfig(environment: Record<string, string | undefined>): CloudinaryConfig {
  const names = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;
  const values = Object.fromEntries(names.map((name) => [name, environment[name]?.trim()]));
  const missing = names.filter((name) => !values[name]);
  if (missing.length) throw new CloudinaryConfigurationError([...missing]);
  return {
    cloudName: values.CLOUDINARY_CLOUD_NAME as string,
    apiKey: values.CLOUDINARY_API_KEY as string,
    apiSecret: values.CLOUDINARY_API_SECRET as string,
  };
}
