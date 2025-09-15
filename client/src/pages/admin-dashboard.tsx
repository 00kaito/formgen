import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { LayersIcon, Plus, Eye, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { FormTemplate } from "@shared/schema";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import ShareFormModal from "@/components/share-form-modal";
import { useState } from "react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalForms: number;
    totalResponses: number;
    activeLinks: number;
    completionRate: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleCopyLink = async (template: FormTemplate) => {
    const url = `${window.location.origin}/form/${template.shareableLink}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Form link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy link",
        description: "Could not copy the form link",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setDeleteModalOpen(true);
  };

  const handleShare = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setShareModalOpen(true);
  };

  if (templatesLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <LayersIcon className="text-primary text-xl" />
                <h1 className="text-xl font-bold text-foreground">FormFlow</h1>
              </div>
              <nav className="hidden md:flex space-x-1">
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">A</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Forms</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalForms || 0}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <LayersIcon className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Responses</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalResponses || 0}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye className="text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Links</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.activeLinks || 0}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <LinkIcon className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.completionRate || 0}%</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold">%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Form Templates</h2>
            <p className="text-muted-foreground">Create and manage your form templates</p>
          </div>
          <Link href="/form-builder">
            <Button data-testid="button-create-form">
              <Plus className="w-4 h-4 mr-2" />
              Create New Form
            </Button>
          </Link>
        </div>

        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: FormTemplate) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2" data-testid={`text-title-${template.id}`}>
                      {template.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description || "No description provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <LayersIcon className="w-4 h-4 mr-2" />
                  <span>{template.fields.length} fields</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-md ${
                      template.isActive 
                        ? "bg-secondary text-secondary-foreground" 
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {template.isActive ? "Active" : "Draft"}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(template)}
                      data-testid={`button-copy-link-${template.id}`}
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                    <Link href={`/form-builder/${template.id}`}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-${template.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/responses/${template.id}`}>
                      <Button variant="ghost" size="sm" data-testid={`button-view-responses-${template.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      data-testid={`button-delete-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full text-center py-12">
              <LayersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No forms yet</h3>
              <p className="text-muted-foreground mb-4">Create your first form template to get started</p>
              <Link href="/form-builder">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Form
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        template={selectedTemplate}
      />

      <ShareFormModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        template={selectedTemplate}
      />
    </div>
  );
}
