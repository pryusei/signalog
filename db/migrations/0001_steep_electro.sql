CREATE TABLE "bookmarks" (
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_article_id_pk" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "bookmark_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_article_idx" ON "bookmarks" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "articles_bookmark_count_idx" ON "articles" USING btree ("bookmark_count");