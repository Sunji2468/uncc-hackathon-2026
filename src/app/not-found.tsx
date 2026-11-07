import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark size={56} />
      <h1 className="text-4xl tracking-[-1px]">Nothing on this shelf</h1>
      <p className="max-w-sm text-muted">That page does not exist.</p>
      <Link href="/" className="mt-2 flex min-h-[52px] items-center rounded-2xl bg-coral px-6 font-bold text-bg">
        Go to your board
      </Link>
    </main>
  );
}
