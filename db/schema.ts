import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const economicSourceCache = sqliteTable("economic_source_cache", {
  kind: text("kind").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  sourceLastModified: text("source_last_modified"),
  sourceEtag: text("source_etag"),
  sourceSize: text("source_size"),
  payloadJson: text("payload_json").notNull(),
  checkedAt: text("checked_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
