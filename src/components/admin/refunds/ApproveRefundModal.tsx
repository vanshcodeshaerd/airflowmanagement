import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { adminApproveRefund } from "@/lib/payments-refunds.functions";

export function ApproveRefundModal({ refund, onClose, onDone }: { refund: any; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(refund.refund_amount));
  const [notes, setNotes] = useState("");
  const [notify, setNotify] = useState(true);
  const fn = useServerFn(adminApproveRefund);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          refund_id: refund.id,
          amount: Number(amount),
          admin_notes: notes || undefined,
          notify,
        },
      }),
    onSuccess: () => {
      toast.success("Refund approved");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-none">
        <DialogHeader>
          <DialogTitle>Approve Refund Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="border-2 border-muted bg-muted/30 p-3 grid grid-cols-2 gap-y-1">
            <div className="text-muted-foreground">Refund ID</div>
            <div className="font-mono">{refund.refund_request_id}</div>
            <div className="text-muted-foreground">Email</div>
            <div>{refund.request_email}</div>
            <div className="text-muted-foreground">Booking</div>
            <div className="font-mono text-xs">{refund.request_booking_id}</div>
            <div className="text-muted-foreground">Txn</div>
            <div className="font-mono text-xs break-all">{refund.request_txn_id}</div>
            <div className="text-muted-foreground">Refund to UPI</div>
            <div className="font-mono">{refund.refund_to_upi}</div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-primary font-bold">Refund Amount (₹)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-none border-2 mt-1"
            />
            <div className="text-[11px] text-muted-foreground">Original: ₹{Number(refund.refund_amount).toLocaleString("en-IN")}</div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-primary font-bold">Admin Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-none border-2 mt-1"
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
            Send notification to passenger
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mut.isPending || !Number(amount)}
            onClick={() => mut.mutate()}
            className="rounded-none bg-green-600 hover:bg-green-700 text-white"
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
