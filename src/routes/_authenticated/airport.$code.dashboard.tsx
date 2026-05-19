import { createFileRoute } from "@tanstack/react-router";
import { AirportDashboard } from "@/components/airport-dashboard/AirportDashboard";

export const Route = createFileRoute("/_authenticated/airport/$code/dashboard")({
  head: ({ params }) => {
    const code = params.code?.toUpperCase() ?? "";
    const title = `${code} - Manage Flights & Boarding | AirFlow`;
    const desc = `Manage your flights at ${code}. Generate boarding passes, check flight status, or book a new flight in seconds.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "noindex, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: RouteCmp,
});

function RouteCmp() {
  const { code } = Route.useParams();
  return <AirportDashboard code={code.toUpperCase()} />;
}
