import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, X, File, CheckCircle } from "lucide-react";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: number;
}

const supportedFormats = [
  { ext: ".csv", desc: "CSV files" },
  { ext: ".xlsx, .xls", desc: "Excel files" },
  { ext: ".json", desc: "JSON files" },
  { ext: ".tsv", desc: "TSV files" },
];

export default function FileUploadModal({
  isOpen,
  onClose,
  organizationId
}: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("type", getFileType(file.name));
      formData.append("organizationId", organizationId?.toString() || "");

      const response = await fetch("/api/data-sources", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      setUploadComplete(true);
      setUploadProgress(100);
      
      toast({
        title: "Upload Complete!",
        description: "Your data source has been uploaded successfully.",
      });
      
      // Invalidate data sources queries
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/overview"] });
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      
      if (isUnauthorizedError(error)) {
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
      
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getFileType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'csv': return 'csv';
      case 'json': return 'json';
      case 'xlsx':
      case 'xls': return 'excel';
      case 'tsv': return 'tsv';
      default: return 'unknown';
    }
  };

  const isValidFileType = (file: File): boolean => {
    const validExtensions = ['csv', 'json', 'xlsx', 'xls', 'tsv'];
    const ext = file.name.toLowerCase().split('.').pop();
    return validExtensions.includes(ext || '');
  };

  const handleFileSelect = (file: File) => {
    if (!isValidFileType(file)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a supported file format.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    
    if (!organizationId) {
      toast({
        title: "Error",
        description: "No organization selected.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    uploadMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadComplete(false);
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Upload Data Source</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isUploading}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile 
                ? "border-indigo-300 bg-indigo-50" 
                : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  {uploadComplete ? (
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  ) : (
                    <File className="h-12 w-12 text-indigo-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                {!uploadComplete && !isUploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <CloudUpload className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg text-gray-600 mb-2">Drag and drop your file here</p>
                  <p className="text-sm text-gray-500 mb-4">Or click to browse</p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Choose File
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="text-gray-600">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Supported Formats */}
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Supported formats:</p>
            <ul className="space-y-1">
              {supportedFormats.map((format, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  {format.desc} ({format.ext})
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-2">Maximum file size: 10MB</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || uploadComplete}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : uploadComplete ? (
                "Complete!"
              ) : (
                "Upload"
              )}
            </Button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,.xlsx,.xls,.tsv"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}
