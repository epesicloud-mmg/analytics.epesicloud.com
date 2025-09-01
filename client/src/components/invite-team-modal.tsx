import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2, Mail } from "lucide-react";

interface InviteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
}

const inviteTeamSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["viewer", "editor", "admin"]),
  message: z.string().optional(),
});

type InviteTeamFormData = z.infer<typeof inviteTeamSchema>;

export default function InviteTeamModal({
  isOpen,
  onClose,
  projectId,
}: InviteTeamModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteTeamFormData>({
    resolver: zodResolver(inviteTeamSchema),
    defaultValues: {
      email: "",
      role: "viewer",
      message: "",
    },
  });

  const handleSubmit = async (data: InviteTeamFormData) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call - in a real app, this would send an invitation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Invitation sent",
        description: `Team invitation sent to ${data.email}`,
      });
      
      onClose();
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to collaborate on this project.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter team member's email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={form.watch("role")} 
              onValueChange={(value) => form.setValue("role", value as "viewer" | "editor" | "admin")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer - Can view dashboards and data</SelectItem>
                <SelectItem value="editor">Editor - Can edit dashboards and data</SelectItem>
                <SelectItem value="admin">Admin - Full project access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Input
              id="message"
              placeholder="Add a personal message to the invitation"
              {...form.register("message")}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}