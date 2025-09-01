import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, Table, Gauge, Type, Save, Eye, MousePointer } from "lucide-react";

interface DashboardBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: number;
}

const componentTypes = [
  { id: 'chart', name: 'Chart', icon: BarChart3, color: 'text-indigo-600' },
  { id: 'table', name: 'Table', icon: Table, color: 'text-emerald-600' },
  { id: 'metric', name: 'Metric', icon: Gauge, color: 'text-amber-600' },
  { id: 'text', name: 'Text', icon: Type, color: 'text-gray-600' },
];

export default function DashboardBuilderModal({ 
  isOpen, 
  onClose, 
  dashboardId 
}: DashboardBuilderModalProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);

  const handleDragStart = (componentType: string) => {
    setDraggedComponent(componentType);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedComponent) {
      // TODO: Add component to dashboard
      console.log('Adding component:', draggedComponent);
      setDraggedComponent(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Dashboard Builder</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[calc(90vh-120px)]">
          {/* Components Sidebar */}
          <div className="w-64 bg-gray-50 p-4 overflow-y-auto border-r">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Components</h3>
            <div className="space-y-2">
              {componentTypes.map((component) => {
                const Icon = component.icon;
                return (
                  <Card
                    key={component.id}
                    className="cursor-pointer hover:shadow-md border-2 border-transparent hover:border-indigo-200 transition-all"
                    draggable
                    onDragStart={() => handleDragStart(component.id)}
                    onClick={() => setSelectedComponent(component.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <Icon className={`h-5 w-5 ${component.color}`} />
                        <span className="text-sm font-medium">{component.name}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          
          {/* Canvas Area */}
          <div className="flex-1 bg-gray-100 p-6 overflow-auto">
            <div className="grid grid-cols-12 gap-4 min-h-full">
              <div 
                className="col-span-12 border-2 border-dashed border-gray-300 p-8 rounded-lg text-center text-gray-500 hover:border-indigo-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <MousePointer className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg mb-2">Drag components here to build your dashboard</p>
                <p className="text-sm">Start by dragging a chart or table from the sidebar</p>
              </div>
            </div>
          </div>
          
          {/* Properties Panel */}
          <div className="w-80 bg-white border-l p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Properties</h3>
            
            {selectedComponent ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="data-source">Data Source</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Data CSV</SelectItem>
                      <SelectItem value="customer">Customer Database</SelectItem>
                      <SelectItem value="marketing">Marketing Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedComponent === 'chart' && (
                  <>
                    <div>
                      <Label htmlFor="chart-type">Chart Type</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select chart type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">Line Chart</SelectItem>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                          <SelectItem value="area">Area Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="x-axis">X-Axis</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select X-axis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="y-axis">Y-Axis</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select Y-axis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="count">Count</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {selectedComponent === 'metric' && (
                  <>
                    <div>
                      <Label htmlFor="metric-field">Metric Field</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select metric field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="total-sales">Total Sales</SelectItem>
                          <SelectItem value="avg-order">Average Order Value</SelectItem>
                          <SelectItem value="conversion">Conversion Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="aggregation">Aggregation</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select aggregation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sum">Sum</SelectItem>
                          <SelectItem value="avg">Average</SelectItem>
                          <SelectItem value="count">Count</SelectItem>
                          <SelectItem value="max">Maximum</SelectItem>
                          <SelectItem value="min">Minimum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-sm">Select a component to edit its properties</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="h-4 w-4 mr-2" />
              Save Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
