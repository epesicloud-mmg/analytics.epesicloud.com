import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Info, 
  Sparkles, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Database, 
  Eye, 
  Share, 
  Save,
  Bot
} from "lucide-react";

interface DraggableToolbarProps {
  onInfoClick: () => void;
  onAIClick: () => void;
  onTextClick: () => void;
  onChartClick: () => void;
  onInsightsClick: () => void;
  onDataClick: () => void;
  onAgentClick: () => void;
  onPreviewClick: () => void;
  onShareClick: () => void;
  onSaveClick: () => void;
}

export default function DraggableToolbar({
  onInfoClick,
  onAIClick,
  onTextClick,
  onChartClick,
  onInsightsClick,
  onDataClick,
  onAgentClick,
  onPreviewClick,
  onShareClick,
  onSaveClick,
}: DraggableToolbarProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Center the toolbar initially
  useEffect(() => {
    const centerToolbar = () => {
      if (toolbarRef.current) {
        const rect = toolbarRef.current.getBoundingClientRect();
        setPosition({
          x: (window.innerWidth - rect.width) / 2,
          y: window.innerHeight - rect.height - 24, // 24px from bottom
        });
      }
    };

    centerToolbar();
    window.addEventListener('resize', centerToolbar);
    return () => window.removeEventListener('resize', centerToolbar);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 0);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={toolbarRef}
      className={`fixed z-50 bg-white rounded-2xl shadow-xl border border-gray-200 px-4 py-3 flex items-center space-x-2 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        left: position.x,
        top: position.y,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Info */}
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-600 hover:text-gray-800"
        onClick={(e) => {
          e.stopPropagation();
          onInfoClick();
        }}
      >
        <Info className="h-4 w-4" />
        <span className="ml-1 text-sm">Info</span>
      </Button>

      <div className="h-6 w-px bg-gray-200" />

      {/* AI */}
      <Button
        variant="ghost"
        size="sm"
        className="text-indigo-600 hover:text-indigo-700"
        onClick={(e) => {
          e.stopPropagation();
          onAIClick();
        }}
      >
        <Sparkles className="h-4 w-4" />
        <span className="ml-1 text-sm">AI</span>
      </Button>

      <div className="h-6 w-px bg-gray-200" />

      {/* Text */}
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-600 hover:text-gray-800"
        onClick={(e) => {
          e.stopPropagation();
          onTextClick();
        }}
      >
        <FileText className="h-4 w-4" />
        <span className="ml-1 text-sm">Text</span>
      </Button>

      {/* Chart */}
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-600 hover:text-gray-800"
        onClick={(e) => {
          e.stopPropagation();
          onChartClick();
        }}
      >
        <BarChart3 className="h-4 w-4" />
        <span className="ml-1 text-sm">Chart</span>
      </Button>

      {/* Insights */}
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-600 hover:text-gray-800"
        onClick={(e) => {
          e.stopPropagation();
          onInsightsClick();
        }}
      >
        <TrendingUp className="h-4 w-4" />
        <span className="ml-1 text-sm">Insights</span>
      </Button>

      <div className="h-6 w-px bg-gray-200" />

      {/* Data */}
      <Button
        variant="ghost"
        size="sm"
        className="text-blue-600 hover:text-blue-700"
        onClick={(e) => {
          e.stopPropagation();
          onDataClick();
        }}
      >
        <Database className="h-4 w-4" />
        <span className="ml-1 text-sm">Data</span>
      </Button>

      {/* Epesi Agent */}
      <Button
        variant="ghost"
        size="sm"
        className="text-purple-600 hover:text-purple-700"
        onClick={(e) => {
          e.stopPropagation();
          onAgentClick();
        }}
      >
        <Bot className="h-4 w-4" />
        <span className="ml-1 text-sm">Epesi Agent</span>
      </Button>

      <div className="h-6 w-px bg-gray-200" />

      {/* Preview */}
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-600 hover:text-gray-800"
        onClick={(e) => {
          e.stopPropagation();
          onPreviewClick();
        }}
      >
        <Eye className="h-4 w-4" />
        <span className="ml-1 text-sm">Preview</span>
      </Button>

      {/* Share */}
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-600 hover:text-gray-800"
        onClick={(e) => {
          e.stopPropagation();
          onShareClick();
        }}
      >
        <Share className="h-4 w-4" />
        <span className="ml-1 text-sm">Share</span>
      </Button>

      {/* Save */}
      <Button
        variant="default"
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={(e) => {
          e.stopPropagation();
          onSaveClick();
        }}
      >
        <Save className="h-4 w-4" />
        <span className="ml-1 text-sm">Save</span>
      </Button>
    </div>
  );
}