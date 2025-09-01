// ================================================
// routes/applet/dashboards/web.js - Updated with Enhanced Page Context
const express = require('express');
const router = express.Router();

console.log('🔧 Loading Dashboards Web Routes...');

// Simple middleware to check authentication for web routes
const requireAuth = (req, res, next) => {
  console.log(`🔐 Dashboards Auth check for: ${req.path}`);
  if (req.session?.userId) {
    req.user = { 
      id: req.session.userId, 
      email: req.session.userEmail || req.session.email || null,
      name: req.session.userName || req.session.name || 'User'
    };
    console.log(`✅ Dashboards User authenticated: ${req.user.email || req.user.id}`);
    return next();
  }
  
  console.log('❌ Dashboards Authentication failed, redirecting to login');
  return res.redirect('/login?message=' + encodeURIComponent('Please log in to continue'));
};

// Helper function to get user info
const getUserInfo = (req) => {
  return {
    id: req.session?.userId || (req.user && req.user.id),
    email: req.session?.email || req.session?.userEmail || (req.user && req.user.email),
    name: req.session?.name || req.session?.userName || (req.user && req.user.name) || 'User'
  };
};

// Helper function to create page config for layout
const createPageConfig = (options = {}) => {
  return {
    isCollapsed: options.isCollapsed !== undefined ? options.isCollapsed : false,
    activeProjectId: options.activeProjectId || null,
    pageType: options.pageType || 'default',
    showProjectSelector: options.showProjectSelector !== undefined ? options.showProjectSelector : true,
    requiresOrganization: options.requiresOrganization !== undefined ? options.requiresOrganization : true
  };
};

// Main dashboard home (changed from /dashboard to avoid conflict)
router.get('/dashboard', requireAuth, (req, res) => {
  console.log('📊 Dashboard home route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'dashboard-home'
  });
  
  try {
    res.render('applets/epesiai/index', {
      layout: 'dashboard',
      title: 'Dashboard Home',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering dashboard home:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Test route to verify router is working
router.get('/dashboards-test', (req, res) => {
  console.log('🧪 Dashboards test route hit');
  res.json({
    success: true,
    message: 'Dashboards applet is working!',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// ================================
// IMPORTANT: SPECIFIC ROUTES FIRST
// These must come BEFORE the dynamic :id route
// ================================

// Dashboard management page (list all dashboards)
router.get('/dashboards', requireAuth, (req, res) => {
  console.log('📊 Dashboards management route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'dashboards-list'
  });
  
  try {
    res.render('applets/epesiai/dashboards', {
      layout: 'dashboard',
      title: 'Dashboard Management',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering dashboards management:', error);
    res.status(500).send('Error loading dashboards management');
  }
});

// Create dashboard page
router.get('/dashboards/create', requireAuth, (req, res) => {
  console.log('➕ Create dashboard route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'dashboard-create'
  });
  
  try {
    res.render('applets/epesiai/create', {
      layout: 'dashboard',
      title: 'Create Dashboard',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering create dashboard:', error);
    res.status(500).send('Error loading create dashboard');
  }
});

// Dashboard analytics page
router.get('/dashboards/analytics', requireAuth, (req, res) => {
  console.log('📈 Dashboard analytics route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'dashboard-analytics'
  });
  
  try {
    res.render('applets/epesiai/analytics', {
      layout: 'dashboard',
      title: 'Dashboard Analytics',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering dashboard analytics:', error);
    res.status(500).send('Error loading dashboard analytics');
  }
});

// Dashboard templates page
router.get('/dashboards/templates', requireAuth, (req, res) => {
  console.log('📋 Dashboard templates route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'dashboard-templates'
  });
  
  try {
    res.render('applets/epesiai/templates', {
      layout: 'dashboard',
      title: 'Dashboard Templates',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering dashboard templates:', error);
    res.status(500).send('Error loading dashboard templates');
  }
});

// Data sources management page
router.get('/dashboards/datasources', requireAuth, (req, res) => {
  console.log('🗂️ Data sources route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'data-sources'
  });
  
  try {
    res.render('applets/epesiai/datasources', {
      layout: 'dashboard',
      title: 'Data Sources',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering data sources:', error);
    res.status(500).send('Error loading data sources');
  }
});

// Dashboard settings page
router.get('/dashboards/settings', requireAuth, (req, res) => {
  console.log('⚙️ Dashboard settings route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'dashboard-settings'
  });
  
  try {
    res.render('applets/epesiai/settings', {
      layout: 'dashboard',
      title: 'Dashboard Settings',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering dashboard settings:', error);
    res.status(500).send('Error loading dashboard settings');
  }
});

// Live dashboard viewing (for presentations) - SPECIFIC ROUTE
router.get('/dashboards/live/:id', (req, res) => {
  console.log('📺 Dashboard live view route hit');
  const { id } = req.params;
  
  try {
    res.render('applets/epesiai/dashboard-live', {
      layout: false, // No sidebar for live view
      title: 'Live Dashboard',
      dashboardId: id,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering live dashboard:', error);
    res.status(500).send('Error loading live dashboard');
  }
});

// Debug route to list all registered routes
router.get('/dashboards/debug/routes', (req, res) => {
  const routes = [];
  router.stack.forEach(layer => {
    if (layer.route) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      });
    }
  });
  
  res.json({
    success: true,
    message: 'Dashboards routes',
    routes: routes,
    total: routes.length
  });
});

// ================================
// DYNAMIC ROUTES LAST
// These catch-all routes must come AFTER specific routes
// ================================

// Individual dashboard page (editor) - DYNAMIC ROUTE
router.get('/dashboards/:id', requireAuth, (req, res) => {
  console.log('📊 Dashboard editor route hit for ID:', req.params.id);
  const user = getUserInfo(req);
  const { id } = req.params;
  
  // Basic validation to ensure ID looks like a dashboard ID
  if (!id || !id.startsWith('dash_')) {
    console.log('❌ Invalid dashboard ID format:', id);
    return res.status(404).send('Dashboard not found - invalid ID format');
  }
  
  // Extract project ID from dashboard ID or use query parameter
  const projectId = req.query.project || extractProjectFromDashboard(id);
  const pageConfig = createPageConfig({ 
    isCollapsed: true, // Collapsed for dashboard editor
    activeProjectId: projectId,
    pageType: 'dashboard-editor',
    showProjectSelector: false // Hide project selector in dashboard editor
  });
  
  try {
    console.log('✅ Rendering dashboard editor for:', id);
    res.render('applets/epesiai/dashboard', {
      layout: "dashboard",
      title: 'Dashboard Editor',
      user,
      dashboardId: id,
      projectId,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering dashboard editor:', error);
    res.status(500).send('Error loading dashboard editor');
  }
});

// Projects page (list all projects) - UPDATED
router.get('/projects', requireAuth, (req, res) => {
  console.log('📁 Projects route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'projects-list',
    showProjectSelector: false, // Don't show project selector on projects list page
    requiresOrganization: true // Requires organization to show projects
  });
  
  try {
    res.render('applets/epesiai/projects', {
      layout: "dashboard",
      title: 'Projects',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering projects:', error);
    res.status(500).send('Error loading projects');
  }
});

// Individual project page - UPDATED
router.get('/project/:id', requireAuth, (req, res) => {
  console.log('📂 Individual project route hit for ID:', req.params.id);
  const user = getUserInfo(req);
  const { id } = req.params;
  
  // Basic validation for project ID format
  if (!id) {
    console.log('❌ No project ID provided');
    return res.status(404).send('Project not found - no ID provided');
  }
  
  const pageConfig = createPageConfig({ 
    isCollapsed: true, // Collapsed for project detail view
    activeProjectId: id,
    pageType: 'project-detail',
    showProjectSelector: true, // Show project selector but with current project selected
    requiresOrganization: true
  });
  
  try {
    console.log('✅ Rendering project detail for:', id);
    res.render('applets/epesiai/project', {
      layout: "dashboard",
      title: 'Project Dashboard',
      user,
      projectId: id,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering project:', error);
    res.status(500).send('Error loading project');
  }
});

// Team management page
router.get('/team', requireAuth, (req, res) => {
  console.log('👥 Team management route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'team-management'
  });
  
  try {
    res.render('applets/epesiai/team', {
      layout: "dashboard",
      title: 'Team Management',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering team management:', error);
    res.status(500).send('Error loading team management');
  }
});

// Account settings page
router.get('/account', requireAuth, (req, res) => {
  console.log('⚙️ Account settings route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'account-settings'
  });
  
  try {
    res.render('applets/epesiai/account', {
      layout: "dashboard",
      title: 'Account Settings',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering account settings:', error);
    res.status(500).send('Error loading account settings');
  }
});

// Preferences page
router.get('/preferences', requireAuth, (req, res) => {
  console.log('🎨 Preferences route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'preferences'
  });
  
  try {
    res.render('applets/epesiai/preferences', {
      layout: "dashboard",
      title: 'Preferences',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering preferences:', error);
    res.status(500).send('Error loading preferences');
  }
});

// Data sources page
router.get('/data-sources', requireAuth, (req, res) => {
  console.log('🗃️ Data sources route hit');
  const user = getUserInfo(req);
  const pageConfig = createPageConfig({ 
    isCollapsed: false,
    pageType: 'data-sources-main'
  });
  
  try {
    res.render('applets/epesiai/data-sources', {
      layout: "dashboard",
      title: 'Data Sources',
      user,
      pageConfig,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering data sources:', error);
    res.status(500).send('Error loading data sources');
  }
});

// Public dashboard sharing (no auth required)
router.get('/share/:id', (req, res) => {
  console.log('🔗 Dashboard share route hit');
  const { id } = req.params;
  
  try {
    res.render('applets/epesiai/dashboard-view', {
      layout: false, // No sidebar for shared view
      title: 'Shared Dashboard',
      dashboardId: id,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    console.error('❌ Error rendering shared dashboard:', error);
    res.status(500).send('Error loading shared dashboard');
  }
});

// API Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboards applet is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper function to extract project ID from dashboard ID
function extractProjectFromDashboard(dashboardId) {
  // This is a placeholder - implement based on your ID structure
  // For example, if dashboard IDs contain project info: "dash_proj123_dash456"
  const parts = dashboardId.split('_');
  if (parts.length >= 3 && parts[1].startsWith('proj')) {
    return parts[1];
  }
  return null;
}

console.log('✅ Dashboards Web Routes Loaded');

// CRITICAL: Export the router
module.exports = router;