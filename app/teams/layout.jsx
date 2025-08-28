// app/teams/layout.jsx
export const dynamic = "force-dynamic";

// Public layout: no auth checks here.
// Pages under /teams can fetch the user as needed.
export default function TeamsLayout({ children }) {
  return <>{children}</>;
}
