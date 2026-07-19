import { parseCloudinaryConfig } from "./cloudinary-config-values";

export function getCloudinaryConfig() {
  return parseCloudinaryConfig(process.env);
}
