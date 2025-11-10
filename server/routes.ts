import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertProjectSchema, insertDashboardSchema, insertDataSourceSchema, insertOrganizationSchema, insertBlockSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user!;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Organization routes
  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertOrganizationSchema.parse({ ...req.body, ownerId: userId });
      
      const organization = await storage.createOrganization(data);
      
      // Add the creator as owner
      await storage.addUserToOrganization(organization.id, userId, 'owner');
      
      res.json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.get('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let organizations = await storage.getUserOrganizations(userId);
      
      // If user has no organizations, create a default one
      if (organizations.length === 0) {
        const user = await storage.getUser(userId);
        const defaultOrgName = user?.firstName ? `${user.firstName}'s Workspace` : 'My Workspace';
        
        const defaultOrg = await storage.createOrganization({
          name: defaultOrgName,
          slug: `user-${userId}-workspace`,
          ownerId: userId,
        });
        
        await storage.addUserToOrganization(defaultOrg.id, userId, 'owner');
        organizations = [defaultOrg];
      }
      
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get('/api/organizations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.getOrganization(id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // Project routes
  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertProjectSchema.parse({ ...req.body, createdById: userId });
      
      const project = await storage.createProject(data);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId } = req.query;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      
      const projects = await storage.getProjectsByOrganization(parseInt(organizationId));
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.patch('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Dashboard routes
  app.post('/api/dashboards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertDashboardSchema.parse({ ...req.body, createdById: userId });
      
      const dashboard = await storage.createDashboard(data);
      res.json(dashboard);
    } catch (error) {
      console.error("Error creating dashboard:", error);
      res.status(500).json({ message: "Failed to create dashboard" });
    }
  });

  app.get('/api/dashboards', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.query;
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      const dashboards = await storage.getDashboardsByProject(parseInt(projectId));
      res.json(dashboards);
    } catch (error) {
      console.error("Error fetching dashboards:", error);
      res.status(500).json({ message: "Failed to fetch dashboards" });
    }
  });

  app.get('/api/dashboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const dashboard = await storage.getDashboard(id);
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  });

  app.put('/api/dashboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const dashboard = await storage.updateDashboard(id, updates);
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      res.json(dashboard);
    } catch (error) {
      console.error("Error updating dashboard:", error);
      res.status(500).json({ message: "Failed to update dashboard" });
    }
  });

  app.patch('/api/dashboards/:id/access', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const dashboard = await storage.updateDashboard(id, {
        lastAccessedAt: new Date()
      });
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      res.json(dashboard);
    } catch (error) {
      console.error("Error updating dashboard access:", error);
      res.status(500).json({ message: "Failed to update dashboard access" });
    }
  });

  app.delete('/api/dashboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDashboard(id);
      res.json({ message: "Dashboard deleted successfully" });
    } catch (error) {
      console.error("Error deleting dashboard:", error);
      res.status(500).json({ message: "Failed to delete dashboard" });
    }
  });

  // Data source routes
  app.post('/api/data-sources', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, type, organizationId } = req.body;
      
      let config = {};
      if (req.file) {
        config = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path,
        };
      }
      
      const data = insertDataSourceSchema.parse({
        name,
        type,
        organizationId: parseInt(organizationId),
        createdById: userId,
        config,
      });
      
      const dataSource = await storage.createDataSource(data);
      res.json(dataSource);
    } catch (error) {
      console.error("Error creating data source:", error);
      res.status(500).json({ message: "Failed to create data source" });
    }
  });

  app.get('/api/data-sources', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId } = req.query;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      
      const dataSources = await storage.getDataSourcesByOrganization(parseInt(organizationId));
      res.json(dataSources);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ message: "Failed to fetch data sources" });
    }
  });

  // Dashboard component routes
  app.post('/api/dashboard-components', isAuthenticated, async (req: any, res) => {
    try {
      const data = req.body;
      const component = await storage.createDashboardComponent(data);
      res.json(component);
    } catch (error) {
      console.error("Error creating dashboard component:", error);
      res.status(500).json({ message: "Failed to create dashboard component" });
    }
  });

  app.get('/api/dashboard-components/:dashboardId', isAuthenticated, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.dashboardId);
      const components = await storage.getDashboardComponents(dashboardId);
      res.json(components);
    } catch (error) {
      console.error("Error fetching dashboard components:", error);
      res.status(500).json({ message: "Failed to fetch dashboard components" });
    }
  });

  app.put('/api/dashboard-components/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const component = await storage.updateDashboardComponent(id, updates);
      if (!component) {
        return res.status(404).json({ message: "Dashboard component not found" });
      }
      res.json(component);
    } catch (error) {
      console.error("Error updating dashboard component:", error);
      res.status(500).json({ message: "Failed to update dashboard component" });
    }
  });

  app.delete('/api/dashboard-components/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDashboardComponent(id);
      res.json({ message: "Dashboard component deleted successfully" });
    } catch (error) {
      console.error("Error deleting dashboard component:", error);
      res.status(500).json({ message: "Failed to delete dashboard component" });
    }
  });

  // Block routes for AI-first dashboard builder
  app.post('/api/blocks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertBlockSchema.parse({ ...req.body, createdById: userId });
      
      const block = await storage.createBlock(data);
      res.json(block);
    } catch (error) {
      console.error("Error creating block:", error);
      res.status(500).json({ message: "Failed to create block" });
    }
  });

  app.get('/api/dashboards/:dashboardId/blocks', isAuthenticated, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.dashboardId);
      const blocks = await storage.getBlocksByDashboard(dashboardId);
      res.json(blocks);
    } catch (error) {
      console.error("Error fetching blocks:", error);
      res.status(500).json({ message: "Failed to fetch blocks" });
    }
  });

  app.get('/api/blocks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const block = await storage.getBlock(id);
      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }
      res.json(block);
    } catch (error) {
      console.error("Error fetching block:", error);
      res.status(500).json({ message: "Failed to fetch block" });
    }
  });

  app.patch('/api/blocks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const block = await storage.updateBlock(id, updates);
      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }
      res.json(block);
    } catch (error) {
      console.error("Error updating block:", error);
      res.status(500).json({ message: "Failed to update block" });
    }
  });

  app.delete('/api/blocks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBlock(id);
      res.json({ message: "Block deleted successfully" });
    } catch (error) {
      console.error("Error deleting block:", error);
      res.status(500).json({ message: "Failed to delete block" });
    }
  });

  // Block chat history routes
  app.get('/api/blocks/:blockId/chat-history', isAuthenticated, async (req: any, res) => {
    try {
      const { blockId } = req.params;
      const chatHistory = await storage.getBlockChatHistory(blockId);
      res.json(chatHistory);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.post('/api/blocks/:blockId/chat-history', isAuthenticated, async (req: any, res) => {
    try {
      const { blockId } = req.params;
      const { question, chartData } = req.body;
      
      const chatHistoryId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const chatHistory = await storage.createBlockChatHistory({
        id: chatHistoryId,
        blockId,
        question,
        chartData,
      });
      
      res.json(chatHistory);
    } catch (error) {
      console.error("Error creating chat history:", error);
      res.status(500).json({ message: "Failed to create chat history" });
    }
  });

  app.delete('/api/blocks/chat-history/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBlockChatHistory(id);
      res.json({ message: "Chat history deleted successfully" });
    } catch (error) {
      console.error("Error deleting chat history:", error);
      res.status(500).json({ message: "Failed to delete chat history" });
    }
  });

  // AI Block Generation
  app.post('/api/ai/generate-block', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { prompt, dashboardId, dataSources } = req.body;
      
      // Generate block using AI (simplified for now)
      const blockId = `ai_block_${Date.now()}`;
      const aiBlock = {
        id: blockId,
        dashboardId: parseInt(dashboardId),
        title: `AI Generated Block`,
        description: `Generated from: "${prompt}"`,
        type: 'ai',
        size: 6,
        content: { prompt, generatedAt: new Date() },
        position: 0,
        createdById: userId,
      };
      
      const block = await storage.createBlock(aiBlock);
      res.json(block);
    } catch (error) {
      console.error("Error generating AI block:", error);
      res.status(500).json({ message: "Failed to generate AI block" });
    }
  });

  // Stats endpoints
  app.get('/api/stats/overview', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId } = req.query;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      
      const projects = await storage.getProjectsByOrganization(parseInt(organizationId));
      const activeProjects = projects.filter(p => p.status === 'active');
      
      let totalDashboards = 0;
      for (const project of projects) {
        const dashboards = await storage.getDashboardsByProject(project.id);
        totalDashboards += dashboards.length;
      }
      
      const dataSources = await storage.getDataSourcesByOrganization(parseInt(organizationId));
      
      res.json({
        activeProjects: activeProjects.length,
        totalDashboards,
        dataSources: dataSources.length,
        teamMembers: 1, // TODO: Implement team member counting
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Epesi Agent Chat Routes
  app.post('/api/epesi-agent/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, dashboardId, conversationId } = req.body;
      const userId = req.user.id;
      
      console.log("Epesi Agent request:", { prompt, dashboardId, userId });
      
      // Ensure dashboardId is properly parsed
      const numericDashboardId = parseInt(dashboardId);
      if (isNaN(numericDashboardId)) {
        console.error("Invalid dashboard ID:", dashboardId);
        return res.status(400).json({ message: "Invalid dashboard ID" });
      }
      
      // Get dashboard and data sources
      console.log("Attempting to get dashboard with ID:", numericDashboardId);
      const dashboard = await storage.getDashboard(numericDashboardId);
      console.log("Dashboard query result:", dashboard);
      
      if (!dashboard) {
        console.error("Dashboard not found for ID:", numericDashboardId);
        console.log("Storage instance:", typeof storage);
        console.log("getDashboard method:", typeof storage.getDashboard);
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      // Get data sources for the dashboard's organization
      let dataSources = await storage.getDataSourcesByOrganization(dashboard.organizationId || 1);
      console.log("Data sources found:", dataSources?.length || 0);
      
      // Fallback to default organization if no data sources found
      if (!dataSources || dataSources.length === 0) {
        dataSources = await storage.getDataSourcesByOrganization(1);
        console.log("Fallback data sources found:", dataSources?.length || 0);
      }
      
      // Create or get existing conversation
      let conversation;
      if (conversationId) {
        conversation = await storage.getEpesiConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
      } else {
        // Create new conversation with a title based on the prompt
        const title = prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt;
        const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        conversation = await storage.createEpesiConversation({
          id: newConversationId,
          dashboardId: numericDashboardId,
          title,
          createdById: userId
        });
      }
      
      // Save user message
      await storage.createEpesiMessage({
        conversationId: conversation.id,
        role: 'user',
        content: prompt
      });
      
      // Check if this is a greeting or general conversation
      const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|what's up|how are you|what can you do|help)$/i.test(prompt.trim());
      
      if (isGreeting) {
        const response = "Hello! I'm Epesi Agent, your AI analytics assistant. I can help you:\n\n• Analyze your data and generate insights\n• Create various types of charts and visualizations\n• Answer questions about your data\n• Generate comprehensive reports\n\nWhat would you like to explore today?";
        
        // Save assistant message
        await storage.createEpesiMessage({
          conversationId: conversation.id,
          role: 'assistant',
          content: response
        });
        
        return res.json({
          response,
          charts: [],
          conversationId: conversation.id
        });
      }
      
      // For data analysis questions, generate multiple charts
      let dataContext = "";
      let sampleData = "";
      
      // Process data sources for context
      for (const dataSource of dataSources.slice(0, 2)) {
        try {
          if (dataSource.content && typeof dataSource.content === 'object') {
            const contentArray = Array.isArray(dataSource.content) ? dataSource.content : [dataSource.content];
            if (contentArray.length > 0) {
              const sample = contentArray.slice(0, 5);
              sampleData += `\n--- Data Source: ${dataSource.name} ---\n`;
              sampleData += JSON.stringify(sample, null, 2);
              
              const fields = Object.keys(contentArray[0] || {});
              dataContext += `\nData Source "${dataSource.name}": ${fields.join(', ')} (${contentArray.length} records)`;
            }
          }
        } catch (error) {
          console.error('Error processing data source:', error);
        }
      }
      
      // If no data context, use sample data
      if (!dataContext.trim()) {
        dataContext = "\nData Source \"Sample Sales Data\": product_name, sales_value, quarter, region, sales_rep (100 records)";
        sampleData = `\n--- Data Source: Sample Sales Data ---\n${JSON.stringify([
          { product_name: "Product A", sales_value: 15000, quarter: "Q1", region: "North", sales_rep: "John Smith" },
          { product_name: "Product B", sales_value: 22000, quarter: "Q1", region: "South", sales_rep: "Emily Johnson" },
          { product_name: "Product C", sales_value: 18000, quarter: "Q2", region: "East", sales_rep: "Michael Williams" },
          { product_name: "Product A", sales_value: 25000, quarter: "Q2", region: "West", sales_rep: "Jessica Brown" },
          { product_name: "Product B", sales_value: 31000, quarter: "Q3", region: "North", sales_rep: "David Jones" }
        ], null, 2)}`;
      }
      
      // Generate charts using OpenAI
      const { generateEpesiAgentResponse } = await import('./openai');
      
      const response = await generateEpesiAgentResponse({
        prompt,
        dataContext,
        sampleData,
        chartCount: 4
      });
      
      // Save assistant message
      await storage.createEpesiMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: response.response,
        metadata: { charts: response.charts }
      });
      
      // Update conversation timestamp
      await storage.updateEpesiConversation(conversation.id, {
        title: conversation.title // Keep existing title
      });
      
      res.json({
        ...response,
        conversationId: conversation.id
      });
    } catch (error) {
      console.error("Error processing Epesi Agent chat:", error);
      
      // Provide more specific error messages
      if (error.message?.includes("Unauthorized")) {
        return res.status(401).json({ message: "Authentication required" });
      } else if (error.message?.includes("not found")) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      res.status(500).json({ message: "Failed to process your request" });
    }
  });

  // AI-first Dashboard Builder Routes
  app.get("/api/dashboards/:id/blocks", isAuthenticated, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const blocks = await storage.getBlocksByDashboard(dashboardId);
      res.json(blocks);
    } catch (error) {
      console.error("Error fetching blocks:", error);
      res.status(500).json({ message: "Failed to fetch blocks" });
    }
  });

  app.post("/api/dashboards/:id/blocks", isAuthenticated, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const { title, description, type, size, content, position } = req.body;
      const userId = req.user.id;
      
      // Generate unique block ID
      const blockId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // If no position provided, add to top (position 0) and shift others down
      let blockPosition = position;
      if (blockPosition === undefined) {
        const existingBlocks = await storage.getBlocksByDashboard(dashboardId);
        blockPosition = 0;
        
        // Shift existing blocks down by 1 position
        for (const existingBlock of existingBlocks) {
          await storage.updateBlock(existingBlock.id, { 
            position: existingBlock.position + 1 
          });
        }
      }
      
      const block = await storage.createBlock({
        id: blockId,
        dashboardId,
        title: title || "New Block",
        description: description || "",
        type: type || "ai",
        size: size || 4,
        content: content || {},
        position: blockPosition,
        createdById: userId
      });
      
      res.json(block);
    } catch (error) {
      console.error("Error creating block:", error);
      res.status(500).json({ message: "Failed to create block" });
    }
  });

  app.put("/api/blocks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const blockId = req.params.id;
      const updates = req.body;
      
      const updatedBlock = await storage.updateBlock(blockId, updates);
      
      if (!updatedBlock) {
        return res.status(404).json({ message: "Block not found" });
      }
      
      res.json(updatedBlock);
    } catch (error) {
      console.error("Error updating block:", error);
      res.status(500).json({ message: "Failed to update block" });
    }
  });

  app.delete("/api/blocks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const blockId = req.params.id;
      await storage.deleteBlock(blockId);
      res.json({ message: "Block deleted successfully" });
    } catch (error) {
      console.error("Error deleting block:", error);
      res.status(500).json({ message: "Failed to delete block" });
    }
  });

  app.put("/api/dashboards/:id/blocks/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const { blockOrder } = req.body;
      
      await storage.reorderBlocks(dashboardId, blockOrder);
      res.json({ message: "Blocks reordered successfully" });
    } catch (error) {
      console.error("Error reordering blocks:", error);
      res.status(500).json({ message: "Failed to reorder blocks" });
    }
  });

  // AI Chart Generation Route
  app.post("/api/ai/generate-chart", isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, blockId, dashboardId, chatHistory } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      // Import OpenAI functions
      const { generateChart } = await import('./openai');
      
      // Generate chart using OpenAI with chat history context
      const chartConfig = await generateChart({
        prompt,
        chartType: "auto", // Let AI decide the best chart type
        context: "Dashboard chart generation",
        chatHistory: chatHistory || []
      });
      
      res.json(chartConfig);
    } catch (error) {
      console.error("Error generating chart:", error);
      res.status(500).json({ message: "Failed to generate chart" });
    }
  });

  // AI Synthetic Data Generation Route
  app.post("/api/ai/generate-synthetic-data", isAuthenticated, async (req: any, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      // Import OpenAI functions
      const { generateSyntheticData } = await import('./openai');
      
      // Generate synthetic data using OpenAI
      const syntheticData = await generateSyntheticData(prompt);
      
      res.json(syntheticData);
    } catch (error) {
      console.error("Error generating synthetic data:", error);
      res.status(500).json({ message: "Failed to generate synthetic data" });
    }
  });

  // AI Smart Insights Generation Route
  app.post("/api/ai/generate-insights", isAuthenticated, async (req: any, res) => {
    try {
      const { dashboardId, count = 3 } = req.body;
      
      if (!dashboardId) {
        return res.status(400).json({ 
          success: false, 
          message: "Dashboard ID is required" 
        });
      }

      // Validate count
      const insightCount = Math.min(Math.max(parseInt(count), 1), 8);

      // Check if the dashboard exists
      const dashboard = await storage.getDashboard(dashboardId);
      
      if (!dashboard) {
        return res.status(404).json({ 
          success: false, 
          message: "Dashboard not found" 
        });
      }

      // Get existing data sources for this dashboard
      // First try to get by organization, then fallback to all data sources
      console.log('Dashboard:', dashboard);
      let dataSources = await storage.getDataSourcesByOrganization(dashboard.organizationId || 1);
      console.log('Data sources found:', dataSources?.length || 0);
      
      // If no data sources found by organization, get all data sources as fallback
      if (!dataSources || dataSources.length === 0) {
        const allDataSources = await storage.getDataSourcesByOrganization(1); // Default org
        dataSources = allDataSources;
        console.log('Fallback data sources found:', dataSources?.length || 0);
      }
      
      if (!dataSources || dataSources.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No data sources found. Add data sources first to generate insights." 
        });
      }

      // Get existing blocks to avoid duplicate insights
      const existingBlocks = await storage.getBlocksByDashboard(dashboardId);
      const existingQuestions = existingBlocks
        .filter(block => block.title && block.title !== 'Untitled Block')
        .map(block => block.title);

      // Prepare data context for AI - sample from first available data source
      let dataContext = "";
      let sampleData = "";
      
      console.log('Processing data sources for insights:', dataSources);
      
      for (const dataSource of dataSources.slice(0, 2)) { // Limit to first 2 data sources
        try {
          console.log(`Processing data source: ${dataSource.name}`, dataSource.content);
          
          if (dataSource.content && typeof dataSource.content === 'object') {
            const contentArray = Array.isArray(dataSource.content) ? dataSource.content : [dataSource.content];
            if (contentArray.length > 0) {
              // Take sample of first few records
              const sample = contentArray.slice(0, 5);
              sampleData += `\n--- Data Source: ${dataSource.name} ---\n`;
              sampleData += JSON.stringify(sample, null, 2);
              
              // Extract field information
              const fields = Object.keys(contentArray[0] || {});
              dataContext += `\nData Source "${dataSource.name}": ${fields.join(', ')} (${contentArray.length} records)`;
            }
          }
        } catch (error) {
          console.error('Error processing data source:', error);
        }
      }
      
      console.log('Data context:', dataContext);
      console.log('Sample data:', sampleData);
      
      // If no data context found, create sample data to generate insights
      if (!dataContext.trim()) {
        dataContext = "\nData Source \"Sample Sales Data\": product_name, sales_value, quarter, region, sales_rep (100 records)";
        sampleData = `\n--- Data Source: Sample Sales Data ---\n${JSON.stringify([
          { product_name: "Product A", sales_value: 15000, quarter: "Q1", region: "North", sales_rep: "John Smith" },
          { product_name: "Product B", sales_value: 22000, quarter: "Q1", region: "South", sales_rep: "Emily Johnson" },
          { product_name: "Product C", sales_value: 18000, quarter: "Q2", region: "East", sales_rep: "Michael Williams" },
          { product_name: "Product A", sales_value: 25000, quarter: "Q2", region: "West", sales_rep: "Jessica Brown" },
          { product_name: "Product B", sales_value: 31000, quarter: "Q3", region: "North", sales_rep: "David Jones" }
        ], null, 2)}`;
      }

      // Build context about existing insights to avoid duplicates
      let existingInsightsContext = "";
      if (existingQuestions.length > 0) {
        existingInsightsContext = `\nEXISTING INSIGHTS TO AVOID DUPLICATING:\n${existingQuestions.map(q => `- ${q}`).join('\n')}`;
      }

      // Generate insights using OpenAI
      const { generateSmartInsights } = await import('./openai');
      
      const insights = await generateSmartInsights({
        insightCount,
        dataContext,
        sampleData,
        existingInsightsContext
      });

      // Add metadata to each insight and generate multiple insights per chart
      const { generateInsights } = await import('./openai');
      
      const enrichedInsights = await Promise.all(insights.map(async (insight: any, index: number) => {
        // Generate multiple insights for each chart using the same function as AI Assistant
        const chartData = insight.chart_payload.datasets?.[0]?.data || [];
        console.log(`Generating insights for insight ${index + 1}: ${insight.question}`);
        console.log(`Chart data:`, chartData);
        
        const chartInsights = await generateInsights(chartData, insight.question);
        console.log(`Generated ${chartInsights.length} insights:`, chartInsights);
        
        return {
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          question: insight.question,
          description: insight.description,
          chart_type: insight.chart_type,
          insight_category: insight.insight_category,
          chart_payload: insight.chart_payload,
          insights: chartInsights.length > 0 ? chartInsights : [insight.description],
          created_at: new Date().toISOString()
        };
      }));
      
      res.json({
        success: true,
        data: { insights: enrichedInsights },
        count: enrichedInsights.length,
        message: `Generated ${enrichedInsights.length} smart insights with charts`
      });
    } catch (error) {
      console.error("Error generating smart insights:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to generate insights" 
      });
    }
  });

  // AI Insights Generation Route (legacy endpoint)
  app.post("/api/blocks/:id/generate-insights", isAuthenticated, async (req: any, res) => {
    try {
      const blockId = req.params.id;
      const { data, prompt } = req.body;
      
      if (!data) {
        return res.status(400).json({ message: "Data is required" });
      }
      
      const { generateInsights } = await import('./openai');
      
      const insights = await generateInsights(data, prompt);
      
      // Update the block with insights
      const updatedBlock = await storage.updateBlock(blockId, {
        content: { insights },
        type: "insights"
      });
      
      res.json(updatedBlock);
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // AI SQL Query Generation Route
  app.post("/api/generate-sql", isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, schema } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      const { generateSQLQuery } = await import('./openai');
      
      const sqlQuery = await generateSQLQuery(prompt, schema);
      
      res.json({ sql: sqlQuery });
    } catch (error) {
      console.error("Error generating SQL:", error);
      res.status(500).json({ message: "Failed to generate SQL query" });
    }
  });

  // Data Source Analysis Route
  app.post("/api/data-sources/:id/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const dataSourceId = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(dataSourceId);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      const { analyzeDataSource } = await import('./openai');
      
      const analysis = await analyzeDataSource(dataSource);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing data source:", error);
      res.status(500).json({ message: "Failed to analyze data source" });
    }
  });

  // Epesi Agent Conversation Management Routes
  app.get('/api/dashboards/:dashboardId/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.dashboardId);
      const conversations = await storage.getEpesiConversations(dashboardId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Fallback route for conversations
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.query.dashboardId as string);
      if (!dashboardId) {
        return res.status(400).json({ message: "Dashboard ID is required" });
      }
      const conversations = await storage.getEpesiConversations(dashboardId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/dashboards/:dashboardId/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const dashboardId = parseInt(req.params.dashboardId);
      const { title } = req.body;
      const userId = req.user.id;
      
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const conversation = await storage.createEpesiConversation({
        id: conversationId,
        dashboardId,
        title: title || "New Conversation",
        createdById: userId
      });
      
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.conversationId;
      const messages = await storage.getEpesiMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.delete('/api/conversations/:conversationId', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.conversationId;
      await storage.deleteEpesiConversation(conversationId);
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Broadcast updates to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
