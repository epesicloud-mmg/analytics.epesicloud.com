# EpesiAI Analytics Platform

## Overview

EpesiAI is a modern analytics platform built with React frontend and Express backend, enabling users to create data visualizations, manage projects, and build interactive dashboards. The application uses a PostgreSQL database with Drizzle ORM for data management and integrates with Replit's authentication system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OIDC integration with passport.js
- **Session Management**: Express sessions with PostgreSQL storage
- **File Uploads**: Multer for handling file uploads

## Key Components

### Database Schema
- **Users**: Stores user information integrated with Replit auth
- **Organizations**: Multi-tenant workspace system
- **Projects**: Container for analytics projects within organizations
- **Dashboards**: Visual dashboard configurations
- **Data Sources**: File-based data imports and external connections
- **Dashboard Components**: Individual visualization components

### Authentication System
- Uses Replit's OIDC for user authentication
- Session-based authentication with PostgreSQL session store
- Multi-organization support with role-based access

### File Management
- CSV, Excel, JSON, and TSV file upload support
- 10MB file size limit
- Temporary file storage in uploads directory
- Data parsing and validation for imported files

### UI Components
- Comprehensive shadcn/ui component library
- Custom components for project management, dashboards, and data visualization
- Responsive design with mobile support
- Modal-based workflows for creating projects and dashboards

## Data Flow

1. **User Authentication**: Users authenticate via Replit OIDC
2. **Organization Selection**: Users select or create organizations
3. **Project Management**: Users create projects within organizations
4. **Dashboard Creation**: Users build dashboards with various components
5. **Data Import**: Users upload files to create data sources
6. **Visualization**: Dashboard components connect to data sources for visualization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **passport**: Authentication middleware
- **multer**: File upload handling

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking
- **tailwindcss**: Utility-first CSS framework
- **esbuild**: JavaScript bundler for production

## Deployment Strategy

### Development Environment
- Uses Vite dev server for frontend hot reloading
- Express server runs on Node.js with tsx for TypeScript execution
- Development-specific plugins including runtime error overlay

### Production Build
- Frontend: Vite builds optimized React application
- Backend: esbuild bundles Express server for production
- Static assets served from dist/public directory
- Environment variables for database and session configuration

### Database Management
- Drizzle Kit for schema migrations
- PostgreSQL connection via environment variables
- Session storage in dedicated sessions table
- Automatic schema synchronization with `db:push` command

### Security Considerations
- HTTPS-only session cookies in production
- CSRF protection through session-based authentication
- Rate limiting capabilities (configured but not actively used)
- Input validation using Zod schemas
- File upload restrictions and validation

## Recent Changes: Latest modifications with dates

### July 13, 2025 - Epesi Agent: Conversational AI Assistant Implementation
- **Added Epesi Agent button** to dashboard builder floating toolbar with purple Bot icon
- **Implemented resizable off-canvas chat** - Draggable left edge to resize window (400px-800px)
- **Conversational AI interface** - Chat-style UI with user/assistant message bubbles
- **Smart response system** - Handles greetings normally, generates 4 charts for data analysis
- **Multiple chart generation** - Bar, line, pie charts with proper colors and insights
- **Add as Block functionality** - One-click to add any generated chart to dashboard
- **Professional chat design** - Clean interface with proper loading states and scrolling
- **Backend API integration** - New /api/epesi-agent/chat endpoint with OpenAI integration
- **Enhanced chart rendering** - Uses Recharts with proper responsive containers
- **Comprehensive error handling** - User-friendly error messages and fallback states
- **Fixed API request handling** - Proper JSON body formatting and Content-Type headers
- **Improved block positioning** - New blocks from Epesi Agent added at top with consistent 4-column sizing

### July 13, 2025 - AI Block Chat History Feature & Critical Chart Conversion Fix
- **Added chat history functionality** for AI blocks with persistent storage
- **Implemented block-specific history** - each AI block maintains its own question history
- **Added history icon with count badge** showing number of previous questions per block
- **One-click chart loading** from history - click any previous question to instantly load that chart
- **Database schema updates** with new `block_chat_history` table for storing questions and chart data
- **API endpoints** for creating, retrieving, and managing chat history per block
- **Visual indicators** showing chart type icons for each history item
- **Auto-save functionality** - every AI-generated chart is automatically saved to history
- **CRITICAL FIX: Enhanced AI chart conversion intelligence** - AI now preserves exact data structure during chart type conversions
- **Fixed vibrant chart colors** - All charts now display in beautiful colors instead of black/white
- **Added dynamic color support** - AI can change chart colors based on user requests (red, green, purple, etc.)
- **Improved data preservation** - Converting bar→line, line→pie, pie→bar maintains original labels and values

### December 12, 2024 - Major Dashboard Builder Redesign
- **Complete rebuild of dashboard builder interface** based on user's original design reference
- **Implemented floating toolbar** replacing sidebar for better UX and space utilization
- **Added off-canvas data source management** with intuitive slide-out panel
- **Enhanced AI assistant integration** with expandable prompt interface
- **Improved block creation workflow** with visual component selection
- **Added comprehensive data source creation** with multiple input methods (manual, file upload, synthetic data)
- **Implemented responsive grid layout** for dashboard blocks with proper sizing
- **Added block management controls** with hover actions and inline editing
- **Enhanced authentication flow** with proper error handling and redirects
- **Fixed API client architecture** with corrected request signatures for all operations