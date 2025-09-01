import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  AreaChart,
  Area,
  ResponsiveContainer
} from "recharts";
import { 
  Sparkles, 
  Loader2, 
  X, 
  Save, 
  RefreshCw, 
  Plus,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Activity
} from "lucide-react";

interface SmartInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: number;
  onInsightSaved?: () => void;
}

interface Insight {
  id: string;
  question: string;
  description: string;
  chart_type: string;
  insight_category: string;
  chart_payload: any;
  created_at: string;
}

interface InsightWithChartData extends Insight {
  transformedData: any[];
}

export default function SmartInsightsModal({ 
  isOpen, 
  onClose, 
  dashboardId, 
  onInsightSaved 
}: SmartInsightsModalProps) {
  const [step, setStep] = useState<'configure' | 'analyzing' | 'results'>('configure');
  const [insightCount, setInsightCount] = useState("3");
  const [insights, setInsights] = useState<InsightWithChartData[]>([]);
  const { toast } = useToast();

  // Check if data sources exist
  const { data: dataSources } = useQuery({
    queryKey: ['/api/data-sources', { organizationId: 1 }],
    enabled: isOpen,
  });

  // Transform chart data from Chart.js format to Recharts format
  const transformChartData = (chartPayload: any) => {
    console.log('Transforming chart data:', chartPayload);
    
    if (!chartPayload) {
      return [];
    }

    // Handle Chart.js format (from AI)
    if (chartPayload.labels && chartPayload.datasets) {
      const labels = chartPayload.labels;
      const dataset = chartPayload.datasets[0];
      
      if (!dataset || !dataset.data) {
        return [];
      }

      // Transform to Recharts format
      return labels.map((label: string, index: number) => ({
        name: label,
        value: dataset.data[index] || 0
      }));
    }

    // Handle legacy format (series/categories)
    if (chartPayload.series && chartPayload.series[0]) {
      const series = chartPayload.series[0];
      const categories = chartPayload.xAxis?.categories || [];
      const data = series.data || [];

      return categories.map((category: string, index: number) => ({
        name: category,
        value: data[index] || 0
      }));
    }

    return [];
  };

  const generateInsightsMutation = useMutation({
    mutationFn: async (count: string) => {
      const response = await apiRequest("/api/ai/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          dashboardId: dashboardId,
          count: parseInt(count)
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      const insightsWithTransformedData = data.data.insights.map((insight: Insight) => ({
        ...insight,
        transformedData: transformChartData(insight.chart_payload)
      }));
      setInsights(insightsWithTransformedData);
      setStep('results');
      toast({
        title: "Success",
        description: `Generated ${data.data.insights.length} smart insights`,
      });
    },
    onError: (error) => {
      setStep('configure');
      toast({
        title: "Error",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    },
  });

  const saveInsightMutation = useMutation({
    mutationFn: async (insight: InsightWithChartData) => {
      const response = await apiRequest("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          dashboardId: dashboardId,
          title: insight.question,
          description: insight.description,
          type: 'ai',
          content: {
            chartData: {
              data: insight.chart_payload,
              type: insight.chart_type,
              title: insight.question,
              description: insight.description,
              insights: insight.insights || [insight.description],
              category: insight.insight_category
            },
            lastPrompt: insight.question,
            generatedAt: new Date().toISOString()
          }
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Insight saved as block",
      });
      onInsightSaved?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save insight",
        variant: "destructive",
      });
    },
  });

  const saveAllInsightsMutation = useMutation({
    mutationFn: async () => {
      const promises = insights.map(insight => 
        apiRequest("/api/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            dashboardId: dashboardId,
            title: insight.question,
            description: insight.description,
            type: 'ai',
            content: {
              chartData: {
                data: insight.chart_payload,
                type: insight.chart_type,
                title: insight.question,
                description: insight.description,
                insights: insight.insights || [insight.description],
                category: insight.insight_category
              },
              lastPrompt: insight.question,
              generatedAt: new Date().toISOString()
            }
          }),
        }).then(res => res.json())
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All insights saved as blocks",
      });
      onInsightSaved?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save insights",
        variant: "destructive",
      });
    },
  });

  const regenerateInsightMutation = useMutation({
    mutationFn: async (index: number) => {
      const response = await apiRequest("/api/ai/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          dashboardId: dashboardId,
          count: 1,
          regenerateIndex: index
        }),
      });
      return response.json();
    },
    onSuccess: (data, index) => {
      const newInsight = data.data.insights[0];
      if (newInsight) {
        const insightWithData = {
          ...newInsight,
          transformedData: transformChartData(newInsight.chart_payload)
        };
        
        const updatedInsights = [...insights];
        updatedInsights[index] = insightWithData;
        setInsights(updatedInsights);
        
        toast({
          title: "Success",
          description: "Insight regenerated successfully",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate insight",
        variant: "destructive",
      });
    },
  });

  const handleGenerateInsights = () => {
    console.log('Data sources check:', dataSources);
    if (!dataSources || dataSources.length === 0) {
      toast({
        title: "No Data Sources",
        description: "Please add data sources first to generate insights.",
        variant: "destructive",
      });
      return;
    }

    setStep('analyzing');
    generateInsightsMutation.mutate(insightCount);
  };

  const handleRegenerateInsights = () => {
    setStep('analyzing');
    generateInsightsMutation.mutate(insightCount);
  };

  const renderChart = (insight: InsightWithChartData) => {
    if (!insight.transformedData || insight.transformedData.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No data available</p>
          </div>
        </div>
      );
    }

    // Filter out zero values for better visualization, but only if there are non-zero values
    const nonZeroData = insight.transformedData.filter(item => item.value > 0);
    const chartData = nonZeroData.length > 0 ? nonZeroData : insight.transformedData;

    return (
      <div className="h-48">
        <ChartContainer
          config={{
            value: {
              label: "Value",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-full w-full"
        >
          {(insight.chart_type === 'column' || insight.chart_type === 'bar') && (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
            </BarChart>
          )}
          
          {insight.chart_type === 'line' && (
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} />
            </RechartsLineChart>
          )}
          
          {(insight.chart_type === 'pie' || insight.chart_type === 'doughnut') && (
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={60}
                innerRadius={insight.chart_type === 'doughnut' ? 20 : 0}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </RechartsPieChart>
          )}
          
          {insight.chart_type === 'area' && (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
            </AreaChart>
          )}
        </ChartContainer>
      </div>
    );
  };

  const getChartIcon = (chartType: string) => {
    switch (chartType) {
      case 'column':
      case 'bar':
        return <BarChart3 className="h-4 w-4" />;
      case 'line':
        return <LineChart className="h-4 w-4" />;
      case 'pie':
        return <PieChart className="h-4 w-4" />;
      case 'doughnut':
        return <PieChart className="h-4 w-4" />;
      case 'area':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Sparkles className="h-6 w-6 mr-2 text-purple-500" />
            Smart Insights
          </DialogTitle>
          <p className="text-gray-600 mt-2">
            AI-powered analysis of your data to discover hidden insights and trends
          </p>
        </DialogHeader>

        {step === 'configure' && (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Discover Data Insights</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Our AI will analyze your data sources and generate intelligent questions and visualizations to 
                help you uncover trends, patterns, and actionable insights.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <label className="text-sm font-medium">Number of insights:</label>
                <Select value={insightCount} onValueChange={setInsightCount}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 insights</SelectItem>
                    <SelectItem value="4">4 insights</SelectItem>
                    <SelectItem value="5">5 insights</SelectItem>
                    <SelectItem value="6">6 insights</SelectItem>
                    <SelectItem value="8">8 insights</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={handleGenerateInsights}
                  disabled={generateInsightsMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Smart Insights
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="space-y-6 py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Discover Data Insights</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Our AI will analyze your data sources and generate intelligent questions and visualizations to 
                help you uncover trends, patterns, and actionable insights.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <label className="text-sm font-medium">Number of insights:</label>
              <Select value={insightCount} onValueChange={setInsightCount} disabled>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 insights</SelectItem>
                  <SelectItem value="4">4 insights</SelectItem>
                  <SelectItem value="5">5 insights</SelectItem>
                  <SelectItem value="6">6 insights</SelectItem>
                  <SelectItem value="8">8 insights</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <Button disabled className="bg-purple-600">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Data...
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold">Generated Insights</h3>
                <Badge variant="secondary">{insights.length}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateInsights}
                  disabled={generateInsightsMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveAllInsightsMutation.mutate()}
                  disabled={saveAllInsightsMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, index) => (
                <Card key={insight.id} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getChartIcon(insight.chart_type)}
                        <Badge variant="outline" className="text-xs">
                          {insight.insight_category}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {insight.chart_type}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-medium leading-tight">
                      {insight.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {renderChart(insight)}
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {insight.description}
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => regenerateInsightMutation.mutate(index)}
                        disabled={regenerateInsightMutation.isPending}
                        className="flex-1"
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveInsightMutation.mutate(insight)}
                        disabled={saveInsightMutation.isPending}
                        className="flex-1"
                      >
                        <Save className="h-3 w-3 mr-2" />
                        Save Block
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('configure');
                  setInsights([]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate More Insights
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}