const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer  - file buffer from multer memory storage
 * @param {string} mimetype
 * @param {string} folder  - Cloudinary folder e.g. "medistore/lab-tests"
 * @param {string} filename
 */
exports.uploadBuffer = (buffer, mimetype, folder, filename) => {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype === 'application/pdf' ? 'raw' : 'image';

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:     filename,
        resource_type: resourceType,
        // PDFs: force attachment on download
        ...(resourceType === 'raw' && { flags: 'attachment' }),
      },
      (error, result) => {
        if (error) reject(error);
        else       resolve(result);
      }
    );

    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by public_id
 */
exports.deleteFile = async (publicId, mimetype) => {
  const resourceType = mimetype === 'application/pdf' ? 'raw' : 'image';
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('[Cloudinary] Delete failed:', err.message);
  }
};

exports.cloudinary = cloudinary;