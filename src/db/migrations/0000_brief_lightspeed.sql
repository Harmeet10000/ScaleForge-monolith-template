CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(72) NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"phone_number" json NOT NULL,
	"timezone" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"account_confirmation" json NOT NULL,
	"password_reset" json,
	"last_login_at" timestamp,
	"consent" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_address_unique" UNIQUE("email_address")
);
