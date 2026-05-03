import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Админка",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page/40 pt-6 text-zinc-900 backdrop-blur-md dark:bg-page/25 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
