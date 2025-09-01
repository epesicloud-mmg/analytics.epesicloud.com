import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Share2, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Clock,
  Eye,
  MoreHorizontal,
  FileText,
  Download,
  Plus,
  MoreVertical,
  Lightbulb,
  LightbulbOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

interface Block {
  id: string;
  type: 'ai' | 'text' | 'chart' | 'data' | 'insights';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: any;
  createdAt: string;
  updatedAt: string;
}

interface Dashboard {
  id: number;
  name: string;
  description: string;
  projectId: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export default function DashboardPreview() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(60);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: [`/api/dashboards/${id}`],
    enabled: !!id,
  });

  // Fetch dashboard blocks
  const { data: blocks = [], isLoading: blocksLoading, refetch: refetchBlocks } = useQuery({
    queryKey: [`/api/dashboards/${id}/blocks`],
    enabled: !!id,
  });



  // Click outside handler for FAB menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setFabMenuOpen(false);
      }
    };

    if (fabMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [fabMenuOpen]);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          refetchDashboard();
          refetchBlocks();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, refetchDashboard, refetchBlocks]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Share dashboard
  const shareDashboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied",
        description: "Dashboard link copied to clipboard",
      });
    });
  };

  // Manual refresh
  const handleRefresh = () => {
    setRefreshCountdown(60);
    refetchDashboard();
    refetchBlocks();
    toast({
      title: "Dashboard refreshed",
      description: "Data has been updated",
    });
  };

  // Convert chart data for recharts
  const convertChartData = (chartData: any) => {
    if (!chartData?.data?.labels || !chartData?.data?.datasets?.[0]?.data) {
      return [];
    }

    return chartData.data.labels.map((label: string, index: number) => ({
      name: label,
      value: chartData.data.datasets[0].data[index] || 0,
    }));
  };

  // Render chart based on type
  const renderChart = (block: Block) => {
    if (block.type !== 'ai' || !block.content?.chartData) {
      return null;
    }

    const chartData = block.content.chartData;
    const rechartsData = convertChartData(chartData);
    const colors = chartData.colors || ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

    return (
      <div className="space-y-4">
        <ChartContainer
          config={{
            value: {
              label: "Value",
              color: colors[0],
            },
          }}
          className="h-full w-full"
        >
          {chartData.type === 'bar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rechartsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="value" 
                  fill={colors[0]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {chartData.type === 'line' && (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={rechartsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={colors[0]} 
                  strokeWidth={2}
                  dot={{ r: 4, fill: colors[0] }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          )}
          
          {(chartData.type === 'pie' || chartData.type === 'doughnut') && (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={rechartsData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={chartData.type === 'doughnut' ? 40 : 0}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {rechartsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
          
          {chartData.type === 'area' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rechartsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={colors[0]} 
                  fill={colors[0]}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
        
        {showInsights && chartData.insights && chartData.insights.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Key Insights
            </h4>
            <ul className="space-y-2">
              {chartData.insights.map((insight, index) => (
                <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Render different block types
  const renderBlock = (block: Block) => {
    const gridColSpan = Math.min(Math.max(block.size?.width || 1, 1), 4); // Adjusted for mobile-first grid
    
    return (
      <Card 
        key={block.id} 
        className="transition-all duration-200 hover:shadow-lg"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{block.title}</CardTitle>
            <Badge variant="outline" className="capitalize">
              {block.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {block.type === 'ai' && block.content?.chartData ? (
            <div className="h-64">
              {renderChart(block)}
            </div>
          ) : block.type === 'text' ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700">{block.content?.text || 'No text content'}</p>
            </div>
          ) : block.type === 'insights' ? (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Key Insights</h4>
              <ul className="space-y-1">
                {(block.content?.insights || []).map((insight: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Eye className="h-8 w-8 mx-auto mb-2" />
              <p>Preview not available for this block type</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (dashboardLoading || blocksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-64" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {dashboard?.name || 'Dashboard'}
                </h1>
                {dashboard?.description && (
                  <p className="text-sm text-gray-600 mt-1">{dashboard.description}</p>
                )}
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Last updated: {new Date(dashboard?.updatedAt || '').toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Auto-refresh indicator */}
              <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full border">
                <RefreshCw 
                  className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} 
                  onClick={handleRefresh}
                />
                <span>{refreshCountdown}s</span>
              </div>
              
              {/* Key Insights Toggle */}
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full border">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <Label htmlFor="insights-toggle" className="text-sm text-gray-700 cursor-pointer">
                  Key Insights
                </Label>
                <Switch
                  id="insights-toggle"
                  checked={showInsights}
                  onCheckedChange={(checked) => {
                    setShowInsights(checked);
                    toast({
                      title: checked ? "Insights shown" : "Insights hidden",
                      description: checked ? "Key insights are now visible" : "Key insights are now hidden",
                    });
                  }}
                />
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={shareDashboard}
                className="flex items-center space-x-1"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {blocksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-center py-16">
            <Eye className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No blocks to display</h3>
            <p className="text-gray-600">This dashboard doesn't have any blocks yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {blocks.map(renderBlock)}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>Dashboard Preview • Auto-refresh: {autoRefresh ? 'On' : 'Off'}</p>
          </div>
        </div>
      </footer>

      {/* Floating Action Button */}
      <div ref={fabRef} className="fixed bottom-4 right-4 z-50">
        {/* FAB Menu Options - Flyout Design */}
        {fabMenuOpen && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-1 min-w-[140px] animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-10 px-3 text-gray-700 hover:bg-gray-50 rounded-md"
              onClick={() => {
                refetchDashboard();
                refetchBlocks();
                setFabMenuOpen(false);
                toast({
                  title: "Refreshed",
                  description: "Dashboard data has been refreshed",
                });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-10 px-3 text-gray-700 hover:bg-gray-50 rounded-md"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setFabMenuOpen(false);
                toast({
                  title: "Link copied",
                  description: "Dashboard link copied to clipboard",
                });
              }}
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-10 px-3 text-gray-700 hover:bg-gray-50 rounded-md"
              onClick={() => {
                setIsFullscreen(!isFullscreen);
                setFabMenuOpen(false);
              }}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span>Fullscreen</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 h-10 px-3 text-gray-700 hover:bg-gray-50 rounded-md"
              onClick={() => {
                // Export functionality - could be PDF, CSV, etc.
                setFabMenuOpen(false);
                toast({
                  title: "Report",
                  description: "Report functionality coming soon",
                });
              }}
            >
              <FileText className="h-4 w-4" />
              <span>Report</span>
            </Button>
          </div>
        )}
        
        {/* Main FAB Button */}
        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full w-14 h-14 p-0"
          onClick={() => setFabMenuOpen(!fabMenuOpen)}
        >
          <MoreVertical className={`h-5 w-5 transition-transform duration-200 ${fabMenuOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </div>
  );
}