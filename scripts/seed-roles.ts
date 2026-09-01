import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding roles...");

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Super Administrator with full access to the platform.",
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: {
      name: "USER",
      description: "Standard platform user.",
    },
  });

  console.log("Roles seeded successfully.");

  const email = "admin@cuelara.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { email },
      data: {
        roles: {
          connect: [{ id: adminRole.id }],
        },
      },
    });
    console.log(`Assigned ADMIN role to ${email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
