import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Search, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AddPersonForm from "./AddPersonForm";

const PeopleTab = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      toast.success("נמחק בהצלחה");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const { error } = await supabase.from("people").insert(records);
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      toast.success(`יובאו ${count} רשומות בהצלחה`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error("הקובץ ריק או חסר כותרות");
          return;
        }

        // Try to detect delimiter
        const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : "|";
        const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

        const fieldMap: Record<string, string> = {
          "שם פרטי": "first_name", "first_name": "first_name", "firstname": "first_name", "שם": "first_name",
          "שם משפחה": "last_name", "last_name": "last_name", "lastname": "last_name", "משפחה": "last_name",
          "מגדר": "gender", "gender": "gender",
          "גיל": "age", "age": "age",
          "עיר": "city", "city": "city",
          "טלפון": "phone", "phone": "phone", "tel": "phone",
          "אימייל": "email", "email": "email",
          "מקצוע": "occupation", "occupation": "occupation", "עיסוק": "occupation",
          "השכלה": "education", "education": "education",
          "רמת דתיות": "religiosity", "religiosity": "religiosity", "דתיות": "religiosity",
          "תחביבים": "hobbies", "hobbies": "hobbies",
          "העדפות": "preferences", "preferences": "preferences",
          "סטטוס": "status", "status": "status",
          "הערות": "notes", "notes": "notes",
        };

        const mappedHeaders = headers.map((h) => fieldMap[h] || null);

        const records = lines.slice(1).map((line) => {
          const values = line.split(delimiter).map((v) => v.trim());
          const record: any = { created_by: user.id };
          mappedHeaders.forEach((field, i) => {
            if (field && values[i]) {
              record[field] = field === "age" ? parseInt(values[i]) || null : values[i];
            }
          });
          return record;
        }).filter((r) => r.first_name && r.last_name);

        if (records.length === 0) {
          toast.error("לא נמצאו רשומות תקינות. ודאו שהקובץ מכיל לפחות שם פרטי ושם משפחה.");
          return;
        }

        importMutation.mutate(records);
      } catch {
        toast.error("שגיאה בקריאת הקובץ");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = people.filter((p: any) =>
    `${p.first_name} ${p.last_name} ${p.city || ""} ${p.occupation || ""}`.includes(search)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Actions bar */}
      <div className="p-3 space-y-2 border-b border-sidebar-border">
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => setShowForm(!showForm)} className="flex-1 gap-1.5">
            <Plus className="w-4 h-4" />
            הוספה
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-1.5">
            <Upload className="w-4 h-4" />
            ייבוא TXT
          </Button>
          <input ref={fileInputRef} type="file" accept=".txt,.csv,.tsv" className="hidden" onChange={handleFileImport} />
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="w-full h-9 pr-9 pl-3 rounded-lg border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Add person form */}
      {showForm && <AddPersonForm onClose={() => setShowForm(false)} />}

      {/* People list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {search ? "לא נמצאו תוצאות" : "אין אנשים עדיין. הוסיפו או ייבאו נתונים."}
          </div>
        ) : (
          filtered.map((person: any) => {
            const isExpanded = expandedId === person.id;
            return (
              <div key={person.id} className="rounded-lg border border-sidebar-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : person.id)}
                  className="w-full flex items-center justify-between p-3 text-right hover:bg-sidebar-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {person.first_name} {person.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[person.age && `${person.age}`, person.city].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1.5 text-xs border-t border-sidebar-border pt-2">
                    {person.gender && <Detail label="מגדר" value={person.gender} />}
                    {person.phone && <Detail label="טלפון" value={person.phone} />}
                    {person.email && <Detail label="אימייל" value={person.email} />}
                    {person.occupation && <Detail label="מקצוע" value={person.occupation} />}
                    {person.education && <Detail label="השכלה" value={person.education} />}
                    {person.religiosity && <Detail label="דתיות" value={person.religiosity} />}
                    {person.hobbies && <Detail label="תחביבים" value={person.hobbies} />}
                    {person.preferences && <Detail label="העדפות" value={person.preferences} />}
                    {person.status && <Detail label="סטטוס" value={person.status} />}
                    {person.notes && <Detail label="הערות" value={person.notes} />}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                        onClick={() => deleteMutation.mutate(person.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        מחיקה
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-sidebar-border text-center text-xs text-muted-foreground">
        {filtered.length} אנשים
      </div>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-2">
    <span className="text-muted-foreground flex-shrink-0">{label}:</span>
    <span className="text-foreground">{value}</span>
  </div>
);

export default PeopleTab;
