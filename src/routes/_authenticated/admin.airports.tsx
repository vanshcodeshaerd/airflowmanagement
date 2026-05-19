import { createFileRoute } from "@tanstack/react-router";
import { AirportDirectoryPage } from "@/components/airports/AirportDirectoryPage";

const TITLE = "Airport Management - Admin | AirFlow";
const DESC = "Admin view: add, edit, and manage all airports in the directory.";

export const Route = createFileRoute("/_authenticated/admin/airports")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <AirportDirectoryPage mode="admin" />,
});
