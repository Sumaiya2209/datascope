import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export const datasetPermission = pgEnum("dataset_permission", [
  "view",
  "edit",
  "manage",
]);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("roles_slug_uidx").on(table.slug),
    uniqueIndex("roles_name_uidx").on(table.name),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_email_uidx").on(table.email),
    index("users_role_id_idx").on(table.roleId),
  ],
);

export const datasets = pgTable(
  "datasets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    dataSource: varchar("data_source", { length: 200 }),
    recordCount: bigint("record_count", { mode: "number" })
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("datasets_slug_uidx").on(table.slug),
    index("datasets_created_by_idx").on(table.createdBy),
  ],
);

export const datasetFields = pgTable(
  "dataset_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    dataType: varchar("data_type", { length: 32 }).notNull(),
    isSearchable: boolean("is_searchable").default(false).notNull(),
    isFilterable: boolean("is_filterable").default(true).notNull(),
    isSortable: boolean("is_sortable").default(true).notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("dataset_fields_dataset_name_uidx").on(
      table.datasetId,
      table.name,
    ),
    index("dataset_fields_dataset_position_idx").on(
      table.datasetId,
      table.position,
    ),
  ],
);

export const datasetRecords = pgTable(
  "dataset_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 64 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    revenue: numeric("revenue", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    extra: jsonb("extra")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(${sql.identifier("name")}, '') || ' ' || coalesce(${sql.identifier("email")}, '') || ' ' || coalesce(${sql.identifier("status")}, '') || ' ' || coalesce(${sql.identifier("country")}, '') || ' ' || coalesce(${sql.identifier("category")}, ''))`,
    ),
  },
  (table) => [
    index("dataset_records_filter_idx").on(
      table.datasetId,
      table.status,
      table.country,
      table.createdAt,
    ),
    index("dataset_records_dataset_revenue_idx").on(
      table.datasetId,
      table.revenue,
    ),
    index("dataset_records_dataset_created_at_idx").on(
      table.datasetId,
      table.createdAt,
    ),
    index("dataset_records_search_vector_gin_idx").using(
      "gin",
      table.searchVector,
    ),
    index("dataset_records_name_trgm_gin_idx").using(
      "gin",
      table.name.op("gin_trgm_ops"),
    ),
  ],
);

export const recordRelationships = pgTable(
  "record_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceRecordId: uuid("source_record_id")
      .notNull()
      .references(() => datasetRecords.id, { onDelete: "cascade" }),
    targetRecordId: uuid("target_record_id")
      .notNull()
      .references(() => datasetRecords.id, { onDelete: "cascade" }),
    relationshipType: varchar("relationship_type", { length: 64 }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "record_relationships_no_self_reference",
      sql`${table.sourceRecordId} <> ${table.targetRecordId}`,
    ),
    uniqueIndex("record_relationships_pair_type_uidx").on(
      table.sourceRecordId,
      table.targetRecordId,
      table.relationshipType,
    ),
    index("record_relationships_target_idx").on(table.targetRecordId),
  ],
);

export const recordHistory = pgTable(
  "record_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => datasetRecords.id, { onDelete: "cascade" }),
    changedBy: uuid("changed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    operation: varchar("operation", { length: 32 }).notNull(),
    changes: jsonb("changes")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("record_history_record_created_at_idx").on(
      table.recordId,
      table.createdAt,
    ),
    index("record_history_changed_by_idx").on(table.changedBy),
  ],
);

export const savedViews = pgTable(
  "saved_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    configuration: jsonb("configuration")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    isShared: boolean("is_shared").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("saved_views_user_dataset_name_uidx").on(
      table.userId,
      table.datasetId,
      table.name,
    ),
    index("saved_views_dataset_id_idx").on(table.datasetId),
  ],
);

export const searchHistory = pgTable(
  "search_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    datasetId: uuid("dataset_id").references(() => datasets.id, {
      onDelete: "set null",
    }),
    query: jsonb("query").$type<Record<string, unknown>>().notNull(),
    resultCount: bigint("result_count", { mode: "number" })
      .default(0)
      .notNull(),
    durationMs: integer("duration_ms").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("search_history_user_executed_at_idx").on(
      table.userId,
      table.executedAt,
    ),
    index("search_history_dataset_executed_at_idx").on(
      table.datasetId,
      table.executedAt,
    ),
  ],
);

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    preferences: jsonb("preferences")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("user_preferences_user_id_uidx").on(table.userId)],
);

export const accessPermissions = pgTable(
  "access_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    roleId: uuid("role_id").references(() => roles.id, {
      onDelete: "cascade",
    }),
    permission: datasetPermission("permission").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "access_permissions_single_grantee",
      sql`(${table.userId} IS NULL) <> (${table.roleId} IS NULL)`,
    ),
    uniqueIndex("access_permissions_dataset_user_permission_uidx")
      .on(table.datasetId, table.userId, table.permission)
      .where(sql`${table.userId} IS NOT NULL`),
    uniqueIndex("access_permissions_dataset_role_permission_uidx")
      .on(table.datasetId, table.roleId, table.permission)
      .where(sql`${table.roleId} IS NOT NULL`),
    index("access_permissions_user_dataset_idx")
      .on(table.userId, table.datasetId)
      .where(sql`${table.userId} IS NOT NULL`),
    index("access_permissions_role_dataset_idx")
      .on(table.roleId, table.datasetId)
      .where(sql`${table.roleId} IS NOT NULL`),
  ],
);

export const queryLogs = pgTable(
  "query_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    datasetId: uuid("dataset_id").references(() => datasets.id, {
      onDelete: "set null",
    }),
    queryType: varchar("query_type", { length: 64 }).notNull(),
    normalizedQuery: text("normalized_query"),
    durationMs: integer("duration_ms").notNull(),
    rowsReturned: bigint("rows_returned", { mode: "number" }),
    succeeded: boolean("succeeded").notNull(),
    errorCode: varchar("error_code", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("query_logs_created_at_idx").on(table.createdAt),
    index("query_logs_dataset_created_at_idx").on(
      table.datasetId,
      table.createdAt,
    ),
    index("query_logs_duration_ms_idx").on(table.durationMs),
  ],
);

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  accessPermissions: many(accessPermissions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  datasetsCreated: many(datasets),
  savedViews: many(savedViews),
  searchHistory: many(searchHistory),
  accessPermissions: many(accessPermissions),
}));

export const datasetsRelations = relations(datasets, ({ one, many }) => ({
  creator: one(users, {
    fields: [datasets.createdBy],
    references: [users.id],
  }),
  fields: many(datasetFields),
  records: many(datasetRecords),
  savedViews: many(savedViews),
  accessPermissions: many(accessPermissions),
}));

export const datasetFieldsRelations = relations(datasetFields, ({ one }) => ({
  dataset: one(datasets, {
    fields: [datasetFields.datasetId],
    references: [datasets.id],
  }),
}));

export const datasetRecordsRelations = relations(
  datasetRecords,
  ({ one, many }) => ({
    dataset: one(datasets, {
      fields: [datasetRecords.datasetId],
      references: [datasets.id],
    }),
    outgoingRelationships: many(recordRelationships, {
      relationName: "sourceRecord",
    }),
    incomingRelationships: many(recordRelationships, {
      relationName: "targetRecord",
    }),
    history: many(recordHistory),
  }),
);

export const recordRelationshipsRelations = relations(
  recordRelationships,
  ({ one }) => ({
    sourceRecord: one(datasetRecords, {
      fields: [recordRelationships.sourceRecordId],
      references: [datasetRecords.id],
      relationName: "sourceRecord",
    }),
    targetRecord: one(datasetRecords, {
      fields: [recordRelationships.targetRecordId],
      references: [datasetRecords.id],
      relationName: "targetRecord",
    }),
  }),
);

export const recordHistoryRelations = relations(recordHistory, ({ one }) => ({
  record: one(datasetRecords, {
    fields: [recordHistory.recordId],
    references: [datasetRecords.id],
  }),
  actor: one(users, {
    fields: [recordHistory.changedBy],
    references: [users.id],
  }),
}));

export const savedViewsRelations = relations(savedViews, ({ one }) => ({
  owner: one(users, {
    fields: [savedViews.userId],
    references: [users.id],
  }),
  dataset: one(datasets, {
    fields: [savedViews.datasetId],
    references: [datasets.id],
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
  dataset: one(datasets, {
    fields: [searchHistory.datasetId],
    references: [datasets.id],
  }),
}));

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const accessPermissionsRelations = relations(
  accessPermissions,
  ({ one }) => ({
    dataset: one(datasets, {
      fields: [accessPermissions.datasetId],
      references: [datasets.id],
    }),
    user: one(users, {
      fields: [accessPermissions.userId],
      references: [users.id],
    }),
    role: one(roles, {
      fields: [accessPermissions.roleId],
      references: [roles.id],
    }),
  }),
);

export const queryLogsRelations = relations(queryLogs, ({ one }) => ({
  user: one(users, {
    fields: [queryLogs.userId],
    references: [users.id],
  }),
  dataset: one(datasets, {
    fields: [queryLogs.datasetId],
    references: [datasets.id],
  }),
}));
