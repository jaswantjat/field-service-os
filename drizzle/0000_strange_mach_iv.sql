CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`order_id` integer,
	`subcontractor_id` integer,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`subcontractor_id` integer NOT NULL,
	`time_slot_id` integer NOT NULL,
	`completion_photos` text NOT NULL,
	`signature_data` text NOT NULL,
	`gps_lat` real NOT NULL,
	`gps_lng` real NOT NULL,
	`gps_timestamp` text NOT NULL,
	`completion_notes` text,
	`completed_at` text NOT NULL,
	`customer_satisfaction` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`location_lat` real NOT NULL,
	`location_lng` real NOT NULL,
	`service_type` text NOT NULL,
	`inventory_items` text NOT NULL,
	`inventory_status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`estimated_duration` integer NOT NULL,
	`special_instructions` text,
	`status` text DEFAULT 'unassigned' NOT NULL,
	`created_at` text NOT NULL,
	`due_date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subcontractors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`service_areas` text NOT NULL,
	`max_daily_jobs` integer NOT NULL,
	`rating` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subcontractors_email_unique` ON `subcontractors` (`email`);--> statement-breakpoint
CREATE TABLE `time_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`subcontractor_id` integer,
	`slot_date` text NOT NULL,
	`slot_start_time` text NOT NULL,
	`slot_end_time` text NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`claimed_at` text,
	`status` text DEFAULT 'available' NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors`(`id`) ON UPDATE no action ON DELETE no action
);
