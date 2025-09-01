import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import StatsCard from "@/components/stats-card";
import ProjectCard from "@/components/project-card";
import CreateProjectModal from "@/components/create-project-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Bell, Filter } from "lucide-react";
import type { Organization, Project } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: organizations, isLoading: organizationsLoading } = useQuery({
    queryKey: ["/api/organizations"],
    enabled: isAuthenticated,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects", { organizationId: selectedOrganization?.id }],
    enabled: !!selectedOrganization?.id,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats/overview", { organizationId: selectedOrganization?.id }],
    enabled: !!selectedOrganization?.id,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  // Set first organization as selected when organizations load
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrganization) {
      setSelectedOrganization(organizations[0]);
    }
  }, [organizations, selectedOrganization]);

  const filteredProjects = (projects || []).filter((project: Project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading || organizationsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar organizations={organizations || []} selectedOrganization={selectedOrganization} onOrganizationChange={setSelectedOrganization} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Projects Overview</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              
              {/* Notifications */}
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              
              {/* Create Project */}
              <Button onClick={() => setIsCreateProjectOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Active Projects"
              value={stats?.activeProjects || 0}
              change="+12%"
              icon="folder"
              color="indigo"
            />
            <StatsCard
              title="Dashboards"
              value={stats?.totalDashboards || 0}
              change="+28%"
              icon="chart"
              color="emerald"
            />
            <StatsCard
              title="Data Sources"
              value={stats?.dataSources || 0}
              change="+8%"
              icon="database"
              color="amber"
            />
            <StatsCard
              title="Team Members"
              value={stats?.teamMembers || 0}
              change="+15%"
              icon="users"
              color="rose"
            />
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={statusFilter === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className="text-sm"
                  >
                    All Projects
                  </Button>
                  <Button
                    variant={statusFilter === "active" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("active")}
                    className="text-sm"
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === "archived" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter("archived")}
                    className="text-sm"
                  >
                    Archived
                  </Button>
                </div>
                
                <Select defaultValue="recent">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Sort by: Recent</SelectItem>
                    <SelectItem value="name">Sort by: Name</SelectItem>
                    <SelectItem value="status">Sort by: Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects?.map((project: Project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            
            {/* Create Project Card */}
            <div 
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer"
              onClick={() => setIsCreateProjectOpen(true)}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Project</h3>
                <p className="text-gray-600 mb-4">Start building your analytics dashboard with our drag-and-drop builder.</p>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredProjects?.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filters, or create a new project.</p>
              <Button onClick={() => setIsCreateProjectOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </main>
      </div>

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        organizationId={selectedOrganization?.id}
      />
    </div>
  );
}
