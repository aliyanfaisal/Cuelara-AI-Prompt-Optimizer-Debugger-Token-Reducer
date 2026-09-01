import { PrismaClient } from "../src/generated/client/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Engineering", slug: "engineering", description: "Prompts for software development, coding, architecture, and debugging." },
  { name: "Content & SEO", slug: "content", description: "Prompts for blog posts, copywriting, and search engine optimization." },
  { name: "Data Analysis", slug: "data", description: "Prompts for data extraction, analysis, SQL generation, and visualization." },
  { name: "Image Gen", slug: "image", description: "Prompts for Midjourney, DALL-E, Stable Diffusion, and other image generators." },
  { name: "System", slug: "system", description: "System prompts for setting up AI personas and strict boundaries." },
  { name: "Marketing & Sales", slug: "marketing", description: "Prompts for cold emails, ad copy, and go-to-market strategies." },
  { name: "Productivity", slug: "productivity", description: "Prompts for summarization, task management, and workflow optimization." },
  { name: "Creative Writing", slug: "creative-writing", description: "Prompts for storytelling, scriptwriting, and world-building." }
];

async function main() {
  console.log("Seeding Cookbook Categories...");
  
  for (const cat of CATEGORIES) {
    const created = await prisma.cookbookCategory.upsert({
      where: { slug: cat.slug },
      update: {}, // Do nothing if it exists
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description
      }
    });
    console.log(`- Upserted: ${created.name}`);
  }
  
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
