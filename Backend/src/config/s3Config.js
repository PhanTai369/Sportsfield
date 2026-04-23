const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl: getS3SignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const AWS_REGION = process.env.AWS_REGION;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const AWS_CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

const PRIVATE_FOLDER_MARKERS = [
  'secure_documents/',
  'business-licenses/',
  'identity-cards/',
  'business_licenses/',
  'identity_cards/'
];

const MIME_TYPE_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  mov: 'video/quicktime'
};

const ensureConfig = () => {
  const missing = ['AWS_REGION', 'AWS_S3_BUCKET_NAME'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing S3 configuration: ${missing.join(', ')}`);
  }
};

const sanitizePathSegment = (value) => String(value || '')
  .replace(/^\/+|\/+$/g, '')
  .replace(/\s+/g, '_');

const detectExtensionFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return 'jpg';

  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (buffer.subarray(0, 4).toString() === 'GIF8') return 'gif';
  if (buffer.subarray(0, 4).toString() === '%PDF') return 'pdf';
  if (buffer.subarray(0, 4).toString('hex') === '52494646' && buffer.subarray(8, 12).toString() === 'WEBP') return 'webp';

  return 'jpg';
};

const splitExtension = (value = '') => {
  const normalized = sanitizePathSegment(value);
  const dotIndex = normalized.lastIndexOf('.');

  if (dotIndex <= 0) {
    return { baseName: normalized, extension: null };
  }

  return {
    baseName: normalized.slice(0, dotIndex),
    extension: normalized.slice(dotIndex + 1).toLowerCase()
  };
};

const isPrivateKey = (key = '') => PRIVATE_FOLDER_MARKERS.some((marker) => key.includes(marker));

const normalizeFolder = (folder = 'profiles') => sanitizePathSegment(folder) || 'profiles';

const buildObjectKey = (fileBuffer, options = {}) => {
  const folder = normalizeFolder(options.folder);
  const publicId = sanitizePathSegment(options.public_id || `${Date.now()}`);
  const { baseName, extension } = splitExtension(publicId);
  const finalExtension = extension || detectExtensionFromBuffer(fileBuffer);

  return `${folder}/${baseName}.${finalExtension}`;
};

const normalizePublicBaseUrl = () => {
  if (AWS_CLOUDFRONT_DOMAIN) {
    return `https://${AWS_CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/g, '')}`;
  }

  return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`;
};

const buildObjectUrl = (key) => `${normalizePublicBaseUrl()}/${key}`;

const uploadImage = async (fileBuffer, options = {}) => {
  ensureConfig();

  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error('File buffer is required for S3 upload');
  }

  const key = buildObjectKey(fileBuffer, options);
  const extension = key.split('.').pop().toLowerCase();
  const contentType = options.contentType || MIME_TYPE_BY_EXTENSION[extension] || 'application/octet-stream';

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType
    }));

    return {
      secure_url: buildObjectUrl(key),
      public_id: key
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
};

const deleteImage = async (key) => {
  ensureConfig();

  if (!key) {
    return { deleted: false };
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key
    }));

    return { deleted: true, public_id: key };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

const generateSignedUrl = async (key, expiresIn = 300) => {
  ensureConfig();

  if (!key) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key
    });

    return await getS3SignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating S3 signed URL:', error);
    return null;
  }
};

const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;

  const pathname = new URL(url).pathname;
  const uploadMatch = pathname.match(/\/(?:image|video|raw)\/(?:upload|private)\/(?:v\d+\/)?(.+)$/);

  if (!uploadMatch || !uploadMatch[1]) return null;

  return uploadMatch[1].replace(/\.[^.]+$/, '');
};

const extractS3KeyFromUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname;
    const path = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));

    if (AWS_CLOUDFRONT_DOMAIN) {
      const cloudFrontHost = AWS_CLOUDFRONT_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/g, '');
      if (host === cloudFrontHost) {
        return path || null;
      }
    }

    if (host.endsWith('.cloudfront.net')) {
      return path || null;
    }

    if (AWS_S3_BUCKET_NAME && host === `${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`) {
      return path || null;
    }

    const virtualHostedMatch = host.match(/^(.+)\.s3[.-][a-z0-9-]+\.amazonaws\.com$/i);
    if (virtualHostedMatch) {
      return path || null;
    }

    if (host === 's3.amazonaws.com' && path.startsWith(`${AWS_S3_BUCKET_NAME}/`)) {
      return path.slice(AWS_S3_BUCKET_NAME.length + 1) || null;
    }

    if (host.startsWith('s3.') && path.startsWith(`${AWS_S3_BUCKET_NAME}/`)) {
      return path.slice(AWS_S3_BUCKET_NAME.length + 1) || null;
    }

    const pathStyleMatch = host.match(/^s3[.-][a-z0-9-]+\.amazonaws\.com$/i);
    if (pathStyleMatch) {
      const keyParts = path.split('/').slice(1);
      return keyParts.length > 0 ? keyParts.join('/') : null;
    }

    return null;
  } catch (error) {
    return null;
  }
};

const extractPublicId = (urlOrKey) => {
  if (!urlOrKey) return null;

  if (typeof urlOrKey !== 'string') return null;

  if (urlOrKey.startsWith('data:')) return null;

  if (!/^https?:\/\//i.test(urlOrKey)) {
    return sanitizePathSegment(urlOrKey) || null;
  }

  const s3Key = extractS3KeyFromUrl(urlOrKey);
  if (s3Key) return s3Key;

  const cloudinaryKey = extractCloudinaryPublicId(urlOrKey);
  if (cloudinaryKey) return cloudinaryKey;

  return null;
};

module.exports = {
  s3Client,
  uploadImage,
  deleteImage,
  generateSignedUrl,
  extractPublicId,
  buildObjectUrl,
  isPrivateKey
};
