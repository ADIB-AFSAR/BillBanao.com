"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tags, CornerDownRight } from "lucide-react";
import {
  listCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/lib/actions/categories";
import { categorySchema, type CategoryInput } from "@/schemas/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { OfflineListNotice, OfflineStaleBanner } from "@/components/layout/offline-list-notice";
import { flattenCategoryTree, indentLabel } from "@/lib/category-tree";
import { warmCategoryCache, getCachedCategories } from "@/lib/offline/cache";
import { withTimeout } from "@/lib/offline/with-timeout";

type Category = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  _count: { products: number; children: number };
};

export function CategoryManager({ businessId }: { businessId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [addUnderParentId, setAddUnderParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await withTimeout(listCategoriesAction());
      if (!res.ok) {
      throw new Error(res.error || "Request failed");
    }
        const data = res.data as unknown as Category[];
        setCategories(data);
        void warmCategoryCache(
          businessId,
          data.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            parentId: c.parentId,
            productCount: c._count.products,
            childrenCount: c._count.children,
          }))
        );
      setOffline(false);
    } catch {
      // Request never reached the server - fall back to the last cached
      // category list on this device rather than spinning forever or
      // leaving the page blank.
      const cached = await getCachedCategories(businessId);
      if (cached.length > 0) {
        setCategories(
          cached.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            parentId: c.parentId,
            _count: { products: c.productCount, children: c.childrenCount },
          }))
        );
      }
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Refetch automatically once the connection comes back.
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flattened = useMemo(() => flattenCategoryTree(categories), [categories]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteCategoryAction(deleteTarget.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`"${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate max-w-lg">
          Nest categories as deep as your business needs - e.g. Clothing → Ladies → Suits → Cotton.
          Grocery might just need one level.
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setAddUnderParentId(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Add category
        </Button>
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading && categories.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate">Loading…</div>
        ) : offline && categories.length === 0 ? (
          <OfflineListNotice label="Can't reach the server to load categories." onRetry={load} />
        ) : categories.length === 0 ? (
          <div className="p-10 text-center">
            <Tags className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No categories yet.</p>
          </div>
        ) : (
          <>
            {offline && (
              <div className="p-3 pb-0">
                <OfflineStaleBanner />
              </div>
            )}
          <div className="divide-y divide-paper-line">
            {flattened.map(({ category: c, depth }) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 20 }}>
                  {depth > 0 && <CornerDownRight className="size-3.5 text-slate/50 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{c.name}</p>
                    {c.description && <p className="text-xs text-slate truncate">{c.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate tabular hidden sm:inline">
                    {c._count.products} product{c._count.products === 1 ? "" : "s"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setAddUnderParentId(c.id);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="size-3.5" /> Sub
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(c);
                      setAddUnderParentId(null);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="size-4 text-brick" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        defaultParentId={addUnderParentId}
        allCategories={categories}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description={
          deleteTarget && deleteTarget._count.children > 0
            ? "This category has subcategories - delete or move those first."
            : "Products in this category will become uncategorized."
        }
        confirmLabel="Delete category"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  editing,
  defaultParentId,
  allCategories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Category | null;
  defaultParentId: string | null;
  allCategories: Category[];
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryInput>({ resolver: zodResolver(categorySchema) as never });

  useEffect(() => {
    reset({
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      parentId: editing?.parentId ?? defaultParentId ?? "",
    });
  }, [editing, defaultParentId, open, reset]);

  // A category can't be parented under itself or (checked server-side too)
  // one of its own descendants - keep the option list simple here and let
  // the server give the definitive error if something slips through.
  const parentOptions = useMemo(
    () => flattenCategoryTree(allCategories.filter((c) => c.id !== editing?.id)),
    [allCategories, editing]
  );

  async function onSubmit(values: CategoryInput) {
    setLoading(true);
    const result = editing
      ? await updateCategoryAction(editing.id, values)
      : await createCategoryAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Category updated." : "Category added.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={editing ? "Edit category" : "Add category"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="cat-name">Name</Label>
          <Input id="cat-name" invalid={!!errors.name} {...register("name")} placeholder="Grocery" />
          {errors.name && <p className="text-xs text-brick mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="cat-parent">Parent category</Label>
          <Select id="cat-parent" {...register("parentId")}>
            <option value="">No parent (top level)</option>
            {parentOptions.map(({ category: c, depth }) => (
              <option key={c.id} value={c.id}>
                {indentLabel(c.name, depth)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cat-desc">Description</Label>
          <Textarea id="cat-desc" rows={2} {...register("description")} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {editing ? "Save changes" : "Add category"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}