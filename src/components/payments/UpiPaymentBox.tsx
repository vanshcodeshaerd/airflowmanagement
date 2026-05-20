import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, CheckCircle2, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeUpiPayment } from "@/lib/payments-refunds.functions";

interface Props {
  bookingId: string;
  amount: number;
  onPaid: (txn: string) => void;
}

const CHIPS = ["@paytm", "@okhdfcbank", "@ybl", "@gpay", "@oksbi"];

export function UpiPaymentBox({ bookingId, amount, onPaid }: Props) {
  const [upi, setUpi] = useState("");
  const [success, setSuccess] = useState<{ txn: string } | null>(null);
  const payFn = useServerFn(completeUpiPayment);
  const mut = useMutation({
    mutationFn: () => payFn({ data: { booking_id: bookingId, user_upi_id: upi.trim() } }),
    onSuccess: (res) => {
      setSuccess({ txn: res.transaction_reference });
      onPaid(res.transaction_reference);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = /^[\w.\-]+@[\w.\-]+$/.test(upi.trim());

  const handlePay = async () => {
    // 1.5s simulated processing
    await new Promise((r) => setTimeout(r, 1500));
    mut.mutate();
  };

  if (success) {
    return (
      <div className="space-y-3 border-2 border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 font-display font-extrabold text-green-800">
          <CheckCircle2 className="h-5 w-5" /> Payment Successful
        </div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Transaction ID</div>
        <div className="flex items-center gap-2 break-all rounded-none border-2 border-green-300 bg-white px-3 py-2 font-mono text-sm">
          {success.txn}
          <button
            className="ml-auto rounded-none border border-green-300 p-1 hover:bg-green-100"
            onClick={() => {
              navigator.clipboard.writeText(success.txn);
              toast.success("Transaction ID copied");
            }}
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
        <div className="bg-amber-50 border-2 border-amber-300 p-3 text-xs text-amber-900">
          <strong>IMPORTANT:</strong> Save this Transaction ID — it's required for any refund request.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border-2 border-muted bg-muted/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pay To UPI ID</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono font-bold text-accent">airflow.payments@upi</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText("airflow.payments@upi");
              toast.success("UPI ID copied");
            }}
            className="p-1 hover:bg-muted"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">AirFlow Payments Gateway</div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Your UPI ID</div>
        <Input
          placeholder="yourname@paytm"
          value={upi}
          onChange={(e) => setUpi(e.target.value)}
          className="rounded-none border-2"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {CHIPS.map((c) => (
            <span key={c} className="border border-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="border-2 border-accent/30 bg-accent/5 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount to Pay</div>
        <div className="flex items-center text-2xl font-bold text-accent">
          <IndianRupee className="h-5 w-5" />
          {amount.toLocaleString("en-IN")}
        </div>
        <div className="text-[11px] text-muted-foreground">Including all taxes and fees</div>
      </div>

      <Button
        type="button"
        disabled={!valid || mut.isPending}
        onClick={handlePay}
        className="w-full rounded-none bg-green-600 hover:bg-green-700 text-white font-ui font-bold uppercase tracking-wider"
      >
        {mut.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
          </>
        ) : (
          <>Pay ₹{amount.toLocaleString("en-IN")} via UPI</>
        )}
      </Button>
    </div>
  );
}
