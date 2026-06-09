import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

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
 * Get the raw (private) URL of a blob — not publicly accessible.
 */
export function getBlobUrl(blobPath: string): string {
  return containerClient.getBlockBlobClient(blobPath).url;
}

/**
 * Parse an Azure Storage connection string and return account credentials.
 * Connection strings look like:
 *   DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=yyy;EndpointSuffix=...
 */
function parseConnectionStringCredentials(cs: string): {
  accountName: string;
  accountKey: string;
} {
  const map: Record<string, string> = {};
  cs.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > 0) map[part.slice(0, idx)] = part.slice(idx + 1);
  });
  return { accountName: map.AccountName, accountKey: map.AccountKey };
}

/**
 * Generate a time-limited SAS (Shared Access Signature) URL for a blob.
 * The URL is safe to embed in <Image> components on the client.
 *
 * @param blobPath      Full path inside the container, e.g. "patients/uid/avatar.jpg"
 * @param expiresInDays How long the SAS should be valid (default 365 days)
 */
export function generateSasUrl(
  blobPath: string,
  expiresInDays = 365
): string {
  const { accountName, accountKey } = parseConnectionStringCredentials(
    connectionString
  );
  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  const expiresOn = new Date();
  expiresOn.setDate(expiresOn.getDate() + expiresInDays);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName:    blobPath,
      permissions: BlobSASPermissions.parse("r"), // read-only
      expiresOn,
    },
    credential
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;
}
