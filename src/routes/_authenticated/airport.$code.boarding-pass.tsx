import { createFileRoute, Link } from "@tanstack/react-router";
import { FeatureStub } from "@/components/airport-dashboard/FeatureStub";

export const Route = createFileRoute("/_authenticated/airport/$code/boarding-pass")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code?.toUpperCase()} - Boarding Pass | AirFlow` },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: () => {
    const { code } = Route.useParams();
    return (
      <FeatureStub
        code={code.toUpperCase()}
        title="Generate Boarding Pass"
        description="Digital boarding pass generation will be available here."
      />
    );
  },
});
