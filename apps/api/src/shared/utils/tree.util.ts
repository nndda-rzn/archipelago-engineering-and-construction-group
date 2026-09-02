

export interface TreeNode<T> {
  item: T;
  children: TreeNode<T>[];
}

export function buildTree<T extends { id: string; parentId: string | null }>(
  items: T[],
): TreeNode<T>[] {
  const map = new Map<string, TreeNode<T>>();
  for (const item of items) {
    map.set(item.id, { item, children: [] });
  }
  const roots: TreeNode<T>[] = [];
  for (const node of map.values()) {
    const parentId = node.item.parentId;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
