"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { type Discipline, gradesForDiscipline } from "@/lib/grades";
import { holdColor, holdInk } from "@/lib/holds";
import { FavoriteHeart } from "./FavoriteHeart";
import {
  PlayCircleIcon,
  SearchIcon,
  SlidersIcon,
  MountainIcon,
  PlusIcon,
} from "./icons";

// A route enriched on the server with community counts + a display-ready
// "set" label (computed server-side so there's no hydration mismatch).
type Route = {
  id: string;
  name: string;
  discipline: Discipline;
  color: string | null;
  grade_label: string;
  grade_order: number;
  wall_id: string | null;
  set_date: string | null;
  beta: number; // ready beta-video count
  sends: number; // total sends
  setLabel: string | null; // e.g. "today", "3d ago", "2w ago"
};

type Wall = {
  id: string;
  name: string;
  sort_order: number;
};

type SortKey = "grade" | "color" | "discipline" | "wall";

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: "Boulder",
  top_rope: "Top rope",
  lead: "Lead",
};

// Fixed order so the V-scale and YDS blocks don't interleave when sorting by
// grade across all disciplines (their grade_order index spaces overlap).
const DISCIPLINE_ORDER: Record<Discipline, number> = {
  boulder: 0,
  top_rope: 1,
  lead: 2,
};

// Sort chip options, keyed by `${sortKey}:${sortDir}`.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "grade:desc", label: "Grade · hardest" },
  { value: "grade:asc", label: "Grade · easiest" },
  { value: "discipline:asc", label: "Discipline" },
  { value: "color:asc", label: "Color" },
  { value: "wall:asc", label: "Wall" },
];

// Custom dropdown used by the toolbar's filter/sort chips — a pill button plus a
// themed, animated popover menu (the native <select> popup can't be styled). The
// chosen value shows on the pill; the menu closes on select, outside-click, or
// Escape.
type SelectOption = { value: string; label: string };
function SelectChip({
  label,
  icon,
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  label?: string;
  icon?: ReactNode;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className="gd-select" ref={ref}>
      <button
        type="button"
        className={"gd-select-btn" + (open ? " is-open" : "")}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
        {label && <span className="lbl">{label}</span>}
        <span className="val">{current?.label ?? ""}</span>
        <span className="chev" aria-hidden="true" />
      </button>
      <div
        className={"gd-menu" + (open ? " is-open" : "")}
        role="listbox"
        aria-label={ariaLabel}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            className={"gd-menu-item" + (o.value === value ? " is-sel" : "")}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// A flat list of tappable option chips — used inside the mobile filter sheet in
// place of the SelectChip dropdowns (a downward popover would overflow a
// bottom-pinned sheet). `scroll` keeps long lists (grades) on one swipeable row.
type SheetOpt = { value: string; label: string; swatch?: string };
function ChipGroup({
  options,
  value,
  onChange,
  scroll = false,
}: {
  options: SheetOpt[];
  value: string;
  onChange: (value: string) => void;
  scroll?: boolean;
}) {
  return (
    <div className={"gd-chips" + (scroll ? " is-scroll" : "")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={"gd-chip" + (o.value === value ? " is-active" : "")}
          onClick={() => onChange(o.value)}
        >
          {o.swatch && (
            <span className="sw" style={{ background: o.swatch }} aria-hidden />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}


export function RouteBrowser({
  routes,
  walls,
  favoritedRouteIds,
  canFavorite,
  canManage,
  gymId,
}: {
  routes: Route[];
  walls: Wall[];
  favoritedRouteIds: string[];
  canFavorite: boolean;
  canManage: boolean;
  gymId: string;
}) {
  const favorited = useMemo(
    () => new Set(favoritedRouteIds),
    [favoritedRouteIds],
  );
  const [discipline, setDiscipline] = useState<"all" | Discipline>("all");
  const [gradeMin, setGradeMin] = useState(0);
  const [gradeMax, setGradeMax] = useState(0);
  const [color, setColor] = useState<"all" | string>("all");
  const [wall, setWall] = useState<"all" | "unassigned" | string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const sheetRef = useRef<HTMLDialogElement>(null);

  const colors = useMemo(
    () =>
      Array.from(
        new Set(routes.map((r) => r.color).filter((c): c is string => !!c)),
      ).sort((a, b) => a.localeCompare(b)),
    [routes],
  );

  const activeGrades = useMemo(
    () => (discipline === "all" ? [] : gradesForDiscipline(discipline)),
    [discipline],
  );

  // Count of active filters that live in the mobile sheet (Color/Wall/Grade) so
  // the Filters button can flag hidden state. Sort is not a filter, so excluded.
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (color !== "all") n += 1;
    if (wall !== "all") n += 1;
    if (
      discipline !== "all" &&
      (gradeMin > 0 || gradeMax < activeGrades.length - 1)
    )
      n += 1;
    return n;
  }, [color, wall, discipline, gradeMin, gradeMax, activeGrades]);

  // Per-discipline counts for the filter pills.
  const disciplineCounts = useMemo(() => {
    const c = {
      all: routes.length,
      boulder: 0,
      top_rope: 0,
      lead: 0,
    } as Record<"all" | Discipline, number>;
    for (const r of routes) c[r.discipline] += 1;
    return c;
  }, [routes]);

  const wallName = useMemo(() => {
    const map = new Map(walls.map((w) => [w.id, w.name]));
    return (id: string | null) => (id && map.get(id)) || "Unassigned";
  }, [walls]);

  const wallSortValue = useMemo(() => {
    const map = new Map(walls.map((w) => [w.id, w.sort_order]));
    return (id: string | null) =>
      id && map.has(id) ? (map.get(id) as number) : Number.MAX_SAFE_INTEGER;
  }, [walls]);

  function onDisciplineChange(next: "all" | Discipline) {
    setDiscipline(next);
    if (next !== "all") {
      setGradeMin(0);
      setGradeMax(gradesForDiscipline(next).length - 1);
    }
  }

  function clearFilters() {
    setDiscipline("all");
    setGradeMin(0);
    setGradeMax(0);
    setColor("all");
    setWall("all");
    setQuery("");
    setSortKey("grade");
    setSortDir("asc");
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = routes.filter((r) => {
      if (discipline !== "all") {
        if (r.discipline !== discipline) return false;
        if (r.grade_order < gradeMin || r.grade_order > gradeMax) return false;
      }
      if (color !== "all" && r.color !== color) return false;
      if (wall === "unassigned") {
        if (r.wall_id !== null) return false;
      } else if (wall !== "all") {
        if (r.wall_id !== wall) return false;
      }
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "grade":
          cmp = DISCIPLINE_ORDER[a.discipline] - DISCIPLINE_ORDER[b.discipline];
          if (cmp === 0) cmp = a.grade_order - b.grade_order;
          break;
        case "color":
          cmp = (a.color ?? "").localeCompare(b.color ?? "");
          break;
        case "discipline":
          cmp = DISCIPLINE_ORDER[a.discipline] - DISCIPLINE_ORDER[b.discipline];
          break;
        case "wall":
          cmp = wallSortValue(a.wall_id) - wallSortValue(b.wall_id);
          break;
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [
    routes,
    discipline,
    gradeMin,
    gradeMax,
    color,
    wall,
    sortKey,
    sortDir,
    query,
    wallSortValue,
  ]);

  // Brand-new gym with no routes at all → full empty-state card.
  if (routes.length === 0) {
    return (
      <div className="gd-empty">
        <div className="gd-empty-ic">
          <MountainIcon />
        </div>
        <h3>No routes set yet</h3>
        <p>
          This gym hasn&apos;t published any routes. Once the setters log their
          first problems, they&apos;ll show up here with grades, beta, and
          sends.
        </p>
        {canManage ? (
          <Link className="gd-empty-cta" href={`/gyms/${gymId}/manage`}>
            <PlusIcon />
            Add the first route
          </Link>
        ) : (
          <span className="gd-empty-soon">Check back soon</span>
        )}
      </div>
    );
  }

  const DISCIPLINE_PILLS: ["all" | Discipline, string][] = [
    ["all", "All"],
    ["boulder", "Boulder"],
    ["lead", "Lead"],
    ["top_rope", "Top-rope"],
  ];

  return (
    <div>
      <div className="gd-toolbar">
        <div className="gd-tb-left">
          {DISCIPLINE_PILLS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={"gd-pill" + (discipline === value ? " is-active" : "")}
              onClick={() => onDisciplineChange(value)}
            >
              {label}
              <span className="ct">{disciplineCounts[value]}</span>
            </button>
          ))}

          <SelectChip
            label="Min"
            ariaLabel="Minimum grade"
            disabled={discipline === "all"}
            value={String(gradeMin)}
            options={
              discipline === "all"
                ? [{ value: "0", label: "Any" }]
                : activeGrades.map((g, i) => ({ value: String(i), label: g }))
            }
            onChange={(v) => {
              const next = Number(v);
              setGradeMin(next);
              if (next > gradeMax) setGradeMax(next);
            }}
          />

          <SelectChip
            label="Max"
            ariaLabel="Maximum grade"
            disabled={discipline === "all"}
            value={String(gradeMax)}
            options={
              discipline === "all"
                ? [{ value: "0", label: "Any" }]
                : activeGrades.map((g, i) => ({ value: String(i), label: g }))
            }
            onChange={(v) => {
              const next = Number(v);
              setGradeMax(next);
              if (next < gradeMin) setGradeMin(next);
            }}
          />

          <SelectChip
            label="Color"
            ariaLabel="Color"
            value={color}
            options={[
              { value: "all", label: "Any" },
              ...colors.map((c) => ({ value: c, label: c })),
            ]}
            onChange={(v) => setColor(v)}
          />

          <SelectChip
            label="Wall"
            ariaLabel="Wall"
            value={wall}
            options={[
              { value: "all", label: "All walls" },
              ...walls.map((w) => ({ value: w.id, label: w.name })),
              { value: "unassigned", label: "Unassigned" },
            ]}
            onChange={(v) => setWall(v)}
          />
        </div>

        <div className="gd-tb-right">
          <div className="gd-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter routes"
              aria-label="Filter routes by name"
            />
          </div>
          <SelectChip
            icon={<SlidersIcon />}
            ariaLabel="Sort routes"
            value={`${sortKey}:${sortDir}`}
            options={SORT_OPTIONS}
            onChange={(v) => {
              const [k, d] = v.split(":") as [SortKey, "asc" | "desc"];
              setSortKey(k);
              setSortDir(d);
            }}
          />
          <button
            type="button"
            className="gd-filters-btn"
            aria-label="Filters and sort"
            onClick={() => sheetRef.current?.showModal()}
          >
            <SlidersIcon />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ct">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile-only filter/sort sheet — the inline chips above are hidden below
          720px and surfaced here as tappable options. Live-applies (same setters
          as desktop); native <dialog> gives backdrop + Escape for free. */}
      <dialog
        ref={sheetRef}
        className="gd-sheet"
        onClick={(e) => {
          if (e.target === sheetRef.current) sheetRef.current.close();
        }}
      >
        <div className="gd-sheet-inner">
          <div className="gd-sheet-head">
            <span className="gd-fsec-lbl">Filters &amp; sort</span>
            <button
              type="button"
              className="gd-sheet-x"
              aria-label="Close"
              onClick={() => sheetRef.current?.close()}
            >
              ✕
            </button>
          </div>

          <div className="gd-sheet-body">
            <section className="gd-fsec">
              <span className="gd-fsec-lbl">Grade</span>
              {discipline === "all" ? (
                <p className="gd-fsec-hint">
                  Pick a discipline to filter by grade.
                </p>
              ) : (
                <>
                  <span className="gd-fsec-sub">Min</span>
                  <ChipGroup
                    scroll
                    value={String(gradeMin)}
                    options={activeGrades.map((g, i) => ({
                      value: String(i),
                      label: g,
                    }))}
                    onChange={(v) => {
                      const next = Number(v);
                      setGradeMin(next);
                      if (next > gradeMax) setGradeMax(next);
                    }}
                  />
                  <span className="gd-fsec-sub">Max</span>
                  <ChipGroup
                    scroll
                    value={String(gradeMax)}
                    options={activeGrades.map((g, i) => ({
                      value: String(i),
                      label: g,
                    }))}
                    onChange={(v) => {
                      const next = Number(v);
                      setGradeMax(next);
                      if (next < gradeMin) setGradeMin(next);
                    }}
                  />
                </>
              )}
            </section>

            <section className="gd-fsec">
              <span className="gd-fsec-lbl">Color</span>
              <ChipGroup
                value={color}
                options={[
                  { value: "all", label: "Any" },
                  ...colors.map((c) => ({
                    value: c,
                    label: c,
                    swatch: holdColor(c),
                  })),
                ]}
                onChange={(v) => setColor(v)}
              />
            </section>

            <section className="gd-fsec">
              <span className="gd-fsec-lbl">Wall</span>
              <ChipGroup
                value={wall}
                options={[
                  { value: "all", label: "All walls" },
                  ...walls.map((w) => ({ value: w.id, label: w.name })),
                  { value: "unassigned", label: "Unassigned" },
                ]}
                onChange={(v) => setWall(v)}
              />
            </section>

            <section className="gd-fsec">
              <span className="gd-fsec-lbl">Sort</span>
              <ChipGroup
                value={`${sortKey}:${sortDir}`}
                options={SORT_OPTIONS}
                onChange={(v) => {
                  const [k, d] = v.split(":") as [SortKey, "asc" | "desc"];
                  setSortKey(k);
                  setSortDir(d);
                }}
              />
            </section>
          </div>

          <div className="gd-sheet-foot">
            <button
              type="button"
              className="gd-sheet-clear"
              onClick={clearFilters}
            >
              Clear all
            </button>
            <button
              type="button"
              className="gd-sheet-done"
              onClick={() => sheetRef.current?.close()}
            >
              Done
            </button>
          </div>
        </div>
      </dialog>

      <div className="gd-list">
        {visible.length === 0 ? (
          <p className="gd-noresults">
            No routes match these filters.
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </p>
        ) : (
          <div className="gd-clist">
            {visible.map((r) => {
              const band = holdColor(r.color);
              const ink = holdInk(r.color);
              return (
                <Link key={r.id} href={`/routes/${r.id}`} className="gd-crow">
                  <div className="gd-cband" style={{ background: band }}>
                    <span className="g" style={{ color: ink }}>
                      {r.grade_label}
                    </span>
                    {r.color && (
                      <span className="col" style={{ color: ink }}>
                        {r.color}
                      </span>
                    )}
                  </div>
                  <div className="gd-crow-body">
                    <div className="gd-crow-l">
                      <div className="gd-crow-name">{r.name}</div>
                      <div className="gd-crow-meta">
                        <span className="gd-m-disc">
                          {DISCIPLINE_LABEL[r.discipline]}
                        </span>
                        <span className="dot" />
                        <span>{wallName(r.wall_id)}</span>
                        {r.setLabel && (
                          <>
                            <span className="dot" />
                            <span className="gd-m-set">Set {r.setLabel}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="gd-crow-r">
                      <div
                        className={
                          "gd-stat-mini" + (r.beta === 0 ? " muted" : "")
                        }
                      >
                        <span className="n">
                          <PlayCircleIcon />
                          {r.beta}
                        </span>
                        <span className="l">Beta</span>
                      </div>
                      <div
                        className={
                          "gd-stat-mini sends" + (r.sends === 0 ? " muted" : "")
                        }
                      >
                        <span className="n">{r.sends}</span>
                        <span className="l">Sends</span>
                      </div>
                      {canFavorite && (
                        <FavoriteHeart
                          kind="route"
                          id={r.id}
                          favorited={favorited.has(r.id)}
                        />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
