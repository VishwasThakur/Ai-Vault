const multer = require('multer');

const storage = multer.memoryStorage();
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

module.exports = {
  upload,
  MAX_FILE_SIZE,
};
