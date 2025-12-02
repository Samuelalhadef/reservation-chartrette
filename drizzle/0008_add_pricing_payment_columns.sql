-- Add pricing columns to rooms table
ALTER TABLE `rooms` ADD `pricing_full_day` text DEFAULT '{"chartrettois":0,"association":0,"exterieur":0}';
ALTER TABLE `rooms` ADD `pricing_half_day` text DEFAULT '{"chartrettois":0,"association":0,"exterieur":0}';
ALTER TABLE `rooms` ADD `pricing_hourly` text DEFAULT '{"chartrettois":0,"association":0,"exterieur":0}';
ALTER TABLE `rooms` ADD `deposit` real DEFAULT 0;
ALTER TABLE `rooms` ADD `is_paid` integer DEFAULT false;

-- Add payment columns to reservations table
ALTER TABLE `reservations` ADD `total_price` real DEFAULT 0;
ALTER TABLE `reservations` ADD `deposit_amount` real DEFAULT 0;
ALTER TABLE `reservations` ADD `duration_type` text;
ALTER TABLE `reservations` ADD `payment_status` text DEFAULT 'pending';
ALTER TABLE `reservations` ADD `payment_method` text;
ALTER TABLE `reservations` ADD `payment_reference` text;
ALTER TABLE `reservations` ADD `payment_validated_by` text REFERENCES `users`(`id`);
ALTER TABLE `reservations` ADD `payment_validated_at` integer;
ALTER TABLE `reservations` ADD `payment_notes` text;
