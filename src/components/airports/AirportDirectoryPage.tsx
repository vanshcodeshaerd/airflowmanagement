import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LayoutGrid, List, Plus, LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  listAirports,
  deleteAirport as deleteAirportFn,
} from "@/lib/airports.functions";
import { getCurrentRole } from "@/lib/airport-role.functions";
import { supabase } from "@/integrations/supabase/client";
import type { Airport, SortKey, ViewMode, AirportCategory, AirportStatus } from "./types";
import { FilterBar } from "./FilterBar";
import { AirportCard } from "./AirportCard";
import { AirportDetailModal } from "./AirportDetailModal";
import { AirportFormModal } from "./AirportFormModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { toast } from "sonner";

interface Props {
  mode: "user" | "admin";
}

export function AirportDirectoryPage({ mode }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listAirports);
  const role = useServerFn(getCurrentRole);
  const delFn = useServerFn(deleteAirportFn);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AirportCategory | "">("");
  const [stateFilter, setStateFilter] = useState("");
  const [status, setStatus] = useState<AirportStatus | "">("");
  const [sort, setSort] = useState<SortKey>("alpha");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editAirport, setEditAirport] = useState<Airport | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteAirport, setDeleteAirport] = useState<Airport | null>(null);

  const roleQuery = useQuery({
    queryKey: ["role"],
    queryFn: () => role(),
    staleTime: 60_000,
  });

  // Block non-admins from /admin/airports
  useEffect(() => {
    if (mode === "admin" && roleQuery.data && roleQuery.data.role !== "admin") {
      toast.error("Admin access required");
      navigate({ to: "/dashboard/airports" as never });
    }
  }, [mode, roleQuery.data, navigate]);

  const airportsQuery = useQuery({
    queryKey: ["airports", { search, category, stateFilter, status, sort }],
    queryFn: () =>
      list({
        data: {
          search: search || undefined,
          category: category || undefined,
          state: stateFilter || undefined,
          status: status || undefined,
          sort,
        },
      }),
  });

  useEffect(() => {
    setPage(1);
  }, [search, category, stateFilter, status, sort]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Airport deleted");
      qc.invalidateQueries({ queryKey: ["airports"] });
      setDeleteAirport(null);
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to delete"),
  });

  const all = (airportsQuery.data ?? []) as Airport[];
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paged = all.slice((page - 1) * perPage, page * perPage);

  const states = Array.from(new Set(all.map((a) => a.state))).sort();

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setStateFilter("");
    setStatus("");
    setSort("alpha");
  };

  const filtersActive =
    !!search || !!category || !!stateFilter || !!status || sort !== "alpha";

  async function handleSignOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("userRole");
    navigate({ to: "/auth" as never });
  }

  const isAdmin = mode === "admin" && roleQuery.data?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-5 h-[60px] flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-primary hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-display font-extrabold">AirFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            {mode === "user" && roleQuery.data?.role === "admin" && (
              <Link
                to="/admin/airports"
                className="text-[12px] font-ui font-semibold text-accent hover:underline"
              >
                Admin view
              </Link>
            )}
            {mode === "admin" && (
              <Link
                to="/dashboard/airports"
                className="text-[12px] font-ui font-semibold text-accent hover:underline"
              >
                User view
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-[12px] font-ui font-semibold text-muted-foreground hover:text-primary"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <nav className="text-[12px] text-muted-foreground font-sans mb-2">
            <Link to="/" className="hover:text-accent">
              Home
            </Link>{" "}
            ›{" "}
            <span>
              {mode === "admin" ? "Admin" : "Dashboard"}
            </span>{" "}
            › <span className="text-primary">Airports</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display font-extrabold text-[40px] leading-tight text-primary">
                {mode === "admin" ? "Manage Airports" : "Select Your Airport"}
              </h1>
              <p className="text-[15px] text-muted-foreground font-sans mt-1">
                Browse all airports across India
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-strong text-white font-ui font-bold uppercase tracking-wider text-[13px] px-5 py-2.5 rounded-none transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" /> Add Airport
              </button>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <FilterBar
            search={search}
            onSearch={setSearch}
            category={category}
            onCategory={setCategory}
            stateValue={stateFilter}
            onState={setStateFilter}
            stateOptions={states}
            status={status}
            onStatus={setStatus}
            sort={sort}
            onSort={setSort}
            onClear={clearFilters}
            filtersActive={filtersActive}
          />
        </motion.div>

        <div className="flex items-center justify-between mt-4 mb-4">
          <p className="text-[13px] text-muted-foreground font-sans">
            {airportsQuery.isLoading
              ? "Loading airports…"
              : `Showing ${total} airport${total === 1 ? "" : "s"}`}
            {filtersActive && total > 0 ? " (filtered)" : ""}
          </p>
          <div className="inline-flex border border-border">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 text-[12px] font-ui font-semibold px-3 py-1.5 rounded-none ${
                view === "grid" ? "bg-primary text-white" : "bg-white text-primary"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 text-[12px] font-ui font-semibold px-3 py-1.5 rounded-none border-l border-border ${
                view === "list" ? "bg-primary text-white" : "bg-white text-primary"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
        </div>

        {airportsQuery.isError && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 mb-4 text-sm">
            Failed to load airports.{" "}
            {(airportsQuery.error as Error)?.message ?? "Please try again."}
          </div>
        )}

        {view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paged.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.4 }}
              >
                <AirportCard
                  airport={a}
                  mode={isAdmin ? "admin" : "user"}
                  onView={() => setDetailId(a.id)}
                  onEdit={() => setEditAirport(a)}
                  onDelete={() => setDeleteAirport(a)}
                  onSelect={() =>
                    navigate({
                      to: "/airport/$code/dashboard" as never,
                      params: { code: a.iata_code } as never,
                    })
                  }
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {states
              .filter((s) => paged.some((a) => a.state === s))
              .map((s) => (
                <section key={s}>
                  <h2 className="font-display font-extrabold text-xl text-primary mb-2">
                    {s}{" "}
                    <span className="text-[12px] text-muted-foreground font-sans font-normal">
                      ({paged.filter((a) => a.state === s).length} airports)
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paged
                      .filter((a) => a.state === s)
                      .map((a) => (
                        <AirportCard
                          key={a.id}
                          airport={a}
                          mode={isAdmin ? "admin" : "user"}
                          onView={() => setDetailId(a.id)}
                          onEdit={() => setEditAirport(a)}
                          onDelete={() => setDeleteAirport(a)}
                          onSelect={() =>
                            navigate({
                              to: "/airport/$code/dashboard" as never,
                              params: { code: a.iata_code } as never,
                            })
                          }
                        />
                      ))}
                  </div>
                </section>
              ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-[12px] font-ui font-semibold border border-border bg-white disabled:opacity-50 rounded-none"
            >
              Previous
            </button>
            <span className="text-[13px] text-muted-foreground font-sans">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-[12px] font-ui font-semibold border border-border bg-white disabled:opacity-50 rounded-none"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {detailId && (
        <AirportDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
      {addOpen && (
        <AirportFormModal
          mode="create"
          onClose={() => setAddOpen(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["airports"] })}
        />
      )}
      {editAirport && (
        <AirportFormModal
          mode="edit"
          airport={editAirport}
          onClose={() => setEditAirport(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["airports"] })}
        />
      )}
      {deleteAirport && (
        <DeleteConfirmDialog
          airport={deleteAirport}
          isDeleting={deleteMut.isPending}
          onConfirm={() => deleteMut.mutate(deleteAirport.id)}
          onCancel={() => setDeleteAirport(null)}
        />
      )}
    </div>
  );
}
