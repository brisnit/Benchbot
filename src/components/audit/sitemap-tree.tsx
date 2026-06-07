import { cn } from "@/lib/utils";
import type { SitemapNode } from "@/lib/types";

// Renders a sitemap as an ASCII-style tree, e.g.
// Home
// ├── Products
// └── Contact
function TreeRows({
  node,
  prefix = "",
  isLast = true,
  isRoot = true,
}: {
  node: SitemapNode;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
}) {
  const connector = isRoot ? "" : isLast ? "└── " : "├── ";
  const children = node.children ?? [];
  const childPrefix = prefix + (isRoot ? "" : isLast ? "    " : "│   ");

  return (
    <>
      <div className="whitespace-pre font-mono text-sm leading-6">
        <span className="text-slate-400">{prefix + connector}</span>
        <span className={cn(isRoot ? "font-semibold text-ink" : "text-slate-700")}>{node.label}</span>
      </div>
      {children.map((child, i) => (
        <TreeRows
          key={`${child.label}-${i}`}
          node={child}
          prefix={childPrefix}
          isLast={i === children.length - 1}
          isRoot={false}
        />
      ))}
    </>
  );
}

export function SitemapTree({ tree }: { tree: SitemapNode }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4 scrollbar-thin overflow-x-auto">
      <TreeRows node={tree} />
    </div>
  );
}
