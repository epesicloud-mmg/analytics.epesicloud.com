import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import CreateDashboardModal from "@/components/create-dashboard-modal";
import FileUploadModal from "@/components/file-upload-modal";
import InviteTeamModal from "@/components/invite-team-modal";
import EditProjectModal from "@/components/edit-project-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BarChart3, Database, Settings, Users, Calendar, Activity, Edit, Eye, Grid3X3, List } from "lucide-react";
import { Link } from "wouter";
import type { Organization, Project, Dashboard } from "@shared/schema";

export default function ProjectDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isCreateDashboardOpen, setIsCreateDashboardOpen] = useState(false);
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);
  const [isInviteTeamOpen, setIsInviteTeamOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [dashboardView, setDashboardView] = useState<'grid' | 'list'>('grid');

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

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: [`/api/projects/${id}`],
    enabled: !!id,
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

  const { data: dashboards, isLoading: dashboardsLoading } = useQuery({
    queryKey: ["/api/dashboards", { projectId: id }],
    enabled: !!id,
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

  // Update dashboard access time
  const updateDashboardAccessMutation = useMutation({
    mutationFn: async (dashboardId: number) => {
      await apiRequest(`/api/dashboards/${dashboardId}/access`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
    },
  });

  const updateDashboardAccess = (dashboardId: number) => {
    updateDashboardAccessMutation.mutate(dashboardId);
  };

  // Set first organization as selected when organizations load
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrganization) {
      setSelectedOrganization(organizations[0]);
    }
  }, [organizations, selectedOrganization]);

  if (isLoading || organizationsLoading || projectLoading) {
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

  if (!project) {
    return (
      <div className="flex h-screen">
        <Sidebar organizations={organizations || []} selectedOrganization={selectedOrganization} onOrganizationChange={setSelectedOrganization} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600">The project you're looking for doesn't exist or you don't have access to it.</p>
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
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${project.color}20` }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                ></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-500">{project.description}</p>
              </div>
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setIsInviteTeamOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Invite Team
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setIsCreateDashboardOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Dashboard
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="dashboards" className="space-y-6">
            <TabsList>
              <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
              <TabsTrigger value="project-info">Project Info</TabsTrigger>
              <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboards">
              <div className="space-y-6">
                {/* Dashboard Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-semibold">Dashboards</h2>
                    <Badge variant="outline">{dashboards?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={dashboardView === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDashboardView('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={dashboardView === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDashboardView('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Dashboard Grid/List View */}
                {dashboardsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : dashboards && dashboards.length > 0 ? (
                  <div className={dashboardView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                    {dashboards
                      .sort((a: Dashboard, b: Dashboard) => {
                        const aTime = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
                        const bTime = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
                        return bTime - aTime;
                      })
                      .map((dashboard: Dashboard) => (
                        <Card key={dashboard.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-medium">{dashboard.name}</CardTitle>
                              <div className="flex items-center space-x-2">
                                {dashboard.isPublic && (
                                  <Badge variant="outline" className="text-xs">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Public
                                  </Badge>
                                )}
                                <Link to={`/dashboard-builder/${dashboard.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateDashboardAccess(dashboard.id)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                            {dashboard.description && (
                              <CardDescription>{dashboard.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {dashboard.lastAccessedAt
                                    ? `Last accessed ${new Date(dashboard.lastAccessedAt).toLocaleDateString()}`
                                    : 'Never accessed'
                                  }
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Activity className="h-4 w-4" />
                                <span>Active</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <BarChart3 className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No dashboards yet</h3>
                    <p className="text-gray-600 mb-6">
                      Create your first dashboard to start building analytics.
                    </p>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => setIsCreateDashboardOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Dashboard
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="project-info">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Project Information</h2>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditProjectOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Project
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-lg font-medium">{project.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p className="text-sm text-gray-700">{project.description || 'No description provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="flex items-center space-x-2">
                          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Color</label>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="text-sm">{project.color}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Project Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Total Dashboards</span>
                        </div>
                        <span className="font-medium">{dashboards?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Eye className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Public Dashboards</span>
                        </div>
                        <span className="font-medium">{dashboards?.filter((d: Dashboard) => d.isPublic).length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Data Sources</span>
                        </div>
                        <span className="font-medium">0</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Team Members</span>
                        </div>
                        <span className="font-medium">1</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data-sources">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Data Sources</h2>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => setIsDataSourceOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Data Source
                  </Button>
                </div>

                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Database className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No data sources yet</h3>
                  <p className="text-gray-600 mb-6">
                    Upload CSV files or connect to external data sources to get started.
                  </p>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => setIsDataSourceOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Data
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Team Members</h2>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => setIsInviteTeamOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </div>

                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Just you for now</h3>
                  <p className="text-gray-600 mb-6">
                    Invite team members to collaborate on this project.
                  </p>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => setIsInviteTeamOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Team
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Modals */}
      <CreateDashboardModal
        isOpen={isCreateDashboardOpen}
        onClose={() => setIsCreateDashboardOpen(false)}
        projectId={Number(id)}
      />
      <FileUploadModal
        isOpen={isDataSourceOpen}
        onClose={() => setIsDataSourceOpen(false)}
        organizationId={selectedOrganization?.id}
      />
      <InviteTeamModal
        isOpen={isInviteTeamOpen}
        onClose={() => setIsInviteTeamOpen(false)}
        projectId={Number(id)}
      />
      {project && (
        <EditProjectModal
          isOpen={isEditProjectOpen}
          onClose={() => setIsEditProjectOpen(false)}
          project={project}
        />
      )}
    </div>
  );
}