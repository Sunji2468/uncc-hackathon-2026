import { Sidebar } from "@/components/Sidebar";
import { isDemo } from "@/lib/demo";
import { MobileTabBar, MobileTopBar } from "@/components/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const demo = await isDemo();
  return (
    <div className="flex min-h-dvh">
      <Sidebar demo={demo} />
      <div className="min-w-0 flex-1">
        <MobileTopBar />
        <main className="px-4 pt-6 pb-32 md:px-10 md:pt-8 md:pb-16">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}
