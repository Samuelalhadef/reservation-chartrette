ALTER TABLE `associations` ADD `yearly_convention_signed_at` integer;--> statement-breakpoint
ALTER TABLE `associations` ADD `yearly_convention_signature` text;--> statement-breakpoint
ALTER TABLE `associations` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `verification_code` text;--> statement-breakpoint
ALTER TABLE `users` ADD `verification_code_expiry` integer;