// app/admin/layout.jsx
export const dynamic = "force-dynamic";

/**
 * AdminLayout
 * - NO header or extra nav here (global chrome already provides it).
 * - Keeps spacing consistent with the rest of the app.
 */
export default function AdminLayout({ children }) {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6">
      {children}
    </section>
  );
}
