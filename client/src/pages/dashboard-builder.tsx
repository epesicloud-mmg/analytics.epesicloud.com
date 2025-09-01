import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DraggableToolbar from "@/components/draggable-toolbar";
import AIBlock from "@/components/ai-block";
import DataSourceModal from "@/components/data-source-modal";
import SmartInsightsModal from "@/components/smart-insights-modal";
import EpesiAgentModal from "@/components/epesi-agent-modal";
import { 
  ArrowLeft, 
  Sparkles, 
  BarChart3, 
  FileText, 
  Target, 
  Table, 
  Database, 
  Plus,
  Eye,
  Trash2,
  Edit3,
  X,
  TrendingUp,
  PieChart,
  LineChart,
  Activity,
  Share,
  Save
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Dashboard, Block, DataSource } from "@shared/schema";

export default function DashboardBuilder() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [showSmartInsightsModal, setShowSmartInsightsModal] = useState(false);
  const [showEpesiAgentModal, setShowEpesiAgentModal] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Authentication check
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

  // Data queries
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: [`/api/dashboards/${id}`],
    enabled: !!id && isAuthenticated,
  });

  const { data: blocksData, isLoading: blocksLoading } = useQuery({
    queryKey: [`/api/dashboards/${id}/blocks`],
    enabled: !!id && isAuthenticated,
  });

  const { data: dataSources, isLoading: dataSourcesLoading } = useQuery({
    queryKey: ["/api/data-sources", { organizationId: 1 }],
    enabled: isAuthenticated,
  });

  // Update blocks when data changes
  useEffect(() => {
    if (blocksData) {
      setBlocks(blocksData);
    }
  }, [blocksData]);

  // Mutations
  const createBlockMutation = useMutation({
    mutationFn: async (blockData: any) => {
      const response = await apiRequest("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blockData),
      });
      return response.json();
    },
    onSuccess: (newBlock) => {
      setBlocks(prev => [...prev, newBlock]);
      // Don't invalidate queries to prevent re-ordering - we already have the new block
      toast({
        title: "Success",
        description: "Block created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ blockId, updates }: { blockId: string, updates: Partial<Block> }) => {
      const response = await apiRequest(`/api/blocks/${blockId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return response.json();
    },
    onSuccess: (updatedBlock) => {
      setBlocks(prev => prev.map(block => 
        block.id === updatedBlock.id ? updatedBlock : block
      ));
      // Don't invalidate queries to prevent re-ordering - we already have the updated block
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      await apiRequest(`/api/blocks/${blockId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, blockId) => {
      setBlocks(prev => prev.filter(block => block.id !== blockId));
      // Don't invalidate queries to prevent re-ordering - we already removed the block
      toast({
        title: "Success",
        description: "Block deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreateBlock = (type: string) => {
    const blockId = `block_${Date.now()}`;
    const newBlock = {
      id: blockId,
      dashboardId: Number(id),
      title: type === 'ai' ? 'AI Assistant' : `New ${type} Block`,
      description: type === 'ai' ? 'Ask AI to generate charts and insights' : `A new ${type} block for your dashboard`,
      type: type,
      size: 4,
      content: {},
      position: blocks.length,
    };
    
    createBlockMutation.mutate(newBlock);
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    updateBlockMutation.mutate({ blockId, updates });
  };

  const handleDeleteBlock = (blockId: string) => {
    deleteBlockMutation.mutate(blockId);
  };

  // Toolbar handlers
  const handleInfoClick = () => {
    toast({
      title: "Dashboard Info",
      description: `${dashboard?.name} - ${blocks.length} blocks`,
    });
  };

  const handleAIClick = () => {
    handleCreateBlock('ai');
  };

  const handleTextClick = () => {
    handleCreateBlock('text');
  };

  const handleChartClick = () => {
    handleCreateBlock('chart');
  };

  const handleInsightsClick = () => {
    setShowSmartInsightsModal(true);
  };

  const handleDataClick = () => {
    setShowDataSourceModal(true);
  };

  const handleAgentClick = () => {
    setShowEpesiAgentModal(true);
  };

  const handlePreviewClick = () => {
    window.open(`/dashboard-preview/${id}`, '_blank');
  };

  const handleShareClick = () => {
    toast({
      title: "Share Dashboard",
      description: "Share functionality coming soon",
    });
  };

  const handleSaveClick = () => {
    toast({
      title: "Saved",
      description: "Dashboard saved successfully",
    });
  };

  // Loading states
  if (isLoading || dashboardLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Not Found</h2>
          <p className="text-gray-600">The dashboard you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to={`/project/${dashboard.projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{dashboard.name}</h1>
              <p className="text-sm text-gray-500">{dashboard.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {blocks.length === 0 ? (
          <div className="text-center py-24">
            <div className="max-w-md mx-auto">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Building Your Dashboard</h3>
              <p className="text-gray-600 mb-8">Use the floating toolbar below to add blocks and create visualizations</p>
              
              <div className="grid grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleAIClick}>
                  <CardContent className="p-6 text-center">
                    <Sparkles className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">AI Assistant</h4>
                    <p className="text-sm text-gray-600">Ask AI to generate charts</p>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleTextClick}>
                  <CardContent className="p-6 text-center">
                    <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Text Block</h4>
                    <p className="text-sm text-gray-600">Add notes and insights</p>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleChartClick}>
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Chart Block</h4>
                    <p className="text-sm text-gray-600">Analyze data visually</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 pb-32">
            {blocks.map((block) => {
              const getColSpan = (size: number) => {
                switch (size) {
                  case 3: return 'col-span-3';
                  case 4: return 'col-span-4';
                  case 6: return 'col-span-6';
                  case 8: return 'col-span-8';
                  case 12: return 'col-span-12';
                  default: return 'col-span-4';
                }
              };
              
              return (
              <div key={block.id} className={getColSpan(block.size || 4)}>
                {block.type === 'ai' ? (
                  <AIBlock
                    block={block}
                    onDelete={handleDeleteBlock}
                    onUpdate={handleUpdateBlock}
                  />
                ) : (
                  <Card className="h-full group relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{block.title}</CardTitle>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteBlock(block.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {block.description && (
                        <p className="text-sm text-gray-600">{block.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center">
                        {block.type === 'chart' && <BarChart3 className="h-12 w-12 text-gray-400" />}
                        {block.type === 'text' && <FileText className="h-12 w-12 text-gray-400" />}
                        {block.type === 'metric' && <Target className="h-12 w-12 text-gray-400" />}
                        {block.type === 'table' && <Table className="h-12 w-12 text-gray-400" />}
                        {block.type === 'pie' && <PieChart className="h-12 w-12 text-gray-400" />}
                        {block.type === 'line' && <LineChart className="h-12 w-12 text-gray-400" />}
                        {block.type === 'activity' && <Activity className="h-12 w-12 text-gray-400" />}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Draggable Floating Toolbar */}
      <DraggableToolbar
        onInfoClick={handleInfoClick}
        onAIClick={handleAIClick}
        onTextClick={handleTextClick}
        onChartClick={handleChartClick}
        onInsightsClick={handleInsightsClick}
        onDataClick={handleDataClick}
        onAgentClick={handleAgentClick}
        onPreviewClick={handlePreviewClick}
        onShareClick={handleShareClick}
        onSaveClick={handleSaveClick}
      />

      {/* Data Source Modal */}
      <DataSourceModal
        isOpen={showDataSourceModal}
        onClose={() => setShowDataSourceModal(false)}
      />

      {/* Smart Insights Modal */}
      <SmartInsightsModal
        isOpen={showSmartInsightsModal}
        onClose={() => setShowSmartInsightsModal(false)}
        dashboardId={Number(id)}
        onInsightSaved={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/dashboards/${id}/blocks`] });
          setShowSmartInsightsModal(false);
        }}
      />

      {/* Epesi Agent Modal */}
      <EpesiAgentModal
        isOpen={showEpesiAgentModal}
        onClose={() => setShowEpesiAgentModal(false)}
        dashboardId={Number(id)}
        onBlockAdded={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/dashboards/${id}/blocks`] });
        }}
      />
    </div>
  );
}