'use client';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBillStore } from '@/store/billStore';

export function DuplicateWarningDialog() {
  const { showDuplicateWarning, duplicateResult, dismissDuplicateWarning, saveBillNow } = useBillStore();
  const router = useRouter();

  if (!showDuplicateWarning || !duplicateResult) return null;

  const topMatch = duplicateResult.matchedBills[0];
  const isCritical = duplicateResult.score >= 85;

  return (
    <Dialog open onOpenChange={dismissDuplicateWarning}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="h-5 w-5" />
            {isCritical ? 'Likely Duplicate Bill Detected' : 'Similar Bill Detected'}
          </DialogTitle>
          <DialogDescription>
            This bill appears similar to an existing bill. Please verify that you haven't accidentally copied and forgotten to update key fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800">Similarity Score: {duplicateResult.score}%</p>
              <p className="text-xs text-yellow-600 mt-0.5">
                {isCritical ? 'Very high chance of duplicate' : 'Moderate similarity — please review'}
              </p>
            </div>
            {topMatch && (
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground">Most similar to</p>
                <p className="text-sm font-semibold">{topMatch.billNumber}</p>
                <p className="text-xs text-muted-foreground">Score: {topMatch.score}%</p>
              </div>
            )}
          </div>

          {duplicateResult.matches.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Fields that match existing bills:</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {duplicateResult.matches.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                    <div>
                      <span className="font-medium text-red-600">{m.field}</span>
                      <span className="text-muted-foreground ml-2">"{m.value}"</span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      Same as {m.matchedBillNumber}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Common causes:</strong> Forgetting to update bill number, buyer details, date, or PO number when duplicating a bill.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {topMatch && (
            <Button variant="outline" onClick={() => { dismissDuplicateWarning(); router.push(`/bills/${topMatch.id}`); }} className="text-sm">
              Review Matched Bill
            </Button>
          )}
          <Button variant="outline" onClick={dismissDuplicateWarning} className="text-sm">
            Continue Editing
          </Button>
          <Button onClick={() => { dismissDuplicateWarning(); saveBillNow(); }} className="text-sm">
            Save Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
