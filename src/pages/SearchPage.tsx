import { useState, useCallback } from "react";
import { useSearch, useStats } from "@/hooks/use-search";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import type { Person } from "@/lib/api";
import PersonDialog from "@/components/PersonDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search, Users, MapPin, Settings, Palette, X,
  Star, Trash2,
} from "lucide-react";

// ─── Favorites persistence ─────────────────────────────────

function loadFavorites(): Person[] {
  try {
    return JSON.parse(localStorage.getItem("zhutoton-favorites") || "[]");
  } catch {
    return [];
  }
}
function saveFavorites(favs: Person[]) {
  localStorage.setItem("zhutoton-favorites", JSON.stringify(favs));
}

// ─── Component ─────────────────────────────────────────────

const SearchPage = () => {
  const { theme, setTheme } = useTheme();
  const [showThemes, setShowThemes] = useState(false);

  const [filters, setFilters] = useState({
    family: "",
    first: "",
    city: "",
    phone: "",
    tz: "",
  });
  const [activeFilters, setActiveFilters] = useState(filters);
  const [page, setPage] = useState(1);

  // Dialogs: multiple can be open at once
  const [openDialogs, setOpenDialogs] = useState<{ tz: string; pos: { x: number; y: number } }[]>([]);

  // Favorites
  const [favorites, setFavorites] = useState<Person[]>(loadFavorites);
  const [showFavorites, setShowFavorites] = useState(false);

  const { data, isLoading, error } = useSearch({
    ...activeFilters,
    page,
    per_page: 50,
  });
  const { data: stats } = useStats();

  const handleSearch = useCallback(() => {
    setPage(1);
    setActiveFilters({ ...filters });
  }, [filters]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const openPersonDialog = useCallback((tz: string) => {
    setOpenDialogs((prev) => {
      if (prev.some((d) => d.tz === tz)) return prev;
      const offset = prev.length * 30;
      return [...prev, { tz, pos: { x: 120 + offset, y: 100 + offset } }];
    });
  }, []);

  const closeDialog = useCallback((tz: string) => {
    setOpenDialogs((prev) => prev.filter((d) => d.tz !== tz));
  }, []);

  const togglePin = useCallback((person: Person) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.tz === person.tz);
      const next = exists ? prev.filter((p) => p.tz !== person.tz) : [...prev, person];
      saveFavorites(next);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Search className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">זהותון</h1>
            <span className="text-sm text-muted-foreground hidden sm:block">מנוע חיפוש אנשים</span>
          </div>

          {stats && (
            <div className="hidden md:flex gap-3 text-sm text-muted-foreground">
              <span><Users className="inline h-4 w-4 ml-1" />{stats.total_people.toLocaleString()}</span>
              <span><MapPin className="inline h-4 w-4 ml-1" />{stats.unique_cities.toLocaleString()} ערים</span>
            </div>
          )}

          <div className="mr-auto flex items-center gap-1">
            {/* Favorites toggle */}
            <Button
              variant={showFavorites ? "default" : "ghost"}
              size="icon"
              className="rounded-full h-8 w-8 relative"
              title="מועדפים"
              onClick={() => setShowFavorites(!showFavorites)}
            >
              <Star className={`h-4 w-4 ${favorites.length > 0 ? "text-yellow-500" : ""}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-0.5 -left-0.5 bg-primary text-primary-foreground text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Button>

            {/* Theme toggle */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowThemes((s) => !s)}
                className="rounded-full h-8 w-8"
                title="ערכות נושא"
              >
                {showThemes ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
              </Button>
              {showThemes && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-card border rounded-xl shadow-elevated p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b">
                    <Palette className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-xs">ערכת נושא</span>
                  </div>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setShowThemes(false); }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-right w-full ${
                        theme === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Favorites bar */}
      {showFavorites && favorites.length > 0 && (
        <div className="bg-muted/50 border-b px-4 py-2">
          <div className="container mx-auto flex flex-wrap gap-1.5 items-center">
            <Star className="h-4 w-4 text-yellow-500 ml-2" />
            {favorites.map((f) => (
              <div key={f.tz} className="inline-flex items-center gap-1 bg-card border rounded-full px-2.5 py-0.5 text-xs">
                <button onClick={() => openPersonDialog(f.tz)} className="font-medium hover:text-primary transition-colors">
                  {f.first_name} {f.family_name}
                </button>
                <button onClick={() => togglePin(f)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 text-muted-foreground"
              onClick={() => { setFavorites([]); saveFavorites([]); }}
            >
              <Trash2 className="h-3 w-3 ml-1" /> נקה הכל
            </Button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Search filters */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              חיפוש
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <Input placeholder="שם משפחה" value={filters.family} onChange={(e) => setFilters((f) => ({ ...f, family: e.target.value }))} onKeyDown={handleKeyDown} className="h-9 text-sm" />
              <Input placeholder="שם פרטי" value={filters.first} onChange={(e) => setFilters((f) => ({ ...f, first: e.target.value }))} onKeyDown={handleKeyDown} className="h-9 text-sm" />
              <Input placeholder="עיר" value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} onKeyDown={handleKeyDown} className="h-9 text-sm" />
              <Input placeholder="טלפון" value={filters.phone} onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))} onKeyDown={handleKeyDown} className="h-9 text-sm" />
              <Input placeholder="ת.ז." value={filters.tz} onChange={(e) => setFilters((f) => ({ ...f, tz: e.target.value }))} onKeyDown={handleKeyDown} className="h-9 text-sm" />
            </div>
            <div className="mt-2 flex gap-2">
              <Button onClick={handleSearch} className="gap-1.5 h-8 text-sm">
                <Search className="h-3.5 w-3.5" /> חפש
              </Button>
              <Button variant="outline" className="h-8 text-sm" onClick={() => {
                setFilters({ family: "", first: "", city: "", phone: "", tz: "" });
                setActiveFilters({ family: "", first: "", city: "", phone: "", tz: "" });
              }}>
                נקה
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-4 text-destructive text-center text-sm">
              שגיאה: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin inline-block w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
            <p className="mt-1.5 text-muted-foreground text-sm">מחפש...</p>
          </div>
        )}

        {data && (
          <Card>
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  נמצאו {data.total.toLocaleString()} תוצאות
                </CardTitle>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>הקודם</Button>
                  <Badge variant="outline" className="text-xs py-0.5">{data.page} / {Math.ceil(data.total / data.per_page)}</Badge>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!data.has_more} onClick={() => setPage((p) => p + 1)}>הבא</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right text-xs py-2">ת.ז.</TableHead>
                      <TableHead className="text-right text-xs py-2">שם משפחה</TableHead>
                      <TableHead className="text-right text-xs py-2">שם פרטי</TableHead>
                      <TableHead className="text-right text-xs py-2">עיר</TableHead>
                      <TableHead className="text-right text-xs py-2">רחוב</TableHead>
                      <TableHead className="text-right text-xs py-2">טלפון</TableHead>
                      <TableHead className="text-right text-xs py-2">שנת לידה</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.results.map((r) => (
                      <TableRow
                        key={r.row_id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => openPersonDialog(r.tz)}
                      >
                        <TableCell className="font-mono text-xs py-1.5">{r.tz}</TableCell>
                        <TableCell className="font-medium text-xs py-1.5">{r.family_name || "—"}</TableCell>
                        <TableCell className="text-xs py-1.5">{r.first_name || "—"}</TableCell>
                        <TableCell className="text-xs py-1.5">{r.city || "—"}</TableCell>
                        <TableCell className="text-xs py-1.5">{r.street || "—"}</TableCell>
                        <TableCell className="font-mono text-xs py-1.5">{r.phone || "—"}</TableCell>
                        <TableCell className="text-xs py-1.5">{r.birth_year || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Person Dialogs (floating) */}
      {openDialogs.map((d) => (
        <PersonDialog
          key={d.tz}
          tz={d.tz}
          onClose={() => closeDialog(d.tz)}
          onOpenPerson={openPersonDialog}
          onPin={togglePin}
          isPinned={favorites.some((f) => f.tz === d.tz)}
          initialPos={d.pos}
        />
      ))}
    </div>
  );
};

export default SearchPage;
