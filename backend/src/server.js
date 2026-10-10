require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const AppError = require('./utils/AppError');
const { serveFile } = require('./controllers/fileAccessController');

if (require.main === module) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error('JWT_SECRET is missing or too short. Put a long random text (16+ characters) in .env, then start again.');
    process.exit(1);
  }
  connectDB();
}

const app = express();

// Which web addresses may talk to this server. CLIENT_URL can list several, separated by commas.
// While developing (not in production) any computer, phone or tablet on the same private network
// (192.168.x.x, 10.x.x.x, 172.16-31.x.x) and "localhost" are also allowed, so other devices can use the app.
const allowedOrigins = String(process.env.CLIENT_URL || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
// ...and computer names on the network (for example http://DESKTOP-ABC:3001 or http://my-pc.local:3001).
const privateNetworkOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|[a-z0-9][a-z0-9-]*(\.local)?)(:\d+)?$/i;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // not a browser (for example a script or a health check)
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && privateNetworkOrigin.test(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
// Uploaded files are private: they open only through a short link (see fileAccessController).
app.get('/uploads/:filename', serveFile);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/school-years', require('./routes/schoolYearRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/defense-types', require('./routes/defenseTypeRoutes'));
app.use('/api/research', require('./routes/researchRoutes'));
app.use('/api/versions', require('./routes/versionRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/consultations', require('./routes/consultationRoutes'));
app.use('/api/panel-availability', require('./routes/panelAvailabilityRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));

app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record with these unique fields already exists' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
