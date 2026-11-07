import { PrismaClient, ReactionKind } from "@prisma/client";
import { plateThumbnail as plate } from "../src/lib/plate";

const prisma = new PrismaClient();

const USERS = [
  {
    id: "seed_maya",
    displayName: "Maya",
    posts: [
      { title: "Cacio e Pepe", menu: 2500, home: 390, thumb: plate("#FFD54A", "#E9A93A") },
      { title: "Shakshuka", menu: 1600, home: 280, thumb: plate("#FFB199", "#D9432B") },
    ],
  },
  {
    id: "seed_jordan",
    displayName: "Jordan",
    posts: [{ title: "Smash burger", menu: 1800, home: 510, thumb: plate("#FFB199", "#8A4B2A") }],
  },
  {
    id: "seed_priya",
    displayName: "Priya",
    posts: [
      { title: "Pad see ew", menu: 1700, home: 460, thumb: plate("#9FE3C4", "#7A4A22") },
      { title: "Chicken tikka", menu: 2100, home: 620, thumb: plate("#FFE08A", "#E07A2E") },
    ],
  },
];

const NOTES = [
  "Made this on Tuesday. Add lemon zest at the end.",
  "Tried it with brown butter, would do again.",
  "Way better than the place downtown.",
  "Doubled the garlic. No regrets.",
  "My kids asked for seconds.",
];

async function main() {
  // Idempotent: wipe and recreate seed users (cascade removes their posts).
  await prisma.user.deleteMany({ where: { id: { in: USERS.map((u) => u.id) } } });

  const postIds: string[] = [];
  const postOwners: string[] = [];
  for (const u of USERS) {
    await prisma.user.create({ data: { id: u.id, displayName: u.displayName } });
    for (const [i, p] of u.posts.entries()) {
      const post = await prisma.fridgePost.create({
        data: {
          userId: u.id,
          title: p.title,
          thumbnail: p.thumb,
          menuPriceCents: p.menu,
          homeCostCents: p.home,
          createdAt: new Date(Date.now() - (postIds.length * 5 + i) * 60 * 60 * 1000),
        },
      });
      postIds.push(post.id);
      postOwners.push(u.id);
    }
  }

  // Everyone reacts to and leaves a note on someone else's posts.
  const kinds = [ReactionKind.FIRE, ReactionKind.HEART, ReactionKind.YUM];
  let n = 0;
  for (const [ui, u] of USERS.entries()) {
    for (const [pi, postId] of postIds.entries()) {
      if (postOwners[pi] === u.id) continue;
      if ((ui + pi) % 2 === 0) {
        await prisma.reaction.create({ data: { postId, userId: u.id, kind: kinds[(ui + pi) % 3] } });
      }
      if ((ui + pi) % 3 === 0) {
        await prisma.note.create({ data: { postId, userId: u.id, text: NOTES[n++ % NOTES.length] } });
      }
    }
  }

  console.log(`Seeded ${USERS.length} users and ${postIds.length} Fridge posts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
