import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  X, 
  Upload, 
  Edit3, 
  Zap, 
  Plus, 
  RefreshCw,
  Check,
  FileText,
  Database,
  Sparkles
} from "lucide-react";

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataSourceModal({ isOpen, onClose }: DataSourceModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    type: "manual",
    content: "",
    file: null as File | null,
    syntheticPrompt: ""
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDataSourceMutation = useMutation({
    mutationFn: async (dataSourceData: any) => {
      const response = await apiRequest("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataSourceData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({
        title: "Success",
        description: "Data source created successfully",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create data source",
        variant: "destructive",
      });
    },
  });

  const generateSyntheticDataMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("/api/ai/generate-synthetic-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, content: JSON.stringify(data, null, 2) }));
      setIsGenerating(false);
      toast({
        title: "Success",
        description: "Synthetic data generated successfully",
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: error.message || "Failed to generate synthetic data",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setStep(1);
    setFormData({
      name: "",
      type: "manual",
      content: "",
      file: null,
      syntheticPrompt: ""
    });
    setIsGenerating(false);
    onClose();
  };

  const handleNext = () => {
    console.log("Next clicked, current step:", step, "formData:", formData);
    if (step === 1) {
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Please enter a data source name",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.type === "synthetic") {
        if (!formData.syntheticPrompt.trim()) {
          toast({
            title: "Error",
            description: "Please enter a description for the synthetic data",
            variant: "destructive",
          });
          return;
        }
        setStep(3);
      } else if (formData.type === "file") {
        if (!formData.file) {
          toast({
            title: "Error",
            description: "Please select a file to upload",
            variant: "destructive",
          });
          return;
        }
        handleSubmit();
      } else {
        if (!formData.content.trim()) {
          toast({
            title: "Error",
            description: "Please enter data content",
            variant: "destructive",
          });
          return;
        }
        handleSubmit();
      }
    }
  };

  const handleGenerateSyntheticData = () => {
    if (!formData.syntheticPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for the synthetic data",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    generateSyntheticDataMutation.mutate(formData.syntheticPrompt);
  };

  const handleSubmit = () => {
    let content = formData.content;
    let config: any = {
      inputMethod: formData.type
    };

    if (formData.type === "synthetic") {
      config.syntheticPrompt = formData.syntheticPrompt;
    }

    if (formData.type === "file" && formData.file) {
      config.fileName = formData.file.name;
      config.fileType = formData.file.type;
    }

    const dataSourceData = {
      name: formData.name,
      type: formData.type,
      organizationId: 1,
      config: {
        ...config,
        content: content
      }
    };

    createDataSourceMutation.mutate(dataSourceData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFormData(prev => ({ ...prev, content }));
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add Data Source
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="dataSourceName">Data Source Title *</Label>
                <Input
                  id="dataSourceName"
                  placeholder="Enter data source name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label>Data Input Method</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <Card 
                    className={`cursor-pointer transition-all ${formData.type === "manual" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"}`}
                    onClick={() => setFormData(prev => ({ ...prev, type: "manual" }))}
                  >
                    <CardContent className="p-4 text-center">
                      <Edit3 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <h3 className="font-medium text-sm">Manual Input</h3>
                      <p className="text-xs text-gray-600">Type or paste your data</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${formData.type === "file" ? "ring-2 ring-green-500 bg-green-50" : "hover:shadow-md"}`}
                    onClick={() => setFormData(prev => ({ ...prev, type: "file" }))}
                  >
                    <CardContent className="p-4 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <h3 className="font-medium text-sm">File Upload</h3>
                      <p className="text-xs text-gray-600">Upload CSV or JSON file</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${formData.type === "synthetic" ? "ring-2 ring-purple-500 bg-purple-50" : "hover:shadow-md"}`}
                    onClick={() => {
                      console.log("Synthetic data clicked");
                      setFormData(prev => ({ ...prev, type: "synthetic" }));
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <h3 className="font-medium text-sm">Synthetic Data</h3>
                      <p className="text-xs text-gray-600">AI-generated sample data</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Data Input */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{formData.name}</span>
                </div>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600 capitalize">{formData.type} Input</span>
              </div>

              {formData.type === "manual" && (
                <div>
                  <Label>Data Content</Label>
                  <Textarea
                    placeholder="Enter data in CSV or JSON format..."
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: CSV, JSON, TSV
                  </p>
                </div>
              )}

              {formData.type === "file" && (
                <div>
                  <Label>Upload File</Label>
                  <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept=".csv,.json,.txt,.tsv"
                            className="sr-only"
                            onChange={handleFileUpload}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        CSV, JSON, TSV files up to 10MB
                      </p>
                      {formData.file && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ {formData.file.name} selected
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {formData.type === "synthetic" && (
                <div>
                  <Label>Data Description</Label>
                  <Textarea
                    placeholder="Describe the data you want to generate... (e.g., 'Sales data for 12 months with product categories, quantities, and revenue')"
                    value={formData.syntheticPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, syntheticPrompt: e.target.value }))}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific about the data structure, columns, and sample size you need
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Synthetic Data Generation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Generating Synthetic Data</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Prompt:</strong> {formData.syntheticPrompt}
                </p>
                
                {!formData.content && (
                  <Button
                    onClick={handleGenerateSyntheticData}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Data...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate Synthetic Data
                      </>
                    )}
                  </Button>
                )}
              </div>

              {formData.content && (
                <div>
                  <Label>Generated Data Preview</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can edit the generated data before saving
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={step === 3 ? handleSubmit : handleNext}
                disabled={createDataSourceMutation.isPending || (step === 3 && !formData.content)}
              >
                {createDataSourceMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : step === 3 || (step === 2 && formData.type !== "synthetic") ? (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Data Source
                  </>
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}