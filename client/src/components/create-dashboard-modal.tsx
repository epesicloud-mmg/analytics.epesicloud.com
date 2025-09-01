import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Loader2 } from "lucide-react";
import { insertDashboardSchema } from "@shared/schema";

interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
}

const createDashboardSchema = insertDashboardSchema.extend({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CreateDashboardFormData = z.infer<typeof createDashboardSchema>;

export default function CreateDashboardModal({
  isOpen,
  onClose,
  projectId,
}: CreateDashboardModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPublic, setIsPublic] = useState(false);

  const form = useForm<CreateDashboardFormData>({
    resolver: zodResolver(createDashboardSchema),
    defaultValues: {
      name: "",
      description: "",
      projectId,
      isPublic: false,
    },
  });

  const createDashboardMutation = useMutation({
    mutationFn: async (data: CreateDashboardFormData) => {
      console.log("Sending data to API:", data);
      const response = await apiRequest("POST", "/api/dashboards", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dashboard created",
        description: "Your dashboard has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboards"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      console.error("Dashboard creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create dashboard",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateDashboardFormData) => {
    console.log("Form data:", data);
    console.log("Is Public:", isPublic);
    createDashboardMutation.mutate({
      ...data,
      isPublic,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Dashboard</DialogTitle>
          <DialogDescription>
            Create a new dashboard to visualize your data with charts and metrics.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Dashboard Name</Label>
            <Input
              id="name"
              placeholder="Enter dashboard name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter dashboard description (optional)"
              {...form.register("description")}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="public">Make dashboard public</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              disabled={createDashboardMutation.isPending}
              onClick={() => {
                console.log("Button clicked");
                const formData = form.getValues();
                console.log("Form values:", formData);
                if (!formData.name) {
                  console.log("Name is required");
                  return;
                }
                handleSubmit(formData);
              }}
            >
              {createDashboardMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Dashboard
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}