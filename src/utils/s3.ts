import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 configuration
export const S3_BUCKET_NAME = "clamo";
export const S3_REGION = "us-east-1";

/**
 * Initialize and return an S3 client instance
 * 
 * @returns Initialized S3Client
 */
export function createS3Client(): S3Client {
  try {
    return new S3Client({
      region: S3_REGION,
    });
  } catch (error) {
    console.error("Error initializing S3 client:", error);
    // Create a dummy client that will throw an error if used
    return new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: "missing",
        secretAccessKey: "missing",
      },
    });
  }
}

// Initialize S3 client - AWS credentials are expected to be in environment variables
// or in AWS credentials file, or via IAM role if running on AWS infrastructure
export const s3 = createS3Client();

/**
 * Generates a presigned URL for accessing a recording in S3
 * 
 * @param roomName - The LiveKit room name used as the recording filename prefix
 * @returns A presigned URL with temporary access to the recording
 */
export async function generatePresignedUrl(roomName: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: `${roomName}.ogg`,
  });

  const presignedUrl = await getSignedUrl(s3, command, {
    expiresIn: 60 * 15, // 15 minutes
  });

  return presignedUrl;
} 

/**
 * Generates a presigned URL for uploading a file to S3 (PUT)
 *
 * @param key - The S3 object key where the file will be stored
 * @param contentType - MIME type of the file
 * @param expiresIn - Expiration in seconds (default 15 minutes)
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 60 * 15
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}

/**
 * Generates a presigned URL for downloading a file from S3 (GET)
 *
 * @param key - The S3 object key of the file to download
 * @param fileName - Optional filename for Content-Disposition header
 * @param expiresIn - Expiration in seconds (default 15 minutes)
 */
export async function generatePresignedDownloadUrl(
  key: string,
  fileName?: string,
  expiresIn = 60 * 15
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ...(fileName && {
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    }),
  });

  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}