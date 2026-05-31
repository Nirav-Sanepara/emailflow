import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Test123456";

async function ensureAuthUser(email: string, password: string): Promise<string> {
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM auth.users WHERE email = $1`,
    email
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

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
    password
  );

  return result[0].id;
}

async function main() {
  console.log("Seeding database...");

  // ──────────────────────────────────────────────
  // 1. PLANS
  // ──────────────────────────────────────────────
  const plans = [
    {
      id: "free",
      name: "Free",
      description: "Basic features for getting started",
      features: { max_projects: 5, storage_gb: 1, supports_ai: false },
      priceMonthly: 0,
      sortOrder: 1,
      isActive: true,
    },
    {
      id: "pro",
      name: "Pro",
      description: "Advanced features for professionals",
      features: { max_projects: 100, storage_gb: 50, supports_ai: true },
      priceMonthly: 29,
      sortOrder: 2,
      isActive: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Custom solutions for large teams",
      features: { max_projects: -1, storage_gb: 500, supports_ai: true },
      priceMonthly: 99,
      sortOrder: 3,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }
  console.log("Plans seeded:", plans.length);

  // ──────────────────────────────────────────────
  // 2. ADMIN USER (auth + prisma)
  // ──────────────────────────────────────────────
  const adminId = await ensureAuthUser(ADMIN_EMAIL, ADMIN_PASSWORD);

  await prisma.user.upsert({
    where: { id: adminId },
    update: {},
    create: { id: adminId, email: ADMIN_EMAIL },
  });

  await prisma.userProfile.upsert({
    where: { userId: adminId },
    update: {},
    create: { userId: adminId, email: ADMIN_EMAIL, planId: "pro", projectCount: 25 },
  });
  console.log("Admin user ready:", ADMIN_EMAIL);

  // ──────────────────────────────────────────────
  // 3. TEST USER PROFILES (Prisma records only, no auth)
  // ──────────────────────────────────────────────
  const testUsers = [
    { id: "test-user-pro", email: "pro_user@example.com", planId: "pro", projectCount: 25, unsubscribed: false },
    { id: "test-user-free", email: "free_user@example.com", planId: "free", projectCount: 8, unsubscribed: false },
    { id: "test-user-unsubscribed", email: "unsubscribed_user@example.com", planId: "free", projectCount: 3, unsubscribed: true },
    { id: "test-user-power", email: "power_user@example.com", planId: "pro", projectCount: 120, unsubscribed: false },
    { id: "test-user-enterprise", email: "enterprise_user@example.com", planId: "enterprise", projectCount: 500, unsubscribed: false },
  ] as const;

  for (const u of testUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email },
    });
    await prisma.userProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        email: u.email,
        planId: u.planId,
        projectCount: u.projectCount,
        unsubscribed: u.unsubscribed,
      },
    });
  }
  console.log("Test user profiles created:", testUsers.length);

  // ──────────────────────────────────────────────
  // 4. TEMPLATES
  // ──────────────────────────────────────────────
  const definitions = {
    first_name: { label: "First Name", type: "string" as const, required: true },
    plan_name: { label: "Plan Name", type: "string" as const, required: true },
    dashboard_link: { label: "Dashboard Link", type: "string" as const, required: false },
    project_count: { label: "Project Count", type: "number" as const, required: true },
    upgrade_link: { label: "Upgrade Link", type: "string" as const, required: false },
    old_plan: { label: "Old Plan", type: "string" as const, required: true },
    new_plan: { label: "New Plan", type: "string" as const, required: true },
    features_link: { label: "Features Link", type: "string" as const, required: false },
    inactive_days: { label: "Inactive Days", type: "number" as const, required: true },
    reengage_link: { label: "Re-engagement Link", type: "string" as const, required: false },
    amount: { label: "Amount", type: "number" as const, required: true },
    grace_period: { label: "Grace Period (days)", type: "number" as const, required: true },
    payment_link: { label: "Payment Link", type: "string" as const, required: false },
  };

  const templates = [
    {
      id: "seed-template-welcome",
      name: "Welcome to Pro",
      subject: "Welcome to Pro, {{first_name}}! 🎉",
      htmlBody: `<h1>Hi {{first_name}},</h1><p>Thank you for upgrading to <strong>{{plan_name}}</strong>!</p><p>You now have access to:</p><ul><li>Unlimited projects</li><li>Priority support</li><li>Advanced analytics</li></ul><p><a href="{{dashboard_link}}">Go to Dashboard</a></p><p>Best regards,<br>The Team</p>`,
      placeholders: ["first_name", "plan_name", "dashboard_link"],
      variableDefinitions: {
        first_name: definitions.first_name,
        plan_name: definitions.plan_name,
        dashboard_link: definitions.dashboard_link,
      },
    },
    {
      id: "seed-template-milestone",
      name: "Project Milestone Alert",
      subject: "You've created {{project_count}} projects! 🚀",
      htmlBody: `<h2>Congratulations, {{first_name}}!</h2><p>You've just created your <strong>{{project_count}}th project</strong> on our platform.</p><p>Did you know? Pro users get unlimited projects. <a href="{{upgrade_link}}">Upgrade now</a> to unlock more.</p><p>Keep up the great work!</p>`,
      placeholders: ["first_name", "project_count", "upgrade_link"],
      variableDefinitions: {
        first_name: definitions.first_name,
        project_count: definitions.project_count,
        upgrade_link: definitions.upgrade_link,
      },
    },
    {
      id: "seed-template-upgrade-confirm",
      name: "Plan Upgrade Confirmation",
      subject: "Your plan has been upgraded to {{new_plan}}",
      htmlBody: `<h1>Thank you for upgrading, {{first_name}}!</h1><p>Your account has been upgraded from <strong>{{old_plan}}</strong> to <strong>{{new_plan}}</strong>.</p><p>Your new features are now active. <a href="{{features_link}}">View all features</a></p><p>If you have any questions, reply to this email.</p>`,
      placeholders: ["first_name", "old_plan", "new_plan", "features_link"],
      variableDefinitions: {
        first_name: definitions.first_name,
        old_plan: definitions.old_plan,
        new_plan: definitions.new_plan,
        features_link: definitions.features_link,
      },
    },
    {
      id: "seed-template-reengage",
      name: "We Miss You",
      subject: "{{first_name}}, we haven't seen you in a while",
      htmlBody: `<h2>Hi {{first_name}},</h2><p>It's been {{inactive_days}} days since you last used our platform.</p><p>We've added new features you might like:</p><ul><li>AI-powered recommendations</li><li>Faster project creation</li><li>Team collaboration tools</li></ul><p><a href="{{reengage_link}}">Come back and see what's new</a></p>`,
      placeholders: ["first_name", "inactive_days", "reengage_link"],
      variableDefinitions: {
        first_name: definitions.first_name,
        inactive_days: definitions.inactive_days,
        reengage_link: definitions.reengage_link,
      },
    },
    {
      id: "seed-template-payment-failed",
      name: "Payment Failed Alert",
      subject: "Action Required: Payment failed for your account",
      htmlBody: `<h1>Payment Failed</h1><p>Dear {{first_name}},</p><p>We were unable to process your payment of <strong>${'$'}{{amount}}</strong> for your {{plan_name}} plan.</p><p>Please update your payment information within {{grace_period}} days to avoid service interruption.</p><p><a href="{{payment_link}}">Update Payment Method</a></p>`,
      placeholders: ["first_name", "amount", "plan_name", "grace_period", "payment_link"],
      variableDefinitions: {
        first_name: definitions.first_name,
        amount: definitions.amount,
        plan_name: definitions.plan_name,
        grace_period: definitions.grace_period,
        payment_link: definitions.payment_link,
      },
    },
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        subject: t.subject,
        htmlBody: t.htmlBody,
        placeholders: t.placeholders,
        variableDefinitions: t.variableDefinitions,
      },
      create: {
        id: t.id,
        name: t.name,
        subject: t.subject,
        htmlBody: t.htmlBody,
        placeholders: t.placeholders,
        variableDefinitions: t.variableDefinitions,
        userId: adminId,
      },
    });
  }
  console.log("Templates created:", templates.length);

  // ──────────────────────────────────────────────
  // 5. RULES WITH CONDITIONS
  // ──────────────────────────────────────────────
  type RuleSeed = {
    id: string;
    name: string;
    eventType: string;
    templateId: string;
    active: boolean;
    conditions: { field: string; operator: string; value: unknown }[];
  };

  const rules: RuleSeed[] = [
    {
      id: "seed-rule-pro-welcome",
      name: "Send Welcome to Pro Users",
      eventType: "plan_upgraded",
      templateId: "seed-template-welcome",
      active: true,
      conditions: [{ field: "payload.plan_name", operator: "eq", value: "pro" }],
    },
    {
      id: "seed-rule-free-milestone",
      name: "Nudge Free Users at 10 Projects",
      eventType: "project_created",
      templateId: "seed-template-milestone",
      active: true,
      conditions: [
        { field: "user.projectCount", operator: "gte", value: 10 },
        { field: "user.planId", operator: "eq", value: "free" },
      ],
    },
    {
      id: "seed-rule-not-unsubscribed",
      name: "Don't Send to Unsubscribed Users",
      eventType: "email_campaign",
      templateId: "seed-template-welcome",
      active: true,
      conditions: [{ field: "user.unsubscribed", operator: "eq", value: false }],
    },
    {
      id: "seed-rule-ai-feature",
      name: "AI Feature Announcement",
      eventType: "feature_launched",
      templateId: "seed-template-welcome",
      active: true,
      conditions: [{ field: "user.plan.features.supports_ai", operator: "eq", value: true }],
    },
    {
      id: "seed-rule-payment-failed",
      name: "Payment Failed - Pro Users",
      eventType: "payment_failed",
      templateId: "seed-template-payment-failed",
      active: true,
      conditions: [{ field: "user.planId", operator: "eq", value: "pro" }],
    },
  ];

  for (const r of rules) {
    await prisma.rule.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        eventType: r.eventType,
        templateId: r.templateId,
        active: r.active,
      },
      create: {
        id: r.id,
        name: r.name,
        eventType: r.eventType,
        templateId: r.templateId,
        active: r.active,
        userId: adminId,
        conditions: {
          create: r.conditions.map((c) => ({
            field: c.field,
            operator: c.operator,
            value: c.value as any,
          })),
        },
      },
    });
  }
  console.log("Rules created:", rules.length);

  // ──────────────────────────────────────────────
  // 6. HISTORICAL EVENTS
  // ──────────────────────────────────────────────
  const now = Date.now();

  const events = [
    {
      id: "seed-event-plan-upgrade-pro",
      eventType: "plan_upgraded",
      userId: "test-user-pro",
      payload: { plan_name: "pro", first_name: "Pro", email: "pro_user@example.com" },
      idempotencyKey: "seed_plan_upgrade_pro",
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-plan-upgrade-free",
      eventType: "plan_upgraded",
      userId: "test-user-free",
      payload: { plan_name: "free", first_name: "Free", email: "free_user@example.com" },
      idempotencyKey: "seed_plan_upgrade_free",
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-project-free-1",
      eventType: "project_created",
      userId: "test-user-free",
      payload: { project_name: "My Portfolio", first_name: "Free" },
      idempotencyKey: "seed_project_free_1",
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-project-pro-1",
      eventType: "project_created",
      userId: "test-user-pro",
      payload: { project_name: "Client Dashboard", first_name: "Pro" },
      idempotencyKey: "seed_project_pro_1",
      createdAt: new Date(now - 4 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-payment-failed",
      eventType: "payment_failed",
      userId: "test-user-pro",
      payload: { amount: 29.99, plan_name: "pro", first_name: "Pro" },
      idempotencyKey: "seed_payment_failed_1",
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-feature-launched",
      eventType: "feature_launched",
      userId: "test-user-pro",
      payload: { feature_name: "AI Recommendations", first_name: "Pro", tier: "pro" },
      idempotencyKey: "seed_feature_launched_1",
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-email-campaign",
      eventType: "email_campaign",
      userId: "test-user-unsubscribed",
      payload: { campaign_name: "March Newsletter", first_name: "Unsubscribed", email: "unsubscribed_user@example.com" },
      idempotencyKey: "seed_email_campaign_1",
      createdAt: new Date(now - 12 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-power-milestone",
      eventType: "project_created",
      userId: "test-user-power",
      payload: { project_name: "Data Pipeline v3", first_name: "Power" },
      idempotencyKey: "seed_project_power_1",
      createdAt: new Date(now - 7 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-enterprise-upgrade",
      eventType: "plan_upgraded",
      userId: "test-user-enterprise",
      payload: { plan_name: "enterprise", first_name: "Enterprise", email: "enterprise_user@example.com" },
      idempotencyKey: "seed_enterprise_upgrade_1",
      createdAt: new Date(now - 48 * 60 * 60 * 1000),
    },
    {
      id: "seed-event-payment-failed-free",
      eventType: "payment_failed",
      userId: "test-user-free",
      payload: { amount: 9.99, plan_name: "free", first_name: "Free" },
      idempotencyKey: "seed_payment_free_1",
      createdAt: new Date(now - 72 * 60 * 60 * 1000),
    },
  ];

  for (const e of events) {
    await prisma.event.upsert({
      where: { idempotencyKey: e.idempotencyKey },
      update: {},
      create: {
        id: e.id,
        eventType: e.eventType,
        userId: e.userId,
        payload: e.payload as any,
        idempotencyKey: e.idempotencyKey,
        processed: true,
        createdAt: e.createdAt,
      },
    });
  }
  console.log("Historical events created:", events.length);

  // ──────────────────────────────────────────────
  // 7. EMAIL LOGS
  // ──────────────────────────────────────────────
  const emailLogs = [
    {
      id: "seed-emaillog-welcome-pro",
      eventId: "seed-event-plan-upgrade-pro",
      ruleId: "seed-rule-pro-welcome",
      templateId: "seed-template-welcome",
      userId: "test-user-pro",
      status: "sent",
      providerResponse: JSON.stringify({ id: "resend_pro_welcome", delivered: true }),
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
    },
    {
      id: "seed-emaillog-milestone-free",
      eventId: "seed-event-project-free-1",
      ruleId: "seed-rule-free-milestone",
      templateId: "seed-template-milestone",
      userId: "test-user-free",
      status: "failed",
      error: "Rate limit exceeded - will retry",
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
    },
    {
      id: "seed-emaillog-payment-pro",
      eventId: "seed-event-payment-failed",
      ruleId: "seed-rule-payment-failed",
      templateId: "seed-template-payment-failed",
      userId: "test-user-pro",
      status: "sent",
      providerResponse: JSON.stringify({ id: "resend_payment_alert", delivered: true }),
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-emaillog-feature-pro",
      eventId: "seed-event-feature-launched",
      ruleId: "seed-rule-ai-feature",
      templateId: "seed-template-welcome",
      userId: "test-user-pro",
      status: "sent",
      providerResponse: JSON.stringify({ id: "resend_ai_feature", delivered: true }),
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
    },
    {
      id: "seed-emaillog-campaign-unsubscribed",
      eventId: "seed-event-email-campaign",
      ruleId: "seed-rule-not-unsubscribed",
      templateId: "seed-template-welcome",
      userId: "test-user-unsubscribed",
      status: "skipped",
      error: "User is unsubscribed",
      createdAt: new Date(now - 12 * 60 * 60 * 1000),
    },
  ];

  for (const l of emailLogs) {
    await prisma.emailLog.upsert({
      where: { id: l.id },
      update: {},
      create: l,
    });
  }
  console.log("Email logs created:", emailLogs.length);

  // ──────────────────────────────────────────────
  // 8. EVALUATION LOGS
  // ──────────────────────────────────────────────
  const evalLogs = [
    {
      id: "seed-evallog-welcome-match",
      eventId: "seed-event-plan-upgrade-pro",
      ruleId: "seed-rule-pro-welcome",
      ruleName: "Send Welcome to Pro Users",
      matched: true,
      details: JSON.stringify([
        { condition: "payload.plan_name = pro", actual: "pro", result: true },
      ]),
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
    },
    {
      id: "seed-evallog-welcome-no-match",
      eventId: "seed-event-plan-upgrade-free",
      ruleId: "seed-rule-pro-welcome",
      ruleName: "Send Welcome to Pro Users",
      matched: false,
      details: JSON.stringify([
        { condition: "payload.plan_name = pro", actual: "free", result: false },
      ]),
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
    },
    {
      id: "seed-evallog-milestone-free",
      eventId: "seed-event-project-free-1",
      ruleId: "seed-rule-free-milestone",
      ruleName: "Nudge Free Users at 10 Projects",
      matched: false,
      details: JSON.stringify([
        { condition: "user.projectCount >= 10", actual: 8, result: false },
        { condition: "user.planId = free", actual: "free", result: true },
      ]),
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
    },
    {
      id: "seed-evallog-payment-pro",
      eventId: "seed-event-payment-failed",
      ruleId: "seed-rule-payment-failed",
      ruleName: "Payment Failed - Pro Users",
      matched: true,
      details: JSON.stringify([
        { condition: "user.planId = pro", actual: "pro", result: true },
      ]),
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "seed-evallog-feature-pro",
      eventId: "seed-event-feature-launched",
      ruleId: "seed-rule-ai-feature",
      ruleName: "AI Feature Announcement",
      matched: true,
      details: JSON.stringify([
        { condition: "user.plan.features.supports_ai = true", actual: true, result: true },
      ]),
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
    },
    {
      id: "seed-evallog-campaign-unsubscribed",
      eventId: "seed-event-email-campaign",
      ruleId: "seed-rule-not-unsubscribed",
      ruleName: "Don't Send to Unsubscribed Users",
      matched: false,
      details: JSON.stringify([
        { condition: "user.unsubscribed = false", actual: true, result: false },
      ]),
      createdAt: new Date(now - 12 * 60 * 60 * 1000),
    },
    {
      id: "seed-evallog-power-milestone",
      eventId: "seed-event-power-milestone",
      ruleId: "seed-rule-free-milestone",
      ruleName: "Nudge Free Users at 10 Projects",
      matched: false,
      details: JSON.stringify([
        { condition: "user.projectCount >= 10", actual: 120, result: true },
        { condition: "user.planId = free", actual: "pro", result: false },
      ]),
      createdAt: new Date(now - 7 * 60 * 60 * 1000),
    },
    {
      id: "seed-evallog-enterprise-upgrade",
      eventId: "seed-event-enterprise-upgrade",
      ruleId: "seed-rule-pro-welcome",
      ruleName: "Send Welcome to Pro Users",
      matched: false,
      details: JSON.stringify([
        { condition: "payload.plan_name = pro", actual: "enterprise", result: false },
      ]),
      createdAt: new Date(now - 48 * 60 * 60 * 1000),
    },
  ];

  for (const l of evalLogs) {
    await prisma.evaluationLog.upsert({
      where: { id: l.id },
      update: {},
      create: l,
    });
  }
  console.log("Evaluation logs created:", evalLogs.length);

  console.log("\n✅ Seed complete!");
  console.log(`Login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("Test users: pro_user@example.com, free_user@example.com, unsubscribed_user@example.com, power_user@example.com, enterprise_user@example.com");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
