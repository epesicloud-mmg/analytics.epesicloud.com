require('dotenv').config();
const express = require('express');
const path = require('path');
const { create } = require('express-handlebars');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const RateLimiterMemory = require('rate-limiter-flexible').RateLimiterMemory;
const loggerMiddleware = require('./middleware/logger');

const app = express();

// DEBUG: Add request logging to see what's happening
app.use((req, res, next) => {
  console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Initialize rate limiter
const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.API_RATE_LIMIT || 1000),
  duration: parseInt(process.env.API_RATE_LIMIT_WINDOW || 60),
});

const hbs = create({
  extname: '.hbs',
  defaultLayout: 'dashboard',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    eq: function(v1, v2) { return v1 === v2; },
    json: function(context) { return JSON.stringify(context); },
    formatDate: function(date) { return new Date(date).toLocaleDateString(); },
    currentYear: function() { return new Date().getFullYear(); },
    ne: function(a, b) { return a !== b; },
    gt: function(a, b) { return a > b; },
    lt: function(a, b) { return a < b; },
    and: function(a, b) { return a && b; },
    or: function(a, b) { return a || b; },
    default: function(value, defaultValue) { return value || defaultValue; },
    
    // Additional helpers for the templates
    substring: function(str, start, length) {
      if (typeof str !== 'string') return '';
      if (length) {
        return str.substring(start, start + length);
      }
      return str.substring(start);
    },
    
    // Note: 'unless' is already built-in to Handlebars, but here's how you could override it if needed
    // unless: function(conditional, options) {
    //   if (!conditional) {
    //     return options.fn(this);
    //   } else {
    //     return options.inverse(this);
    //   }
    // }
  }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// Initialize database and run migrations
(async () => {
  try {
    const db = require('./helpers/db'); 
    const MigrationRunner = require('./middleware/migrations');
    const migrationRunner = new MigrationRunner(db);
    await migrationRunner.runMigrations();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('⚠️ Continuing without database for debugging...');
  }
})();

// Basic middleware
console.log('🔄 Setting up basic middleware...');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('public'));

// Session middleware with environment variable support
function createSessionStore() {
  const preferredStoreType = (process.env.SESSION_STORE_TYPE || 'auto').toLowerCase();
  
  // For Railway/production, prefer memory store to avoid file system issues
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    console.log('🔄 Using memory session store (Railway/Production detected)');
    return { store: null, type: 'memory' };
  }
  
  // If explicitly set to memory, use no store (default memory)
  if (preferredStoreType === 'memory') {
    console.log('🔄 Using memory session store (configured via SESSION_STORE_TYPE)');
    return { store: null, type: 'memory' };
  }
  
  // If explicitly set to postgresql, try PostgreSQL only
  if (preferredStoreType === 'postgresql') {
    console.log('🔄 Using PostgreSQL session store (configured via SESSION_STORE_TYPE)');
    try {
      const connectPgSimple = require('connect-pg-simple')(session);
      const { Pool } = require('pg');
      
      const pool = new Pool({
        connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      const store = new connectPgSimple({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true,
        schemaName: 'public'
      });
      
      console.log('✅ PostgreSQL session store initialized');
      return { store, type: 'postgresql' };
    } catch (error) {
      console.error('❌ PostgreSQL session store failed:', error.message);
      console.log('⚠️ Falling back to memory session store');
      return { store: null, type: 'memory-fallback' };
    }
  }
  
  // Default behavior (auto or sqlite) - use SQLite, but fallback to memory on Railway
  console.log('🔄 Using SQLite session store');
  try {
    const SQLiteStore = require('connect-sqlite3')(session);
    const fs = require('fs');
    
    // Ensure data directory exists
    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory for SQLite sessions');
    }
    
    const store = new SQLiteStore({
      db: 'sessions.db',
      dir: dataDir,
      table: 'sessions'
    });
    
    console.log('✅ SQLite session store initialized');
    return { store, type: 'sqlite' };
  } catch (error) {
    console.error('❌ SQLite session store failed:', error.message);
    console.log('⚠️ Falling back to memory session store');
    return { store: null, type: 'memory-fallback' };
  }
}

// Create session store
const { store: sessionStore, type: sessionStoreType } = createSessionStore();

// Configure session middleware
console.log('🔄 Setting up session middleware...');
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: process.env.SESSION_COOKIE_NAME || 'sessionId'
}));

// Store session info for health check
app.set('sessionStore', sessionStore);
app.set('sessionStoreType', sessionStoreType);

// Session activity extension middleware
console.log('🔄 Setting up session activity middleware...');
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    req.session.touch();
  }
  next();
});

// CORS headers
// CORS headers
console.log('🔄 Setting up CORS middleware...');
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;

  if (!allowedOrigins) {
    // No origins specified in .env - allow all origins
    res.header('Access-Control-Allow-Origin', '*');
    console.log('🌐 CORS: Allowing all origins (ALLOWED_ORIGINS not specified)');
  } else {
    // Parse origins from environment variable
    const configuredOrigins = allowedOrigins.split(',').map(origin => origin.trim());
    const origin = req.headers.origin;
    
    if (configuredOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      console.log(`🌐 CORS: Allowing specific origin: ${origin}`);
    } else {
      console.log(`🚫 CORS: Rejecting origin: ${origin}`);
    }
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// SIMPLIFIED AUTH MIDDLEWARE - NO GLOBAL CONTEXT
console.log('🔄 Setting up minimal auth middleware...');
app.use((req, res, next) => {
  // Only add basic session context - no complex user loading
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/auth/') || 
      req.path === '/health' ||
      req.path === '/test' ||
      req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }

  // Just add basic session info to res.locals for template access
  res.locals.isAuthenticated = !!req.session?.userId;
  res.locals.currentUser = req.session?.userId ? {
    id: req.session.userId,
    email: req.session.userEmail || null
  } : null;
  
  next();
});

// Health check route (early in the stack)
console.log('🔄 Setting up health route...');
app.get('/health', (req, res) => {
  console.log('🩺 Health check requested');
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    session_store_type: app.get('sessionStoreType') || 'unknown',
    session_support: !!req.sessionStore || !!app.get('sessionStore'),
    auth_middleware: 'simplified',
    logger_enabled: true,
    database_configured: !!(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL)
  });
});

// Test route (early in the stack)
console.log('🔄 Setting up test route...');
app.get('/test', (req, res) => {
  console.log('🧪 Test route requested');
  res.json({ 
    message: 'Server is running properly!',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    authenticated: !!req.session?.userId,
    session_user: req.session?.userId || null
  });
});

console.log('🔄 Loading routes...');

// ===== CRITICAL: LOAD APPLETS FIRST BEFORE OTHER ROUTES =====
console.log('🔄 Loading applet routes FIRST...');
try {
  require('./routes/applet').loadApplets(app);
  console.log('✅ All applet routes loaded');
} catch (error) {
  console.error('❌ Applet routes failed:', error.message);
}

// Load core authentication routes
try {
  console.log('🔄 Loading auth routes...');
  const authRoutes = require('./routes/auth');
  app.use('/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
}

// Load core management API routes (organizations, projects, api-keys, etc.)
try {
  console.log('🔄 Loading management API routes...');
  const managementRoutes = require('./routes/admin');
  app.use('/api/admin', loggerMiddleware, managementRoutes);
  console.log('✅ Management API routes loaded');
} catch (error) {
  console.error('❌ Management API routes failed:', error.message);
}

// API rate limiting (after management routes are loaded)
console.log('🔄 Setting up rate limiting...');
app.use('/api', async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const userId = req.session?.userId;
    const key = apiKey ? apiKey : userId;

    if (!key) {
      return next();
    }

    const rateLimiterKey = `api_${key}`;
    const { consumedPoints, remainingPoints } = await rateLimiter.consume(rateLimiterKey);

    res.setHeader('X-RateLimit-Limit', process.env.API_RATE_LIMIT || 1000);
    res.setHeader('X-RateLimit-Remaining', remainingPoints);
    res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + (process.env.API_RATE_LIMIT_WINDOW || 60));

    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) {
      return res.status(500).json({
        success: false,
        message: 'Rate limiter error'
      });
    }
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
});

// ===== LOAD CORE WEB ROUTES LAST =====
try {
  console.log('🔄 Loading core web routes LAST...');
  const webRoutes = require('./routes/web');
  app.use('/', webRoutes);
  console.log('✅ Core web routes loaded');
} catch (error) {
  console.error('❌ Core web routes failed:', error.message);
}

console.log('🔄 Routes loading complete');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error caught:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({
      success: false,
      message: process.env.NODE_ENV === 'production' && status === 500
        ? 'Internal server error'
        : message
    });
  }

  try {
    const error = {
      status,
      message: process.env.NODE_ENV === 'production' && status === 500
        ? 'Something went wrong on our end'
        : message
    };

    res.status(status).render('error', {
      title: `${status} Error`,
      error,
      currentYear: new Date().getFullYear(),
      user: res.locals.currentUser || null
    });
  } catch (renderError) {
    console.error('❌ Error rendering error page:', renderError);
    res.status(status).send(`Error ${status}: ${message}`);
  }
});

// 404 handler (make it specific to avoid catching applet routes)
app.use((req, res) => {
  console.log('🔍 404 handler for:', req.path);


  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }

  try {
    res.status(404).render('404', {
      title: 'Page Not Found',
      currentYear: new Date().getFullYear(),
      user: res.locals.currentUser || null
    });
  } catch (renderError) {
    console.error('❌ Error rendering 404 page:', renderError);
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>404 - Page Not Found</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 400px; margin: 0 auto; }
          h1 { color: #333; }
          p { color: #666; margin: 20px 0; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>404 - Page Not Found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <a href="/">Go Home</a>
        </div>
      </body>
      </html>
    `);
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📱 Web interface: http://${HOST}:${PORT}`);
  console.log(`🔌 API: http://${HOST}:${PORT}/api`);
  console.log(`🔐 Authentication: Simplified Session-based`);
  console.log(`📦 Session storage: ${sessionStoreType}`);
  console.log(`📊 API Logging: Enabled`);
  console.log(`🩺 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://${HOST}:${PORT}/test`);
  console.log(`🎨 Frontend: API-driven data loading`);
  console.log(`📚 Applet System: API + Web routes loaded`);
  
  // Railway success indicator
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('🚂 Railway deployment successful!');
  }
});

// Add server error handling
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else if (error.code === 'EACCES') {
    console.error(`❌ Permission denied to bind to port ${PORT}`);
    process.exit(1);
  } else {
    console.error('❌ Unexpected server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      const db = require('./helpers/db');  
      await db.end();
      console.log('Database connection closed');
    } catch (error) {
      console.log('Error closing database:', error.message);
    }
    
    try {
      if (sessionStore && typeof sessionStore.close === 'function') {
        await new Promise((resolve) => {
          sessionStore.close(resolve);
        });
        console.log('Session store closed');
      }
    } catch (error) {
      console.log('Error closing session store:', error.message);
    }
    
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
module.exports = app;