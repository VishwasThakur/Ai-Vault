const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'vaultai_super_secure_jwt_secret_key_prod';
};

const getVaultTokenSecret = () => {
  return getJwtSecret() + '_CRITICAL_VAULT';
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = await User.findById(decoded.id).select('-password -vaultPin');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token. Please log in again.',
    });
  }
};

const protectCriticalVault = async (req, res, next) => {
  await protect(req, res, async () => {
    let vaultToken = req.headers['x-vault-token'];
    if (!vaultToken && req.query && req.query.vaultToken) {
      vaultToken = req.query.vaultToken;
    }

    if (!vaultToken) {
      return res.status(401).json({
        success: false,
        vaultLocked: true,
        message: 'Critical Vault is locked. 6-digit PIN verification required.',
      });
    }

    try {
      const decoded = jwt.verify(vaultToken, getVaultTokenSecret());
      if (decoded.id !== req.user._id.toString() || decoded.type !== 'critical_vault') {
        return res.status(401).json({
          success: false,
          vaultLocked: true,
          message: 'Invalid Vault session token. Please re-enter your PIN.',
        });
      }
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        vaultLocked: true,
        message: 'Critical Vault session expired. Please re-enter your PIN.',
      });
    }
  });
};

module.exports = {
  protect,
  protectCriticalVault,
  getJwtSecret,
  getVaultTokenSecret,
};
