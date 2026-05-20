'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Mail, Loader2, Link as LinkIcon } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  billId: string;
  billNumber: string;
  buyerEmail: string;
}

export function SendInvoiceDialog({ open, onClose, orgId, billId, billNumber, buyerEmail }: Props) {
  const [shareUrl, setShareUrl] = useState('');
  const [email, setEmail] = useState(buyerEmail);
  const [loadingLink, setLoadingLink] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && !shareUrl) {
      setLoadingLink(true);
      fetch(`/api/orgs/${orgId}/bills/${billId}/share`, { method: 'POST' })
        .then((r) => r.json())
        .then((d) => { if (d.shareUrl) setShareUrl(d.shareUrl); })
        .catch(() => toast.error('Failed to generate share link'))
        .finally(() => setLoadingLink(false));
    }
    if (open) setEmail(buyerEmail);
  }, [open]);

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendEmail() {
    if (!email) { toast.error('Enter recipient email'); return; }
    setSendingEmail(true);
    const res = await fetch(`/api/orgs/${orgId}/bills/${billId}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email }),
    });
    const data = await res.json();
    setSendingEmail(false);
    if (res.ok) {
      toast.success('Invoice sent by email');
      onClose();
    } else {
      toast.error(data.error || 'Failed to send email');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Invoice — {billNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Share link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" /> Shareable Link
            </Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={loadingLink ? 'Generating…' : shareUrl}
                className="font-mono text-xs bg-muted"
              />
              <Button size="sm" variant="outline" onClick={handleCopy} disabled={!shareUrl || loadingLink}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Anyone with this link can view the invoice without logging in.</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or email directly</span></div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Send to Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@company.com"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSendEmail} disabled={sendingEmail || !email}>
            {sendingEmail ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Sending…</> : <><Mail className="h-3.5 w-3.5 mr-1.5" />Send Email</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
