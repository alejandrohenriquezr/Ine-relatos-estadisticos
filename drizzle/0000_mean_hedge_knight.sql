CREATE TABLE `economic_source_cache` (
	`kind` text PRIMARY KEY NOT NULL,
	`source_url` text NOT NULL,
	`source_last_modified` text,
	`source_etag` text,
	`source_size` text,
	`payload_json` text NOT NULL,
	`checked_at` text NOT NULL,
	`updated_at` text NOT NULL
);
