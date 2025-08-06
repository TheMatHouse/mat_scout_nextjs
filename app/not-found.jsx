export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-6 bg-white dark:bg-gray-900">
      <h1 className="text-6xl font-extrabold text-ms-blue mb-4">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Page Not Found
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Oops! The page you are looking for doesn’t exist or has been moved.
      </p>
      <a
        href="/"
        className="inline-block bg-ms-blue hover:bg-ms-dark-red text-white font-semibold px-6 py-3 rounded-lg shadow transition"
      >
        Go Back Home
      </a>
    </div>
  );
}
