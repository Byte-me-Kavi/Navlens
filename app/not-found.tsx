import Link from 'next/link';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center relative overflow-hidden">
       {/* Background Gradient Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 opacity-20 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-20 blur-3xl -z-10" />

      <div className="fixed inset-0 z-0 pointer-events-none">
          <AnimatedBackground />
      </div>

       <div className="mb-8 font-extrabold text-3xl text-indigo-600 tracking-tight z-10">
            Navlens Analytics
       </div>

      <h1 className="mb-4 text-9xl font-black bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent z-10">404</h1>
      
      <h2 className="mb-4 text-3xl font-bold text-gray-900 z-10">Page Not Found</h2>
      <p className="mb-8 max-w-md text-gray-600 z-10">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
      </p>

      <div className="flex gap-4 z-10">
        <Link
          href="/dashboard"
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl"
        >
          Go to Dashboard
        </Link>
        <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50"
        >
            Back Home
        </Link>
      </div>
    </div>
  );
}
