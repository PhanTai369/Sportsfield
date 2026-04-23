const storageConfig = require('../config/s3Config');
const logger = require('./logger');
const crypto = require('crypto');

const CLOUDINARY_PRIVATE_MARKERS = [
  'secure_documents/',
  'business_licenses/',
  'identity_cards/'
];

const S3_PRIVATE_MARKERS = [
  'secure_documents/',
  'business-licenses/',
  'identity-cards/'
];

const isCloudinaryUrl = (url) => typeof url === 'string' && url.includes('cloudinary.com');

const isStorageUrl = (url) => typeof url === 'string' &&
  (url.startsWith('data:image') ||
   isCloudinaryUrl(url) ||
   !!storageConfig.extractPublicId(url));

const isPrivateAsset = (publicId = '', originalUrl = '') => {
  const value = `${publicId} ${originalUrl}`;
  return [...CLOUDINARY_PRIVATE_MARKERS, ...S3_PRIVATE_MARKERS].some((marker) => value.includes(marker));
};

const getCloudinaryResourceType = (publicId = '') => {
  if (publicId.endsWith('.pdf')) return 'raw';
  if (publicId.match(/\.(mp4|mov|avi|wmv)$/i)) return 'video';
  return 'image';
};

const generateLegacyCloudinaryUrl = (publicId, expiresIn = 300, originalUrl = null) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return originalUrl;
  }

  const timestamp = Math.round(Date.now() / 1000) + expiresIn;
  const resourceType = getCloudinaryResourceType(publicId);
  const signatureBase = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');
  const params = new URLSearchParams({
    api_key: apiKey,
    public_id: publicId,
    timestamp: String(timestamp),
    signature
  });

  return `https://res.cloudinary.com/${cloudName}/${resourceType}/private/${publicId}?${params.toString()}`;
};

const generateSignedUrl = async (publicId, expiresIn = 300, originalUrl = null) => {
  try {
    if (!publicId) {
      logger.warn('Attempted to generate signed URL with null publicId');
      return originalUrl;
    }

    if (isCloudinaryUrl(originalUrl)) {
      return generateLegacyCloudinaryUrl(publicId, expiresIn, originalUrl);
    }

    const signedUrl = await storageConfig.generateSignedUrl(publicId, expiresIn);
    logger.debug(`Generated S3 signed URL for ${publicId}: ${signedUrl ? 'success' : 'failed'}`);

    return signedUrl || originalUrl;
  } catch (error) {
    logger.error(`Error generating signed URL: ${error.message}`);
    return originalUrl;
  }
};

const extractPublicIdFromUrl = (storageUrl) => {
  try {
    if (!storageUrl) {
      return null;
    }

    if (isCloudinaryUrl(storageUrl)) {
      const cloudinaryMatch = storageUrl.match(/\/(?:upload|private)\/(?:v\d+\/)?(.+?)(\.[^.?#]+)?(?:[?#].*)?$/);
      if (cloudinaryMatch && cloudinaryMatch[1]) {
        return cloudinaryMatch[1];
      }
    }

    const publicId = storageConfig.extractPublicId(storageUrl);
    if (publicId) {
      return publicId;
    }

    return null;
  } catch (error) {
    logger.error(`Error extracting public ID: ${error.message}`);
    return null;
  }
};

const generateDirectDeliveryUrl = async (publicId, expiresIn = 300, originalUrl = null) => {
  if (!publicId) {
    return originalUrl;
  }

  if (!isPrivateAsset(publicId, originalUrl)) {
    return originalUrl || null;
  }

  if (isCloudinaryUrl(originalUrl)) {
    return generateLegacyCloudinaryUrl(publicId, expiresIn, originalUrl);
  }

  return generateSignedUrl(publicId, expiresIn, originalUrl);
};

module.exports = {
  generateSignedUrl,
  generateDirectDeliveryUrl,
  extractPublicIdFromUrl,
  isStorageUrl
};
