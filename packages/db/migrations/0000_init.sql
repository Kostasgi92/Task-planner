CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#5E61E8' NOT NULL,
	CONSTRAINT "categories_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "categories_user_id_not_empty" CHECK ("categories"."user_id" <> '')
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category_id" integer NOT NULL,
	"parent_id" integer,
	"title" text NOT NULL,
	"notes" text,
	"bullet_points" text[] DEFAULT '{}'::text[] NOT NULL,
	"bullet_point_completed" boolean[] DEFAULT '{}'::boolean[] NOT NULL,
	"importance" text DEFAULT 'medium' NOT NULL,
	"due_at" timestamp with time zone,
	"reminder_at" timestamp with time zone,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "tasks_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "tasks_user_id_not_empty" CHECK ("tasks"."user_id" <> ''),
	CONSTRAINT "tasks_importance_check" CHECK ("tasks"."importance" in ('low', 'medium', 'high')),
	CONSTRAINT "tasks_not_own_parent" CHECK ("tasks"."parent_id" is null or "tasks"."parent_id" <> "tasks"."id")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_same_user_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_same_user_fk" FOREIGN KEY ("parent_id","user_id") REFERENCES "public"."tasks"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_user_id_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_user_category_idx" ON "tasks" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "tasks_parent_id_idx" ON "tasks" USING btree ("parent_id");