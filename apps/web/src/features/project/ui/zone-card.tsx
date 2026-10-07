/** Kartu zona di halaman detail proyek: judul overline + isi. */
export function ZoneCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-neutral-200 bg-white p-4 shadow-xs ${className ?? ''}`}>
      <h2 className="mb-3 text-overline uppercase text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}
