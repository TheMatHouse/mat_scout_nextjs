// app/(print)/teams/[slug]/flyer/layout.jsx
export const dynamic = "force-dynamic";

const FlyerLayout = ({ children }) => {
  return <div className="bg-white min-h-screen print:bg-white">{children}</div>;
};

export default FlyerLayout;
