const express = require('express');
const router = express.Router();
const { getFolders, createFolder, deleteFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getFolders)
  .post(createFolder);

router.route('/:id')
  .delete(deleteFolder);

module.exports = router;
