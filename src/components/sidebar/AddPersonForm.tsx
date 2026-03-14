import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

interface AddPersonFormProps {
  onClose: () => void;
}

const AddPersonForm = ({ onClose }: AddPersonFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    age: "",
    city: "",
    phone: "",
    email: "",
    occupation: "",
    education: "",
    religiosity: "",
    hobbies: "",
    preferences: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("people").insert({
        created_by: user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender || null,
        age: form.age ? parseInt(form.age) : null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        occupation: form.occupation || null,
        education: form.education || null,
        religiosity: form.religiosity || null,
        hobbies: form.hobbies || null,
        preferences: form.preferences || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      toast.success("נוסף בהצלחה!");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const fields = [
    { key: "first_name", label: "שם פרטי *", required: true },
    { key: "last_name", label: "שם משפחה *", required: true },
    { key: "gender", label: "מגדר" },
    { key: "age", label: "גיל", type: "number" },
    { key: "city", label: "עיר" },
    { key: "phone", label: "טלפון", type: "tel" },
    { key: "email", label: "אימייל", type: "email" },
    { key: "occupation", label: "מקצוע" },
    { key: "education", label: "השכלה" },
    { key: "religiosity", label: "רמת דתיות" },
    { key: "hobbies", label: "תחביבים" },
    { key: "preferences", label: "העדפות" },
    { key: "notes", label: "הערות" },
  ];

  return (
    <div className="border-b border-sidebar-border bg-sidebar-accent/30 p-3" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">הוספת אדם חדש</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="space-y-2 max-h-64 overflow-y-auto pr-1"
      >
        {fields.map(({ key, label, required, type }) => (
          <div key={key}>
            <label className="block text-xs text-muted-foreground mb-0.5">{label}</label>
            <input
              type={type || "text"}
              value={(form as any)[key]}
              onChange={(e) => update(key, e.target.value)}
              required={required}
              className="w-full h-8 px-2.5 rounded border border-input bg-background text-sm text-foreground focus:ring-1 focus:ring-ring focus:outline-none"
              dir={type === "email" || type === "tel" ? "ltr" : "rtl"}
            />
          </div>
        ))}
        <Button type="submit" size="sm" className="w-full mt-2" disabled={mutation.isPending}>
          {mutation.isPending ? "שומר..." : "שמור"}
        </Button>
      </form>
    </div>
  );
};

export default AddPersonForm;
