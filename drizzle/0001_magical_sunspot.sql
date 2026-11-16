ALTER TABLE "dataset_records" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "dataset_records" AS r
SET "updated_at" = GREATEST(
  r."created_at",
  COALESCE(
    (SELECT MAX(history."created_at")
     FROM "record_history" AS history
     WHERE history."record_id" = r."id"),
    r."created_at"
  )
);
--> statement-breakpoint
CREATE FUNCTION "set_dataset_record_updated_at"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "dataset_records_updated_at_trigger"
BEFORE UPDATE ON "dataset_records"
FOR EACH ROW
EXECUTE FUNCTION "set_dataset_record_updated_at"();