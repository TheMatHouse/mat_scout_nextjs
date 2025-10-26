// app/teams/layout.jsx
export const dynamic = "force-dynamic";

export default function TeamsLayout({ children }) {
  return (
    <main className="relative w-full overflow-x-hidden">
      <section className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </section>
    </main>
  );
}
