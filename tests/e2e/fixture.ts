import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";

export const E2E_TEST_EMAIL = "e2e-analyst@datascope.test";
export const E2E_TEST_DATASET_SLUG = "e2e-records-test";

export async function seedE2EFixture(password: string): Promise<{
  datasetId: string;
}> {
  const { client, db } = await import("../../src/lib/db/client");
  const {
    accessPermissions,
    datasetFields,
    datasetRecords,
    datasets,
    roles,
    savedViews,
    users,
  } = await import("../../src/lib/db/schema");

  try {
    const passwordHash = await hash(password, 10);
    const [role] = await db
      .insert(roles)
      .values({ name: "Analyst", slug: "analyst" })
      .onConflictDoUpdate({
        target: roles.slug,
        set: { name: "Analyst" },
      })
      .returning({ id: roles.id });
    if (!role) {
      throw new Error("The e2e analyst role could not be created.");
    }

    const [user] = await db
      .insert(users)
      .values({
        roleId: role.id,
        email: E2E_TEST_EMAIL,
        name: "DataScope E2E Analyst",
        passwordHash,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          roleId: role.id,
          name: "DataScope E2E Analyst",
          passwordHash,
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id });
    if (!user) {
      throw new Error("The e2e analyst user could not be created.");
    }

    const [dataset] = await db
      .insert(datasets)
      .values({
        name: "E2E Records",
        slug: E2E_TEST_DATASET_SLUG,
        description: "Isolated end-to-end search fixtures.",
        createdBy: user.id,
        recordCount: 2,
      })
      .onConflictDoUpdate({
        target: datasets.slug,
        set: {
          name: "E2E Records",
          description: "Isolated end-to-end search fixtures.",
          createdBy: user.id,
          updatedAt: new Date(),
        },
      })
      .returning({ id: datasets.id });
    if (!dataset) {
      throw new Error("The e2e dataset could not be created.");
    }

    await db
      .insert(accessPermissions)
      .values({
        datasetId: dataset.id,
        roleId: role.id,
        permission: "edit",
      })
      .onConflictDoNothing();

    const fieldFixtures = [
      ["status", "Status", "string"],
      ["country", "Country", "string"],
      ["category", "Category", "string"],
      ["revenue", "Revenue", "number"],
      ["created_at", "Created at", "datetime"],
      ["name", "Name", "string"],
      ["email", "Email", "string"],
    ] as const;
    for (const [position, [name, label, dataType]] of fieldFixtures.entries()) {
      await db
        .insert(datasetFields)
        .values({
          datasetId: dataset.id,
          name,
          label,
          dataType,
          isSearchable: true,
          isFilterable: true,
          isSortable: true,
          position,
        })
        .onConflictDoUpdate({
          target: [datasetFields.datasetId, datasetFields.name],
          set: { label, dataType, position },
        });
    }

    await db
      .delete(savedViews)
      .where(
        and(
          eq(savedViews.userId, user.id),
          eq(savedViews.datasetId, dataset.id),
        ),
      );
    await db
      .delete(datasetRecords)
      .where(eq(datasetRecords.datasetId, dataset.id));
    await db.insert(datasetRecords).values([
      {
        datasetId: dataset.id,
        status: "Active",
        country: "United States",
        category: "Integration",
        revenue: "100.00",
        name: "E2E Target Alpha",
        email: "alpha@datascope.test",
      },
      {
        datasetId: dataset.id,
        status: "Pending",
        country: "United States",
        category: "Integration",
        revenue: "200.00",
        name: "E2E Target Beta",
        email: "beta@datascope.test",
      },
    ]);

    return { datasetId: dataset.id };
  } finally {
    await client.end();
  }
}
