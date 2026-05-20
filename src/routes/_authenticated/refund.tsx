import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, FileText, Hash, Loader2, Mail, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitRefundRequest } from "@/lib/payments-refunds.functions";

export const Route = createFileRoute("/_authenticated/refund")({
  head: () => ({
    meta: [
      { title: "Request a Refund | AirFlow" },
      { name: "description", content: "Submit a refund request for a cancelled or delayed flight." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: RefundPage,
});

const schema = z.object({
  email: z.string().email(),
  booking_id: z.string().min(3),
  transaction_id: z.string().min(5),
  reason: z.string().optional(),
  refund_to_upi: z.string().regex(/^[\w.\-]+@[\w.\-]+$/),
});

function RefundPage() {
  const [form, setForm] = useState({
    email: "",
    booking_id: "",
    transaction_id: "",
    reason: "Flight Cancelled",
    refund_to_upi: "",
  });
  const [success, setSuccess] = useState<null | {
    refund_request_id: string;
    amount: number;
    refund_to_upi: string;
  }>(null);

  const subFn = useServerFn(submitRefundRequest);
  const mut = useMutation({
    mutationFn: () =>
      subFn({
        data: {
          email: form.email.trim(),
          booking_id: form.booking_id.trim(),
          transaction_id: form.transaction_id.trim(),
          reason: form.reason,
          refund_to_upi: form.refund_to_upi.trim(),
        },
      }),
    onSuccess: (res) => setSuccess(res),
    onError: (e: Error) => toast.error(e.message),
  });

  const parsed = schema.safeParse({ ...form });
  const valid = parsed.success;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <Link to="/dashboard/airports">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <h1 className="font-display font-extrabold text-xl">Request a Refund</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        {success ? (
          <div className="border-2 border-green-200 bg-green-50 p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
              <h2 className="font-display font-extrabold text-2xl text-primary">Refund Request Submitted!</h2>
            </div>
            <p className="text-muted-foreground mt-1">
              Your refund request has been received and is under review.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-y-2 gap-x-4 border-2 border-muted bg-white p-4 text-sm">
              <div className="text-muted-foreground">Refund Request ID</div>
              <div className="font-mono font-bold">{success.refund_request_id}</div>
              <div className="text-muted-foreground">Booking ID</div>
              <div className="font-mono">{form.booking_id}</div>
              <div className="text-muted-foreground">Transaction ID</div>
              <div className="font-mono text-xs break-all">{form.transaction_id}</div>
              <div className="text-muted-foreground">Amount</div>
              <div className="font-bold">₹{success.amount.toLocaleString("en-IN")}</div>
              <div className="text-muted-foreground">Refund to UPI</div>
              <div className="font-mono">{success.refund_to_upi}</div>
              <div className="text-muted-foreground">Status</div>
              <div>
                <span className="bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  Pending
                </span>
              </div>
              <div className="text-muted-foreground">Estimated Time</div>
              <div>5-7 business days</div>
            </div>

            <div className="mt-5 border-2 border-accent/30 bg-accent/5 p-4 text-sm">
              <div className="font-bold mb-1">What happens next?</div>
              <ol className="list-decimal pl-5 space-y-0.5 text-muted-foreground">
                <li>Our team will review your request within 24 hours</li>
                <li>If approved, amount will be credited to your UPI ID</li>
                <li>You will receive a notification with the refund status</li>
                <li>Track status from the Notifications bell</li>
              </ol>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="rounded-none bg-accent hover:bg-accent-strong">
                <Link to="/dashboard/airports">Back to Home</Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => {
                  setSuccess(null);
                  setForm({
                    email: "",
                    booking_id: "",
                    transaction_id: "",
                    reason: "Flight Cancelled",
                    refund_to_upi: "",
                  });
                }}
              >
                Submit another
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) mut.mutate();
            }}
            className="space-y-4 border-2 border-muted bg-white p-6"
          >
            <p className="text-sm text-muted-foreground">
              Enter your details below to request a refund for a cancelled or delayed flight.
            </p>

            <Field icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Registered Email ID">
              <Input
                type="email"
                placeholder="yourname@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-none border-2"
              />
            </Field>

            <Field
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              label="Booking ID"
              help="Found in your booking confirmation"
            >
              <Input
                placeholder="6E-20260410-001-XXXXXX"
                value={form.booking_id}
                onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
                className="rounded-none border-2 font-mono"
              />
            </Field>

            <Field
              icon={<Hash className="h-4 w-4 text-muted-foreground" />}
              label="Transaction ID"
              help="Found on your payment success screen"
            >
              <Input
                placeholder="TXN-20260410143052-847291-XXXXXX"
                value={form.transaction_id}
                onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
                className="rounded-none border-2 font-mono text-xs"
              />
            </Field>

            <Field icon={<Receipt className="h-4 w-4 text-muted-foreground" />} label="Reason (Optional)">
              <Select
                value={form.reason}
                onValueChange={(v) => setForm({ ...form, reason: v })}
              >
                <SelectTrigger className="rounded-none border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flight Cancelled">Flight Cancelled</SelectItem>
                  <SelectItem value="Flight Delayed">Flight Delayed</SelectItem>
                  <SelectItem value="Personal Reasons">Personal Reasons</SelectItem>
                  <SelectItem value="Duplicate Booking">Duplicate Booking</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Refund to UPI ID" help="Amount will be refunded to this UPI ID">
              <Input
                placeholder="yourname@paytm"
                value={form.refund_to_upi}
                onChange={(e) => setForm({ ...form, refund_to_upi: e.target.value })}
                className="rounded-none border-2"
              />
            </Field>

            <Button
              type="submit"
              disabled={!valid || mut.isPending}
              className="w-full rounded-none bg-accent hover:bg-accent-strong text-white font-ui font-bold uppercase tracking-wider"
            >
              {mut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying details…
                </>
              ) : (
                "Submit Refund Request"
              )}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({
  icon,
  label,
  help,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary font-bold mb-1">
        {icon}
        {label}
      </label>
      {children}
      {help && <p className="text-[11px] text-muted-foreground mt-1">{help}</p>}
    </div>
  );
}
