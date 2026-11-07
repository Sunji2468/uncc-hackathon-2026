"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Heart, StickyNote, Trash2, Utensils } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  NOTE_MAX,
  REACTIONS,
  sortPosts,
  toggleReaction,
  topHeists,
  type FridgePostView,
  type FridgeSort,
  type Reaction,
} from "@/lib/fridge";
import { formatCents } from "@/lib/money";
import { ApiRequestError, fetchJson } from "@/lib/client/fetch-json";

const DRAG_TYPE = "application/x-tasteheist-fridge";

const REACTION_STYLE: Record<Reaction, { label: string; Icon: typeof Flame; chip: string; dot: string }> = {
  FIRE: { label: "Fire", Icon: Flame, chip: "bg-[#FFB199]", dot: "bg-coral" },
  HEART: { label: "Heart", Icon: Heart, chip: "bg-[#FFC7D2]", dot: "bg-[#FF9DB0]" },
  YUM: { label: "Yum", Icon: Utensils, chip: "bg-[#FFE98A]", dot: "bg-butter" },
};

type DragPayload = { type: "reaction"; kind: Reaction } | { type: "note" };

export function Fridge({ initial, initialSort, myName }: { initial: FridgePostView[]; initialSort: FridgeSort; myName: string }) {
  const [posts, setPosts] = useState(initial);
  const [sort, setSort] = useState<FridgeSort>(initialSort);
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  const refresh = useCallback(async () => {
    try {
      const res = await fetchJson<{ posts: FridgePostView[] }>(`/api/fridge?sort=${sortRef.current}`);
      setPosts(res.posts);
      setLastSync(new Date());
    } catch {
      // A failed background refresh keeps the current posts; the next focus retries.
    }
  }, []);

  // No realtime: refetch when the window regains focus or becomes visible.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const choose = (s: FridgeSort) => {
    setSort(s);
    setPosts((p) => sortPosts(p, s));
    const url = new URL(window.location.href);
    if (s === "new") url.searchParams.delete("sort");
    else url.searchParams.set("sort", s);
    window.history.replaceState(null, "", url);
  };

  const replace = (p: FridgePostView) => setPosts((list) => list.map((x) => (x.id === p.id ? p : x)));

  const react = async (post: FridgePostView, kind: Reaction) => {
    setError("");
    replace(toggleReaction(post, kind)); // optimistic
    try {
      const res = await fetchJson<{ post: FridgePostView }>(`/api/fridge/${post.id}/react`, { method: "POST", json: { kind } });
      replace(res.post);
      setAnnounce(`${res.post.reacted[kind] ? "Added" : "Removed"} ${REACTION_STYLE[kind].label} on ${post.title}.`);
    } catch {
      replace(post);
      setError("Could not save that reaction. Please try again.");
    }
  };

  const addNote = async (post: FridgePostView, text: string): Promise<boolean> => {
    const t = text.trim();
    if (!t) {
      setError("Write your sticky note first.");
      return false;
    }
    setError("");
    try {
      const res = await fetchJson<{ post: FridgePostView }>(`/api/fridge/${post.id}/notes`, { method: "POST", json: { text: t } });
      replace(res.post);
      setAnnounce(`Note added to ${post.title}.`);
      return true;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not add the note.");
      return false;
    }
  };

  const remove = async (post: FridgePostView) => {
    const before = posts;
    setPosts((l) => l.filter((x) => x.id !== post.id));
    try {
      await fetchJson(`/api/fridge/${post.id}`, { method: "DELETE" });
      setAnnounce(`Removed ${post.title} from the Fridge.`);
    } catch {
      setPosts(before);
      setError("Could not remove that post.");
    }
  };

  const onDrop = (post: FridgePostView, payload: DragPayload) => {
    if (payload.type === "reaction") {
      if (!post.reacted[payload.kind]) void react(post, payload.kind);
    } else void addNote(post, noteText).then((ok) => ok && setNoteText(""));
  };

  const top = topHeists(posts, new Date());

  return (
    <>
      <PageHeader title="Community Fridge" subtitle="A shared board of dishes. React with stickers instead of likes.">
        <div role="group" aria-label="Sort posts" className="flex gap-1 rounded-full border-2 border-line bg-panel p-1">
          {(
            [
              ["new", "New"],
              ["heist", "Biggest heist"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={sort === id}
              onClick={() => choose(id)}
              className={`min-h-11 rounded-full px-[22px] text-[15px] font-bold ${sort === id ? "bg-butter text-bg" : "text-ink hover:bg-bg"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </PageHeader>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Palette: draggable reactions and a sticky note, with buttons on every post as the alternative */}
      <div className="mt-6 flex flex-wrap items-center gap-x-9 gap-y-5 rounded-3xl border-2 border-line bg-panel px-[22px] py-4">
        <div className="min-w-0 flex-[1_1_220px]">
          <p className="text-[17px] font-bold">Stickers to hand out</p>
          <p className="mt-0.5 text-sm text-muted">Drag onto a dish, or use the buttons on it.</p>
        </div>
        <div className="flex gap-3.5">
          {REACTIONS.map((k) => {
            const { label, Icon, dot } = REACTION_STYLE[k];
            return (
              <div key={k} className="flex flex-col items-center gap-1">
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ type: "reaction", kind: k } satisfies DragPayload));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  aria-hidden="true"
                  className={`flex size-14 cursor-grab items-center justify-center rounded-full border-4 border-white text-sticker-ink ${dot}`}
                >
                  <Icon size={24} />
                </div>
                <span className="text-xs font-bold">{label}</span>
              </div>
            );
          })}
          <div className="flex flex-col items-center gap-1">
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ type: "note" } satisfies DragPayload));
                e.dataTransfer.effectAllowed = "copy";
              }}
              aria-hidden="true"
              className="flex size-14 cursor-grab items-center justify-center rounded-[14px] border-4 border-white bg-[#FFE98A] text-sticker-ink"
            >
              <StickyNote size={24} />
            </div>
            <span className="text-xs font-bold">Note</span>
          </div>
        </div>
        <div className="min-w-0 flex-[1_1_240px]">
          <label htmlFor="notetext" className="mb-1.5 block text-sm font-bold">
            Text for your sticky note
          </label>
          <input
            id="notetext"
            value={noteText}
            maxLength={NOTE_MAX}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add chili crisp on top."
            className="min-h-12 w-full rounded-[14px] border-2 border-line bg-face px-3.5 text-base text-sticker-ink placeholder:text-sticker-muted"
          />
          <p className="mt-1 text-xs text-muted">
            {noteText.length}/{NOTE_MAX} · Posting as {myName === "Guest" ? <Link href="/settings" className="underline">Guest (set a name)</Link> : myName}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-coral/15 p-4 font-bold">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-start gap-7">
        <div className="min-w-0 flex-[1_1_620px]">
          {posts.length === 0 ? (
            <div className="dotted-board flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[32px] border-2 border-line p-8 text-center">
              <p className="font-display text-2xl font-extrabold">The Fridge is empty</p>
              <p className="max-w-sm text-muted">Open one of your restaurant heists and press Share to Fridge.</p>
              <Link href="/" className="mt-2 flex min-h-12 items-center rounded-2xl bg-coral px-6 font-bold text-bg">
                Go to your board
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-7 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
              {posts.map((p, i) => (
                <PostCard
                  key={p.id}
                  post={p}
                  index={i}
                  noteText={noteText}
                  onReact={(k) => void react(p, k)}
                  onNote={(t) => addNote(p, t)}
                  onDrop={(payload) => onDrop(p, payload)}
                  onRemove={() => void remove(p)}
                />
              ))}
            </ul>
          )}
          <p className="mt-6 text-[13px] text-muted">
            Updates when you come back to this tab. {lastSync && `Last refreshed ${lastSync.toLocaleTimeString()}.`}{" "}
            <button type="button" onClick={() => void refresh()} className="min-h-11 font-bold text-ink underline">
              Refresh now
            </button>
          </p>
        </div>

        <aside className="min-w-[260px] flex-[0_1_320px] rounded-[28px] border-2 border-line bg-panel p-[22px] max-sm:min-w-0 max-sm:flex-[1_1_100%]" aria-labelledby="top-h">
          <h2 id="top-h" className="text-2xl tracking-[-0.5px]">
            Biggest heist this week
          </h2>
          <p className="mt-1 text-[13px] text-muted">Ranked by money kept per plate</p>
          {top.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No heists this week yet.</p>
          ) : (
            <ol className="mt-4 flex flex-col gap-2.5">
              {top.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-bg px-3.5 py-3">
                  <span
                    className={`flex size-[34px] flex-none items-center justify-center rounded-full font-extrabold text-bg ${i === 0 ? "bg-butter" : "bg-ink"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-base font-bold">
                    {p.title}
                    <span className="block text-[13px] font-normal text-muted">{p.author}</span>
                  </span>
                  <span className="text-lg font-extrabold">{formatCents(p.keepCents)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-[13px] leading-snug text-muted">Costs are estimates. Posts from everyone appear here after a refresh.</p>
        </aside>
      </div>
    </>
  );
}

const ROT = [-1, 1.5, -1.5, 1];

function PostCard({
  post,
  index,
  noteText,
  onReact,
  onNote,
  onDrop,
  onRemove,
}: {
  post: FridgePostView;
  index: number;
  noteText: string;
  onReact: (k: Reaction) => void;
  onNote: (text: string) => Promise<boolean>;
  onDrop: (p: DragPayload) => void;
  onRemove: () => void;
}) {
  const [over, setOver] = useState(false);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const notes = showAll ? post.notes : post.notes.slice(-3);

  return (
    <li
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_TYPE)) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          onDrop(JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as DragPayload);
        } catch {}
      }}
      style={{ transform: `rotate(${ROT[index % ROT.length]}deg)` }}
      className={`overflow-hidden rounded-[26px] border-[6px] bg-face text-sticker-ink shadow-[0_12px_24px_rgba(0,0,0,0.4)] transition ${
        over ? "scale-[1.02] border-butter" : "border-white"
      }`}
    >
      <article aria-label={`${post.title} by ${post.author}`}>
        <div className="relative h-[72px] bg-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.thumbnail} alt="" className="size-full object-cover" />
          <p className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-sticker-ink px-2.5 py-1 text-xs font-bold text-face">
            by {post.author}
          </p>
          {post.mine && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${post.title} from the Fridge`}
              className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 hover:text-[#B3261E]"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="px-4 pt-3.5 pb-4">
          <h3 className="text-2xl tracking-[-0.6px]">{post.title}</h3>
          <p className="mt-1 text-sm font-bold">
            <span className="text-sticker-muted line-through">{formatCents(post.menuPriceCents)}</span> to{" "}
            {formatCents(post.homeCostCents)} <span className="font-normal text-sticker-muted">(est.)</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Reactions">
            {REACTIONS.map((k) => {
              const { label, Icon, chip } = REACTION_STYLE[k];
              const on = post.reacted[k];
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${label}: ${post.counts[k]}. ${on ? "Remove your" : "Give a"} ${label.toLowerCase()} sticker`}
                  onClick={() => onReact(k)}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold ${chip} ${
                    on ? "ring-[3px] ring-sticker-ink" : ""
                  }`}
                >
                  <Icon size={16} aria-hidden="true" fill={on ? "currentColor" : "none"} />
                  {post.counts[k]}
                </button>
              );
            })}
            <button
              type="button"
              aria-expanded={writing}
              onClick={() => {
                setDraft(noteText);
                setWriting((w) => !w);
              }}
              className="flex min-h-11 items-center gap-1.5 rounded-full border-2 border-sticker-ink px-3 text-sm font-bold"
            >
              <StickyNote size={16} aria-hidden="true" /> Note
            </button>
          </div>

          {writing && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await onNote(draft)) {
                  setDraft("");
                  setWriting(false);
                }
              }}
            >
              <label htmlFor={`note-${post.id}`} className="sr-only">
                Sticky note for {post.title}
              </label>
              <input
                id={`note-${post.id}`}
                autoFocus
                value={draft}
                maxLength={NOTE_MAX}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Your tip, 140 characters"
                className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-chip bg-white px-3 text-sm"
              />
              <button type="submit" className="min-h-11 rounded-xl bg-sticker-ink px-3.5 text-sm font-bold text-face">
                Stick
              </button>
            </form>
          )}

          {notes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {notes.map((n, i) => (
                <li
                  key={n.id}
                  style={{ transform: `rotate(${i % 2 ? 1 : -1}deg)` }}
                  className="rounded-md bg-[#FFE98A] px-3 py-2 text-sm shadow-[0_3px_6px_rgba(0,0,0,0.15)]"
                >
                  {n.text}
                  <span className="mt-0.5 block text-xs text-sticker-muted">by {n.author}</span>
                </li>
              ))}
            </ul>
          )}
          {post.notes.length > 3 && (
            <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-2 min-h-11 text-sm font-bold underline">
              {showAll ? "Show fewer notes" : `Show all ${post.notes.length} notes`}
            </button>
          )}
        </div>
      </article>
    </li>
  );
}
