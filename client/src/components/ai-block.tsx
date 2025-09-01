import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  BarChart3, 
  PieChart, 
  LineChart, 
  TrendingUp,
  Edit3,
  Trash2,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  AreaChart,
  Area
} from "recharts";
import type { Block } from "@shared/schema";

interface AIBlockProps {
  block: Block;
  onDelete: (blockId: string) => void;
  onUpdate: (blockId: string, updates: Partial<Block>) => void;
}

export default function AIBlock({ block, onDelete, onUpdate }: AIBlockProps) {
  const [prompt, setPrompt] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat history for this block
  const { data: chatHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: [`/api/blocks/${block.id}/chat-history`],
  });

  const saveChatHistoryMutation = useMutation({
    mutationFn: async ({ question, chartData }: { question: string; chartData: any }) => {
      const response = await apiRequest(`/api/blocks/${block.id}/chat-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, chartData }),
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate chat history query to refetch
      queryClient.invalidateQueries({ queryKey: [`/api/blocks/${block.id}/chat-history`] });
    },
  });

  const generateChartMutation = useMutation({
    mutationFn: async (aiPrompt: string) => {
      // Get the last 6 chat history items for context
      const recentHistory = chatHistory.slice(-6).reverse(); // Most recent first
      
      const response = await apiRequest("/api/ai/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          blockId: block.id,
          dashboardId: block.dashboardId,
          chatHistory: recentHistory
        }),
      });
      return response.json();
    },
    onSuccess: (chartData) => {
      // Update block with chart data
      onUpdate(block.id, {
        content: {
          ...block.content,
          chartData,
          lastPrompt: prompt,
          generatedAt: new Date().toISOString()
        }
      });
      
      // Save to chat history
      saveChatHistoryMutation.mutate({
        question: prompt,
        chartData
      });
      
      setPrompt("");
      setIsExpanded(false);
      toast({
        title: "Success",
        description: "Chart generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate chart",
        variant: "destructive",
      });
    },
  });

  const handleGenerateChart = () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for chart generation",
        variant: "destructive",
      });
      return;
    }
    generateChartMutation.mutate(prompt);
  };

  const handleUpdateTitle = (newTitle: string) => {
    onUpdate(block.id, { title: newTitle });
    setIsEditing(false);
  };

  const handleLoadFromHistory = (historyItem: any) => {
    // Update block with chart data from history
    onUpdate(block.id, {
      content: {
        ...block.content,
        chartData: historyItem.chartData,
        lastPrompt: historyItem.question,
        generatedAt: new Date().toISOString()
      }
    });
    
    setShowHistory(false);
    toast({
      title: "Success",
      description: "Chart loaded from history",
    });
  };

  const chartData = block.content?.chartData;
  
  // Transform Chart.js format to Recharts format
  const transformChartData = (data: any) => {
    if (!data) return [];
    
    // If data is already in Recharts format (array of objects)
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'name' in data[0]) {
      return data;
    }
    
    // If data is in Chart.js format (with labels and datasets)
    if (data.labels && data.datasets && data.datasets.length > 0) {
      const labels = data.labels;
      const values = data.datasets[0].data;
      
      return labels.map((label: string, index: number) => ({
        name: label,
        value: values[index] || 0
      }));
    }
    
    // If data is a plain array of numbers, create generic labels
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'number') {
      return data.map((value: number, index: number) => ({
        name: `Item ${index + 1}`,
        value: value
      }));
    }
    
    return [];
  };

  // Handle different chart data structures
  const chartDataToTransform = chartData?.data || chartData;
  const rechartsData = transformChartData(chartDataToTransform);
  
  const hasChart = chartData && rechartsData.length > 0;

  return (
    <Card className="h-full group relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <input
              type="text"
              value={block.title}
              onChange={(e) => handleUpdateTitle(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
              className="text-lg font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
              autoFocus
            />
          ) : (
            <CardTitle className="text-lg flex items-center">
              <Sparkles className="h-5 w-5 text-indigo-500 mr-2" />
              {block.title}
            </CardTitle>
          )}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              onClick={() => onDelete(block.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {block.description && (
          <p className="text-sm text-gray-600">{block.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Prompt Interface */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
              AI Assistant
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-purple-600 hover:text-purple-700 relative"
              >
                <Clock className="h-4 w-4" />
                {chatHistory.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-purple-100 text-purple-700 border-purple-200"
                  >
                    {chatHistory.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-indigo-600 hover:text-indigo-700"
              >
                {isExpanded ? "Collapse" : "Ask AI"}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <Textarea
                placeholder="Ask AI a question... (e.g., 'Show me a bar chart of sales by month')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerateChart}
                  disabled={generateChartMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {generateChartMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Ask
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Chat History Section */}
          {showHistory && (
            <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-purple-900">Chat History</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              
              {historyLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="ml-2 text-sm text-purple-600">Loading history...</span>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  No previous questions found
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {chatHistory.map((item: any, index: number) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-lg border border-purple-200 hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => handleLoadFromHistory(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {item.question}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.generatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="ml-2 flex items-center space-x-1">
                          {item.chartData?.type === 'bar' && <BarChart3 className="h-4 w-4 text-purple-600" />}
                          {item.chartData?.type === 'line' && <LineChart className="h-4 w-4 text-purple-600" />}
                          {(item.chartData?.type === 'pie' || item.chartData?.type === 'doughnut') && <PieChart className="h-4 w-4 text-purple-600" />}
                          {item.chartData?.type === 'area' && <TrendingUp className="h-4 w-4 text-purple-600" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart Display */}
        {hasChart ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{chartData.title}</h4>
              <Badge variant="outline" className="capitalize">
                {chartData.type}
              </Badge>
            </div>
            
            <div className="h-64 bg-white rounded-lg border border-gray-200 p-4">
              <ChartContainer
                config={{
                  value: {
                    label: "Value",
                    color: "#3b82f6",
                  },
                }}
                className="h-full w-full"
              >
                {chartData.type === 'bar' && (
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
                      fill={chartData.colors?.[0] || "#3b82f6"}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
                
                {chartData.type === 'line' && (
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
                      stroke={chartData.colors?.[0] || "#3b82f6"} 
                      strokeWidth={2}
                      dot={{ r: 4, fill: chartData.colors?.[0] || "#3b82f6" }}
                    />
                  </RechartsLineChart>
                )}
                
                {(chartData.type === 'pie' || chartData.type === 'doughnut') && (
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
                      {rechartsData.map((entry, index) => {
                        const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];
                        const colors = chartData.colors || defaultColors;
                        return (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        );
                      })}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPieChart>
                )}
                
                {chartData.type === 'area' && (
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
                      stroke={chartData.colors?.[0] || "#3b82f6"} 
                      fill={chartData.colors?.[0] || "#3b82f6"}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                )}
              </ChartContainer>
            </div>

            {chartData.insights && chartData.insights.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Key Insights</h5>
                <ul className="space-y-1">
                  {chartData.insights.slice(0, 3).map((insight, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center text-center">
            <div>
              <Sparkles className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No chart generated yet</p>
              <p className="text-gray-500 text-xs">Click "Ask AI" to generate a chart</p>
            </div>
          </div>
        )}

        {/* Last Prompt Display */}
        {block.content?.lastPrompt && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <span className="font-medium">Last prompt:</span> {block.content.lastPrompt}
          </div>
        )}
      </CardContent>
    </Card>
  );
}