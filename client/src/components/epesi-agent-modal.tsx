import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  Send, 
  Bot, 
  User, 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity,
  Plus,
  Sparkles,
  TrendingUp,
  MessageCircle,
  History,
  Trash2
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Cell, Pie } from "recharts";

interface EpesiAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: number;
  onBlockAdded?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  charts?: ChartData[];
}

interface ChartData {
  id: string;
  type: string;
  title: string;
  description: string;
  data: any[];
  options: any;
  insights?: string[];
  colors?: string[];
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface EpesiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: {
    charts?: ChartData[];
  };
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export default function EpesiAgentModal({ 
  isOpen, 
  onClose, 
  dashboardId, 
  onBlockAdded 
}: EpesiAgentModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modalWidth, setModalWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: [`/api/conversations?dashboardId=${dashboardId}`],
    enabled: isOpen && showHistory,
  });
  
  // Debug log for conversations
  useEffect(() => {
    if (showHistory && conversations) {
      console.log('Conversations loaded:', conversations);
    }
  }, [showHistory, conversations]);

  // Fetch messages for current conversation
  const { data: conversationMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/conversations/${currentConversationId}/messages`],
    enabled: isOpen && !!currentConversationId,
  });
  
  // Debug log for messages
  useEffect(() => {
    if (currentConversationId && conversationMessages) {
      console.log('Messages loaded for conversation:', currentConversationId, conversationMessages);
    }
  }, [currentConversationId, conversationMessages]);

  // Convert conversation messages to chat messages
  useEffect(() => {
    if (messagesLoading) {
      // Show loading message while fetching
      setMessages([
        {
          id: 'loading',
          type: 'assistant',
          content: "Loading conversation history...",
          timestamp: new Date(),
        }
      ]);
    } else if (conversationMessages.length > 0) {
      const chatMessages: ChatMessage[] = conversationMessages.map((msg: EpesiMessage) => ({
        id: msg.id,
        type: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        charts: msg.metadata?.charts || []
      }));
      setMessages(chatMessages);
    } else if (!currentConversationId) {
      // Show welcome message for new conversations
      setMessages([
        {
          id: 'welcome',
          type: 'assistant',
          content: "Hello! I'm Epesi Agent, your AI analytics assistant. I can help you analyze data, answer questions, and generate insightful charts. What would you like to explore today?",
          timestamp: new Date(),
        }
      ]);
    } else if (currentConversationId && conversationMessages.length === 0) {
      // Show empty conversation message
      setMessages([
        {
          id: 'empty',
          type: 'assistant',
          content: "This conversation appears to be empty. Start by asking me a question!",
          timestamp: new Date(),
        }
      ]);
    }
  }, [conversationMessages, currentConversationId, messagesLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle mouse resize
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      setModalWidth(Math.max(400, Math.min(800, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const generateChartsMutation = useMutation({
    mutationFn: async ({ prompt }: { prompt: string }) => {
      console.log("Epesi Agent mutation called with:", { prompt, dashboardId, conversationId: currentConversationId });
      const response = await apiRequest('/api/epesi-agent/chat', {
        method: 'POST',
        body: { prompt, dashboardId, conversationId: currentConversationId }
      });
      return response;
    },
    onSuccess: (data) => {
      // Update conversation ID if it was returned
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        charts: data.charts || []
      };
      setMessages(prev => [...prev, newMessage]);
      setIsLoading(false);
      
      // Invalidate conversation queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['/api/dashboards', dashboardId, 'conversations']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations', data.conversationId, 'messages']
      });
    },
    onError: (error) => {
      console.error("Epesi Agent error:", error);
      let errorMessage = "Failed to get response from Epesi Agent";
      
      // Check if it's an authentication error
      if (error.message?.includes("Unauthorized") || error.message?.includes("401")) {
        errorMessage = "Session expired. Please refresh the page and try again.";
      } else if (error.message?.includes("Dashboard not found")) {
        errorMessage = "Dashboard not found. Please make sure you're in a valid dashboard.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: async ({ chartData }: { chartData: ChartData }) => {
      const blockData = {
        type: 'ai',
        title: chartData.title,
        description: chartData.description,
        content: {
          chartData: {
            data: chartData.data,
            type: chartData.type,
            options: chartData.options,
            insights: chartData.insights || []
          }
        },
        size: 4,
        position: 0
      };
      
      return await apiRequest(`/api/dashboards/${dashboardId}/blocks`, {
        method: 'POST',
        body: blockData
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chart added to dashboard successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboards/${dashboardId}/blocks`] });
      onBlockAdded?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add chart to dashboard",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputMessage("");

    generateChartsMutation.mutate({ prompt: inputMessage });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderChart = (chart: ChartData) => {
    const chartColors = chart.colors || COLORS;
    
    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={chartColors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={chartColors[0]} strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            <BarChart3 className="h-12 w-12 mb-2" />
            <p>Chart type not supported</p>
          </div>
        );
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="h-4 w-4" />;
      case 'line':
        return <LineChart className="h-4 w-4" />;
      case 'pie':
        return <PieChart className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-end">
      <div
        ref={modalRef}
        className="h-full bg-white shadow-xl flex flex-col"
        style={{ width: modalWidth }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 w-1 h-full bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors"
          onMouseDown={handleMouseDown}
        />
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Epesi Agent</h2>
            <Badge variant="secondary" className="bg-white/20 text-white">
              AI Assistant
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-white hover:bg-white/20"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversation History Panel */}
        {showHistory && (
          <div className="border-b bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Recent Conversations</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentConversationId(null);
                  setMessages([
                    {
                      id: 'welcome',
                      type: 'assistant',
                      content: "Hello! I'm Epesi Agent, your AI analytics assistant. I can help you analyze data, answer questions, and generate insightful charts. What would you like to explore today?",
                      timestamp: new Date(),
                    }
                  ]);
                  setShowHistory(false);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Chat
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {conversationsLoading ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm">Loading conversations...</p>
                </div>
              ) : (
                <>
                  {conversations.map((conversation: Conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        currentConversationId === conversation.id
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setCurrentConversationId(conversation.id);
                        setShowHistory(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium truncate">{conversation.title}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No conversations yet</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {message.type === 'user' ? 'You' : 'Epesi Agent'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Charts */}
                  {message.charts && message.charts.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {message.charts.map((chart) => (
                        <Card key={chart.id} className="bg-white">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getChartIcon(chart.type)}
                                <CardTitle className="text-sm">{chart.title}</CardTitle>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addBlockMutation.mutate({ chartData: chart })}
                                disabled={addBlockMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </div>
                            <p className="text-xs text-gray-600">{chart.description}</p>
                          </CardHeader>
                          <CardContent>
                            {renderChart(chart)}
                            
                            {/* Insights */}
                            {chart.insights && chart.insights.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center space-x-1">
                                  <Sparkles className="h-3 w-3 text-blue-600" />
                                  <span className="text-xs font-medium text-gray-700">Key Insights</span>
                                </div>
                                {chart.insights.map((insight, idx) => (
                                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-2">
                                    <p className="text-xs text-blue-800">{insight}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm font-medium">Epesi Agent</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Analyzing and generating charts...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex space-x-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your data..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}