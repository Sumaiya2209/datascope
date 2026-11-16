import "dotenv/config";
import { createHash } from "node:crypto";
import { faker } from "@faker-js/faker";
import { count, eq } from "drizzle-orm";
import {
  accessPermissions,
  datasetFields,
  datasetRecords,
  datasets,
  roles,
  users,
} from "../src/lib/db/schema";

const DEFAULT_RECORD_COUNT = 100_000;
const MAX_RECORD_COUNT = 1_000_000;
const BATCH_SIZE = 5_000;
const FAKER_SEED = 20_261_115;
const UUID_NAMESPACE = Buffer.from("6ba7b8109dad11d180b400c04fd430c8", "hex");

const roleSeeds = [
  {
    name: "Administrator",
    slug: "admin",
    description: "Manages users, datasets, and platform settings.",
    email: "admin@datascope.local",
    userName: "DataScope Admin",
    permission: "manage",
  },
  {
    name: "Data Analyst",
    slug: "analyst",
    description: "Explores datasets and performs advanced searches.",
    email: "analyst@datascope.local",
    userName: "DataScope Analyst",
    permission: "edit",
  },
  {
    name: "Viewer",
    slug: "viewer",
    description: "Browses and searches authorized datasets.",
    email: "viewer@datascope.local",
    userName: "DataScope Viewer",
    permission: "view",
  },
] as const;

const datasetSeeds = [
  {
    name: "Customer Accounts",
    slug: "customer-accounts",
    description: "Generated customer account records for DataScope demos.",
    category: "Customers",
    dataSource: "DataScope demo generator",
  },
  {
    name: "Business Partners",
    slug: "business-partners",
    description: "Generated business partner records for DataScope demos.",
    category: "Partners",
    dataSource: "DataScope demo generator",
  },
] as const;

const datasetFieldSeeds = [
  {
    name: "status",
    label: "Status",
    dataType: "string",
    isSearchable: true,
    isFilterable: true,
    isSortable: true,
  },
  {
    name: "country",
    label: "Country",
    dataType: "string",
    isSearchable: true,
    isFilterable: true,
    isSortable: true,
  },
  {
    name: "category",
    label: "Category",
    dataType: "string",
    isSearchable: true,
    isFilterable: true,
    isSortable: true,
  },
  {
    name: "revenue",
    label: "Revenue",
    dataType: "number",
    isSearchable: false,
    isFilterable: true,
    isSortable: true,
  },
  {
    name: "created_at",
    label: "Created at",
    dataType: "datetime",
    isSearchable: false,
    isFilterable: true,
    isSortable: true,
  },
  {
    name: "name",
    label: "Name",
    dataType: "string",
    isSearchable: true,
    isFilterable: true,
    isSortable: true,
  },
  {
    name: "email",
    label: "Email",
    dataType: "string",
    isSearchable: true,
    isFilterable: true,
    isSortable: true,
  },
  {
    name: "company",
    label: "Company",
    dataType: "string",
    isSearchable: false,
    isFilterable: true,
    isSortable: false,
  },
  {
    name: "industry",
    label: "Industry",
    dataType: "string",
    isSearchable: false,
    isFilterable: true,
    isSortable: false,
  },
  {
    name: "employeeCount",
    label: "Employee count",
    dataType: "number",
    isSearchable: false,
    isFilterable: true,
    isSortable: false,
  },
  {
    name: "source",
    label: "Source",
    dataType: "string",
    isSearchable: false,
    isFilterable: true,
    isSortable: false,
  },
] as const;

function parseRecordCount(args: string[]): number {
  if (args.length > 1 || (args[0] !== undefined && !/^\d+$/.test(args[0]))) {
    throw new Error(
      "Usage: npm run db:seed -- [record-count] (1 to 1,000,000)",
    );
  }

  const recordCount =
    args[0] === undefined ? DEFAULT_RECORD_COUNT : Number(args[0]);

  if (
    !Number.isSafeInteger(recordCount) ||
    recordCount < 1 ||
    recordCount > MAX_RECORD_COUNT
  ) {
    throw new Error(
      `Record count must be an integer from 1 to ${MAX_RECORD_COUNT.toLocaleString()}.`,
    );
  }

  return recordCount;
}

function deterministicRecordId(datasetId: string, index: number): string {
  // Stable IDs let reruns skip records already inserted by an earlier seed run.
  const bytes = createHash("sha1")
    .update(UUID_NAMESPACE)
    .update(`datascope-demo:${datasetId}:${index}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hash = bytes.toString("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
}

async function seed(
  recordCount: number,
  db: typeof import("../src/lib/db/client").db,
) {
  const roleIds = new Map<(typeof roleSeeds)[number]["slug"], string>();

  for (const roleSeed of roleSeeds) {
    const [role] = await db
      .insert(roles)
      .values({
        name: roleSeed.name,
        slug: roleSeed.slug,
        description: roleSeed.description,
      })
      .onConflictDoUpdate({
        target: roles.slug,
        set: {
          name: roleSeed.name,
          description: roleSeed.description,
        },
      })
      .returning({ id: roles.id });

    if (!role) {
      throw new Error(`Failed to seed the "${roleSeed.slug}" role.`);
    }

    roleIds.set(roleSeed.slug, role.id);
  }

  const adminRoleId = roleIds.get("admin");
  if (!adminRoleId) {
    throw new Error("The administrator role was not seeded.");
  }

  const userIds = new Map<(typeof roleSeeds)[number]["slug"], string>();

  for (const roleSeed of roleSeeds) {
    const roleId = roleIds.get(roleSeed.slug);
    if (!roleId) {
      throw new Error(`The "${roleSeed.slug}" role was not seeded.`);
    }

    const [user] = await db
      .insert(users)
      .values({
        roleId,
        email: roleSeed.email,
        name: roleSeed.userName,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          roleId,
          name: roleSeed.userName,
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id });

    if (!user) {
      throw new Error(`Failed to seed "${roleSeed.email}".`);
    }

    userIds.set(roleSeed.slug, user.id);
  }

  const adminUserId = userIds.get("admin");
  if (!adminUserId) {
    throw new Error("The administrator user was not seeded.");
  }

  const datasetIds: string[] = [];

  for (const datasetSeed of datasetSeeds) {
    const [dataset] = await db
      .insert(datasets)
      .values({
        ...datasetSeed,
        createdBy: adminUserId,
      })
      .onConflictDoUpdate({
        target: datasets.slug,
        set: {
          name: datasetSeed.name,
          description: datasetSeed.description,
          category: datasetSeed.category,
          dataSource: datasetSeed.dataSource,
          updatedAt: new Date(),
        },
      })
      .returning({ id: datasets.id });

    if (!dataset) {
      throw new Error(`Failed to seed the "${datasetSeed.slug}" dataset.`);
    }

    datasetIds.push(dataset.id);

    await db
      .insert(datasetFields)
      .values(
        datasetFieldSeeds.map((field, position) => ({
          ...field,
          datasetId: dataset.id,
          position,
        })),
      )
      .onConflictDoNothing();
  }

  const permissions = datasetIds.flatMap((datasetId) =>
    roleSeeds.map((roleSeed) => {
      const roleId = roleIds.get(roleSeed.slug);
      if (!roleId) {
        throw new Error(`The "${roleSeed.slug}" role was not seeded.`);
      }

      return {
        datasetId,
        roleId,
        permission: roleSeed.permission,
      };
    }),
  );

  await db.insert(accessPermissions).values(permissions).onConflictDoNothing();

  faker.seed(FAKER_SEED);
  const startedAt = Date.now();
  console.log(
    `Seeding ${recordCount.toLocaleString()} records in batches of ${BATCH_SIZE.toLocaleString()}...`,
  );

  for (let start = 0; start < recordCount; start += BATCH_SIZE) {
    const batchCount = Math.min(BATCH_SIZE, recordCount - start);
    const batch = Array.from({ length: batchCount }, (_, batchIndex) => {
      const index = start + batchIndex;
      const datasetIndex = index % datasetIds.length;
      const datasetRecordIndex = Math.floor(index / datasetIds.length);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const name = `${firstName} ${lastName}`;

      return {
        id: deterministicRecordId(datasetIds[datasetIndex], datasetRecordIndex),
        datasetId: datasetIds[datasetIndex],
        status: faker.helpers.arrayElement([
          "Active",
          "Pending",
          "Inactive",
          "Suspended",
        ]),
        country: faker.location.country(),
        category: faker.commerce.department(),
        revenue: faker.finance.amount({
          min: 100,
          max: 250_000,
          dec: 2,
        }),
        createdAt: faker.date.past({ years: 5 }),
        name,
        email: faker.internet.exampleEmail({ firstName, lastName }),
        extra: {
          company: faker.company.name(),
          industry: faker.commerce.department(),
          employeeCount: faker.number.int({ min: 1, max: 10_000 }),
          source: "seed",
        },
      };
    });

    await db.insert(datasetRecords).values(batch).onConflictDoNothing();

    const completed = start + batchCount;
    const elapsedSeconds = (Date.now() - startedAt) / 1_000;
    console.log(
      `Processed ${completed.toLocaleString()} / ${recordCount.toLocaleString()} records (${((completed / recordCount) * 100).toFixed(1)}%) in ${elapsedSeconds.toFixed(1)}s`,
    );
  }

  for (const datasetId of datasetIds) {
    const [result] = await db
      .select({ total: count() })
      .from(datasetRecords)
      .where(eq(datasetRecords.datasetId, datasetId));

    await db
      .update(datasets)
      .set({ recordCount: result.total, updatedAt: new Date() })
      .where(eq(datasets.id, datasetId));
  }

  console.log(
    `Seed complete: ${roleSeeds.length} users, ${datasetIds.length} datasets, and ${recordCount.toLocaleString()} requested records.`,
  );
}

async function main() {
  const recordCount = parseRecordCount(process.argv.slice(2));
  const { client, db } = await import("../src/lib/db/client");

  try {
    await seed(recordCount, db);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
});
