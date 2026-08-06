import Link from "next/link";

type AdminShowNavProps = {
  active: "overview" | "questions" | "clues" | "levels" | "readiness";
  slug: string;
};

export function AdminShowNav({ active, slug }: AdminShowNavProps) {
  const items = [
    { id: "overview", label: "Show setup", href: `/admin/shows/${slug}` },
    {
      id: "questions",
      label: "Questions & answers",
      href: `/admin/shows/${slug}/questions`,
    },
    { id: "clues", label: "Case clues", href: `/admin/shows/${slug}/clues` },
    {
      id: "levels",
      label: "Detective levels",
      href: `/admin/shows/${slug}/levels`,
    },
    {
      id: "readiness",
      label: "Launch readiness",
      href: `/admin/shows/${slug}/readiness`,
    },
  ] as const;

  return (
    <nav aria-label="Show configuration" className="admin-show-nav">
      {items.map((item) => (
        <Link
          aria-current={active === item.id ? "page" : undefined}
          className={active === item.id ? "active" : ""}
          href={item.href}
          key={item.id}
        >
          {item.label}
        </Link>
      ))}
      <Link className="admin-preview-link" href={`/play/${slug}`}>
        Preview show ↗
      </Link>
    </nav>
  );
}
