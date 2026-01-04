// app/(print)/layout.jsx
export const dynamic = "force-dynamic";

const PrintRootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body className="bg-white">{children}</body>
    </html>
  );
};

export default PrintRootLayout;
