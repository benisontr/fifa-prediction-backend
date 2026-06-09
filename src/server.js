const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/auth.routes');
const matchRoutes = require('./routes/match.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');

const app = express();

/**
 * Middleware
 */
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/**
 * Routes
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FIFA Prediction Backend Running',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', matchRoutes);
app.use('/api', leaderboardRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const mongoUri =
      process.env.MONGO_URI || process.env.MONGO_URL;

    if (!mongoUri) {
      throw new Error(
        'MONGO_URI is missing in environment variables'
      );
    }

    await mongoose.connect(mongoUri);

    console.log('✅ MongoDB Connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `🚀 Server running at http://0.0.0.0:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      '❌ Failed to start server:',
      error.message
    );
    process.exit(1);
  }
}

startServer();

module.exports = app;

