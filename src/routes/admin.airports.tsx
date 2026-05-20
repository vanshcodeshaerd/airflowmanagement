import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/airports")({
  component: AdminAirportsLayout,
});

function AdminAirportsLayout() {
  return <Outlet />;
}
