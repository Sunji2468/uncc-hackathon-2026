"use client";

import { useEffect, useState } from "react";
import { Box, Sparkles } from "lucide-react";
import { cutoutPhoto } from "@/lib/client/sticker-cutout";
import { formatCents } from "@/lib/money";

/** Shared artwork for collection tiles, flip cards and exported stickers. */
export function FoodStickerArt({ thumbnail, title, kind, savings, className = "" }: {
  thumbnail: string; title: string; kind: "DISH" | "MYSTERY" | "TWIST";
  savings?: number | null; className?: string;
}) {
  const [cutout, setCutout] = useState<{ source: string; image: string } | null>(null);
  useEffect(() => {
    let current = true;
    if (kind === "DISH") void cutoutPhoto(thumbnail).then((image) => {
      if (current && image) setCutout({ source: thumbnail, image });
    });
    return () => { current = false; };
  }, [thumbnail, kind]);
  const image = cutout?.source === thumbnail ? cutout.image : null;
  const label = kind === "MYSTERY" ? "PANTRY MAGIC" : kind === "TWIST" ? "MADE FOR YOU" : "RECIPE HEIST";
  return (
    <div className={`food-sticker-art food-sticker-${kind.toLowerCase()} ${className}`}>
      <span className="food-sticker-orbit" aria-hidden="true" />
      <span className="food-sticker-spark food-sticker-spark-one" aria-hidden="true">✦</span>
      <span className="food-sticker-spark food-sticker-spark-two" aria-hidden="true">✳</span>
      <span className="food-sticker-edition">{label}</span>
      {kind === "DISH" ? (
        <div className={`food-sticker-subject ${image ? "is-cutout" : "is-framed"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image ?? thumbnail} alt={title} loading="eager" />
        </div>
      ) : (
        <div className="food-sticker-emblem" aria-hidden="true">
          {kind === "MYSTERY" ? <Box size={66} strokeWidth={1.6} /> : <Sparkles size={66} strokeWidth={1.6} />}
        </div>
      )}
      {savings != null && savings > 0 && (
        <span className="food-sticker-stamp"><span>SAVED</span><strong>{formatCents(savings)}</strong><span>PER PLATE · EST.</span></span>
      )}
      <span className="food-sticker-caption" aria-hidden="true">{kind === "DISH" ? "Love it. Make it." : kind === "MYSTERY" ? "A little pantry magic." : "Your goals. Your recipe."}</span>
    </div>
  );
}
