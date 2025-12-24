const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => `shah-pharmacy/${req.params.type || 'general'}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload single image
router.post('/:type', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: req.file.path, // Cloudinary URL
      publicId: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Upload multiple images
router.post('/:type/multiple', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      url: file.path, // Cloudinary URL
      publicId: file.filename,
      size: file.size
    }));

    res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Delete uploaded file from Cloudinary
router.delete('/:type/:publicId', async (req, res) => {
  try {
    const { type, publicId } = req.params;
    const fullPublicId = `shah-pharmacy/${type}/${publicId}`;

    const result = await cloudinary.uploader.destroy(fullPublicId);
    
    if (result.result === 'ok') {
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Delete failed: ' + error.message });
  }
});

// Get uploaded files list from Cloudinary
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const folderPath = `shah-pharmacy/${type}`;

    const result = await cloudinary.search
      .expression(`folder:${folderPath}`)
      .sort_by([['created_at', 'desc']])
      .max_results(100)
      .execute();

    const files = result.resources.map(resource => ({
      filename: resource.public_id.split('/').pop(),
      url: resource.secure_url,
      publicId: resource.public_id,
      size: resource.bytes,
      uploadDate: resource.created_at
    }));

    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files: ' + error.message });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files' });
    }
  }
  
  res.status(500).json({ error: error.message });
});

module.exports = router;
