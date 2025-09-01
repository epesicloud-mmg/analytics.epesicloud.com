// ================================================
// routes/applet/dashboards/api.js - CLEANED UP VERSION
const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fetch = require('node-fetch');
const AuthMiddleware = require('../../../middleware/auth');
const db = require('../../../helpers/db'); // Direct import instead of injection

const router = express.Router();

// Set up multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to parse CSV from string
function parseCSV(csvString) {
  return new Promise((resolve, reject) => {
    const results = [];
    const parser = csv();
    
    // Create a readable stream from the string
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(Buffer.from(csvString));
    
    bufferStream
      .pipe(parser)
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Helper function to handle errors
const handleError = (res, error) => {
  console.error('Dashboards API Error:', error);
  return res.status(500).json({
    success: false,
    message: error.message || 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? error : undefined
  });
};

// Health check endpoint (no auth required)
router.get('/health', async (req, res) => {
  try {    
    res.json({
      success: true,
      status: 'healthy',
      service: 'dashboards',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    });
  } catch (error) {
    console.error('Dashboards health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      service: 'dashboards',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Apply authentication to all other routes
router.use(AuthMiddleware.authenticateRequest);

// ===== DASHBOARD ROUTES =====


// Get all dashboards (with optional project filtering)
router.get('/dashboards', async (req, res) => {
  try {
    const { project_id } = req.query;
    
    let query = `
      SELECT d.*, p.name as project_title 
      FROM dashboards d 
      LEFT JOIN projects p ON d.project_id = p.id
    `;
    let params = [];
    
    if (project_id) {
      query += ' WHERE d.project_id = $1';
      params.push(project_id);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const dashboards = await db.allAsync(query, params);
    
    res.json({
      success: true,
      data: dashboards
    });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return handleError(res, error);
  }
});

// Get all dashboards for a specific project
router.get('/projects/:projectId/dashboards', AuthMiddleware.requireProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const dashboards = await db.allAsync(
      'SELECT * FROM dashboards WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    
    res.json({
      success: true,
      data: dashboards
    });
  } catch (error) {
    console.error('Error fetching project dashboards:', error);
    return handleError(res, error);
  }
});

// Get a specific dashboard with its blocks and data sources
router.get('/dashboards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the dashboard with project info
    const dashboard = await db.getAsync(`
      SELECT d.*, p.name as project_title 
      FROM dashboards d 
      LEFT JOIN projects p ON d.project_id = p.id 
      WHERE d.id = $1
    `, [id]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }
    
    // Get the dashboard's blocks ordered by position
    const blocks = await db.allAsync(
      'SELECT * FROM blocks WHERE dashboard_id = $1 ORDER BY position ASC, created_at ASC', 
      [id]
    );
    
    // Get the dashboard's data sources
    const datasources = await db.allAsync(
      'SELECT id, title, file_name, file_type, created_at FROM datasources WHERE dashboard_id = $1 ORDER BY created_at ASC', 
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...dashboard,
        blocks,
        datasources
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return handleError(res, error);
  }
});

// Create a new dashboard
router.post('/dashboards', async (req, res) => {
  try {
    const { title, description, project_id } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }
    
    if (!project_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }
    
    // Check if the project exists and user has access
    const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [project_id]);
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }
    
    const id = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.runAsync(
      'INSERT INTO dashboards (id, project_id, title, description, creator_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [id, project_id, title, description || '', req.user.id]
    );
    
    // Return the created dashboard with project info
    const dashboard = await db.getAsync(`
      SELECT d.*, p.name as project_title 
      FROM dashboards d 
      LEFT JOIN projects p ON d.project_id = p.id 
      WHERE d.id = $1
    `, [id]);
    
    res.status(201).json({
      success: true,
      data: dashboard,
      message: 'Dashboard created successfully'
    });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return handleError(res, error);
  }
});

// Update a dashboard
router.put('/dashboards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, project_id } = req.body;
    
    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [id]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }
    
    // If project_id is being updated, check if the new project exists
    if (project_id && project_id !== dashboard.project_id) {
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [project_id]);
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }
    }
    
    // Update the dashboard
    await db.runAsync(
      'UPDATE dashboards SET title = COALESCE($1, title), description = COALESCE($2, description), project_id = COALESCE($3, project_id), updated_at = NOW() WHERE id = $4',
      [title, description, project_id, id]
    );
    
    // Return the updated dashboard with project info
    const updatedDashboard = await db.getAsync(`
      SELECT d.*, p.name as project_title 
      FROM dashboards d 
      LEFT JOIN projects p ON d.project_id = p.id 
      WHERE d.id = $1
    `, [id]);
    
    res.json({
      success: true,
      data: updatedDashboard,
      message: 'Dashboard updated successfully'
    });
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return handleError(res, error);
  }
});

// Delete a dashboard
router.delete('/dashboards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [id]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }
    
    // Delete the dashboard (blocks and datasources will be deleted via ON DELETE CASCADE)
    await db.runAsync('DELETE FROM dashboards WHERE id = $1', [id]);
    
    res.json({ 
      success: true, 
      message: 'Dashboard deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return handleError(res, error);
  }
});

// Reorder blocks
router.put('/dashboards/:dashboardId/blocks/reorder', async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { blockOrder } = req.body; // Array of block IDs in new order
    
    if (!Array.isArray(blockOrder)) {
      return res.status(400).json({ 
        success: false, 
        message: 'blockOrder must be an array of block IDs' 
      });
    }
    
    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }
    
    // Update positions for all blocks
    for (let i = 0; i < blockOrder.length; i++) {
      await db.runAsync(
        'UPDATE blocks SET position = $1 WHERE id = $2 AND dashboard_id = $3', 
        [i, blockOrder[i], dashboardId]
      );
    }
    
    // Return updated blocks in new order
    const updatedBlocks = await db.allAsync(
      'SELECT * FROM blocks WHERE dashboard_id = $1 ORDER BY position ASC', 
      [dashboardId]
    );
    
    res.json({
      success: true,
      data: { blocks: updatedBlocks },
      message: 'Blocks reordered successfully'
    });
    
  } catch (error) {
    console.error('Error reordering blocks:', error);
    return handleError(res, error);
  }
});

// ===== BLOCK ROUTES =====

// Create a new block in a dashboard
router.post('/dashboards/:dashboardId/blocks', async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { title, description, type, size, content, position } = req.body;
    
    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }
    
    const id = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine position if not provided
    let blockPosition = position;
    if (blockPosition === undefined || blockPosition === null) {
      // Get the highest position for this dashboard
      const maxPositionResult = await db.getAsync(
        'SELECT MAX(position) as max_pos FROM blocks WHERE dashboard_id = $1', 
        [dashboardId]
      );
      blockPosition = (maxPositionResult?.max_pos || -1) + 1;
    } else {
      // If position is specified, shift other blocks if necessary
      await db.runAsync(
        'UPDATE blocks SET position = position + 1 WHERE dashboard_id = $1 AND position >= $2', 
        [dashboardId, blockPosition]
      );
    }
    
    await db.runAsync(
      'INSERT INTO blocks (id, dashboard_id, title, description, type, size, content, position, creator_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())',
      [
        id, 
        dashboardId, 
        title || 'Untitled Block', 
        description || 'Add a description', 
        type || 'ai', 
        size || 4, 
        content || '', 
        blockPosition,
        req.user.id
      ]
    );
    
    // Return the created block
    const block = await db.getAsync('SELECT * FROM blocks WHERE id = $1', [id]);
    
    res.status(201).json({
      success: true,
      data: block,
      message: 'Block created successfully'
    });
  } catch (error) {
    console.error('Error creating block:', error);
    return handleError(res, error);
  }
});

// Update a block
router.put('/blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, size, content, position } = req.body;
    
    // Check if the block exists
    const block = await db.getAsync('SELECT * FROM blocks WHERE id = $1', [id]);
    
    if (!block) {
      return res.status(404).json({ 
        success: false, 
        message: 'Block not found' 
      });
    }
    
    // Handle position updates
    if (position !== undefined && position !== block.position) {
      const dashboardId = block.dashboard_id;
      const oldPosition = block.position;
      const newPosition = position;
      
      if (newPosition > oldPosition) {
        // Moving down: shift blocks between old and new position up
        await db.runAsync(
          'UPDATE blocks SET position = position - 1 WHERE dashboard_id = $1 AND position > $2 AND position <= $3',
          [dashboardId, oldPosition, newPosition]
        );
      } else {
        // Moving up: shift blocks between new and old position down
        await db.runAsync(
          'UPDATE blocks SET position = position + 1 WHERE dashboard_id = $1 AND position >= $2 AND position < $3',
          [dashboardId, newPosition, oldPosition]
        );
      }
    }
    
    // Update the block
    await db.runAsync(
      'UPDATE blocks SET title = COALESCE($1, title), description = COALESCE($2, description), type = COALESCE($3, type), size = COALESCE($4, size), content = COALESCE($5, content), position = COALESCE($6, position), updated_at = NOW() WHERE id = $7',
      [title, description, type, size, content, position, id]
    );
    
    // Return the updated block
    const updatedBlock = await db.getAsync('SELECT * FROM blocks WHERE id = $1', [id]);
    
    res.json({
      success: true,
      data: updatedBlock,
      message: 'Block updated successfully'
    });
  } catch (error) {
    console.error('Error updating block:', error);
    return handleError(res, error);
  }
});

// Delete a block
router.delete('/blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the block exists
    const block = await db.getAsync('SELECT * FROM blocks WHERE id = $1', [id]);
    
    if (!block) {
      return res.status(404).json({ 
        success: false, 
        message: 'Block not found' 
      });
    }
    
    // Delete the block
    await db.runAsync('DELETE FROM blocks WHERE id = $1', [id]);
    
    res.json({ 
      success: true, 
      message: 'Block deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting block:', error);
    return handleError(res, error);
  }
});

// ===== DATA SOURCE ROUTES =====

// Create a new data source (with CSV upload)
router.post('/dashboards/:dashboardId/datasources', upload.single('file'), async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { title, content } = req.body;
    
    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }
    
    const id = `datasource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let finalContent = content;
    let fileName = null;
    let fileType = null;
    
    // If a file was uploaded
    if (req.file) {
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
      
      // Parse CSV file
      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        try {
          const csvContent = req.file.buffer.toString('utf8');
          const parsedData = await parseCSV(csvContent);
          finalContent = JSON.stringify(parsedData);
        } catch (error) {
          return res.status(400).json({ 
            success: false, 
            message: 'Failed to parse CSV file: ' + error.message 
          });
        }
      } else {
        // For non-CSV files, store the raw content
        finalContent = req.file.buffer.toString('utf8');
      }
    }
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }
    
    if (!finalContent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is required. Either provide content or upload a file.' 
      });
    }
    
    await db.runAsync(
      'INSERT INTO datasources (id, dashboard_id, title, content, file_name, file_type, creator_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
      [id, dashboardId, title, finalContent, fileName, fileType, req.user.id]
    );
    
    // Return the created data source (without content for efficiency)
    const datasource = await db.getAsync(
      'SELECT id, dashboard_id, title, file_name, file_type, created_at FROM datasources WHERE id = $1', 
      [id]
    );
    
    res.status(201).json({
      success: true,
      data: datasource,
      message: 'Data source created successfully'
    });
  } catch (error) {
    console.error('Error creating data source:', error);
    return handleError(res, error);
  }
});

// Get a specific data source
router.get('/datasources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const datasource = await db.getAsync('SELECT * FROM datasources WHERE id = $1', [id]);
    
    if (!datasource) {
      return res.status(404).json({ 
        success: false, 
        message: 'Data source not found' 
      });
    }
    
    res.json({
      success: true,
      data: datasource
    });
  } catch (error) {
    console.error('Error fetching data source:', error);
    return handleError(res, error);
  }
});

// Get all data sources for a dashboard
router.get('/dashboards/:dashboardId/datasources', async (req, res) => {
  try {
    const { dashboardId } = req.params;
    
    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }
    
    // Get all data sources for the dashboard (excluding full content for efficiency)
    const datasources = await db.allAsync(
      'SELECT id, dashboard_id, title, file_name, file_type, created_at FROM datasources WHERE dashboard_id = $1 ORDER BY created_at ASC',
      [dashboardId]
    );
    
    res.json({
      success: true,
      data: datasources
    });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    return handleError(res, error);
  }
});

// Delete a data source
router.delete('/datasources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the data source exists
    const datasource = await db.getAsync('SELECT * FROM datasources WHERE id = $1', [id]);
    
    if (!datasource) {
      return res.status(404).json({ 
        success: false, 
        message: 'Data source not found' 
      });
    }
    
    // Delete the data source
    await db.runAsync('DELETE FROM datasources WHERE id = $1', [id]);
    
    res.json({ 
      success: true, 
      message: 'Data source deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting data source:', error);
    return handleError(res, error);
  }
});


// Create a new dashboard within a project
router.post('/projects/:projectId/dashboards', AuthMiddleware.requireProjectAccess, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({ 
          success: false, 
          message: 'Title is required' 
        });
      }
      
      // Check if the project exists
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [projectId]);
      
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }
      
      const id = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.runAsync(
        'INSERT INTO dashboards (id, project_id, title, description, creator_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [id, projectId, title, description || '', req.user.id]
      );
      
      // Return the created dashboard
      const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [id]);
      
      res.status(201).json({
        success: true,
        data: dashboard,
        message: 'Dashboard created successfully'
      });
    } catch (error) {
      console.error('Error creating dashboard:', error);
      return handleError(res, error);
    }
  });
  
  // Get all projects assigned to a user
  router.get('/users/:userId/projects', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get all projects assigned to this user with project details
      const userProjects = await db.allAsync(`
        SELECT p.*, pu.created_at as assigned_at 
        FROM projects p 
        JOIN project_users pu ON p.id = pu.project_id 
        WHERE pu.user_id = $1 
        ORDER BY pu.created_at DESC
      `, [userId]);
      
      res.json({
        success: true,
        data: userProjects
      });
    } catch (error) {
      console.error('Error fetching user projects:', error);
      return handleError(res, error);
    }
  });
  
  // Bulk assign multiple users to a project
  router.post('/projects/:projectId/users/bulk', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { user_ids } = req.body;
      
      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'User IDs array is required' 
        });
      }
      
      // Check if the project exists
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [projectId]);
      
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }
      
      // Get existing assignments to avoid duplicates
      const placeholders = user_ids.map((_, index) => `$${index + 2}`).join(', ');
      const existingAssignments = await db.allAsync(
        `SELECT user_id FROM project_users WHERE project_id = $1 AND user_id IN (${placeholders})`,
        [projectId, ...user_ids]
      );
      
      const existingUserIds = existingAssignments.map(a => a.user_id);
      const newUserIds = user_ids.filter(id => !existingUserIds.includes(id));
      
      if (newUserIds.length === 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'All users are already assigned to this project' 
        });
      }
      
      // Insert new assignments
      for (const userId of newUserIds) {
        await db.runAsync(
          'INSERT INTO project_users (project_id, user_id, role, creator_id, created_at) VALUES ($1, $2, $3, $4, NOW())', 
          [projectId, userId, 'member', req.user.id]
        );
      }
      
      res.status(201).json({ 
        success: true,
        data: {
          assigned_users: newUserIds,
          already_assigned: existingUserIds
        },
        message: `${newUserIds.length} users assigned to project successfully`
      });
    } catch (error) {
      console.error('Error bulk assigning users to project:', error);
      return handleError(res, error);
    }
  });
  
  // ===== MISSING PROJECT MANAGEMENT ROUTES =====
  
  // Get all projects
  router.get('/projects', async (req, res) => {
    try {
      const projects = await db.allAsync(
        'SELECT * FROM projects ORDER BY created_at DESC'
      );
      
      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      return handleError(res, error);
    }
  });
  
  // Get a specific project with assigned users and dashboards
  router.get('/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the project
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [id]);
      
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }
      
      // Get assigned users for this project
      const assignedUsers = await db.allAsync(
        'SELECT user_id FROM project_users WHERE project_id = $1', 
        [id]
      );
      
      // Get dashboards for this project
      const dashboards = await db.allAsync(
        'SELECT id, title, description, created_at, updated_at FROM dashboards WHERE project_id = $1 ORDER BY created_at DESC', 
        [id]
      );
      
      res.json({
        success: true,
        data: {
          ...project,
          assigned_users: assignedUsers.map(u => u.user_id),
          dashboards: dashboards
        }
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      return handleError(res, error);
    }
  });
  
  // Create a new project
  router.post('/projects', async (req, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({ 
          success: false, 
          message: 'Title is required' 
        });
      }
      
      const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.runAsync(
        'INSERT INTO projects (id, name, description, creator_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [id, title, description || '', req.user.id]
      );
      
      // Return the created project
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [id]);
      
      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error('Error creating project:', error);
      return handleError(res, error);
    }
  });
  
  // Update a project
  router.put('/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description } = req.body;
      
      // Check if the project exists
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [id]);
      
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }
      
      // Update the project
      await db.runAsync(
        'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3',
        [title, description, id]
      );
      
      // Return the updated project
      const updatedProject = await db.getAsync('SELECT * FROM projects WHERE id = $1', [id]);
      
      res.json({
        success: true,
        data: updatedProject,
        message: 'Project updated successfully'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      return handleError(res, error);
    }
  });
  
  // Delete a project
  router.delete('/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if the project exists
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [id]);
      
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }
      
      // Delete the project (project_users will be deleted via ON DELETE CASCADE)
      await db.runAsync('DELETE FROM projects WHERE id = $1', [id]);
      
      res.json({ 
        success: true, 
        message: 'Project deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      return handleError(res, error);
    }
  });
  
  // ===== PROJECT USERS ROUTES =====
  
  // Get all users assigned to a project
  router.get('/projects/:projectId/users', async (req, res) => {
    try {
      const { projectId } = req.params;
      
      // Check if the project exists
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [projectId]);
      
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }
      
      // Get all users assigned to this project
      const projectUsers = await db.allAsync(
        'SELECT * FROM project_users WHERE project_id = $1', 
        [projectId]
      );
      
      res.json({
        success: true,
        data: projectUsers
      });
    } catch (error) {
      console.error('Error fetching project users:', error);
      return handleError(res, error);
    }
  });
  
  // Assign a user to a project
  router.post('/projects/:projectId/users', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { user_id } = req.body;
      
      if (!user_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID is required' 
        });
      }
      
      // Check if the project exists
      const project = await db.getAsync('SELECT * FROM projects WHERE id = $1', [projectId]);
      
      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }
      
      // Check if user is already assigned to this project
      const existingAssignment = await db.getAsync(
        'SELECT * FROM project_users WHERE project_id = $1 AND user_id = $2',
        [projectId, user_id]
      );
      
      if (existingAssignment) {
        return res.status(409).json({ 
          success: false, 
          message: 'User is already assigned to this project' 
        });
      }
      
      // Assign user to project
      await db.runAsync(
        'INSERT INTO project_users (project_id, user_id, role, creator_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [projectId, user_id, 'member', req.user.id]
      );
      
      // Return the created assignment
      const assignment = await db.getAsync(
        'SELECT * FROM project_users WHERE project_id = $1 AND user_id = $2',
        [projectId, user_id]
      );
      
      res.status(201).json({
        success: true,
        data: assignment,
        message: 'User assigned to project successfully'
      });
    } catch (error) {
      console.error('Error assigning user to project:', error);
      return handleError(res, error);
    }
  });
  
  // Remove a user from a project
  router.delete('/projects/:projectId/users/:userId', async (req, res) => {
    try {
      const { projectId, userId } = req.params;
      
      // Check if the assignment exists
      const assignment = await db.getAsync(
        'SELECT * FROM project_users WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      
      if (!assignment) {
        return res.status(404).json({ 
          success: false, 
          message: 'User assignment not found' 
        });
      }
      
      // Remove the assignment
      await db.runAsync(
        'DELETE FROM project_users WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      
      res.json({ 
        success: true, 
        message: 'User removed from project successfully' 
      });
    } catch (error) {
      console.error('Error removing user from project:', error);
      return handleError(res, error);
    }
  });

// ===== AI ENDPOINTS =====

// AI query endpoint
router.post('/ai', async (req, res) => {
  try {
    const { query, blockId, dashboardId } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query is required' 
      });
    }

    if (!dashboardId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dashboard ID is required' 
      });
    }

    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }

    // Get data sources for this dashboard
    const datasources = await db.allAsync('SELECT * FROM datasources WHERE dashboard_id = $1', [dashboardId]);
    
    // Prepare data for the AI
    let datasetString = "";
    
    if (datasources && datasources.length > 0) {
      // Use the first data source for now
      const datasource = datasources[0];
      
      try {
        // Try to parse the content as JSON
        const parsedContent = JSON.parse(datasource.content);
        datasetString = JSON.stringify(parsedContent, null, 2);
      } catch (error) {
        // If not valid JSON, use as is
        datasetString = datasource.content;
      }
    } else {
      // Fallback to demo data if no data sources are available
      const demoData = [
        {"id": 1, "name": "Alice Smith", "class": "Class A", "grade": 85, "subject": "Math"},
        {"id": 2, "name": "Bob Johnson", "class": "Class A", "grade": 90, "subject": "Science"},
        {"id": 3, "name": "Charlie Brown", "class": "Class B", "grade": 78, "subject": "Math"},
        {"id": 4, "name": "Diana Prince", "class": "Class B", "grade": 92, "subject": "Science"},
        {"id": 5, "name": "Ethan Hunt", "class": "Class A", "grade": 88, "subject": "Math"},
        {"id": 6, "name": "Fiona Green", "class": "Class C", "grade": 95, "subject": "Science"},
        {"id": 7, "name": "George King", "class": "Class C", "grade": 80, "subject": "Math"},
        {"id": 8, "name": "Hannah Lee", "class": "Class B", "grade": 87, "subject": "Science"}
      ];
      datasetString = JSON.stringify(demoData, null, 2);
    }

    // System prompt
    const systemPrompt = `You are an AI assistant that generates Highcharts configurations for data visualization. Your task is to analyze the provided dataset and the user's query, then return a valid Highcharts configuration in JSON format. Do not include any explanations, additional text, or markdown. Return only the JSON object.

- The user's query will describe a data visualization request (e.g., "group students by class", "average grade by subject").
- Generate a Highcharts configuration that matches the query, using appropriate chart types (e.g., column, bar, line, pie).
- Ensure the configuration includes necessary properties like chart type, title, xAxis, yAxis, and series.
- Use the dataset to compute the data for the series (e.g., count, average, or other aggregations as needed).
- Do not include any Highcharts options that are not directly relevant to the query.

Return only the JSON object, nothing else.`;

    // Construct the final prompt
    const fullPrompt = `System: ${systemPrompt}\n\nDataset: ${datasetString}\n\nUser Query: ${query}`;

    // OpenAI API setup
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key not configured'
      });
    }

    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: fullPrompt }
      ],
      temperature: 0.5,
      max_tokens: 500
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message || !responseData.choices[0].message.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Parse the JSON from the response content
    let chartConfig;
    try {
      chartConfig = JSON.parse(responseData.choices[0].message.content);
    } catch (error) {
      throw new Error(`Failed to parse chart config: ${error.message}`);
    }
    
    // If blockId is provided, update the block with the query and response
    if (blockId) {
      const block = await db.getAsync('SELECT * FROM blocks WHERE id = $1', [blockId]);
      
      if (block) {
        await db.runAsync(
          'UPDATE blocks SET content = $1, query = $2, response = $3, updated_at = NOW() WHERE id = $4',
          [JSON.stringify(chartConfig), query, responseData.choices[0].message.content, blockId]
        );
      }
    }
    
    res.json({
      success: true,
      data: chartConfig
    });
  } catch (error) {
    console.error('AI endpoint error:', error);
    return handleError(res, error);
  }
});

// Generate synthetic data
router.post('/generate-synthetic', async (req, res) => {
  try {
    const { dashboardId, customInstructions } = req.body;
    
    if (!dashboardId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dashboard ID is required' 
      });
    }

    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }

    // Get existing data sources for this dashboard to understand the data structure
    const existingDataSources = await db.allAsync('SELECT * FROM datasources WHERE dashboard_id = $1', [dashboardId]);
    
    let existingDataExample = "";
    let dataStructureContext = "";
    
    if (existingDataSources && existingDataSources.length > 0) {
      // Use the most recent data source as reference
      const latestDataSource = existingDataSources[existingDataSources.length - 1];
      
      try {
        const parsedContent = JSON.parse(latestDataSource.content);
        // Take first few records as example
        const sampleData = Array.isArray(parsedContent) ? parsedContent.slice(0, 3) : [parsedContent];
        existingDataExample = JSON.stringify(sampleData, null, 2);
        dataStructureContext = `Based on existing data source "${latestDataSource.title}", maintain similar structure and field types.`;
      } catch (error) {
        // If not valid JSON, use first few lines
        const lines = latestDataSource.content.split('\n').slice(0, 5);
        existingDataExample = lines.join('\n');
        dataStructureContext = `Based on existing data source "${latestDataSource.title}", maintain similar CSV structure.`;
      }
    }

    // Construct the system prompt for synthetic data generation
    const systemPrompt = `You are a synthetic data generator. Generate realistic but synthetic data for dashboard analysis. 

IMPORTANT RULES:
1. Always return ONLY a valid JSON array of objects
2. Generate exactly 50-100 records for good analysis
3. All data should be clearly synthetic but realistic
4. Include varied data points for meaningful visualizations
5. Use consistent field names and data types
6. NO explanations, markdown, or additional text - ONLY the JSON array

${dataStructureContext}

${existingDataExample ? `
REFERENCE DATA STRUCTURE:
${existingDataExample}

Generate new synthetic data following this structure but with different values.
` : `
GENERATE GENERAL BUSINESS/EDUCATIONAL DATA with these common fields:
- id: unique identifier
- name: person/item names
- category: grouping field
- value/amount: numeric field for analysis
- date: timestamp for time-series analysis
- status: categorical field
`}

${customInstructions ? `
ADDITIONAL REQUIREMENTS: ${customInstructions}
` : ''}

Return only the JSON array, nothing else.`;

    // OpenAI API call
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key not configured'
      });
    }

    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: systemPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message || !responseData.choices[0].message.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Parse the JSON response
    let syntheticData;
    try {
      const content = responseData.choices[0].message.content.trim();
      // Remove any potential markdown code blocks
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      syntheticData = JSON.parse(cleanContent);
      
      // Ensure it's an array
      if (!Array.isArray(syntheticData)) {
        throw new Error('Generated data is not an array');
      }
      
    } catch (error) {
      throw new Error(`Failed to parse synthetic data: ${error.message}`);
    }
    
    // Return the synthetic data
    res.json({
      success: true,
      data: syntheticData,
      recordCount: syntheticData.length,
      message: 'Synthetic data generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating synthetic data:', error);
    return handleError(res, error);
  }
});

// Generate insights
router.post('/generate-insights', async (req, res) => {
  try {
    const { dashboardId, count = 3 } = req.body;
    
    if (!dashboardId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dashboard ID is required' 
      });
    }

    // Validate count
    const insightCount = Math.min(Math.max(parseInt(count), 1), 8); // Limit between 1-8

    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }

    // Get existing data sources for this dashboard
    const dataSources = await db.allAsync('SELECT * FROM datasources WHERE dashboard_id = $1', [dashboardId]);
    
    if (!dataSources || dataSources.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No data sources found. Add data sources first to generate insights.' 
      });
    }

    // Get existing blocks to avoid duplicate insights
    const existingBlocks = await db.allAsync(
      'SELECT title, query, type FROM blocks WHERE dashboard_id = $1 AND query IS NOT NULL', 
      [dashboardId]
    );
    const existingQueries = existingBlocks.map(block => block.query).filter(Boolean);

    // Prepare data context for AI
    let dataContext = "";
    let sampleData = "";
    
    // Analyze all data sources to understand the data structure
    for (const dataSource of dataSources) {
      try {
        const parsedContent = JSON.parse(dataSource.content);
        if (Array.isArray(parsedContent) && parsedContent.length > 0) {
          // Take sample of first few records
          const sample = parsedContent.slice(0, 5);
          sampleData += `\n--- Data Source: ${dataSource.title} ---\n`;
          sampleData += JSON.stringify(sample, null, 2);
          
          // Extract field information
          const fields = Object.keys(parsedContent[0] || {});
          dataContext += `\nData Source "${dataSource.title}": ${fields.join(', ')} (${parsedContent.length} records)`;
        }
      } catch (error) {
        // Handle non-JSON data
        const lines = dataSource.content.split('\n').slice(0, 5);
        sampleData += `\n--- Data Source: ${dataSource.title} ---\n`;
        sampleData += lines.join('\n');
      }
    }

    // Build context about existing insights to avoid duplicates
    let existingInsightsContext = "";
    if (existingQueries.length > 0) {
      existingInsightsContext = `\nEXISTING INSIGHTS TO AVOID DUPLICATING:\n${existingQueries.map(q => `- ${q}`).join('\n')}`;
    }

    // Single comprehensive system prompt that generates both insights AND chart configs
    const systemPrompt = `You are an expert data analyst and Highcharts visualization specialist. Analyze the provided dataset(s) and generate ${insightCount} intelligent insights, each with a complete Highcharts configuration.

CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON array with exactly ${insightCount} objects
2. Each object must have: question, description, chart_type, insight_category, and chart_payload
3. The chart_payload must be a complete, valid Highcharts configuration object
4. NO explanations, markdown, or additional text - JUST the JSON array
5. Questions should be specific, actionable, and reveal meaningful patterns
6. Chart configurations should directly answer the insight question using the actual data

AVAILABLE DATA:${dataContext}

SAMPLE DATA:${sampleData}${existingInsightsContext}

Each insight object must follow this EXACT structure:
{
  "question": "Specific analytical question about the data",
  "description": "Brief explanation of why this insight is valuable (max 100 chars)",
  "chart_type": "column|line|pie|bar|area|scatter",
  "insight_category": "trend|comparison|distribution|correlation|performance|anomaly",
  "chart_payload": {
    "chart": {"type": "column"},
    "title": {"text": "Chart Title"},
    "xAxis": {"categories": ["data from actual dataset"]},
    "yAxis": {"title": {"text": "Y Axis Label"}},
    "series": [{"name": "Series Name", "data": [actual_numbers_from_dataset]}],
    "plotOptions": {},
    "colors": ["#4f46e5", "#10b981", "#f59e0b", "#ef4444"],
    "credits": {"enabled": false}
  }
}

INSIGHT GENERATION GUIDELINES:
- Focus on actionable business insights that drive decisions
- Look for trends over time, correlations between variables
- Identify top performers, outliers, or unusual patterns
- Compare categories, segments, or time periods
- Use actual field names and data values from the provided dataset
- Ensure chart data calculations are mathematically correct
- Make visualizations clear and immediately interpretable

CHART CONFIGURATION REQUIREMENTS:
- Use actual data values, not placeholder numbers
- Process the dataset to calculate aggregations (sum, average, count, etc.)
- Include proper titles, axis labels, and series names
- Use appropriate chart types that best reveal the insight
- Apply the specified color palette consistently
- Ensure all data references match actual field names

EXAMPLES OF GOOD INSIGHTS:
- "Which product category generates the highest revenue?" (column chart with category totals)
- "How has sales performance changed month over month?" (line chart with time series)
- "What is the distribution of customer satisfaction scores?" (pie chart with score ranges)
- "Which sales representatives exceed their targets?" (bar chart comparing actual vs target)

Generate ${insightCount} diverse, valuable insights with complete chart configurations that help users understand their data better.

Return only the JSON array:`;

    // OpenAI API call
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key not configured'
      });
    }

    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const payload = {
      model: 'gpt-4',
      messages: [
        { role: 'user', content: systemPrompt }
      ],
      temperature: 0.5, // Lower temperature for more consistent chart configs
      max_tokens: 3000   // Increased for complete chart configurations
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message || !responseData.choices[0].message.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Parse the insights with chart configurations
    let insights;
    try {
      const content = responseData.choices[0].message.content.trim();
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      insights = JSON.parse(cleanContent);
      
      if (!Array.isArray(insights)) {
        throw new Error('Response is not an array');
      }
      
      // Validate each insight has required fields
      for (const insight of insights) {
        if (!insight.question || !insight.description || !insight.chart_payload) {
          throw new Error('Invalid insight structure - missing required fields');
        }
        
        // Validate chart_payload is an object
        if (typeof insight.chart_payload !== 'object') {
          throw new Error('chart_payload must be an object');
        }
      }
      
    } catch (error) {
      throw new Error(`Failed to parse insights: ${error.message}`);
    }

    // Add metadata to each insight
    const enrichedInsights = insights.map((insight, index) => ({
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question: insight.question,
      description: insight.description,
      chart_type: insight.chart_type,
      insight_category: insight.insight_category,
      chart_payload: insight.chart_payload,
      created_at: new Date().toISOString()
    }));
    
    res.json({
      success: true,
      data: { insights: enrichedInsights },
      count: enrichedInsights.length,
      message: `Generated ${enrichedInsights.length} smart insights with charts`
    });
    
  } catch (error) {
    console.error('Error generating insights:', error);
    return handleError(res, error);
  }
});

// Save insight block
router.post('/save-insight-block', async (req, res) => {
  try {
    const { dashboardId, insight, position } = req.body;
    
    if (!dashboardId || !insight) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dashboard ID and insight data are required' 
      });
    }

    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }

    const blockId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine position
    let blockPosition = position;
    if (blockPosition === undefined || blockPosition === null) {
      const maxPositionResult = await db.getAsync(
        'SELECT MAX(position) as max_pos FROM blocks WHERE dashboard_id = $1', 
        [dashboardId]
      );
      blockPosition = (maxPositionResult?.max_pos || -1) + 1;
    } else {
      await db.runAsync(
        'UPDATE blocks SET position = position + 1 WHERE dashboard_id = $1 AND position >= $2', 
        [dashboardId, blockPosition]
      );
    }
    
    await db.runAsync(
      'INSERT INTO blocks (id, dashboard_id, title, description, type, size, content, query, response, position, creator_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())',
      [
        blockId,
        dashboardId,
        insight.question,
        insight.description,
        'ai',
        4, // Default size
        JSON.stringify(insight.chart_payload),
        insight.question,
        JSON.stringify(insight.chart_payload),
        blockPosition,
        req.user.id
      ]
    );
    
    // Return the created block
    const block = await db.getAsync('SELECT * FROM blocks WHERE id = $1', [blockId]);
    
    res.status(201).json({
      success: true,
      data: { block: block },
      message: 'Insight saved as dashboard block'
    });
    
  } catch (error) {
    console.error('Error saving insight block:', error);
    return handleError(res, error);
  }
});

// Bulk save multiple insight blocks
router.post('/save-insight-blocks', async (req, res) => {
  try {
    const { dashboardId, insights, startPosition } = req.body;
    
    if (!dashboardId || !insights || !Array.isArray(insights)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dashboard ID and insights array are required' 
      });
    }

    // Check if the dashboard exists
    const dashboard = await db.getAsync('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    }

    // Determine starting position
    let position = startPosition;
    if (position === undefined || position === null) {
      const maxPositionResult = await db.getAsync(
        'SELECT MAX(position) as max_pos FROM blocks WHERE dashboard_id = $1', 
        [dashboardId]
      );
      position = (maxPositionResult?.max_pos || -1) + 1;
    } else {
      // Shift existing blocks to make room
      await db.runAsync(
        'UPDATE blocks SET position = position + $1 WHERE dashboard_id = $2 AND position >= $3', 
        [insights.length, dashboardId, position]
      );
    }

    const savedBlocks = [];
    
    for (let i = 0; i < insights.length; i++) {
      const insight = insights[i];
      const blockId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.runAsync(
        'INSERT INTO blocks (id, dashboard_id, title, description, type, size, content, query, response, position, creator_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())',
        [
          blockId,
          dashboardId,
          insight.question,
          insight.description,
          'ai',
          4, // Default size
          JSON.stringify(insight.chart_payload),
          insight.question,
          JSON.stringify(insight.chart_payload),
          position + i,
          req.user.id
        ]
      );
      
      const block = await db.getAsync('SELECT * FROM blocks WHERE id = $1', [blockId]);
      savedBlocks.push(block);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    res.status(201).json({
      success: true,
      data: { blocks: savedBlocks },
      count: savedBlocks.length,
      message: `${savedBlocks.length} insights saved as dashboard blocks`
    });
    
  } catch (error) {
    console.error('Error saving insight blocks:', error);
    return handleError(res, error);
  }
});

// ===== NEW ENDPOINT: Get all dashboards for organization =====
router.get('/organizations/:orgId/dashboards', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Check if user has access to this organization
    const hasAccess = await db.getAsync(`
      SELECT 
        CASE 
          WHEN o.creator_id = $2 THEN 1
          WHEN EXISTS (
            SELECT 1 FROM project_users pu
            JOIN projects p ON pu.project_id = p.id
            WHERE p.organization_id = $1 AND pu.user_id = $2
          ) THEN 1
          ELSE 0
        END as has_access
      FROM organizations o
      WHERE o.id = $1
    `, [orgId, req.user.id]);
    
    if (!hasAccess || hasAccess.has_access === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this organization'
      });
    }
    
    const dashboards = await db.allAsync(`
      SELECT d.*, p.name as project_name, p.id as project_id
      FROM dashboards d
      JOIN projects p ON d.project_id = p.id
      LEFT JOIN project_users pu ON p.id = pu.project_id
      WHERE p.organization_id = $1 
        AND (pu.user_id = $2 OR p.creator_id = $2)
      ORDER BY d.created_at DESC
    `, [orgId, req.user.id]);

    res.json({
      success: true,
      data: dashboards
    });
  } catch (error) {
    console.error('Get organization dashboards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization dashboards'
    });
  }
});

// ===== NEW ENDPOINT: Get dashboard details =====
router.get('/dashboards/:dashboardId', async (req, res) => {
  try {
    const { dashboardId } = req.params;
    
    // Get dashboard with project and organization info
    const dashboard = await db.getAsync(`
      SELECT d.*, p.name as project_name, p.organization_id, o.name as organization_name
      FROM dashboards d
      JOIN projects p ON d.project_id = p.id
      JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN project_users pu ON p.id = pu.project_id
      WHERE d.id = $1 
        AND (pu.user_id = $2 OR p.creator_id = $2 OR o.creator_id = $2)
    `, [dashboardId, req.user.id]);
    
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found or access denied'
      });
    }

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard'
    });
  }
});

module.exports = router;