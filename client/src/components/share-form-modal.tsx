import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, X, Twitter, Facebook, Linkedin, Mail } from "lucide-react";
import type { FormTemplate } from "@shared/schema";

interface ShareFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FormTemplate | null;
}

export default function ShareFormModal({ open, onOpenChange, template }: ShareFormModalProps) {
  const { toast } = useToast();

  if (!template) return null;

  const formUrl = `${window.location.origin}/form/${template.shareableLink}`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
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

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      toast({
        title: "Embed code copied!",
        description: "Embed code has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy embed code",
        description: "Could not copy the embed code",
        variant: "destructive",
      });
    }
  };

  const handleSocialShare = (platform: string) => {
    const text = `Check out this form: ${template.title}`;
    const url = formUrl;
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(template.title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Share Form</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-share"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Public Form Link</label>
            <div className="flex space-x-2">
              <Input
                readOnly
                value={formUrl}
                className="flex-1 bg-muted"
                data-testid="input-form-url"
              />
              <Button onClick={handleCopyLink} data-testid="button-copy-link">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleSocialShare('twitter')}
              className="flex items-center justify-center space-x-2"
              data-testid="button-share-twitter"
            >
              <Twitter className="w-4 h-4 text-blue-400" />
              <span>Twitter</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSocialShare('facebook')}
              className="flex items-center justify-center space-x-2"
              data-testid="button-share-facebook"
            >
              <Facebook className="w-4 h-4 text-blue-600" />
              <span>Facebook</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSocialShare('linkedin')}
              className="flex items-center justify-center space-x-2"
              data-testid="button-share-linkedin"
            >
              <Linkedin className="w-4 h-4 text-blue-700" />
              <span>LinkedIn</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSocialShare('email')}
              className="flex items-center justify-center space-x-2"
              data-testid="button-share-email"
            >
              <Mail className="w-4 h-4 text-gray-600" />
              <span>Email</span>
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-foreground">Embed Code</h4>
              <Button variant="outline" size="sm" onClick={handleCopyEmbed} data-testid="button-copy-embed">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              readOnly
              value={embedCode}
              rows={3}
              className="bg-muted font-mono text-sm resize-none"
              data-testid="textarea-embed-code"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
