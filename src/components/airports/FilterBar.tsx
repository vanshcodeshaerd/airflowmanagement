import { Search, Filter, MapPin, X } from "lucide-react";
import type { AirportCategory, AirportStatus, SortKey } from "./types";
import { ALL_CATEGORIES, ALL_STATUSES } from "./types";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  category: AirportCategory | "";
  onCategory: (v: AirportCategory | "") => void;
  stateValue: string;
  onState: (v: string) => void;
  stateOptions: string[];
  status: AirportStatus | "";
  onStatus: (v: AirportStatus | "") => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  onClear: () => void;
  filtersActive: boolean;
}

const selectCls =
  "rounded-none border-2 border-border bg-white text-[13px] font-sans px-3 py-2.5 focus:outline-none focus:border-accent transition";

export function FilterBar(p: Props) {
  return (
    <div className="bg-white border border-border p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
      <div className="relative md:col-span-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={p.search}
          onChange={(e) => p.onSearch(e.target.value)}
          placeholder="Search airports by name, code, or city…"
          className="w-full rounded-none border-2 border-border bg-white text-[13px] font-sans pl-9 pr-3 py-2.5 focus:outline-none focus:border-accent transition"
        />
      </div>

      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <select
          value={p.category}
          onChange={(e) => p.onCategory(e.target.value as AirportCategory | "")}
          className={selectCls + " pl-9 w-full appearance-none"}
        >
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <select
          value={p.stateValue}
          onChange={(e) => p.onState(e.target.value)}
          className={selectCls + " pl-9 w-full appearance-none"}
        >
          <option value="">All states</option>
          {p.stateOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <select
        value={p.status}
        onChange={(e) => p.onStatus(e.target.value as AirportStatus | "")}
        className={selectCls + " w-full appearance-none"}
      >
        <option value="">All statuses</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={p.sort}
        onChange={(e) => p.onSort(e.target.value as SortKey)}
        className={selectCls + " w-full appearance-none"}
      >
        <option value="alpha">Alphabetical</option>
        <option value="passengers">Passengers (High to Low)</option>
        <option value="state">By State</option>
      </select>

      {p.filtersActive && (
        <button
          onClick={p.onClear}
          className="md:col-span-6 inline-flex items-center justify-center gap-1.5 text-[12px] font-ui font-semibold text-accent hover:text-accent-strong"
        >
          <X className="w-3.5 h-3.5" /> Clear All
        </button>
      )}
    </div>
  );
}
