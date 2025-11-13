CREATE TABLE `associations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`contact_phone` text,
	`convention_signed_at` integer,
	`convention_signature` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `associations_name_unique` ON `associations` (`name`);--> statement-breakpoint
CREATE TABLE `buildings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`address` text,
	`image` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_name_unique` ON `buildings` (`name`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`room_id` text NOT NULL,
	`association_id` text NOT NULL,
	`date` integer NOT NULL,
	`time_slots` text NOT NULL,
	`reason` text NOT NULL,
	`estimated_participants` integer NOT NULL,
	`required_equipment` text DEFAULT '[]',
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_comment` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`cancelled_at` integer,
	`cancel_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`association_id`) REFERENCES `associations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`capacity` integer NOT NULL,
	`surface` real,
	`equipment` text DEFAULT '[]' NOT NULL,
	`images` text DEFAULT '[]',
	`rules` text,
	`default_time_slots` text DEFAULT '{"start":"08:00","end":"22:00"}' NOT NULL,
	`blocked_dates` text DEFAULT '[]' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`association_id` text,
	`email_verified` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`association_id`) REFERENCES `associations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);