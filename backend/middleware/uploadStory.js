const fs = require('fs');
const path = require('path');
const multer = require('multer');

const STORIES_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'stories');
fs.mkdirSync(STORIES_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STORIES_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.jpg';
    const random = Math.random().toString(36).slice(2, 10);
    cb(null, `${Date.now()}-${random}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
  if (!ok) {
    const err = new Error('Formato inválido. Envie JPG, JPEG ou PNG.');
    err.status = 400;
    return cb(err);
  }
  return cb(null, true);
};

const uploadStory = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

function handleMulterError(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ erro: 'Arquivo muito grande. Máximo permitido: 5MB.' });
  }
  if (err.status) return res.status(err.status).json({ erro: err.message });
  return next(err);
}

module.exports = { uploadStory, STORIES_UPLOAD_DIR, handleMulterError };
