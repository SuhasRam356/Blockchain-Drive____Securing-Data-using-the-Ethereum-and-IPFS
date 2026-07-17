import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body for Vercel Serverless
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { fileName, fileType } = body;
    
    if (!fileName) {
      return res.status(400).json({ error: 'Missing fileName' });
    }

    // Read from process.env (Server-side only!)
    // We check both VITE_ and non-VITE for backwards compatibility while the user transitions
    const accessKeyId = process.env.FILEBASE_ACCESS_KEY || process.env.VITE_FILEBASE_ACCESS_KEY;
    const secretAccessKey = process.env.FILEBASE_SECRET_KEY || process.env.VITE_FILEBASE_SECRET_KEY;
    const bucketName = process.env.FILEBASE_BUCKET || process.env.VITE_FILEBASE_BUCKET;

    if (!accessKeyId || !secretAccessKey || !bucketName) {
      return res.status(500).json({ error: "Server missing Filebase credentials" });
    }

    const s3 = new S3Client({
      endpoint: "https://s3.filebase.com",
      region: "us-east-1",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const key = `${Date.now()}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType || "application/octet-stream",
    });

    // Generate a secure URL that expires in 15 minutes
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    res.status(200).json({ url: signedUrl, key: key });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}
