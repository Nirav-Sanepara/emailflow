import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@yopmail.com";

  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM auth.users WHERE email = $1`,
    email
  );

  let userId: string;

  if (existing.length > 0) {
    userId = existing[0].id;
    console.log("User already exists:", userId);
  } else {
    const result = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        $1,
        crypt($2, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      RETURNING id`,
      email,
      "Demo@123"
    );
    userId = result[0].id;
    console.log("User created:", userId);
  }

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email },
  });

  await prisma.userProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, email, planId: "free" },
  });

  console.log("Done. Email: admin@yopmail.com, Password: Demo@123");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
