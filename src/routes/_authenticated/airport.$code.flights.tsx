import { createFileRoute } from "@tanstack/react-router";
import { FeatureStub } from "@/components/airport-dashboard/FeatureStub";

export const Route = createFileRoute("/_authenticated/airport/$code/flights")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code?.toUpperCase()} - Book a Flight | AirFlow` },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: () => {
    const { code } = Route.useParams();
    return (
      <FeatureStub
        code={code.toUpperCase()}
        title="Book a Flight"
        description="Flight search and booking from this airport will be available here."
      />
    );
  },
});
