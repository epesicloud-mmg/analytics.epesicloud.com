import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Settings, 
  BarChart3, 
  Table, 
  Target, 
  Plus, 
  Grid3X3, 
  Zap, 
  Trash2, 
  GripVertical, 
  Database,
  Sparkles,
  Play,
  RotateCcw,
  FileText,
  PieChart,
  TrendingUp,
  Search,
  X,
  Edit,
  ChevronDown,
  ChevronUp,
  Copy,
  Move,
  Maximize,
  Minimize,
  RefreshCw,
  Share,
  Code,
  Monitor,
  Smartphone,
  Tablet,
  Filter,
  SortAsc,
  Calendar,
  Clock,
  User,
  Tag,
  Bookmark,
  Star,
  Heart,
  MessageCircle,
  Bell,
  Mail,
  Phone,
  MapPin,
  Globe,
  Link as LinkIcon,
  Image,
  Video,
  Music,
  File,
  Folder,
  Archive,
  Trash,
  Cloud,
  HardDrive,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Volume,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  Moon,
  Sun,
  CloudRain,
  CloudSnow,
  Thermometer,
  Wind,
  Compass,
  Navigation,
  Anchor,
  Plane,
  Train,
  Car,
  Bike,
  Truck,
  Ship,
  Rocket,
  Gamepad2,
  Headphones,
  Keyboard,
  Mouse,
  Printer
} from "lucide-react";
import { Link } from "wouter";
import type { Dashboard, Block } from "@shared/schema";

interface DashboardBuilderProps {
  dashboard?: Dashboard;
  blocks?: Block[];
}

export default function DashboardBuilder() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // Early return for authentication check
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

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: [`/api/dashboards/${id}`],
    enabled: !!id && isAuthenticated,
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

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: [`/api/dashboards/${id}/blocks`],
    enabled: !!id && isAuthenticated,
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

  const { data: dataSources, isLoading: dataSourcesLoading } = useQuery({
    queryKey: ["/api/data-sources", { organizationId: 1 }],
    enabled: isAuthenticated,
    onError: (error) => {
      console.error("Error loading data sources:", error);
    },
  });

  const createBlockMutation = useMutation({
    mutationFn: async (blockData: any) => {
      const response = await apiRequest("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blockData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboards/${id}/blocks`] });
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
    mutationFn: async ({ id: blockId, ...updates }: any) => {
      const response = await apiRequest(`/api/blocks/${blockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboards/${id}/blocks`] });
      toast({
        title: "Success",
        description: "Block updated successfully",
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

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      await apiRequest(`/api/blocks/${blockId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboards/${id}/blocks`] });
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

  const generateAIBlockMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("/api/ai/generate-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          dashboardId: Number(id),
          dataSources: dataSources || []
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboards/${id}/blocks`] });
      setAiPrompt("");
      toast({
        title: "Success",
        description: "AI block generated successfully",
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

  const handleCreateBlock = (type: string) => {
    const blockId = `block_${Date.now()}`;
    const newBlock = {
      id: blockId,
      dashboardId: Number(id),
      title: `New ${type} Block`,
      description: `A new ${type} block for your dashboard`,
      type: type,
      size: 4,
      content: {},
      position: blocks?.length || 0,
    };
    
    createBlockMutation.mutate(newBlock);
  };

  const handleGenerateAIBlock = () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for the AI block",
        variant: "destructive",
      });
      return;
    }
    generateAIBlockMutation.mutate(aiPrompt);
  };

  const handleDeleteBlock = (blockId: string) => {
    deleteBlockMutation.mutate(blockId);
    setSelectedBlock(null);
  };

  // Loading states
  if (isLoading || dashboardLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Not Found</h2>
          <p className="text-gray-600">The dashboard you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <Link to={`/project/${dashboard.projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
            </Link>
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
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{dashboard.name}</h1>
            <p className="text-sm text-gray-500">{dashboard.description}</p>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
          </div>
          <div className="space-y-3">
            <Textarea
              placeholder="Describe the chart or component you want to create..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={handleGenerateAIBlock}
              disabled={generateAIBlockMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {generateAIBlockMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Block Types */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Add Components</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => handleCreateBlock("chart")}
              className="flex flex-col items-center space-y-2 h-auto py-3"
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-xs">Chart</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateBlock("table")}
              className="flex flex-col items-center space-y-2 h-auto py-3"
            >
              <Table className="h-6 w-6" />
              <span className="text-xs">Table</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateBlock("metric")}
              className="flex flex-col items-center space-y-2 h-auto py-3"
            >
              <Target className="h-6 w-6" />
              <span className="text-xs">Metric</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateBlock("text")}
              className="flex flex-col items-center space-y-2 h-auto py-3"
            >
              <FileText className="h-6 w-6" />
              <span className="text-xs">Text</span>
            </Button>
          </div>
        </div>

        {/* Data Sources */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Data Sources</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsDataSourceOpen(!isDataSourceOpen)}>
              {isDataSourceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {isDataSourceOpen && (
            <div className="space-y-2">
              {dataSourcesLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-xs text-gray-500">Loading data sources...</p>
                </div>
              ) : dataSources && dataSources.length > 0 ? (
                dataSources.map((source: any) => (
                  <div key={source.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <Database className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{source.name}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Database className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No data sources available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Block List */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Dashboard Blocks</h2>
          {blocksLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading blocks...</p>
            </div>
          ) : blocks && blocks.length > 0 ? (
            <div className="space-y-2">
              {blocks.map((block: Block) => (
                <Card 
                  key={block.id} 
                  className={`cursor-pointer transition-all ${
                    selectedBlock?.id === block.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedBlock(block)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{block.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {block.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-500 mb-2">{block.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Size: {block.size} cols</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBlock(block.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Grid3X3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No blocks yet</p>
              <p className="text-xs text-gray-500">Add components to start building your dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">Dashboard Canvas</h2>
              <Badge variant="outline">{blocks?.length || 0} blocks</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                Desktop
              </Button>
              <Button variant="outline" size="sm">
                <Tablet className="h-4 w-4 mr-2" />
                Tablet
              </Button>
              <Button variant="outline" size="sm">
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Canvas */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg border border-gray-200 min-h-[calc(100vh-200px)] p-6">
            {blocks && blocks.length > 0 ? (
              <div className="grid grid-cols-12 gap-6">
                {blocks.map((block: Block) => (
                  <div
                    key={block.id}
                    className={`col-span-${block.size} bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-4 min-h-[200px] flex flex-col items-center justify-center transition-all ${
                      selectedBlock?.id === block.id ? 'border-indigo-500 bg-indigo-50' : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedBlock(block)}
                  >
                    <div className="text-center">
                      {block.type === 'chart' && <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />}
                      {block.type === 'table' && <Table className="h-12 w-12 text-gray-400 mx-auto mb-2" />}
                      {block.type === 'metric' && <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />}
                      {block.type === 'text' && <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />}
                      {block.type === 'ai' && <Sparkles className="h-12 w-12 text-indigo-400 mx-auto mb-2" />}
                      <h3 className="font-medium text-gray-900 mb-1">{block.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{block.description}</p>
                      <Badge variant="outline" className="text-xs">
                        {block.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Plus className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Building Your Dashboard</h3>
                <p className="text-gray-600 mb-6">
                  Use the AI assistant or add components from the left panel to create your dashboard.
                </p>
                <div className="flex justify-center space-x-4">
                  <Badge variant="secondary">
                    <Zap className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                  <Badge variant="secondary">
                    <Eye className="h-3 w-3 mr-1" />
                    Real-time
                  </Badge>
                  <Badge variant="secondary">
                    <Grid3X3 className="h-3 w-3 mr-1" />
                    Responsive
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Block Properties Sheet */}
      <Sheet open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
        <SheetContent className="w-80">
          <SheetHeader>
            <SheetTitle>Block Properties</SheetTitle>
            <SheetDescription>
              Configure the selected block's properties and settings.
            </SheetDescription>
          </SheetHeader>
          {selectedBlock && (
            <div className="space-y-6 mt-6">
              <div>
                <Label htmlFor="block-title">Title</Label>
                <Input
                  id="block-title"
                  value={selectedBlock.title}
                  onChange={(e) => {
                    const updatedBlock = { ...selectedBlock, title: e.target.value };
                    setSelectedBlock(updatedBlock);
                    updateBlockMutation.mutate({ id: selectedBlock.id, title: e.target.value });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="block-description">Description</Label>
                <Textarea
                  id="block-description"
                  value={selectedBlock.description || ""}
                  onChange={(e) => {
                    const updatedBlock = { ...selectedBlock, description: e.target.value };
                    setSelectedBlock(updatedBlock);
                    updateBlockMutation.mutate({ id: selectedBlock.id, description: e.target.value });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="block-size">Size (Grid Columns)</Label>
                <Select
                  value={selectedBlock.size.toString()}
                  onValueChange={(value) => {
                    const size = parseInt(value);
                    const updatedBlock = { ...selectedBlock, size };
                    setSelectedBlock(updatedBlock);
                    updateBlockMutation.mutate({ id: selectedBlock.id, size });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} column{size > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}