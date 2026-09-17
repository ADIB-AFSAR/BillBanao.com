"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import {
  listCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/lib/actions/categories";
import { categorySchema, type CategoryInput } from "@/schemas/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea } from "@/components/ui/primitives";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";

type Category = {
  id: string;
  name: string;
  description: string | null;
  _count: { products: number };
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await listCategoriesAction();
    if (res.ok) setCategories(res.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

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
        <p className="text-sm text-slate">Organize products so they&apos;re easy to find at the billing screen.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Add category
        </Button>
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate">Loading…</div>
        ) : categories.length === 0 ? (
          <div className="p-10 text-center">
            <Tags className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No categories yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-paper-line last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-slate">{c.description || "—"}</td>
                  <td className="px-4 py-3 tabular text-ink-2">{c._count.products}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="size-4 text-brick" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Products in this category will become uncategorized."
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Category | null;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryInput>({ resolver: zodResolver(categorySchema) });

  useEffect(() => {
    reset({ name: editing?.name ?? "", description: editing?.description ?? "" });
  }, [editing, open, reset]);

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
