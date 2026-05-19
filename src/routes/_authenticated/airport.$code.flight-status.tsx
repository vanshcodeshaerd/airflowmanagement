import { createFileRoute } from "@tanstack/react-router";
import { FeatureStub } from "@/components/airport-dashboard/FeatureStub";

export const Route = createFileRoute("/_authenticated/airport/$code/flight-status")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code?.toUpperCase()} - Flight Status | AirFlow` },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: () => {
    const { code } = Route.useParams();
    return (
      <FeatureStub
        code={code.toUpperCase()}
        title="Check Flight Status"
        description="Real-time flight status, gate info, and delays will be available here."
      />
    );
  },
});
