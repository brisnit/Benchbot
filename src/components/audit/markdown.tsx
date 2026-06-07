import React from "react";

// Minimal, dependency-free Markdown renderer covering the subset BenchBot
// reports use: headings, bold/italic, ordered & unordered lists, tables,
// horizontal rules and paragraphs. Good enough for a client-ready report
// without pulling in a full markdown pipeline.

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // split on **bold** and _italic_
  const regex = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(
        <strong key={`${keyBase}-${i}`} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>,
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code key={`${keyBase}-${i}`} className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>,
      );
    } else if (part.startsWith("_") && part.endsWith("_")) {
      nodes.push(
        <em key={`${keyBase}-${i}`} className="italic text-slate-600">
          {part.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(<React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>);
    }
  });
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // table
    if (line.trim().startsWith("|") && lines[i + 1]?.includes("---")) {
      const header = line.split("|").slice(1, -1).map((c) => c.trim());
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                {header.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 text-left font-display font-semibold text-ink">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-t border-border">
                  {r.map((c, ci) => (
                    <td key={ci} className={ci === 0 ? "px-3 py-2 font-medium" : "px-3 py-2 font-mono text-xs tabular-nums"}>
                      {renderInline(c, `t${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className="mt-5 text-base font-semibold text-ink">
          {renderInline(line.slice(4), `h3-${key}`)}
        </h3>,
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className="mt-7 border-b border-border pb-2 text-xl font-bold tracking-tight text-ink">
          {renderInline(line.slice(3), `h2-${key}`)}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="text-2xl font-bold tracking-tight text-ink">
          {renderInline(line.slice(2), `h1-${key}`)}
        </h1>,
      );
      i++;
      continue;
    }
    if (line.trim() === "---") {
      blocks.push(<hr key={key++} className="my-6 border-border" />);
      i++;
      continue;
    }

    // unordered list
    if (/^[-*] /.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-3 space-y-1.5">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 text-sm text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{renderInline(it, `ul${key}-${ii}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // ordered list
    if (/^\d+\. /.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-3 space-y-1.5">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2.5 text-sm text-slate-700">
              <span className="font-mono text-xs font-semibold text-brand">{ii + 1}.</span>
              <span>{renderInline(it, `ol${key}-${ii}`)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    blocks.push(
      <p key={key++} className="my-2 text-sm leading-relaxed text-slate-700">
        {renderInline(line, `p-${key}`)}
      </p>,
    );
    i++;
  }

  return <div>{blocks}</div>;
}
