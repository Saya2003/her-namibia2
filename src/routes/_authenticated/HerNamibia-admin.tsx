import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import {
  LogOut,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  X,
  Search,
  Calendar,
  Filter,
  ArrowUpDown,
  FileText,
  Newspaper,
  Download,
  ExternalLink,
  Briefcase,
  Mic,
  Users,
  Image as ImageIcon,
  UserPlus,
  Mail,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
  RefreshCw,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Shield,
  Copy,
  HelpCircle,
  Check,
  Globe,
  Inbox,
  UserCheck,
  UserX,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KEY_SECTORS, RESOURCE_TYPES, NEWS_CATEGORIES, PODCAST_CATEGORY } from "@/lib/sectors";
import { PodcastsPanel } from "@/components/admin/PodcastsPanel";

const LOGO_URL = "/her-namibia-logo.png";
const IDLE_MS = 30 * 60 * 1000;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5;

export const Route = createFileRoute("/_authenticated/HerNamibia-admin")({
  head: () => ({
    meta: [
      { title: "Her Namibia Admin Portal" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Her Namibia administration area." },
    ],
  }),
  component: AdminPortal,
});

/* ---------------- Types ---------------- */

type WorkUpdate = {
  id: string;
  title: string;
  description: string;
  image_urls: string[];
  work_date: string;
  status: "draft" | "published";
  sector?: string | null;
};

type ResourceItem = {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  sector?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  author?: string | null;
  publication_date: string;
  status: "draft" | "published";
};

type NewsItem = {
  id: string;
  title: string;
  summary?: string | null;
  content: string;
  news_date: string;
  sector?: string | null;
  category?: string | null;
  image_urls: string[];
  external_link?: string | null;
  status: "draft" | "published";
};

type EmployeeEmail = {
  id: string;
  employee_name: string;
  email_address: string;
  department: string | null;
  position: string | null;
  status: "active" | "suspended";
  created_at?: string;
};

type AdminInvitation = {
  id: string;
  email: string;
  full_name: string | null;
  invited_by: string | null;
  status: "pending" | "accepted" | "suspended" | "revoked" | "expired";
  notes: string | null;
  expires_at: string;
  created_at: string;
};

/* ---------------- Helper: Date Filtering ---------------- */

function matchesDateFilter(
  itemDateStr: string | null | undefined,
  filter: string,
  customStart?: string,
  customEnd?: string
): boolean {
  if (!itemDateStr) return true;
  if (filter === "ALL") return true;

  const itemDate = new Date(itemDateStr).getTime();
  if (isNaN(itemDate)) return true;

  const now = new Date();
  const nowTime = now.getTime();

  if (filter === "THIS_MONTH") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return itemDate >= startOfMonth && itemDate <= nowTime + 86400000;
  }
  if (filter === "LAST_30_DAYS") {
    const thirtyDaysAgo = nowTime - 30 * 24 * 60 * 60 * 1000;
    return itemDate >= thirtyDaysAgo && itemDate <= nowTime + 86400000;
  }
  if (filter === "LAST_90_DAYS") {
    const ninetyDaysAgo = nowTime - 90 * 24 * 60 * 60 * 1000;
    return itemDate >= ninetyDaysAgo && itemDate <= nowTime + 86400000;
  }
  if (filter === "THIS_YEAR") {
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    return itemDate >= startOfYear && itemDate <= nowTime + 86400000;
  }
  if (filter === "CUSTOM") {
    let valid = true;
    if (customStart) {
      const start = new Date(customStart).getTime();
      if (!isNaN(start) && itemDate < start) valid = false;
    }
    if (customEnd) {
      const end = new Date(customEnd).getTime() + 86400000;
      if (!isNaN(end) && itemDate > end) valid = false;
    }
    return valid;
  }
  return true;
}

/* ---------------- Main Admin Portal ---------------- */

function AdminPortal() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    void navigate({ to: "/staff-access-crg" });
  };

  useEffect(() => {
    void (async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          setIsAdmin(false);
          return;
        }

        // Check if admin is suspended in admin_invitations
        const { data: invData } = await supabase
          .from("admin_invitations")
          .select("status")
          .eq("email", userData.user.email ?? "")
          .maybeSingle();

        if (invData?.status === "suspended") {
          setIsAdmin(false);
          setIsSuspended(true);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("User roles query error:", error);
        }

        setIsAdmin(Boolean(data && data.role === "admin"));
      } catch (err) {
        console.error("Unexpected error checking role:", err);
        setIsAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toast.info("Signed out due to inactivity.");
        void signOut();
      }, IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-5">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-5">
        <div className="max-w-sm rounded-2xl border-2 border-primary bg-card p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h1 className="mt-4 text-lg font-bold">
            {isSuspended ? "Account Suspended" : "Not authorised"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSuspended
              ? "Your administrator account has been suspended by an administrator. Please contact your organization director."
              : "This account does not have administrator access."}
          </p>
          <Button className="mt-6" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={LOGO_URL} alt="Her Namibia logo" className="h-9 w-auto shrink-0 object-contain" />
            <h1 className="truncate text-base font-bold sm:text-lg">Her Namibia Admin Portal</h1>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Tabs defaultValue="work">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 w-full max-w-5xl">
            <TabsTrigger value="work" className="flex items-center gap-1.5">
              <Briefcase className="size-3.5" /> Articles
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-1.5">
              <FileText className="size-3.5" /> Resources
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1.5">
              <Newspaper className="size-3.5" /> News & Updates
            </TabsTrigger>
            <TabsTrigger value="podcast" className="flex items-center gap-1.5">
              <Mic className="size-3.5" /> Podcast
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-1.5">
              <Users className="size-3.5" /> Contact Emails
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Manage Admins
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-1.5">
              <User className="size-3.5" /> Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="work" className="mt-6">
            <WorkUpdatesPanel />
          </TabsContent>
          <TabsContent value="resources" className="mt-6">
            <ResourcesPanel />
          </TabsContent>
          <TabsContent value="news" className="mt-6">
            <NewsPanel />
          </TabsContent>
          <TabsContent value="podcast" className="mt-6">
            <PodcastsPanel />
          </TabsContent>
          <TabsContent value="emails" className="mt-6">
            <EmployeeEmailsPanel />
          </TabsContent>
          <TabsContent value="admins" className="mt-6">
            <AdminsPanel />
          </TabsContent>
          <TabsContent value="profile" className="mt-6">
            <ProfilePanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- 1. Work Updates Panel ---------------- */

function WorkUpdatesPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<WorkUpdate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  // Filter states
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSectorFilter, setAdminSectorFilter] = useState("ALL");
  const [adminDateFilter, setAdminDateFilter] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "work_updates"],
    queryFn: async (): Promise<WorkUpdate[]> => {
      const { data, error } = await supabase
        .from("work_updates")
        .select("id,title,description,image_urls,work_date,status,sector")
        .order("work_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        image_urls: Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [],
      })) as WorkUpdate[];
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "work_updates"] });
    void qc.invalidateQueries({ queryKey: ["work_updates", "published"] });
    void qc.invalidateQueries({ queryKey: ["work_updates", "all_published"] });
  };

  const save = useMutation({
    mutationFn: async (payload: Omit<WorkUpdate, "id"> & { id?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (payload.id) {
        const { error } = await supabase
          .from("work_updates")
          .update({
            title: payload.title,
            description: payload.description,
            image_urls: payload.image_urls,
            work_date: payload.work_date,
            status: payload.status,
            sector: payload.sector || "Business",
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("work_updates").insert({
          title: payload.title,
          description: payload.description,
          image_urls: payload.image_urls,
          work_date: payload.work_date,
          status: payload.status,
          sector: payload.sector || "Business",
          created_by: userData.user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Article saved.");
      setEditing(null);
      setCreating(false);
      setImages([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article deleted.");
      setDeleteId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("work-images").upload(path, file);
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data, error: signErr } = await supabase.storage
      .from("work-images")
      .createSignedUrl(path, SIGNED_URL_TTL);
    setUploading(false);
    if (signErr || !data) {
      toast.error(signErr?.message ?? "Could not prepare image link.");
      return;
    }
    setImages((prev) => [...prev, data.signedUrl]);
    toast.success("Image uploaded.");
  };

  const openForm = (item: WorkUpdate | null) => {
    setEditing(item);
    setCreating(item === null);
    setImages(item?.image_urls ?? []);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    const description = String(f.get("description") ?? "").trim();
    const sector = String(f.get("sector") ?? "Business");
    if (!title || !description) {
      toast.error("Title and description are required.");
      return;
    }
    save.mutate({
      ...(editing ? { id: editing.id } : {}),
      title,
      description,
      image_urls: images,
      work_date: String(f.get("work_date") ?? new Date().toISOString().slice(0, 10)),
      status: String(f.get("status") ?? "draft") as WorkUpdate["status"],
      sector,
    });
  };

  const formOpen = creating || editing !== null;

  // Filter and Sort Work Updates
  const filteredData = useMemo(() => {
    const result = data.filter((item) => {
      // Sector filter
      if (adminSectorFilter !== "ALL") {
        const itemSec = (item.sector ?? "Business").trim().toLowerCase();
        const selSec = adminSectorFilter.trim().toLowerCase();
        if (itemSec !== selSec) return false;
      }
      // Date filter
      if (!matchesDateFilter(item.work_date, adminDateFilter, customStartDate, customEndDate)) {
        return false;
      }
      // Search filter
      if (adminSearch.trim() !== "") {
        const q = adminSearch.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchSector = (item.sector ?? "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSector) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.work_date).getTime();
      const dateB = new Date(b.work_date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [data, adminSectorFilter, adminDateFilter, customStartDate, customEndDate, adminSearch, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <h2 className="truncate text-lg font-bold">Articles</h2>
        {!formOpen && (
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4" /> New update
          </Button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={onSubmit}
          className="animate-fade-up space-y-4 rounded-xl border-2 border-primary bg-card p-6 shadow-card"
        >
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" defaultValue={editing?.title ?? ""} required />
          </div>
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={editing?.description ?? ""}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="sector">Category</Label>
              <select
                id="sector"
                name="sector"
                defaultValue={editing?.sector ?? "Business"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {KEY_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="work_date">Date</Label>
              <Input
                id="work_date"
                name="work_date"
                type="date"
                defaultValue={editing?.work_date ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={editing?.status ?? "draft"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (public)</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="image">Images (Upload one or more)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file);
                e.target.value = "";
              }}
            />
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {images.map((url, idx) => (
                  <div key={url} className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <img
                      src={url}
                      alt={`Work update ${idx + 1}`}
                      className="size-full object-cover"
                    />
                    <span className="absolute left-1 bottom-1 rounded bg-black/75 px-1 text-[9px] text-white">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => setImages((p) => p.filter((u) => u !== url))}
                      className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:opacity-90"
                    >
                      <Trash2 className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={save.isPending || uploading}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setImages([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Search and Filters Bar */}
      {!formOpen && data.length > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search updates by title or keyword..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="h-9 pl-9 pr-8"
              />
              {adminSearch && (
                <button
                  onClick={() => setAdminSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Sector, Date, and Sort Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Sector Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted-foreground" />
                <Label htmlFor="adminSector" className="text-xs shrink-0 font-medium">
                  Category:
                </Label>
                <select
                  id="adminSector"
                  value={adminSectorFilter}
                  onChange={(e) => setAdminSectorFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Categories</option>
                  {KEY_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <Label htmlFor="adminDate" className="text-xs shrink-0 font-medium">
                  Date:
                </Label>
                <select
                  id="adminDate"
                  value={adminDateFilter}
                  onChange={(e) => setAdminDateFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Dates</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_30_DAYS">Past 30 Days</option>
                  <option value="LAST_90_DAYS">Past 90 Days</option>
                  <option value="THIS_YEAR">This Year</option>
                  <option value="CUSTOM">Custom Range...</option>
                </select>
              </div>

              {/* Sort Order */}
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1 text-xs"
                onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
                title={`Sorted: ${sortOrder === "desc" ? "Newest First" : "Oldest First"}`}
              >
                <ArrowUpDown className="size-3.5" />
                {sortOrder === "desc" ? "Newest" : "Oldest"}
              </Button>
            </div>
          </div>

          {/* Custom Date Range Picker inputs */}
          {adminDateFilter === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
              <span className="font-semibold text-muted-foreground">From:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              <span className="font-semibold text-muted-foreground">To:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              {(customStartDate || customEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                >
                  Clear Range
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work updates yet.</p>
      ) : filteredData.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work updates match your filters.</p>
      ) : (
        <ul className="space-y-3">
          {filteredData.map((item) => (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-primary bg-card p-5 shadow-card"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                {item.image_urls[0] && (
                  <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={item.image_urls[0]}
                      alt={item.title}
                      className="size-full object-cover"
                    />
                    {item.image_urls.length > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 text-[9px] font-semibold text-white">
                        +{item.image_urls.length - 1}
                      </span>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-foreground">{item.title}</h3>
                    <Badge variant={item.status === "published" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                    {item.sector && (
                      <Badge variant="outline" className="text-[11px]">
                        {item.sector}
                      </Badge>
                    )}
                    {item.image_urls.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        📷 {item.image_urls.length} {item.image_urls.length === 1 ? "image" : "images"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.work_date} · {item.description}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <Button size="icon" variant="outline" onClick={() => openForm(item)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="destructive" onClick={() => setDeleteId(item.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this work update?"
        description="This permanently removes the update from the website."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}

/* ---------------- 2. Resources Panel ---------------- */

function ResourcesPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>("");

  // Filters
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "resources"],
    queryFn: async (): Promise<ResourceItem[]> => {
      const { data, error } = await supabase
        .from("resources")
        .select("id,title,description,resource_type,sector,file_url,external_url,author,publication_date,status")
        .order("publication_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ResourceItem[];
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "resources"] });
    void qc.invalidateQueries({ queryKey: ["resources", "published"] });
  };

  const save = useMutation({
    mutationFn: async (payload: Omit<ResourceItem, "id"> & { id?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (payload.id) {
        const { error } = await supabase
          .from("resources")
          .update({
            title: payload.title,
            description: payload.description,
            resource_type: payload.resource_type,
            sector: payload.sector || "Business",
            file_url: payload.file_url || null,
            external_url: payload.external_url || null,
            author: payload.author || null,
            publication_date: payload.publication_date,
            status: payload.status,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("resources").insert({
          title: payload.title,
          description: payload.description,
          resource_type: payload.resource_type,
          sector: payload.sector || "Business",
          file_url: payload.file_url || null,
          external_url: payload.external_url || null,
          author: payload.author || null,
          publication_date: payload.publication_date,
          status: payload.status,
          created_by: userData.user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Resource saved successfully.");
      setEditing(null);
      setCreating(false);
      setFileUrl("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resource deleted.");
      setDeleteId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadFile = async (file: File) => {
    setUploading(true);
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("resource-files").upload(path, file);
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("resource-files").getPublicUrl(path);
    setUploading(false);
    setFileUrl(data.publicUrl);
    toast.success("Document/File uploaded.");
  };

  const openForm = (item: ResourceItem | null) => {
    setEditing(item);
    setCreating(item === null);
    setFileUrl(item?.file_url ?? "");
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    const description = String(f.get("description") ?? "").trim();
    const resource_type = String(f.get("resource_type") ?? "Feature");
    const sector = String(f.get("sector") ?? "Business");
    const author = String(f.get("author") ?? "").trim();
    const external_url = String(f.get("external_url") ?? "").trim();
    const publication_date = String(f.get("publication_date") ?? new Date().toISOString().slice(0, 10));
    const status = String(f.get("status") ?? "draft") as ResourceItem["status"];

    if (!title || !description) {
      toast.error("Title and description are required.");
      return;
    }

    save.mutate({
      ...(editing ? { id: editing.id } : {}),
      title,
      description,
      resource_type,
      sector,
      file_url: fileUrl || null,
      external_url: external_url || null,
      author: author || null,
      publication_date,
      status,
    });
  };

  const formOpen = creating || editing !== null;

  const filteredData = useMemo(() => {
    const result = data.filter((item) => {
      if (sectorFilter !== "ALL") {
        if ((item.sector ?? "Business").trim().toLowerCase() !== sectorFilter.trim().toLowerCase()) return false;
      }
      if (typeFilter !== "ALL") {
        if (item.resource_type !== typeFilter) return false;
      }
      if (!matchesDateFilter(item.publication_date, dateFilter, customStartDate, customEndDate)) return false;
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchAuthor = (item.author ?? "").toLowerCase().includes(q);
        const matchType = item.resource_type.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAuthor && !matchType) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.publication_date).getTime();
      const dateB = new Date(b.publication_date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [data, sectorFilter, typeFilter, dateFilter, customStartDate, customEndDate, search, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div>
          <h2 className="truncate text-lg font-bold">Resources & Publications</h2>
          <p className="text-xs text-muted-foreground">Manage reports, policy briefs, datasets, and toolkits.</p>
        </div>
        {!formOpen && (
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4" /> New resource
          </Button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={onSubmit}
          className="animate-fade-up space-y-4 rounded-xl border-2 border-primary bg-card p-6 shadow-card"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="res_title">Resource Title *</Label>
              <Input id="res_title" name="title" defaultValue={editing?.title ?? ""} required />
            </div>
            <div>
              <Label htmlFor="resource_type">Resource Type *</Label>
              <select
                id="resource_type"
                name="resource_type"
                defaultValue={editing?.resource_type ?? "Feature"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="res_sector">Category</Label>
              <select
                id="res_sector"
                name="sector"
                defaultValue={editing?.sector ?? "Business"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {KEY_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="res_description">Summary / Abstract *</Label>
            <Textarea
              id="res_description"
              name="description"
              rows={4}
              defaultValue={editing?.description ?? ""}
              placeholder="Provide an overview, key findings, or publication abstract..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="author">Author / Lead Researcher</Label>
              <Input id="author" name="author" placeholder="e.g. CRG Advisory Team" defaultValue={editing?.author ?? ""} />
            </div>
            <div>
              <Label htmlFor="publication_date">Publication Date</Label>
              <Input
                id="publication_date"
                name="publication_date"
                type="date"
                defaultValue={editing?.publication_date ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <Label htmlFor="res_status">Status</Label>
              <select
                id="res_status"
                name="status"
                defaultValue={editing?.status ?? "draft"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (public)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="file_upload">Upload Document / PDF</Label>
              <Input
                id="file_upload"
                type="file"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
              {fileUrl && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-accent">
                  <Download className="size-3.5" /> File attached: <span className="truncate max-w-xs">{fileUrl}</span>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="external_url">Or External URL / Link</Label>
              <Input
                id="external_url"
                name="external_url"
                type="url"
                placeholder="https://..."
                defaultValue={editing?.external_url ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending || uploading}>
              {save.isPending ? "Saving..." : "Save Resource"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setFileUrl("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Filters Bar */}
      {!formOpen && data.length > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search resources by title, author, keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Type Filter */}
              <div className="flex items-center gap-1.5">
                <Label htmlFor="resType" className="text-xs shrink-0 font-medium">
                  Type:
                </Label>
                <select
                  id="resType"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Types</option>
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector Filter */}
              <div className="flex items-center gap-1.5">
                <Label htmlFor="resSector" className="text-xs shrink-0 font-medium">
                  Category:
                </Label>
                <select
                  id="resSector"
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Categories</option>
                  {KEY_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <Label htmlFor="resDate" className="text-xs shrink-0 font-medium">
                  Date:
                </Label>
                <select
                  id="resDate"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Dates</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_30_DAYS">Past 30 Days</option>
                  <option value="LAST_90_DAYS">Past 90 Days</option>
                  <option value="THIS_YEAR">This Year</option>
                  <option value="CUSTOM">Custom Range...</option>
                </select>
              </div>

              {/* Sort Order */}
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1 text-xs"
                onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
              >
                <ArrowUpDown className="size-3.5" />
                {sortOrder === "desc" ? "Newest" : "Oldest"}
              </Button>
            </div>
          </div>

          {dateFilter === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
              <span className="font-semibold text-muted-foreground">From:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              <span className="font-semibold text-muted-foreground">To:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              {(customStartDate || customEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                >
                  Clear Range
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No resources added yet.</p>
      ) : filteredData.length === 0 ? (
        <p className="text-sm text-muted-foreground">No resources match your filters.</p>
      ) : (
        <ul className="space-y-3">
          {filteredData.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border-2 border-primary bg-card p-5 shadow-card"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-bold">{item.title}</h3>
                  <Badge variant="default" className="text-[11px] bg-accent text-accent-foreground">
                    {item.resource_type}
                  </Badge>
                  <Badge variant={item.status === "published" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                  {item.sector && (
                    <Badge variant="outline" className="text-[11px]">
                      {item.sector}
                    </Badge>
                  )}
                  {item.author && (
                    <span className="text-xs text-muted-foreground">By {item.author}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Published: {item.publication_date} · {item.description}
                </p>
                {(item.file_url || item.external_url) && (
                  <div className="mt-2 flex items-center gap-3">
                    {item.file_url && (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        <Download className="size-3.5" /> Download File
                      </a>
                    )}
                    {item.external_url && (
                      <a
                        href={item.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        <ExternalLink className="size-3.5" /> External Link
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="icon" variant="outline" onClick={() => openForm(item)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="destructive" onClick={() => setDeleteId(item.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this resource?"
        description="This will permanently delete the resource and its file link."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}

/* ---------------- 3. News Panel ---------------- */

function NewsPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "news"],
    queryFn: async (): Promise<NewsItem[]> => {
      const { data, error } = await supabase
        .from("news")
        .select("id,title,summary,content,news_date,sector,category,image_urls,external_link,status")
        .order("news_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        image_urls: Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [],
      })) as NewsItem[];
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "news"] });
    void qc.invalidateQueries({ queryKey: ["news", "published"] });
  };

  const save = useMutation({
    mutationFn: async (payload: Omit<NewsItem, "id"> & { id?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (payload.id) {
        const { error } = await supabase
          .from("news")
          .update({
            title: payload.title,
            summary: payload.summary || null,
            content: payload.content,
            news_date: payload.news_date,
            sector: payload.sector || "Business",
            category: payload.category || "Company News",
            image_urls: payload.image_urls,
            external_link: payload.external_link || null,
            status: payload.status,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news").insert({
          title: payload.title,
          summary: payload.summary || null,
          content: payload.content,
          news_date: payload.news_date,
          sector: payload.sector || "Business",
          category: payload.category || "Company News",
          image_urls: payload.image_urls,
          external_link: payload.external_link || null,
          status: payload.status,
          created_by: userData.user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("News article saved successfully.");
      setEditing(null);
      setCreating(false);
      setImages([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("News article deleted.");
      setDeleteId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("work-images").upload(path, file);
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data, error: signErr } = await supabase.storage
      .from("work-images")
      .createSignedUrl(path, SIGNED_URL_TTL);
    setUploading(false);
    if (signErr || !data) {
      toast.error(signErr?.message ?? "Could not prepare image link.");
      return;
    }
    setImages((prev) => [...prev, data.signedUrl]);
    toast.success("Image uploaded.");
  };

  const openForm = (item: NewsItem | null) => {
    setEditing(item);
    setCreating(item === null);
    setImages(item?.image_urls ?? []);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    const summary = String(f.get("summary") ?? "").trim();
    const content = String(f.get("content") ?? "").trim();
    const category = String(f.get("category") ?? "Business");
    const sector = category;
    const news_date = String(f.get("news_date") ?? new Date().toISOString().slice(0, 10));
    const status = String(f.get("status") ?? "draft") as NewsItem["status"];
    const external_link = String(f.get("external_link") ?? "").trim();

    if (!title || !content) {
      toast.error("Title and news content are required.");
      return;
    }

    save.mutate({
      ...(editing ? { id: editing.id } : {}),
      title,
      summary: summary || null,
      content,
      category,
      sector,
      news_date,
      image_urls: images,
      external_link: external_link || null,
      status,
    });
  };

  const formOpen = creating || editing !== null;

  const filteredData = useMemo(() => {
    const result = data.filter((item) => {
      if (item.category === PODCAST_CATEGORY) return false;
      if (sectorFilter !== "ALL") {
        if ((item.sector ?? "Business").trim().toLowerCase() !== sectorFilter.trim().toLowerCase()) return false;
      }
      if (categoryFilter !== "ALL") {
        if ((item.category ?? "").trim().toLowerCase() !== categoryFilter.trim().toLowerCase()) return false;
      }
      if (!matchesDateFilter(item.news_date, dateFilter, customStartDate, customEndDate)) return false;
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = (item.summary ?? "").toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchCat = (item.category ?? "").toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchContent && !matchCat) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.news_date).getTime();
      const dateB = new Date(b.news_date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [data, sectorFilter, categoryFilter, dateFilter, customStartDate, customEndDate, search, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div>
          <h2 className="truncate text-lg font-bold">News & Announcements</h2>
          <p className="text-xs text-muted-foreground">Publish corporate news, fieldwork updates, and event coverage.</p>
        </div>
        {!formOpen && (
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4" /> New article
          </Button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={onSubmit}
          className="animate-fade-up space-y-4 rounded-xl border-2 border-primary bg-card p-6 shadow-card"
        >
          <div>
            <Label htmlFor="news_title">Article Title *</Label>
            <Input id="news_title" name="title" defaultValue={editing?.title ?? ""} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="news_category">Category</Label>
              <select
                id="news_category"
                name="category"
                defaultValue={editing?.category && editing.category !== PODCAST_CATEGORY ? editing.category : "Business"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {NEWS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="news_date">Date</Label>
              <Input
                id="news_date"
                name="news_date"
                type="date"
                defaultValue={editing?.news_date ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="news_summary">Short Summary / Excerpt</Label>
            <Input
              id="news_summary"
              name="summary"
              defaultValue={editing?.summary ?? ""}
              placeholder="Brief 1-2 sentence lead for card previews..."
            />
          </div>

          <div>
            <Label htmlFor="news_content">Full Article Content *</Label>
            <Textarea
              id="news_content"
              name="content"
              rows={6}
              defaultValue={editing?.content ?? ""}
              placeholder="Write the full story, press release or announcement details..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="news_status">Status</Label>
              <select
                id="news_status"
                name="status"
                defaultValue={editing?.status ?? "draft"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (public)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="external_link">External Press / Media Link</Label>
              <Input
                id="external_link"
                name="external_link"
                type="url"
                placeholder="https://..."
                defaultValue={editing?.external_link ?? ""}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="news_image">Article Images / Photos</Label>
            <Input
              id="news_image"
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file);
                e.target.value = "";
              }}
            />
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {images.map((url, idx) => (
                  <div key={url} className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <img
                      src={url}
                      alt={`Article photo ${idx + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => setImages((p) => p.filter((u) => u !== url))}
                      className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:opacity-90"
                    >
                      <Trash2 className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending || uploading}>
              {save.isPending ? "Saving..." : "Save Article"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setImages([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Filters Bar */}
      {!formOpen && data.length > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search news by title, content, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Label htmlFor="newsCat" className="text-xs shrink-0 font-medium">
                  Category:
                </Label>
                <select
                  id="newsCat"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Categories</option>
                  {NEWS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector Filter */}
              <div className="flex items-center gap-1.5">
                <Label htmlFor="newsSec" className="text-xs shrink-0 font-medium">
                  Category:
                </Label>
                <select
                  id="newsSec"
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Categories</option>
                  {KEY_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <Label htmlFor="newsDate" className="text-xs shrink-0 font-medium">
                  Date:
                </Label>
                <select
                  id="newsDate"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Dates</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_30_DAYS">Past 30 Days</option>
                  <option value="LAST_90_DAYS">Past 90 Days</option>
                  <option value="THIS_YEAR">This Year</option>
                  <option value="CUSTOM">Custom Range...</option>
                </select>
              </div>

              {/* Sort Order */}
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1 text-xs"
                onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
              >
                <ArrowUpDown className="size-3.5" />
                {sortOrder === "desc" ? "Newest" : "Oldest"}
              </Button>
            </div>
          </div>

          {dateFilter === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
              <span className="font-semibold text-muted-foreground">From:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              <span className="font-semibold text-muted-foreground">To:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              {(customStartDate || customEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                >
                  Clear Range
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No news articles published yet.</p>
      ) : filteredData.length === 0 ? (
        <p className="text-sm text-muted-foreground">No articles match your filters.</p>
      ) : (
        <ul className="space-y-3">
          {filteredData.map((item) => (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-primary bg-card p-5 shadow-card"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                {item.image_urls[0] && (
                  <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={item.image_urls[0]}
                      alt={item.title}
                      className="size-full object-cover"
                    />
                    {item.image_urls.length > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 text-[9px] font-semibold text-white">
                        +{item.image_urls.length - 1}
                      </span>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-foreground">{item.title}</h3>
                    {item.category && (
                      <Badge variant="default" className="text-[11px]">
                        {item.category}
                      </Badge>
                    )}
                    <Badge variant={item.status === "published" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                    {item.sector && (
                      <Badge variant="outline" className="text-[11px]">
                        {item.sector}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.news_date} · {item.summary || item.content}
                  </p>
                  {item.external_link && (
                    <a
                      href={item.external_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      <ExternalLink className="size-3" /> View Source
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <Button size="icon" variant="outline" onClick={() => openForm(item)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="destructive" onClick={() => setDeleteId(item.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this news article?"
        description="This will permanently delete the news article from the portal."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}

/* ---------------- 4. Employee Emails Panel ---------------- */

const ALPHABET_LETTERS = [
  "ALL", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

function EmployeeEmailsPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EmployeeEmail | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [formEmail, setFormEmail] = useState("");

  // Filter and sort states
  const [letterFilter, setLetterFilter] = useState("ALL");
  const [dateCreatedFilter, setDateCreatedFilter] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "date_desc" | "date_asc" | "status" | "dept">("name_asc");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "employee_emails"] });

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "employee_emails"],
    queryFn: async (): Promise<EmployeeEmail[]> => {
      const { data, error } = await supabase
        .from("employee_emails")
        .select("id,employee_name,email_address,department,position,status,created_at")
        .order("employee_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmployeeEmail[];
    },
  });

  const save = useMutation({
    mutationFn: async (
      payload: Omit<EmployeeEmail, "id"> & { id?: string },
    ) => {
      const { error } = await supabase.from("employee_emails").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Employee record updated." : "Employee record created.");
      setEditing(null);
      setCreating(false);
      setFormEmail("");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async (item: EmployeeEmail) => {
      const nextStatus = item.status === "active" ? "suspended" : "active";
      const { error } = await supabase
        .from("employee_emails")
        .update({ status: nextStatus })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee status updated.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee record deleted.");
      setDeleteId(null);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const employee_name = String(f.get("employee_name") ?? "").trim();
    const email_address = (formEmail || String(f.get("email_address") ?? "")).trim();
    if (!employee_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_address)) {
      toast.error("A name and valid email address are required.");
      return;
    }
    save.mutate({
      ...(editing ? { id: editing.id } : {}),
      employee_name,
      email_address,
      department: String(f.get("department") ?? "").trim() || null,
      position: String(f.get("position") ?? "").trim() || null,
      status: editing?.status ?? "active",
    });
  };

  const formOpen = creating || editing !== null;

  // Open form with populated email state
  const openCreateForm = () => {
    setCreating(true);
    setEditing(null);
    setFormEmail("");
  };

  const openEditForm = (item: EmployeeEmail) => {
    setEditing(item);
    setCreating(false);
    setFormEmail(item.email_address);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`Copied "${text}" to clipboard.`);
  };

  // Helper for applying domain suffix
  const applyDomainSuffix = (suffix: string) => {
    if (!formEmail.includes("@")) {
      setFormEmail(`${formEmail}${suffix}`);
    } else {
      const prefix = formEmail.split("@")[0];
      setFormEmail(`${prefix}${suffix}`);
    }
  };

  // Filtered & Sorted Employee Emails
  const filteredData = useMemo(() => {
    const result = data.filter((item) => {
      // Initial Letter Filter (First or Last name)
      if (letterFilter !== "ALL") {
        const parts = item.employee_name.trim().split(/\s+/);
        const firstLetterOfFirstName = parts[0]?.[0]?.toUpperCase() ?? "";
        const firstLetterOfSurname = parts[parts.length - 1]?.[0]?.toUpperCase() ?? "";
        if (firstLetterOfFirstName !== letterFilter && firstLetterOfSurname !== letterFilter) {
          return false;
        }
      }

      // Date Created Filter
      if (item.created_at) {
        if (!matchesDateFilter(item.created_at, dateCreatedFilter, customStartDate, customEndDate)) {
          return false;
        }
      }

      // Search Filter
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim();
        const matchName = item.employee_name.toLowerCase().includes(q);
        const matchEmail = item.email_address.toLowerCase().includes(q);
        const matchDept = (item.department ?? "").toLowerCase().includes(q);
        const matchPos = (item.position ?? "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept && !matchPos) return false;
      }
      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === "name_asc") return a.employee_name.localeCompare(b.employee_name);
      if (sortBy === "name_desc") return b.employee_name.localeCompare(a.employee_name);
      if (sortBy === "date_desc") {
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      }
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "dept") return (a.department ?? "").localeCompare(b.department ?? "");
      return 0;
    });
  }, [data, letterFilter, dateCreatedFilter, customStartDate, customEndDate, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* ── Header with Hostinger Actions ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Employee Directory & Hostinger Emails</h2>
            <Badge variant="outline" className="border-[#673DE6]/40 bg-[#673DE6]/10 text-[#673DE6] text-[11px] font-semibold">
              Hostinger Custom Domain
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage organization email mailboxes on custom domain.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="https://mail.hostinger.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
          >
            <Button
              size="sm"
              className="gap-1.5 bg-[#673DE6] hover:bg-[#5229cb] text-white shadow-sm text-xs font-semibold"
            >
              <Inbox className="size-3.5" />
              Open Hostinger Webmail
              <ExternalLink className="size-3" />
            </Button>
          </a>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSetupGuide(true)}
            className="gap-1.5 text-xs"
          >
            <HelpCircle className="size-3.5 text-muted-foreground" />
            Email Client Settings
          </Button>

          {!formOpen && (
            <Button size="sm" onClick={openCreateForm} className="gap-1.5 text-xs">
              <Plus className="size-3.5" /> Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* ── Add / Edit Employee Form ── */}
      {formOpen && (
        <form
          onSubmit={onSubmit}
          className="animate-fade-up space-y-4 rounded-xl border-2 border-primary bg-card p-6 shadow-card"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-foreground text-sm">
              {editing ? `Edit Employee Record: ${editing.employee_name}` : "Add New Employee & Hostinger Mailbox"}
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="employee_name">Full Name *</Label>
              <Input
                id="employee_name"
                name="employee_name"
                placeholder="e.g. Martha Shikongo"
                defaultValue={editing?.employee_name ?? ""}
                required
              />
            </div>

            <div>
              <Label htmlFor="email_address">Hostinger Email Address *</Label>
              <Input
                id="email_address"
                name="email_address"
                type="email"
                placeholder="e.g. m.shikongo@domain.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />
              {/* Domain suggestion chips */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-muted-foreground">Quick Domain:</span>
                <button
                  type="button"
                  onClick={() => applyDomainSuffix("@crg-research.com")}
                  className="rounded bg-accent/15 px-2 py-0.5 font-mono text-accent font-semibold hover:bg-accent/25 transition-colors"
                >
                  + @crg-research.com
                </button>
                <button
                  type="button"
                  onClick={() => applyDomainSuffix("@crg-research.co.za")}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground hover:bg-accent/15 hover:text-accent transition-colors"
                >
                  + @crg-research.co.za
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                placeholder="e.g. Research & Advisory"
                defaultValue={editing?.department ?? ""}
              />
            </div>

            <div>
              <Label htmlFor="position">Position / Job Title</Label>
              <Input
                id="position"
                name="position"
                placeholder="e.g. Senior Economic Analyst"
                defaultValue={editing?.position ?? ""}
              />
            </div>
          </div>

          <div className="rounded-lg bg-surface border border-border/80 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Globe className="size-4 text-primary shrink-0" />
            <span>
              <strong>Note:</strong> Make sure this mailbox is created in your <strong>Hostinger hPanel</strong> (<a href="https://mail.hostinger.com" target="_blank" rel="noreferrer" className="text-accent underline font-medium">mail.hostinger.com</a>) so the employee can receive and send emails.
            </span>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save Record"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setFormEmail("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Search, Date Created & Sort Controls ── */}
      {!formOpen && data.length > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <Label htmlFor="empDate" className="text-xs shrink-0 font-medium">
                  Created:
                </Label>
                <select
                  id="empDate"
                  value={dateCreatedFilter}
                  onChange={(e) => setDateCreatedFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="ALL">All Dates</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_30_DAYS">Past 30 Days</option>
                  <option value="LAST_90_DAYS">Past 90 Days</option>
                  <option value="THIS_YEAR">This Year</option>
                  <option value="CUSTOM">Custom Range...</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="size-3.5 text-muted-foreground" />
                <Label htmlFor="empSort" className="text-xs shrink-0 font-medium">
                  Sort By:
                </Label>
                <select
                  id="empSort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="name_asc">Name (A → Z)</option>
                  <option value="name_desc">Name (Z → A)</option>
                  <option value="date_desc">Date Created (Newest)</option>
                  <option value="date_asc">Date Created (Oldest)</option>
                  <option value="status">Status (Active first)</option>
                  <option value="dept">Department (A → Z)</option>
                </select>
              </div>
            </div>
          </div>

          {dateCreatedFilter === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
              <span className="font-semibold text-muted-foreground">From:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              <span className="font-semibold text-muted-foreground">To:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              {(customStartDate || customEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                >
                  Clear Range
                </Button>
              )}
            </div>
          )}

          {/* Alphabet Letter Selector for Initial filtering */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Filter by Initial (First / Last Name):
              </span>
              {letterFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setLetterFilter("ALL")}
                  className="text-[11px] text-accent hover:underline"
                >
                  Show All Letters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {ALPHABET_LETTERS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setLetterFilter(letter)}
                  className={`size-7 rounded text-xs font-semibold transition-all ${
                    letterFilter === letter
                      ? "bg-accent text-accent-foreground shadow-sm scale-110"
                      : "bg-surface text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employee records yet.</p>
      ) : filteredData.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employee records match your search or filters.</p>
      ) : (
        <ul className="space-y-3">
          {filteredData.map((item) => (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border-2 border-primary bg-card p-5 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-foreground">{item.employee_name}</h3>
                  <Badge variant={item.status === "active" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                  {item.department && (
                    <Badge variant="outline" className="text-[11px]">
                      {item.department}
                    </Badge>
                  )}
                  {item.created_at && (
                    <span className="text-[11px] text-muted-foreground">
                      Added: {new Date(item.created_at).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-mono text-foreground font-medium flex items-center gap-1">
                    <Mail className="size-3.5 text-primary" />
                    {item.email_address}
                  </span>
                  {item.position && (
                    <span>· {item.position}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                {/* Copy email */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  onClick={() => copyToClipboard(item.email_address)}
                  title="Copy email address"
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>

                {/* Send Email Mailto */}
                <a href={`mailto:${item.email_address}`}>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" title="Send email">
                    <Mail className="size-3.5" />
                    Email
                  </Button>
                </a>

                {/* Suspend / Reactivate */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => toggleStatus.mutate(item)}
                >
                  {item.status === "active" ? "Suspend" : "Reactivate"}
                </Button>

                {/* Edit */}
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => openEditForm(item)}
                  title="Edit employee record"
                >
                  <Pencil className="size-3.5" />
                </Button>

                {/* Delete */}
                <Button
                  size="icon"
                  variant="destructive"
                  className="size-8"
                  onClick={() => setDeleteId(item.id)}
                  title="Delete employee record"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Hostinger Connection Settings Modal ── */}
      <AlertDialog open={showSetupGuide} onOpenChange={setShowSetupGuide}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-lg bg-[#673DE6]/10 text-[#673DE6]">
                <Inbox className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-foreground">
                  Hostinger Email Configuration & Client Setup
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Connect employee mailboxes to Outlook, Apple Mail, Gmail, iPhone, or Android.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Quick Webmail Access */}
            <div className="rounded-xl border border-[#673DE6]/30 bg-[#673DE6]/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#673DE6]">Direct Webmail Login</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Employees can log in with their full email and password anytime.
                </p>
              </div>
              <a
                href="https://mail.hostinger.com"
                target="_blank"
                rel="noreferrer"
                className="shrink-0"
              >
                <Button size="sm" className="bg-[#673DE6] hover:bg-[#5229cb] text-white gap-1.5 text-xs">
                  <Inbox className="size-3.5" />
                  Open mail.hostinger.com
                  <ExternalLink className="size-3" />
                </Button>
              </a>
            </div>

            {/* Server Settings Cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* IMAP Incoming */}
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Incoming Server (IMAP)</span>
                  <Badge variant="default" className="text-[10px]">Recommended</Badge>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span>Server:</span>
                    <strong className="text-foreground">imap.hostinger.com</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Port:</span>
                    <strong className="text-foreground">993</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Encryption:</span>
                    <strong className="text-foreground">SSL / TLS</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Username:</span>
                    <strong className="text-foreground">Full email address</strong>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] gap-1"
                  onClick={() => copyToClipboard("imap.hostinger.com:993")}
                >
                  <Copy className="size-3" /> Copy IMAP Settings
                </Button>
              </div>

              {/* SMTP Outgoing */}
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Outgoing Server (SMTP)</span>
                  <Badge variant="secondary" className="text-[10px]">Required</Badge>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span>Server:</span>
                    <strong className="text-foreground">smtp.hostinger.com</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Port:</span>
                    <strong className="text-foreground">465 (or 587)</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Encryption:</span>
                    <strong className="text-foreground">SSL / TLS</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Authentication:</span>
                    <strong className="text-foreground">Same as incoming</strong>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] gap-1"
                  onClick={() => copyToClipboard("smtp.hostinger.com:465")}
                >
                  <Copy className="size-3" /> Copy SMTP Settings
                </Button>
              </div>
            </div>

            {/* Quick Steps for Devices */}
            <div className="rounded-lg border border-border bg-surface p-3.5 space-y-1.5 text-muted-foreground">
              <p className="font-bold text-foreground text-xs">How to add to devices:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li><strong>Apple iPhone / iPad:</strong> Go to Settings → Mail → Accounts → Add Account → Other → Add Mail Account.</li>
                <li><strong>Android / Samsung:</strong> Open Gmail app → Tap Profile icon → Add another account → Other (IMAP).</li>
                <li><strong>Outlook (Windows / Mac):</strong> File → Add Account → Enter email → Choose IMAP → Enter the Hostinger server details above.</li>
              </ul>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSetupGuide(false)}>Close Guide</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this employee record?"
        description="This permanently removes the record from the directory. Consider suspending instead."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  );
}

/* ---------------- 5. Admins Panel ---------------- */

function AdminsPanel() {
  const qc = useQueryClient();

  /* ---------- Admin Form State ---------- */
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminInvitation | null>(null);
  const [sending, setSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form field state for editing/adding
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");

  /* ---------- Filter / Search State ---------- */
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  /* ---------- Delete / Revoke dialogs ---------- */
  const [deleteAdmin, setDeleteAdmin] = useState<AdminInvitation | null>(null);

  /* ---------- Fetch current user (for authorization and safety checks) ---------- */
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
      setCurrentUserEmail(data.user?.email ?? null);
    });
  }, []);

  /* ---------- Query: all invitations / admins ---------- */
  const { data: invitations = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: async (): Promise<AdminInvitation[]> => {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select("id,email,full_name,invited_by,status,notes,expires_at,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminInvitation[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "invitations"] });

  /* ---------- Open Create / Edit Forms ---------- */
  const openCreateForm = () => {
    setEditingAdmin(null);
    setFormFirstName("");
    setFormLastName("");
    setFormEmail("");
    setFormNotes("");
    setShowForm(true);
  };

  const openEditForm = (item: AdminInvitation) => {
    setEditingAdmin(item);
    const parts = (item.full_name ?? "").trim().split(" ");
    setFormFirstName(parts[0] || "");
    setFormLastName(parts.slice(1).join(" ") || "");
    setFormEmail(item.email);
    setFormNotes(item.notes ?? "");
    setShowForm(true);
  };

  /* ---------- Mutation: Save Admin (Create or Edit) ---------- */
  const saveAdminMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const firstName = (fd.get("first_name") as string).trim();
      const lastName = (fd.get("last_name") as string).trim();
      const notes = (fd.get("notes") as string).trim() || null;
      const fullName = `${firstName} ${lastName}`.trim() || null;

      // ─── EDIT MODE ───
      if (editingAdmin) {
        // 1. Update admin_invitations
        const { error: updateInvError } = await supabase
          .from("admin_invitations")
          .update({
            full_name: fullName,
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAdmin.id);

        if (updateInvError) throw updateInvError;

        // 2. Update profiles table for matching email
        const { error: profError } = await supabase
          .from("profiles")
          .update({
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          })
          .eq("email", editingAdmin.email);

        if (profError) {
          console.warn("Profile update note:", profError.message);
        }

        return { mode: "edit" as const };
      }

      // ─── CREATE MODE ───
      const email = (fd.get("email") as string).trim().toLowerCase();
      const password = (fd.get("password") as string);
      const confirmPassword = (fd.get("confirm_password") as string);

      if (!email) throw new Error("Email address is required.");
      if (!password) throw new Error("Password is required.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (password !== confirmPassword) throw new Error("Passwords do not match.");

      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Create client instance with persistSession: false to preserve current session
      const SUPABASE_URL = (import.meta.env["VITE_SUPABASE_URL"] as string) || "";
      const SUPABASE_PUBLISHABLE_KEY = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string) || "";
      const tempAuthClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 2. Sign up new admin user
      const { data: signUpData, error: signUpError } = await tempAuthClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            full_name: fullName || undefined,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const newUserId = signUpData.user?.id;

      // 3. Record in admin_invitations
      const { error: dbError } = await supabase.from("admin_invitations").insert({
        email,
        full_name: fullName,
        invited_by: currentUserId,
        status: "accepted",
        notes,
        expires_at: expiresAt,
      });
      if (dbError) {
        console.warn("Could not insert into admin_invitations:", dbError);
      }

      // 4. Ensure admin role in user_roles if newUserId exists
      if (newUserId) {
        const { error: roleError } = await supabase.from("user_roles").upsert(
          { user_id: newUserId, role: "admin" },
          { onConflict: "user_id,role" }
        );
        if (roleError) console.warn("Role assignment note:", roleError.message);

        // Also upsert into profiles
        const { error: profError } = await supabase.from("profiles").upsert(
          {
            id: newUserId,
            email,
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: fullName || null,
          },
          { onConflict: "id" }
        );
        if (profError) console.warn("Profile sync note:", profError.message);
      }

      return { mode: "create" as const };
    },
    onSuccess: (res) => {
      toast.success(
        res.mode === "edit"
          ? "Administrator details updated successfully!"
          : "New administrator account created successfully!"
      );
      setShowForm(false);
      setEditingAdmin(null);
      void invalidate();
    },
    onError: (err: Error) => {
      toast.error(`Operation failed: ${err.message}`);
    },
  });

  /* ---------- Mutation: Suspend / Reactivate Admin ---------- */
  const toggleSuspendMutation = useMutation({
    mutationFn: async (item: AdminInvitation) => {
      if (currentUserEmail && item.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        throw new Error("You cannot suspend your own active administrator account.");
      }

      const nextStatus = item.status === "suspended" ? "accepted" : "suspended";

      // 1. Update status in admin_invitations
      const { error: invError } = await supabase
        .from("admin_invitations")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (invError) throw invError;

      // 2. Sync user_roles: if suspended, revoke admin role; if reactivated, restore admin role
      if (nextStatus === "suspended") {
        // Remove or update role in user_roles for matching user
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", item.email)
          .maybeSingle();

        if (prof?.id) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", prof.id)
            .eq("role", "admin");
          if (roleError) console.warn("user_roles revoke note:", roleError.message);
        }
      } else if (nextStatus === "accepted") {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", item.email)
          .maybeSingle();

        if (prof?.id) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .upsert(
              { user_id: prof.id, role: "admin" },
              { onConflict: "user_id,role" }
            );
          if (roleError) console.warn("user_roles restore note:", roleError.message);
        }
      }

      return { nextStatus, name: item.full_name || item.email };
    },
    onSuccess: ({ nextStatus, name }) => {
      toast.success(
        nextStatus === "suspended"
          ? `Administrator ${name} has been suspended.`
          : `Administrator ${name} has been reactivated.`
      );
      void invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  /* ---------- Mutation: Delete Admin ---------- */
  const deleteAdminMutation = useMutation({
    mutationFn: async (item: AdminInvitation) => {
      if (currentUserEmail && item.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        throw new Error("You cannot delete your own active administrator account.");
      }

      // 1. Delete from admin_invitations
      const { error: delError } = await supabase
        .from("admin_invitations")
        .delete()
        .eq("id", item.id);

      if (delError) throw delError;

      // 2. Remove role from user_roles
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", item.email)
        .maybeSingle();

      if (prof?.id) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", prof.id)
          .eq("role", "admin");
        if (roleError) console.warn("Role delete note:", roleError.message);
      }
    },
    onSuccess: () => {
      toast.success("Administrator record and privileges removed.");
      setDeleteAdmin(null);
      void invalidate();
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete administrator: ${err.message}`);
    },
  });

  /* ---------- Filter logic ---------- */
  const filtered = useMemo(() => {
    return invitations.filter((inv) => {
      const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        inv.email.toLowerCase().includes(q) ||
        (inv.full_name ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [invitations, statusFilter, searchQuery]);

  /* ---------- Stats ---------- */
  const counts = useMemo(
    () => ({
      active: invitations.filter((i) => i.status === "accepted").length,
      suspended: invitations.filter((i) => i.status === "suspended").length,
      pending: invitations.filter((i) => i.status === "pending").length,
      revoked: invitations.filter((i) => i.status === "revoked").length,
    }),
    [invitations]
  );

  /* ---------- Helpers ---------- */
  function statusBadge(status: AdminInvitation["status"]) {
    type BadgeConfig = { label: string; className: string; iconClass: string; isBan?: boolean; isSuspended?: boolean };
    const map: Record<AdminInvitation["status"], BadgeConfig> = {
      accepted: {
        label: "Active Admin",
        className: "bg-emerald-100 text-emerald-800 border-emerald-300",
        iconClass: "check",
      },
      suspended: {
        label: "Suspended",
        className: "bg-amber-100 text-amber-800 border-amber-300",
        iconClass: "suspended",
        isSuspended: true,
      },
      pending: {
        label: "Pending",
        className: "bg-blue-100 text-blue-800 border-blue-300",
        iconClass: "clock",
      },
      revoked: {
        label: "Revoked",
        className: "bg-red-100 text-red-800 border-red-300",
        iconClass: "ban",
        isBan: true,
      },
      expired: {
        label: "Expired",
        className: "bg-gray-100 text-gray-600 border-gray-300",
        iconClass: "clock",
      },
    };
    const cfg = map[status] ?? map.expired;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.className}`}
      >
        {cfg.isSuspended ? (
          <UserX className="size-3 text-amber-700" />
        ) : cfg.isBan ? (
          <Ban className="size-3" />
        ) : cfg.iconClass === "check" ? (
          <CheckCircle2 className="size-3" />
        ) : (
          <Clock className="size-3" />
        )}
        {cfg.label}
      </span>
    );
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function isExpired(inv: AdminInvitation) {
    return inv.status === "pending" && new Date(inv.expires_at) < new Date();
  }

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ShieldCheck className="size-5 text-primary" />
            Manage Administrators
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create, edit, suspend, and remove administrator privileges and accounts.
          </p>
        </div>
        <Button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingAdmin(null);
            } else {
              openCreateForm();
            }
          }}
          className="shrink-0 gap-2"
        >
          {showForm ? (
            <>
              <X className="size-4" /> Cancel
            </>
          ) : (
            <>
              <UserPlus className="size-4" /> Add New Admin
            </>
          )}
        </Button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border-2 border-primary/20 bg-card p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-emerald-600">{counts.active}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Active Admins</p>
        </div>
        <div className="rounded-xl border-2 border-primary/20 bg-card p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-amber-600">{counts.suspended}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Suspended</p>
        </div>
        <div className="rounded-xl border-2 border-primary/20 bg-card p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-blue-600">{counts.pending}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl border-2 border-primary/20 bg-card p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-primary">{invitations.length}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Total Records</p>
        </div>
      </div>

      {/* ── Add / Edit Admin Form ── */}
      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSending(true);
            const fd = new FormData(e.currentTarget);
            saveAdminMutation.mutate(fd, { onSettled: () => setSending(false) });
          }}
          className="animate-fade-up space-y-5 rounded-2xl border-2 border-primary bg-card p-6 shadow-card"
        >
          {/* Form title */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                {editingAdmin ? <Pencil className="size-5 text-primary" /> : <UserPlus className="size-5 text-primary" />}
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  {editingAdmin ? `Edit Administrator: ${editingAdmin.full_name || editingAdmin.email}` : "Create New Admin Account"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {editingAdmin
                    ? "Update administrator names and notes."
                    : "Enter administrator details and set their initial login credentials."}
                </p>
              </div>
            </div>
            {editingAdmin && (
              <Badge variant="outline" className="border-primary/40 text-primary">
                Editing Mode
              </Badge>
            )}
          </div>

          {/* Names and Email */}
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv_first_name" className="font-semibold">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv_first_name"
                name="first_name"
                required
                value={formFirstName}
                onChange={(e) => setFormFirstName(e.target.value)}
                placeholder="e.g. Thabo"
                autoComplete="given-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv_last_name" className="font-semibold">
                Second / Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv_last_name"
                name="last_name"
                required
                value={formLastName}
                onChange={(e) => setFormLastName(e.target.value)}
                placeholder="e.g. Nkosi"
                autoComplete="family-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv_email" className="font-semibold">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="inv_email"
                  name="email"
                  type="email"
                  required
                  disabled={editingAdmin !== null}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="admin@crgresearch.co.za"
                  autoComplete="email"
                  className={`pl-9 ${editingAdmin ? "bg-muted cursor-not-allowed text-muted-foreground" : ""}`}
                />
              </div>
              {editingAdmin && (
                <p className="text-[11px] text-muted-foreground">Admin login email cannot be edited.</p>
              )}
            </div>
          </div>

          {/* Password Fields (Only when creating new admin) */}
          {!editingAdmin && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv_password" className="font-semibold">
                  Create New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="inv_password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Must be at least 6 characters long.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv_confirm_password" className="font-semibold">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="inv_confirm_password"
                    name="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Ensure both passwords match exactly.</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="inv_notes" className="font-semibold">
              Notes / Department
            </Label>
            <Textarea
              id="inv_notes"
              name="notes"
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Lead Research Director — full admin access granted."
            />
            <p className="text-[11px] text-muted-foreground">
              Internal reference note for your administrative records
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              disabled={sending || saveAdminMutation.isPending}
              className="gap-2"
            >
              <Save className="size-4" />
              {sending || saveAdminMutation.isPending
                ? "Saving..."
                : editingAdmin
                ? "Save Changes"
                : "Create Admin Account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingAdmin(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Search & Filter Controls ── */}
      {!showForm && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="size-3.5 text-muted-foreground" />
              <Label htmlFor="invStatus" className="text-xs font-medium shrink-0">
                Status:
              </Label>
              <select
                id="invStatus"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="accepted">Active Admins</option>
                <option value="suspended">Suspended Admins</option>
                <option value="pending">Pending</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={() => void refetch()}
              title="Refresh list"
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* ── Administrators List ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border py-14 text-center">
          <UserPlus className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-foreground">No administrators found</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {invitations.length === 0
                ? "Add your first administrator using the button above."
                : "No admin records match your current filters."}
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((inv) => {
            const expired = isExpired(inv);
            const effectiveStatus = expired ? "expired" : inv.status;
            const isSelf = Boolean(currentUserEmail && inv.email.toLowerCase() === currentUserEmail.toLowerCase());

            return (
              <li
                key={inv.id}
                className={`flex flex-col gap-3 rounded-xl border-2 bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between transition-colors ${
                  inv.status === "suspended"
                    ? "border-amber-400/50 bg-amber-50/20"
                    : "border-primary/30"
                }`}
              >
                {/* Left: avatar + info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Avatar circle */}
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full font-bold text-base uppercase select-none ${
                      inv.status === "suspended"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {(inv.full_name ?? inv.email)[0]}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-foreground text-sm">
                        {inv.full_name ?? <span className="italic text-muted-foreground">No name</span>}
                      </span>
                      {statusBadge(effectiveStatus)}
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px] border-primary text-primary font-bold">
                          You (Current Admin)
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {inv.email}
                      </span>
                      <span>Created {formatDate(inv.created_at)}</span>
                      {inv.status === "pending" && (
                        <span className={expired ? "text-destructive" : ""}>
                          {expired
                            ? "⚠ Expired"
                            : `Expires ${formatDate(inv.expires_at)}`}
                        </span>
                      )}
                    </div>
                    {inv.notes && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground italic">
                        Note: {inv.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: action buttons (Edit, Suspend/Reactivate, Delete) */}
                <div className="flex flex-wrap shrink-0 items-center gap-2 self-end sm:self-center">
                  {/* Suspend / Reactivate Button */}
                  {(inv.status === "accepted" || inv.status === "suspended") && (
                    <Button
                      size="sm"
                      variant={inv.status === "suspended" ? "outline" : "ghost"}
                      disabled={isSelf}
                      className={`h-8 gap-1.5 text-xs ${
                        inv.status === "suspended"
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "text-amber-700 hover:bg-amber-100/70"
                      }`}
                      onClick={() => toggleSuspendMutation.mutate(inv)}
                      title={isSelf ? "You cannot suspend yourself" : inv.status === "suspended" ? "Reactivate this admin" : "Suspend this admin"}
                    >
                      {inv.status === "suspended" ? (
                        <>
                          <UserCheck className="size-3.5" />
                          Reactivate
                        </>
                      ) : (
                        <>
                          <UserX className="size-3.5" />
                          Suspend
                        </>
                      )}
                    </Button>
                  )}

                  {/* Edit Button */}
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => openEditForm(inv)}
                    title="Edit administrator details"
                  >
                    <Pencil className="size-3.5" />
                  </Button>

                  {/* Delete Button */}
                  <Button
                    size="icon"
                    variant="destructive"
                    disabled={isSelf}
                    className="size-8"
                    onClick={() => setDeleteAdmin(inv)}
                    title={isSelf ? "You cannot delete yourself" : "Delete administrator"}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={deleteAdmin !== null}
        title="Delete this administrator?"
        description={
          deleteAdmin
            ? `Are you sure you want to delete ${deleteAdmin.full_name || deleteAdmin.email}? Their administrator access will be permanently revoked.`
            : "This action cannot be undone."
        }
        onCancel={() => setDeleteAdmin(null)}
        onConfirm={() => deleteAdmin && deleteAdminMutation.mutate(deleteAdmin)}
      />
    </div>
  );
}

/* ---------------- 6. Profile Panel ---------------- */

function ProfilePanel() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Fetch logged in admin data
  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          setLoading(false);
          return;
        }
        const user = userData.user;
        setCurrentUser(user);
        setEmail(user.email ?? "");

        // Try fetching profile from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name,last_name,full_name")
          .eq("id", user.id)
          .maybeSingle();

        let resolvedFirst = "";
        let resolvedLast = "";

        if (profile?.first_name || profile?.last_name) {
          resolvedFirst = profile.first_name || "";
          resolvedLast = profile.last_name || "";
        } else if (profile?.full_name) {
          const parts = profile.full_name.trim().split(" ");
          resolvedFirst = parts[0] || "";
          resolvedLast = parts.slice(1).join(" ") || "";
        } else if (user.user_metadata?.["first_name"] || user.user_metadata?.["last_name"]) {
          resolvedFirst = (user.user_metadata["first_name"] as string) || "";
          resolvedLast = (user.user_metadata["last_name"] as string) || "";
        } else if (user.user_metadata?.["full_name"]) {
          const parts = (user.user_metadata["full_name"] as string).trim().split(" ");
          resolvedFirst = parts[0] || "";
          resolvedLast = parts.slice(1).join(" ") || "";
        } else {
          // Check admin_invitations table by email
          const { data: invitation } = await supabase
            .from("admin_invitations")
            .select("full_name")
            .eq("email", user.email ?? "")
            .maybeSingle();
          if (invitation?.full_name) {
            const parts = invitation.full_name.trim().split(" ");
            resolvedFirst = parts[0] || "";
            resolvedLast = parts.slice(1).join(" ") || "";
          }
        }

        setFirstName(resolvedFirst);
        setLastName(resolvedLast);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Save Profile Handler (First Name and Second/Last Name)
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingProfile(true);

    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const fullName = `${trimmedFirst} ${trimmedLast}`.trim();

      // 1. Update Supabase auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: fullName,
        },
      });

      if (authError) throw authError;

      // 2. Update profiles table
      const { error: profError } = await supabase.from("profiles").upsert(
        {
          id: currentUser.id,
          email: currentUser.email,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: fullName,
        },
        { onConflict: "id" }
      );

      if (profError) {
        console.warn("Profile table update note:", profError.message);
      }

      toast.success("Profile details saved successfully!");
    } catch (err: any) {
      toast.error(`Failed to update profile: ${err?.message || "Unknown error"}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    if (!oldPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    if (oldPassword === newPassword) {
      toast.error("New password must be different from the current password.");
      return;
    }

    setUpdatingPassword(true);

    try {
      // 1. Verify old password by attempting re-authentication
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: oldPassword,
      });

      if (verifyError) {
        toast.error("The current password you entered is incorrect. Please check and try again.");
        setUpdatingPassword(false);
        return;
      }

      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(`Failed to update password: ${err?.message || "Unknown error"}`);
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const fullNameDisplay = `${firstName} ${lastName}`.trim();
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || email[0]?.toUpperCase() || "A";

  return (
    <div className="space-y-8">
      {/* ── Top Header Banner with Logged-in Admin Name ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <User className="size-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {fullNameDisplay ? fullNameDisplay : "Administrator Profile"}
            </h2>
            <Badge variant="default" className="gap-1 bg-primary text-primary-foreground text-xs py-0.5">
              <Shield className="size-3" /> Admin
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Currently logged in: <strong className="text-foreground">{firstName || "—"}</strong> (First Name) <strong className="text-foreground">{lastName || "—"}</strong> (Last Name) · <span className="font-mono text-xs">{email}</span>
          </p>
        </div>
      </div>

      {/* ── User Overview Card ── */}
      <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border-2 border-primary bg-card p-6 shadow-card">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-md">
          {initials}
        </div>
        <div className="text-center sm:text-left min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h3 className="text-xl font-bold text-foreground truncate">
              {fullNameDisplay ? fullNameDisplay : email}
            </h3>
            <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700 text-xs font-semibold">
              Active Session
            </Badge>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs">
            <div className="rounded-lg bg-surface border border-border px-3 py-1.5">
              <span className="text-muted-foreground">First Name:</span>{" "}
              <strong className="text-foreground">{firstName || "Not set"}</strong>
            </div>
            <div className="rounded-lg bg-surface border border-border px-3 py-1.5">
              <span className="text-muted-foreground">Second / Last Name:</span>{" "}
              <strong className="text-foreground">{lastName || "Not set"}</strong>
            </div>
            <div className="rounded-lg bg-surface border border-border px-3 py-1.5">
              <span className="text-muted-foreground">Email:</span>{" "}
              <strong className="text-foreground">{email}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Card 1: Edit Profile Name ── */}
        <form
          onSubmit={handleSaveProfile}
          className="flex flex-col justify-between rounded-2xl border-2 border-primary bg-card p-6 shadow-card space-y-6"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <User className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Personal Information</h3>
                <p className="text-xs text-muted-foreground">
                  Update your first and second (last) name.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prof_first_name" className="font-semibold text-xs">
                  First Name
                </Label>
                <Input
                  id="prof_first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Thabo"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof_last_name" className="font-semibold text-xs">
                  Second / Last Name
                </Label>
                <Input
                  id="prof_last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Nkosi"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof_email" className="font-semibold text-xs text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="prof_email"
                  value={email}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Your administrator login email cannot be changed directly.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" disabled={savingProfile} className="gap-2">
              <Save className="size-4" />
              {savingProfile ? "Saving..." : "Save Profile Details"}
            </Button>
          </div>
        </form>

        {/* ── Card 2: Change Password ── */}
        <form
          onSubmit={handleChangePassword}
          className="flex flex-col justify-between rounded-2xl border-2 border-primary bg-card p-6 shadow-card space-y-6"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Change Password</h3>
                <p className="text-xs text-muted-foreground">
                  Enter your current password, followed by your new password.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Old Password */}
              <div className="space-y-1.5">
                <Label htmlFor="prof_old_password" className="font-semibold text-xs">
                  Current / Old Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="prof_old_password"
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="prof_new_password" className="font-semibold text-xs">
                  New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="prof_new_password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Must be at least 6 characters long.
                </p>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="prof_confirm_password" className="font-semibold text-xs">
                  Confirm New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="prof_confirm_password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              type="submit"
              disabled={updatingPassword}
              className="gap-2"
            >
              <KeyRound className="size-4" />
              {updatingPassword ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Helper: Confirm Dialog ---------------- */

function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
