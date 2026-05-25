import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName   = process.env.AZURE_STORAGE_CONTAINER || "wellness";

// Singleton service client
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

// Singleton container client (the root "wellness" container)
export const containerClient: ContainerClient =
  blobServiceClient.getContainerClient(containerName);

/**
 * Upload a file (Buffer or stream) to the wellness container.
 *
 * @param blobPath  Full path inside the container, e.g. "doctors/doc123/avatar.png"
 * @param data      Buffer containing the file bytes
 * @param contentType  MIME type, e.g. "image/png"
 * @returns The blob URL
 */
export async function uploadBlob(
  blobPath: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const blockBlob = containerClient.getBlockBlobClient(blobPath);
  await blockBlob.uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blockBlob.url;
}

/**
 * Delete a blob from the wellness container.
 *
 * @param blobPath  Full path inside the container, e.g. "doctors/doc123/avatar.png"
 */
export async function deleteBlob(blobPath: string): Promise<void> {
  const blockBlob = containerClient.getBlockBlobClient(blobPath);
  await blockBlob.deleteIfExists();
}

/**
 * Generate a URL for a blob (private container — use backend-proxied download,
 * or generate a SAS URL here when needed).
 *
 * @param blobPath  Full path inside the container
 * @returns The blob URL (not publicly accessible; backend must proxy or generate SAS)
 */
export function getBlobUrl(blobPath: string): string {
  return containerClient.getBlockBlobClient(blobPath).url;
}
