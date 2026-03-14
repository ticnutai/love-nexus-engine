import { useParams, useNavigate, Link } from "react-router-dom";
import { usePerson, useFamilyTree } from "@/hooks/use-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ArrowRight, User, Users, MapPin, Phone, Calendar, Globe, Heart } from "lucide-react";

const PersonPage = () => {
  const { tz } = useParams<{ tz: string }>();
  const navigate = useNavigate();
  const { data: person, isLoading, error } = usePerson(tz);
  const { data: tree } = useFamilyTree(tz);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive">לא נמצא אדם עם ת.ז. {tz}</p>
            <Button onClick={() => navigate("/search")}>חזרה לחיפוש</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/search")}>
            <ArrowRight className="h-4 w-4 ml-1" />
            חזרה
          </Button>
          <h1 className="text-xl font-bold">
            {person.first_name} {person.family_name}
          </h1>
          <Badge variant="outline" className="font-mono">{person.tz}</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Person details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              פרטים אישיים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <Field label="ת.ז." value={person.tz} />
              <Field label="שם משפחה" value={person.family_name} />
              <Field label="שם פרטי" value={person.first_name} />
              <Field label="שם קודם" value={person.prev_name} />
              <Field label="מצב אישי" value={person.marital} />
              <Field label="בית אב" value={person.clan} />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              כתובת
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <Field label="ישוב" value={person.city} />
              <Field label="רחוב" value={person.street} />
              <Field label="מספר בית" value={person.house_num} />
              <Field label="מיקוד" value={person.zipcode} />
            </div>
          </CardContent>
        </Card>

        {/* Phone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              טלפון
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <Field label="קידומת" value={person.phone_area} />
              <Field label="טלפון" value={person.phone} />
              <Field label="טלפונים נוספים" value={person.extra_phones} />
            </div>
          </CardContent>
        </Card>

        {/* Birth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              לידה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
              <Field label="שנה" value={person.birth_year} />
              <Field label="חודש" value={person.birth_month} />
              <Field label="יום" value={person.birth_day} />
              <Field label="יום בשבוע" value={person.birth_dow} />
              <Field label="שנה עברית" value={person.heb_year} />
              <Field label="חודש עברי" value={person.heb_month} />
              <Field label="יום עברי" value={person.heb_day} />
            </div>
          </CardContent>
        </Card>

        {/* Origin */}
        {(person.birth_country || person.aliya_year) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                מוצא ועלייה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
                <Field label="ארץ לידה" value={person.birth_country} />
                <Field label="שנת עלייה" value={person.aliya_year} />
                <Field label="חודש עלייה" value={person.aliya_month} />
                <Field label="יום עלייה" value={person.aliya_day} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Tree */}
        {tree && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                עץ משפחה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Parents */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">הורים</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FamilyCard
                    label="אב"
                    name={person.father_name}
                    tz={person.father_tz}
                    person={tree.father}
                  />
                  <FamilyCard
                    label="אם"
                    name={person.mother_name}
                    tz={person.mother_tz}
                    person={tree.mother}
                  />
                </div>
              </div>

              {/* Siblings */}
              {tree.siblings && tree.siblings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    אחים ({tree.siblings.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tree.siblings.map((s) => (
                      <Link
                        key={s.tz}
                        to={`/person/${s.tz}`}
                        className="p-2 rounded border hover:bg-accent/50 transition-colors text-sm"
                      >
                        <span className="font-medium">{s.first_name} {s.family_name}</span>
                        {s.birth_year && (
                          <span className="text-muted-foreground mr-2">({s.birth_year})</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Children */}
              {tree.children && tree.children.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    ילדים ({tree.children.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tree.children.map((ch) => (
                      <Link
                        key={ch.tz}
                        to={`/person/${ch.tz}`}
                        className="p-2 rounded border hover:bg-accent/50 transition-colors text-sm"
                      >
                        <span className="font-medium">{ch.first_name} {ch.family_name}</span>
                        {ch.birth_year && (
                          <span className="text-muted-foreground mr-2">({ch.birth_year})</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-sm text-muted-foreground min-w-[100px]">{label}:</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

function FamilyCard({
  label,
  name,
  tz,
  person,
}: {
  label: string;
  name: string | null | undefined;
  tz: string | null | undefined;
  person?: { first_name: string | null; family_name: string | null };
}) {
  const displayName = person
    ? `${person.first_name || ""} ${person.family_name || ""}`.trim()
    : name || "לא ידוע";

  if (tz) {
    return (
      <Link
        to={`/person/${tz}`}
        className="p-3 rounded-lg border hover:bg-accent/50 transition-colors block"
      >
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{displayName}</div>
        <div className="text-xs font-mono text-muted-foreground">{tz}</div>
      </Link>
    );
  }

  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{displayName}</div>
    </div>
  );
}

export default PersonPage;
