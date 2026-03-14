import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, Users, ArrowRight, Crown, User as UserIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  role?: string;
}

const AdminPanel = ({ onBack }: { onBack: () => void }) => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get roles via exec_sql (admin only)
      const { data: rolesResult } = await supabase.rpc("exec_sql", {
        query: `SELECT json_agg(json_build_object('user_id', user_id::text, 'role', role::text)) as result FROM public.user_roles`,
      });

      let rolesMap: Record<string, string> = {};

      // exec_sql returns {success, rows_affected, ...} but doesn't return SELECT data
      // We need a different approach - create a function that returns data
      // For now, use a workaround: query via exec_sql with a temp table or use direct RPC

      // Actually, let's try getting roles from the user_roles table directly
      // The RLS only allows users to see their own roles, but admin uses exec_sql
      // exec_sql executes but doesn't return result sets
      // Let's create a proper admin function

      const { data: adminRolesResult } = await supabase.rpc("exec_sql", {
        query: `
          CREATE OR REPLACE FUNCTION public.get_all_roles()
          RETURNS json
          LANGUAGE sql
          SECURITY DEFINER
          SET search_path = public
          AS $fn$
            SELECT COALESCE(json_agg(json_build_object('user_id', user_id::text, 'role', role::text)), '[]'::json)
            FROM public.user_roles
          $fn$;
        `,
      });

      // Now call the function
      const { data: rolesData } = await supabase.rpc("get_all_roles" as any);

      if (Array.isArray(rolesData)) {
        rolesData.forEach((r: any) => {
          rolesMap[r.user_id] = r.role;
        });
      }

      const usersWithRoles = (profiles || []).map((p) => ({
        ...p,
        role: rolesMap[p.user_id] || "user",
      }));

      setUsers(usersWithRoles);
    } catch (err: any) {
      toast.error("שגיאה בטעינת משתמשים: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setUpdatingUser(userId);
    try {
      const { data, error } = await supabase.rpc("exec_sql", {
        query: `
          DELETE FROM public.user_roles WHERE user_id = '${userId}';
          INSERT INTO public.user_roles (user_id, role) VALUES ('${userId}', '${newRole}');
        `,
      });
      if (error) throw error;
      if (data && (data as any).success === false) throw new Error((data as any).error);

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
      toast.success(`התפקיד שונה ל-${newRole === "admin" ? "אדמין" : "משתמש"}`);
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    } finally {
      setUpdatingUser(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">אין גישה</h2>
          <p className="text-muted-foreground mb-4">עמוד זה מיועד לאדמינים בלבד</p>
          <Button onClick={onBack}>חזרה</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold font-display text-foreground">פאנל ניהול</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers} className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
            רענון
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-sm text-muted-foreground">סה״כ משתמשים</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter((u) => u.role === "admin").length}
                </p>
                <p className="text-sm text-muted-foreground">אדמינים</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter((u) => u.role === "user").length}
                </p>
                <p className="text-sm text-muted-foreground">משתמשים רגילים</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Users table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">רשימת משתמשים</h2>
            <p className="text-sm text-muted-foreground">ניהול תפקידים והרשאות</p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-pulse-soft text-primary font-display text-lg">טוען...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">#</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">שם</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">אימייל</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">תפקיד</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">הצטרף</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-5 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {user.role === "admin" ? (
                              <Crown className="w-4 h-4 text-accent" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {user.display_name || "ללא שם"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-sm text-muted-foreground" dir="ltr">
                        {user.email}
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-accent/10 text-accent"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {user.role === "admin" ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                          {user.role === "admin" ? "אדמין" : "משתמש"}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("he-IL")}
                      </td>
                      <td className="py-3 px-5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updatingUser === user.user_id}
                          onClick={() => toggleRole(user.user_id, user.role || "user")}
                          className="text-xs"
                        >
                          {updatingUser === user.user_id
                            ? "מעדכן..."
                            : user.role === "admin"
                            ? "הורד לרגיל"
                            : "קדם לאדמין"}
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminPanel;
