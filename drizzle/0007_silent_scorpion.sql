DROP INDEX "associations_name_unique";--> statement-breakpoint
DROP INDEX "buildings_name_unique";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `rooms` ALTER COLUMN "is_paid" TO "is_paid" integer;--> statement-breakpoint
CREATE UNIQUE INDEX `associations_name_unique` ON `associations` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_name_unique` ON `buildings` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);