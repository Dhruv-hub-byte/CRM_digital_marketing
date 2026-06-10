const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required' });
  next();
};

const adminOrManager = (req, res, next) => {
  if (!['admin', 'user'].includes(req.user?.role))
    return res.status(403).json({ error: 'Access denied' });
  next();
};

const noViewer = (req, res, next) => {
  if (req.user?.role === 'viewer')
    return res.status(403).json({ error: 'Viewers have read-only access' });
  next();
};

const salesOrAbove = (req, res, next) => {
  if (!['admin', 'user', 'sales'].includes(req.user?.role))
    return res.status(403).json({ error: 'Access denied' });
  next();
};

module.exports = { auth, adminOnly, adminOrManager, noViewer, salesOrAbove };