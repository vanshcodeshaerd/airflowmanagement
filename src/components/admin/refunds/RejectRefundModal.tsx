import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminRejectRefund } from "@/lib/payments-refunds.functions";

const REASONS = [
  "Booking not eligible for refund",
  "Transaction ID mismatch",
  "Refund already processed",
  "Past refund window",
  "Duplicate request",
];

export function RejectRefundModal({ refund, onClose, onDone }: { refund: any; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [notify, setNotify] = useState(true);
  const fn = useServerFn(adminRejectRefund);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: { refund_id: refund.id, reason, notes: notes || undefined, notify },
      }),
    onSuccess: () => {
      toast.success("Refund rejected");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>Reject Refund Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="text-xs text-muted-foreground">
            {refund.refund_request_id} · {refund.request_email} · ₹{Number(refund.refund_amount).toLocaleString("en-IN")}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-primary font-bold">Rejection Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="rounded-none border-2 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-primary font-bold">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-none border-2 mt-1"
              rows={3}
              placeholder="Add internal notes for this rejection"
            />
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
            Notify passenger
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
            className="rounded-none bg-red-600 hover:bg-red-700 text-white"
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
