const File = require('../models/File');
const Folder = require('../models/Folder');
const User = require('../models/User');

const MAX_STORAGE_BYTES = 100 * 1024 * 1024;

const getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [totalFiles, totalFolders, user] = await Promise.all([
      File.countDocuments({ userId, isCritical: { $ne: true } }),
      Folder.countDocuments({ userId }),
      User.findById(userId).select('storageUsed'),
    ]);

    const storageUsedBytes = user ? user.storageUsed || 0 : 0;
    const storageUsedMB = (storageUsedBytes / (1024 * 1024)).toFixed(2);
    const storagePercentage = Math.min(
      100,
      parseFloat(((storageUsedBytes / MAX_STORAGE_BYTES) * 100).toFixed(1))
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalFiles,
        totalFolders,
        storageUsedBytes,
        storageUsedMB: Number(storageUsedMB),
        storageLimitMB: 100,
        storagePercentage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve stats',
    });
  }
};

module.exports = { getStats };
