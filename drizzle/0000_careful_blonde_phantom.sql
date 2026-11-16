CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."dataset_permission" AS ENUM('view', 'edit', 'manage');--> statement-breakpoint
CREATE TABLE "access_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_id" uuid NOT NULL,
	"user_id" uuid,
	"role_id" uuid,
	"permission" "dataset_permission" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_permissions_single_grantee" CHECK (("access_permissions"."user_id" IS NULL) <> ("access_permissions"."role_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "dataset_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"label" varchar(200) NOT NULL,
	"data_type" varchar(32) NOT NULL,
	"is_searchable" boolean DEFAULT false NOT NULL,
	"is_filterable" boolean DEFAULT true NOT NULL,
	"is_sortable" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dataset_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_id" uuid NOT NULL,
	"status" varchar(64) NOT NULL,
	"country" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"revenue" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(320) NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("email", '') || ' ' || coalesce("status", '') || ' ' || coalesce("country", '') || ' ' || coalesce("category", ''))) STORED
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"category" varchar(100),
	"data_source" varchar(200),
	"record_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"dataset_id" uuid,
	"query_type" varchar(64) NOT NULL,
	"normalized_query" text,
	"duration_ms" integer NOT NULL,
	"rows_returned" bigint,
	"succeeded" boolean NOT NULL,
	"error_code" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"changed_by" uuid,
	"operation" varchar(32) NOT NULL,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_record_id" uuid NOT NULL,
	"target_record_id" uuid NOT NULL,
	"relationship_type" varchar(64) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "record_relationships_no_self_reference" CHECK ("record_relationships"."source_record_id" <> "record_relationships"."target_record_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dataset_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"dataset_id" uuid,
	"query" jsonb NOT NULL,
	"result_count" bigint DEFAULT 0 NOT NULL,
	"duration_ms" integer NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(200) NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset_fields" ADD CONSTRAINT "dataset_fields_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset_records" ADD CONSTRAINT "dataset_records_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_history" ADD CONSTRAINT "record_history_record_id_dataset_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."dataset_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_history" ADD CONSTRAINT "record_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_relationships" ADD CONSTRAINT "record_relationships_source_record_id_dataset_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."dataset_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_relationships" ADD CONSTRAINT "record_relationships_target_record_id_dataset_records_id_fk" FOREIGN KEY ("target_record_id") REFERENCES "public"."dataset_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_permissions_dataset_user_permission_uidx" ON "access_permissions" USING btree ("dataset_id","user_id","permission") WHERE "access_permissions"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "access_permissions_dataset_role_permission_uidx" ON "access_permissions" USING btree ("dataset_id","role_id","permission") WHERE "access_permissions"."role_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "access_permissions_user_dataset_idx" ON "access_permissions" USING btree ("user_id","dataset_id") WHERE "access_permissions"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "access_permissions_role_dataset_idx" ON "access_permissions" USING btree ("role_id","dataset_id") WHERE "access_permissions"."role_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dataset_fields_dataset_name_uidx" ON "dataset_fields" USING btree ("dataset_id","name");--> statement-breakpoint
CREATE INDEX "dataset_fields_dataset_position_idx" ON "dataset_fields" USING btree ("dataset_id","position");--> statement-breakpoint
CREATE INDEX "dataset_records_filter_idx" ON "dataset_records" USING btree ("dataset_id","status","country","created_at");--> statement-breakpoint
CREATE INDEX "dataset_records_dataset_revenue_idx" ON "dataset_records" USING btree ("dataset_id","revenue");--> statement-breakpoint
CREATE INDEX "dataset_records_dataset_created_at_idx" ON "dataset_records" USING btree ("dataset_id","created_at");--> statement-breakpoint
CREATE INDEX "dataset_records_search_vector_gin_idx" ON "dataset_records" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "dataset_records_name_trgm_gin_idx" ON "dataset_records" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "datasets_slug_uidx" ON "datasets" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "datasets_created_by_idx" ON "datasets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "query_logs_created_at_idx" ON "query_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "query_logs_dataset_created_at_idx" ON "query_logs" USING btree ("dataset_id","created_at");--> statement-breakpoint
CREATE INDEX "query_logs_duration_ms_idx" ON "query_logs" USING btree ("duration_ms");--> statement-breakpoint
CREATE INDEX "record_history_record_created_at_idx" ON "record_history" USING btree ("record_id","created_at");--> statement-breakpoint
CREATE INDEX "record_history_changed_by_idx" ON "record_history" USING btree ("changed_by");--> statement-breakpoint
CREATE UNIQUE INDEX "record_relationships_pair_type_uidx" ON "record_relationships" USING btree ("source_record_id","target_record_id","relationship_type");--> statement-breakpoint
CREATE INDEX "record_relationships_target_idx" ON "record_relationships" USING btree ("target_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_slug_uidx" ON "roles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_uidx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_views_user_dataset_name_uidx" ON "saved_views" USING btree ("user_id","dataset_id","name");--> statement-breakpoint
CREATE INDEX "saved_views_dataset_id_idx" ON "saved_views" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "search_history_user_executed_at_idx" ON "search_history" USING btree ("user_id","executed_at");--> statement-breakpoint
CREATE INDEX "search_history_dataset_executed_at_idx" ON "search_history" USING btree ("dataset_id","executed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_id_uidx" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" USING btree ("role_id");