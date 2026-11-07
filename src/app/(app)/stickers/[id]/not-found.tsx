import Link from "next/link";
import { SearchX } from "lucide-react";

export default function StickerNotFound() {
  return (
    <div className="dotted-board mx-auto mt-8 flex max-w-xl flex-col items-center gap-4 rounded-[32px] border-2 border-line p-10 text-center">
      <SearchX size={44} className="text-butter" aria-hidden="true" />
      <h1 className="text-3xl tracking-[-0.8px]">Sticker not found</h1>
      <p className="text-muted">
        It may have been deleted, or it belongs to a different browser. Stickers are saved per browser.
      </p>
      <Link href="/" className="mt-2 flex min-h-[52px] items-center rounded-2xl bg-coral px-6 font-bold text-bg">
        Back to the board
      </Link>
    </div>
  );
}
