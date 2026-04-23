const multer = require('multer');
const path = require('path');
const { errorHandler } = require('../common');
const { AppError } = errorHandler;

// Set up multer storage in memory (not saving to disk)
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

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow 1 file
  }
});

// Wrapper function to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size too large. Maximum size is 5MB', 400));
    }
    return next(new AppError(`Upload error: ${err.message}`, 400));
  } else if (err) {
    return next(new AppError(err.message || 'Error uploading file', 400));
  }
  next();
};

module.exports = {
  upload,
  handleMulterError
}; 