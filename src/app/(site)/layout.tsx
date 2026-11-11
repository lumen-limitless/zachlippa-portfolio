import Navbar from "@/components/navbar";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-12 sm:py-24">
      {children}
      <Navbar />
    </div>
  );
}
