import { createFileRoute } from "@tanstack/react-router";
import { AirportDirectoryPage } from "@/components/airports/AirportDirectoryPage";

const TITLE = "Indian Airports Directory - Browse All Airports | AirFlow";
const DESC =
  "Browse complete list of Indian airports organized by state and category. Find domestic, international, and private airports. Search and select your airport easily.";

export const Route = createFileRoute("/_authenticated/dashboard/airports")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, follow" },
      {
        name: "keywords",
        content:
          "Indian airports, airport directory, domestic airports India, international airports, airport selection",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: () => <AirportDirectoryPage mode="user" />,
});
