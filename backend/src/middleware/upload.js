const multer = require('multer');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage();

function isValidImageBuffer(buffer, mimetype) {
  if (!buffer || buffer.length < 4) return false;

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG magic bytes: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // WEBP magic bytes: 52 49 46 46 ... 57 45 42 50 ('RIFF'...'WEBP')
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
}

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(
      ApiError.badRequest(
        'Invalid file type. Only JPEG, PNG, and WebP images are permitted.',
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 5,
  },
  fileFilter,
});

// Middleware to verify magic bytes of uploaded buffers
function validateMagicBytes(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  for (const file of files) {
    if (!isValidImageBuffer(file.buffer, file.mimetype)) {
      return next(
        ApiError.badRequest(
          `Corrupted or spoofed image detected: ${file.originalname}`,
          'INVALID_IMAGE_SIGNATURE'
        )
      );
    }
  }
  next();
}

module.exports = {
  upload,
  validateMagicBytes,
  isValidImageBuffer,
};
