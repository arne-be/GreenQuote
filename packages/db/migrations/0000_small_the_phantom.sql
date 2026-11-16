CREATE TYPE "public"."risk_band" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"term_years" integer NOT NULL,
	"monthly_payment_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"modified_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_quote_id_term_years_unique" UNIQUE("quote_id","term_years"),
	CONSTRAINT "offers_term_years_check" CHECK ("offers"."term_years" > 0),
	CONSTRAINT "offers_monthly_payment_cents_check" CHECK ("offers"."monthly_payment_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"applicant_name" text NOT NULL,
	"applicant_email" text NOT NULL,
	"applicant_address" text NOT NULL,
	"monthly_consumption_kwh" integer NOT NULL,
	"system_size_kw" numeric(7, 2) NOT NULL,
	"down_payment_cents" integer NOT NULL,
	"system_price_cents" integer NOT NULL,
	"risk_band" "risk_band" NOT NULL,
	"apr" numeric(5, 4) NOT NULL,
	"pricing_rules_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"modified_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_monthly_consumption_kwh_check" CHECK ("quotes"."monthly_consumption_kwh" > 0),
	CONSTRAINT "quotes_system_size_kw_check" CHECK ("quotes"."system_size_kw" > 0),
	CONSTRAINT "quotes_down_payment_cents_check" CHECK ("quotes"."down_payment_cents" >= 0),
	CONSTRAINT "quotes_system_price_cents_check" CHECK ("quotes"."system_price_cents" > 0),
	CONSTRAINT "quotes_apr_check" CHECK ("quotes"."apr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"modified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotes_user_id_created_at_index" ON "quotes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));