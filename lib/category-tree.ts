export interface CategoryTreeNode {
  id: string;
  name: string;
  parentId: string | null;
}

export interface FlattenedCategory<T extends CategoryTreeNode> {
  category: T;
  depth: number;
}

/**
 * Turns a flat list of categories (each with a parentId) into a depth-first
 * ordered list with a computed `depth`, so the UI can indent children under
 * their parent regardless of how many levels deep the business has gone
 * (e.g. Clothing -> Ladies -> Suits -> Cotton).
 */
export function flattenCategoryTree<T extends CategoryTreeNode>(categories: T[]): FlattenedCategory<T>[] {
  const byParent = new Map<string | null, T[]>();
  for (const cat of categories) {
    const key = cat.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(cat);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const result: FlattenedCategory<T>[] = [];
  function visit(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      result.push({ category: child, depth });
      visit(child.id, depth + 1);
    }
  }
  visit(null, 0);

  // Any category whose declared parent isn't in this list (shouldn't
  // normally happen) still needs to show up somewhere - append at root.
  const seen = new Set(result.map((r) => r.category.id));
  for (const cat of categories) {
    if (!seen.has(cat.id)) result.push({ category: cat, depth: 0 });
  }

  return result;
}

/** Builds "— " indentation prefixes for a <select> option list. */
export function indentLabel(name: string, depth: number): string {
  return depth === 0 ? name : `${"\u2003".repeat(depth)}\u2514 ${name}`;
}
