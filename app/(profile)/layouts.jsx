export default function ProfileLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen px-4 py-6 bg-background text-foreground">
          {children}
        </main>
      </body>
    </html>
  );
}
