ALTER TABLE "users" ADD COLUMN "phone_iso_code" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_country_code" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_international_number" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_confirmation_status" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_confirmation_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_confirmation_code" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_confirmation_timestamp" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_last_reset_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone_number";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "account_confirmation";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_reset";