import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import type { InsertProject } from "@shared/schema";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: number;
}

const projectColors = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Emerald", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Orange", value: "#EA580C" },
];

const teams = [
  "Marketing",
  "Sales", 
  "Product",
  "Engineering",
  "Finance",
  "Operations",
  "Customer Success",
  "Design"
];

export default function CreateProjectModal({
  isOpen,
  onClose,
  organizationId
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(projectColors[0].value);
  const [team, setTeam] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", projectData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your project has been created successfully.",
      });
      
      // Invalidate projects queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/overview"] });
      
      // Reset form and close modal
      handleReset();
      onClose();
    },
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
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!organizationId) {
      toast({
        title: "Error",
        description: "No organization selected.",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      color: selectedColor,
      organizationId,
      status: "active",
    });
  };

  const handleReset = () => {
    setName("");
    setDescription("");
    setSelectedColor(projectColors[0].value);
    setTeam("");
  };

  const handleClose = () => {
    if (!createProjectMutation.isPending) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Project</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={createProjectMutation.isPending}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createProjectMutation.isPending}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="team">Team</Label>
              <Select value={team} onValueChange={setTeam} disabled={createProjectMutation.isPending}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((teamName) => (
                    <SelectItem key={teamName} value={teamName}>
                      {teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your project goals and objectives"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createProjectMutation.isPending}
              rows={3}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Project Color</Label>
            <div className="flex items-center space-x-3 mt-2">
              {projectColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  disabled={createProjectMutation.isPending}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value
                      ? "border-gray-800 scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProjectMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createProjectMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
