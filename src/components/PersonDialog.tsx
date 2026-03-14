import { useState, useRef, useCallback, useEffect } from "react";
import { usePerson, useFamilyTree, useNeighbors, useNeighborhood, useCityPeople, useAgeGroup } from "@/hooks/use-search";
import type { SearchResult, Person } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, Minimize2, Maximize2, Star, Pin,
  Users, MapPin, Building2, Calendar, Heart, Home,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────

interface PersonDialogProps {
  tz: string;
  onClose: () => void;
  onOpenPerson: (tz: string) => void;
  onPin?: (person: Person) => void;
  isPinned?: boolean;
  initialPos?: { x: number; y: number };
}

type TabId = "info" | "family" | "neighbors" | "neighborhood" | "city" | "age";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "info", label: "פרטים", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "family", label: "משפחה", icon: <Heart className="h-3.5 w-3.5" /> },
  { id: "neighbors", label: "שכנים", icon: <Home className="h-3.5 w-3.5" /> },
  { id: "neighborhood", label: "שכונה", icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: "city", label: "עיר", icon: <MapPin className="h-3.5 w-3.5" /> },
  { id: "age", label: "גיל", icon: <Calendar className="h-3.5 w-3.5" /> },
];

// ─── Main Dialog ───────────────────────────────────────────

export default function PersonDialog({ tz, onClose, onOpenPerson, onPin, isPinned, initialPos }: PersonDialogProps) {
  const { data: person, isLoading } = usePerson(tz);
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [isMinimized, setIsMinimized] = useState(false);

  // ── Drag state ──
  const dialogRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(initialPos || { x: Math.max(60, window.innerWidth / 2 - 280), y: 80 });
  const [size, setSize] = useState({ w: 560, h: 520 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const onMouseDownDrag = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Resize state ──
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const onMouseDownResize = useCallback((e: React.MouseEvent) => {
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (resizing.current) {
        const dw = e.clientX - resizeStart.current.x;
        const dh = e.clientY - resizeStart.current.y;
        setSize({
          w: Math.max(360, resizeStart.current.w + dw),
          h: Math.max(300, resizeStart.current.h + dh),
        });
      }
    };
    const onUp = () => { resizing.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  if (isLoading) {
    return (
      <div
        ref={dialogRef}
        className="fixed z-50 bg-card border-2 border-primary/30 rounded-xl shadow-elevated"
        style={{ left: pos.x, top: pos.y, width: 300, height: 120 }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!person) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed z-50 bg-card border-2 border-primary/20 rounded-xl shadow-elevated flex flex-col overflow-hidden select-none"
      style={{ left: pos.x, top: pos.y, width: size.w, height: isMinimized ? 48 : size.h }}
      dir="rtl"
    >
      {/* Title bar — draggable */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b cursor-move shrink-0"
        onMouseDown={onMouseDownDrag}
      >
        <span className="font-bold text-sm truncate flex-1">
          {person.first_name} {person.family_name}
        </span>
        <Badge variant="outline" className="font-mono text-[10px] py-0">{person.tz}</Badge>
        <div className="flex gap-0.5">
          {onPin && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPin(person)}>
              <Pin className={`h-3.5 w-3.5 ${isPinned ? "text-primary fill-primary" : ""}`} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(!isMinimized)}>
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex gap-0.5 px-2 py-1 border-b bg-muted/30 overflow-x-auto shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3 text-sm">
            {activeTab === "info" && <InfoTab person={person} />}
            {activeTab === "family" && <FamilyTab tz={tz} person={person} onOpenPerson={onOpenPerson} />}
            {activeTab === "neighbors" && <NeighborsTab tz={tz} onOpenPerson={onOpenPerson} />}
            {activeTab === "neighborhood" && <NeighborhoodTab tz={tz} />}
            {activeTab === "city" && <CityTab tz={tz} onOpenPerson={onOpenPerson} />}
            {activeTab === "age" && <AgeTab tz={tz} onOpenPerson={onOpenPerson} />}
          </div>

          {/* Resize handle */}
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nwse-resize"
            onMouseDown={onMouseDownResize}
          >
            <svg className="w-4 h-4 text-muted-foreground/50" viewBox="0 0 16 16">
              <path d="M14 14L8 14L14 8Z" fill="currentColor" />
              <path d="M14 14L11 14L14 11Z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Info Tab ──────────────────────────────────────────────

function InfoTab({ person }: { person: Person }) {
  const rows: [string, string | null][] = [
    ["ת.ז.", person.tz],
    ["שם משפחה", person.family_name],
    ["שם פרטי", person.first_name],
    ["שם קודם", person.prev_name],
    ["מצב אישי", person.marital],
    ["בית אב", person.clan],
    ["ישוב", person.city],
    ["רחוב", person.street],
    ["מספר בית", person.house_num],
    ["מיקוד", person.zipcode],
    ["קידומת", person.phone_area],
    ["טלפון", person.phone],
    ["טלפונים נוספים", person.extra_phones],
    ["שנת לידה", person.birth_year],
    ["חודש לידה", person.birth_month],
    ["יום לידה", person.birth_day],
    ["ארץ לידה", person.birth_country],
    ["שנת עלייה", person.aliya_year],
    ["שם אב", person.father_name],
    ["ת.ז. אב", person.father_tz],
    ["שם אם", person.mother_name],
    ["ת.ז. אם", person.mother_tz],
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-1.5 py-0.5">
          <span className="text-muted-foreground text-xs min-w-[70px]">{label}:</span>
          <span className="font-medium text-xs">{value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Family Tab ────────────────────────────────────────────

function FamilyTab({ tz, person, onOpenPerson }: { tz: string; person: Person; onOpenPerson: (tz: string) => void }) {
  const { data: tree, isLoading } = useFamilyTree(tz);

  if (isLoading) return <Spinner />;
  if (!tree) return <p className="text-muted-foreground">אין נתונים</p>;

  return (
    <div className="space-y-3">
      {/* Parents */}
      <FamilySection title="הורים">
        <PersonChip label="אב" name={person.father_name} tz={person.father_tz} onClick={onOpenPerson} />
        <PersonChip label="אם" name={person.mother_name} tz={person.mother_tz} onClick={onOpenPerson} />
      </FamilySection>

      {/* Siblings */}
      {tree.siblings && tree.siblings.length > 0 && (
        <FamilySection title={`אחים (${tree.siblings.length})`}>
          {tree.siblings.map((s) => (
            <PersonChip key={s.tz} name={`${s.first_name} ${s.family_name}`} tz={s.tz} year={s.birth_year} onClick={onOpenPerson} />
          ))}
        </FamilySection>
      )}

      {/* Children */}
      {tree.children && tree.children.length > 0 && (
        <FamilySection title={`ילדים (${tree.children.length})`}>
          {tree.children.map((c) => (
            <PersonChip key={c.tz} name={`${c.first_name} ${c.family_name}`} tz={c.tz} year={c.birth_year} onClick={onOpenPerson} />
          ))}
        </FamilySection>
      )}

      {/* Uncles/Aunts from father's side */}
      {tree.uncles_aunts_father && tree.uncles_aunts_father.length > 0 && (
        <FamilySection title={`דודים/דודות (צד אב) (${tree.uncles_aunts_father.length})`}>
          {tree.uncles_aunts_father.map((u) => (
            <PersonChip key={u.tz} name={`${u.first_name} ${u.family_name}`} tz={u.tz} year={u.birth_year} onClick={onOpenPerson} />
          ))}
        </FamilySection>
      )}

      {/* Uncles/Aunts from mother's side */}
      {tree.uncles_aunts_mother && tree.uncles_aunts_mother.length > 0 && (
        <FamilySection title={`דודים/דודות (צד אם) (${tree.uncles_aunts_mother.length})`}>
          {tree.uncles_aunts_mother.map((u) => (
            <PersonChip key={u.tz} name={`${u.first_name} ${u.family_name}`} tz={u.tz} year={u.birth_year} onClick={onOpenPerson} />
          ))}
        </FamilySection>
      )}

      {/* Cousins */}
      {tree.cousins && tree.cousins.length > 0 && (
        <FamilySection title={`בני דודים (${tree.cousins.length})`}>
          {tree.cousins.map((c) => (
            <PersonChip key={c.tz} name={`${c.first_name} ${c.family_name}`} tz={c.tz} year={c.birth_year} onClick={onOpenPerson} />
          ))}
        </FamilySection>
      )}
    </div>
  );
}

// ─── Neighbors Tab ─────────────────────────────────────────

function NeighborsTab({ tz, onOpenPerson }: { tz: string; onOpenPerson: (tz: string) => void }) {
  const [radius, setRadius] = useState(10);
  const { data, isLoading } = useNeighbors(tz, radius);

  if (isLoading) return <Spinner />;
  if (!data) return <p className="text-muted-foreground">אין נתונים</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">טווח בתים:</span>
        {[5, 10, 20, 50].map((r) => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className={`px-2 py-0.5 rounded text-xs ${radius === r ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            ±{r}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {data.person.street}, {data.person.city} — {data.total} שכנים
      </p>
      <PersonList items={data.neighbors} onOpenPerson={onOpenPerson} />
    </div>
  );
}

// ─── Neighborhood Tab ──────────────────────────────────────

function NeighborhoodTab({ tz }: { tz: string }) {
  const { data, isLoading } = useNeighborhood(tz);

  if (isLoading) return <Spinner />;
  if (!data) return <p className="text-muted-foreground">אין נתונים</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{data.city} — {data.total_in_city.toLocaleString()} תושבים</p>
      <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
        {data.streets.map((s) => (
          <div key={s.name} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
            s.name === data.person.street ? "bg-primary/10 font-bold" : "hover:bg-muted"
          }`}>
            <span>{s.name}</span>
            <Badge variant="outline" className="text-[10px] py-0">{s.count}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── City Tab ──────────────────────────────────────────────

function CityTab({ tz, onOpenPerson }: { tz: string; onOpenPerson: (tz: string) => void }) {
  const [page, setPage] = useState(1);
  const [street, setStreet] = useState("");
  const { data, isLoading } = useCityPeople(tz, page, 30, street);

  if (isLoading) return <Spinner />;
  if (!data) return <p className="text-muted-foreground">אין נתונים</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium flex-1">{data.person.city} — {data.total.toLocaleString()} אנשים</p>
        <input
          className="text-xs border rounded px-2 py-0.5 bg-background w-28"
          placeholder="סנן רחוב..."
          value={street}
          onChange={(e) => { setStreet(e.target.value); setPage(1); }}
        />
      </div>
      <PersonList items={data.results} onOpenPerson={onOpenPerson} />
      <Pagination page={page} hasMore={data.has_more} onPage={setPage} />
    </div>
  );
}

// ─── Age Tab ───────────────────────────────────────────────

function AgeTab({ tz, onOpenPerson }: { tz: string; onOpenPerson: (tz: string) => void }) {
  const [rangeYears, setRangeYears] = useState(2);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAgeGroup(tz, rangeYears, page, 30);

  if (isLoading) return <Spinner />;
  if (!data) return <p className="text-muted-foreground">אין נתונים</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">טווח שנים:</span>
        {[0, 1, 2, 5, 10].map((r) => (
          <button
            key={r}
            onClick={() => { setRangeYears(r); setPage(1); }}
            className={`px-2 py-0.5 rounded text-xs ${rangeYears === r ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            ±{r}
          </button>
        ))}
      </div>
      {data.year_range && (
        <p className="text-xs text-muted-foreground">
          שנים {data.year_range[0]}–{data.year_range[1]} — {data.total.toLocaleString()} אנשים
        </p>
      )}
      <PersonList items={data.results} onOpenPerson={onOpenPerson} />
      <Pagination page={page} hasMore={data.has_more} onPage={setPage} />
    </div>
  );
}

// ─── Reusable pieces ───────────────────────────────────────

function FamilySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground mb-1">{title}</h4>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function PersonChip({ label, name, tz, year, onClick }: {
  label?: string;
  name: string | null | undefined;
  tz: string | null | undefined;
  year?: string | null;
  onClick: (tz: string) => void;
}) {
  const display = name?.trim() || "לא ידוע";

  return (
    <button
      onClick={() => tz && onClick(tz)}
      disabled={!tz}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-default"
    >
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span className="font-medium">{display}</span>
      {year && <span className="text-muted-foreground">({year})</span>}
    </button>
  );
}

function PersonList({ items, onOpenPerson }: { items: SearchResult[]; onOpenPerson: (tz: string) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">אין תוצאות</p>;

  return (
    <div className="space-y-0.5 max-h-[260px] overflow-y-auto">
      {items.map((r) => (
        <button
          key={r.row_id}
          onClick={() => onOpenPerson(r.tz)}
          className="flex items-center gap-2 w-full px-2 py-1 rounded text-xs hover:bg-muted transition-colors text-right"
        >
          <span className="font-medium min-w-[100px]">{r.first_name} {r.family_name}</span>
          <span className="text-muted-foreground">{r.city}</span>
          <span className="text-muted-foreground">{r.street}</span>
          {r.phone && <span className="font-mono text-muted-foreground mr-auto">{r.phone}</span>}
          {r.birth_year && <span className="text-muted-foreground">({r.birth_year})</span>}
        </button>
      ))}
    </div>
  );
}

function Pagination({ page, hasMore, onPage }: { page: number; hasMore: boolean; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs">{page}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!hasMore} onClick={() => onPage(page + 1)}>
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
