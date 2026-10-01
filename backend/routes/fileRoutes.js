const express = require('express');
const router = express.Router();
const { uploadFile, getFiles, downloadFile, deleteFile, updateFileFolder } = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(protect);

router.route('/')
  .get(getFiles);

router.post('/upload', upload.single('file'), uploadFile);

router.get('/:id/download', downloadFile);
router.put('/:id/folder', updateFileFolder);
router.put('/:id', updateFileFolder);
router.delete('/:id', deleteFile);

module.exports = router;
