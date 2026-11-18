import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="font-display text-3xl font-bold text-cream">Page Not Found</h2>
      <p className="mt-2 text-sm text-mist">The page or companion you requested could not be found.</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-rose-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-500"
      >
        Return Home
      </Link>
    </div>
  );
}
