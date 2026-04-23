const multer = require('multer');
const { errorHandler } = require('../common');
const { AppError } = errorHandler;

// Use memory storage for S3 upload
const storage = multer.memoryStorage();

// Filter to only allow certain image types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (!file) {
    cb(new AppError('No file uploaded', 400), false);
    return;
  }

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only .jpg, .jpeg, .png and .gif format allowed', 400), false);
  }
};

// Create multer upload instance for multiple files
const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Allow up to 10 files total
  }
});

// Define field configuration for multiple file uploads
const fieldUploadFields = uploadMultiple.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'business_license_image', maxCount: 1 },
  { name: 'identity_card_image', maxCount: 1 },
  { name: 'identity_card_back_image', maxCount: 1 }
]);

// Wrapper function to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size too large. Maximum size is 5MB', 400));
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files uploaded', 400));
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected file field', 400));
    }
    return next(new AppError(`Upload error: ${err.message}`, 400));
  } else if (err) {
    return next(new AppError(err.message || 'Error uploading file', 400));
  }
  next();
};

module.exports = {
  uploadMultiple,
  fieldUploadFields,
  handleMulterError
};
