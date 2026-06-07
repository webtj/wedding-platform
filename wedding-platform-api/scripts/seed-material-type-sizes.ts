// One-off data fix: populate MaterialType.sizes[] for system types
// Run with: pnpm tsx scripts/seed-material-type-sizes.ts
// Idempotent: re-running updates the same rows.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SIZES: Record<string, { width: number; height: number }[]> = {
  vow_card: [
    { width: 120, height: 170 },
    { width: 100, height: 150 },
    { width: 148, height: 210 }
  ],
  table_card: [
    { width: 100, height: 150 },
    { width: 120, height: 170 },
    { width: 90, height: 120 }
  ],
  hand_card: [
    { width: 90, height: 140 },
    { width: 100, height: 150 },
    { width: 80, height: 120 }
  ],
  place_card: [
    { width: 100, height: 150 },
    { width: 120, height: 170 },
    { width: 80, height: 120 }
  ],
  photo_wall: [
    { width: 600, height: 900 },
    { width: 800, height: 1200 },
    { width: 500, height: 750 }
  ],
  sticker: [
    { width: 50, height: 50 },
    { width: 80, height: 80 },
    { width: 100, height: 100 }
  ],
  tablecloth: [
    { width: 1800, height: 1800 },
    { width: 2400, height: 2400 },
    { width: 1500, height: 1500 }
  ],
  fan_cover: [
    { width: 200, height: 300 },
    { width: 250, height: 350 },
    { width: 180, height: 250 }
  ],
  guestbook: [
    { width: 200, height: 200 },
    { width: 250, height: 300 },
    { width: 210, height: 297 }
  ],
  candy_box: [
    { width: 80, height: 80 },
    { width: 100, height: 100 },
    { width: 60, height: 60 }
  ],
  invitation: [
    { width: 180, height: 120 },
    { width: 148, height: 210 },
    { width: 200, height: 280 }
  ],
  table_number: [
    { width: 100, height: 150 },
    { width: 120, height: 170 },
    { width: 80, height: 120 }
  ]
};

async function main() {
  let updated = 0;
  let skipped = 0;
  for (const [code, sizes] of Object.entries(SIZES)) {
    const result = await prisma.materialType.updateMany({
      where: { code },
      data: { sizes }
    });
    if (result.count > 0) {
      updated += result.count;
      console.log(`  ✓ ${code}: ${sizes.length} sizes`);
    } else {
      skipped += 1;
      console.log(`  - ${code}: not found`);
    }
  }
  console.log(`\nUpdated ${updated} rows, skipped ${skipped} codes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
