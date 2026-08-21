import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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

export const publicationFamilies = sqliteTable(
  "publication_families",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("publication_families_code_idx").on(table.code)]
);

export const publicationTypes = sqliteTable(
  "publication_types",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    familyId: integer("family_id")
      .notNull()
      .references(() => publicationFamilies.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (table) => [uniqueIndex("publication_types_code_idx").on(table.code)]
);

export const publicationUsers = sqliteTable(
  "publication_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
  },
  (table) => [uniqueIndex("publication_users_username_idx").on(table.username)]
);

export const publicationSubtypes = sqliteTable(
  "publication_subtypes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    operationCode: text("operation_code").notNull(),
    typeId: integer("type_id")
      .notNull()
      .references(() => publicationTypes.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (table) => [
    uniqueIndex("publication_subtypes_operation_type_code_idx").on(
      table.operationCode,
      table.typeId,
      table.code
    ),
  ]
);

export const publicationDocuments = sqliteTable(
  "publication_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    operationCode: text("operation_code").notNull(),
    typeId: integer("type_id")
      .notNull()
      .references(() => publicationTypes.id),
    subtypeId: integer("subtype_id").references(() => publicationSubtypes.id),
    publicName: text("public_name").notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull().default("PDF"),
    fileSizeKb: integer("file_size_kb").notNull().default(0),
    displayOrder: integer("display_order").notNull().default(0),
    documentUrl: text("document_url").notNull(),
    storagePath: text("storage_path").notNull(),
    uploadedAt: text("uploaded_at").notNull(),
    publishedAt: text("published_at").notNull(),
    uploadedByUserId: integer("uploaded_by_user_id")
      .notNull()
      .references(() => publicationUsers.id),
    approvedByUserId: integer("approved_by_user_id").references(
      () => publicationUsers.id
    ),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("publication_documents_storage_path_idx").on(table.storagePath),
    index("publication_documents_visibility_idx").on(
      table.operationCode,
      table.approvedByUserId,
      table.publishedAt
    ),
  ]
);

// Nuevo dominio editorial. Se mantiene separado de las tablas heredadas hasta
// completar la migración sombra y la conciliación de contenido.
export const cmsUsers = sqliteTable(
  "cms_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    identityProvider: text("identity_provider").notNull().default("chatgpt"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    isDevelopmentException: integer("is_development_exception", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [uniqueIndex("cms_users_email_idx").on(table.email)],
);

export const cmsRoles = sqliteTable(
  "cms_roles",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [uniqueIndex("cms_roles_code_idx").on(table.code)],
);

export const cmsPermissions = sqliteTable(
  "cms_permissions",
  { id: text("id").primaryKey(), code: text("code").notNull(), resource: text("resource").notNull(), action: text("action").notNull(), description: text("description") },
  (table) => [uniqueIndex("cms_permissions_code_idx").on(table.code)],
);

export const cmsOperations = sqliteTable(
  "cms_operations",
  {
    id: text("id").primaryKey(), code: text("code").notNull(), name: text("name").notNull(), acronym: text("acronym"), slug: text("slug").notNull(),
    description: text("description"), responsible: text("responsible"), isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    hasPublicStory: integer("has_public_story", { mode: "boolean" }).notNull().default(false), cmsEnabled: integer("cms_enabled", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("cms_operations_code_idx").on(table.code), uniqueIndex("cms_operations_slug_idx").on(table.slug)],
);

export const cmsPublications = sqliteTable(
  "cms_publications",
  {
    id: text("id").primaryKey(), publicId: text("public_id").notNull(), publicSlug: text("public_slug").notNull(), currentState: text("current_state").notNull().default("BORRADOR"),
    currentVersionNumber: integer("current_version_number").notNull().default(1), publicVersionNumber: integer("public_version_number"), rowVersion: integer("row_version").notNull().default(1),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(), withdrawnAt: text("withdrawn_at"), deletedAt: text("deleted_at"),
  },
  (table) => [uniqueIndex("cms_publications_public_id_idx").on(table.publicId), uniqueIndex("cms_publications_slug_idx").on(table.publicSlug), index("cms_publications_state_idx").on(table.currentState, table.deletedAt)],
);

export const cmsPublicationVersions = sqliteTable(
  "cms_publication_versions",
  {
    id: text("id").primaryKey(), publicationId: text("publication_id").notNull().references(() => cmsPublications.id), versionNumber: integer("version_number").notNull(),
    sectionId: text("section_id").notNull(), typeId: text("type_id"), subtypeId: text("subtype_id"), publicName: text("public_name").notNull(), description: text("description"),
    referencePeriod: text("reference_period"), scheduledAt: text("scheduled_at").notNull(), timezone: text("timezone").notNull().default("America/Santiago"),
    contentFingerprint: text("content_fingerprint").notNull(), createdBy: text("created_by").notNull().references(() => cmsUsers.id), createdAt: text("created_at").notNull(), changeReason: text("change_reason"),
  },
  (table) => [uniqueIndex("cms_publication_version_idx").on(table.publicationId, table.versionNumber), index("cms_publication_schedule_idx").on(table.scheduledAt)],
);

export const cmsFileVersions = sqliteTable(
  "cms_file_versions",
  {
    id: text("id").primaryKey(), fileAssetId: text("file_asset_id").notNull(), versionNumber: integer("version_number").notNull(), originalName: text("original_name").notNull(),
    storageKey: text("storage_key").notNull(), extension: text("extension").notNull(), declaredMime: text("declared_mime"), detectedMime: text("detected_mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(), sha256: text("sha256").notNull(), largeFileAcknowledged: integer("large_file_acknowledged", { mode: "boolean" }).notNull().default(false),
    uploadedBy: text("uploaded_by").notNull().references(() => cmsUsers.id), uploadedAt: text("uploaded_at").notNull(), status: text("status").notNull().default("ACTIVE"),
  },
  (table) => [uniqueIndex("cms_file_version_idx").on(table.fileAssetId, table.versionNumber), uniqueIndex("cms_file_storage_key_idx").on(table.storageKey)],
);

export const cmsAuditEvents = sqliteTable(
  "cms_audit_events",
  {
    id: text("id").primaryKey(), actorId: text("actor_id").references(() => cmsUsers.id), actorEmailSnapshot: text("actor_email_snapshot"), occurredAt: text("occurred_at").notNull(),
    ipAddress: text("ip_address"), userAgent: text("user_agent"), action: text("action").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(),
    operationId: text("operation_id"), beforeJson: text("before_json"), afterJson: text("after_json"), reason: text("reason"), correlationId: text("correlation_id").notNull(), result: text("result").notNull(),
  },
  (table) => [index("cms_audit_query_idx").on(table.occurredAt, table.action, table.operationId)],
);

// Fase 2 del CMS: modelo aditivo para páginas, componentes, fuentes y gobierno
// del ciclo de vida. Estas tablas no sustituyen todavía ninguna lectura pública.
export const cmsThemes = sqliteTable(
  "cms_themes",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("cms_themes_code_idx").on(table.code),
    uniqueIndex("cms_themes_slug_idx").on(table.slug),
    index("cms_themes_parent_order_idx").on(table.parentId, table.displayOrder),
  ],
);

export const cmsOperationThemes = sqliteTable(
  "cms_operation_themes",
  {
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    themeId: text("theme_id").notNull().references(() => cmsThemes.id, { onDelete: "restrict" }),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.operationId, table.themeId] })],
);

export const cmsPages = sqliteTable(
  "cms_pages",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    pageKind: text("page_kind").notNull(),
    slug: text("slug").notNull(),
    publicPath: text("public_path").notNull(),
    currentDraftVersion: integer("current_draft_version").notNull().default(1),
    publishedVersion: integer("published_version"),
    rowVersion: integer("row_version").notNull().default(1),
    status: text("status").notNull().default("BORRADOR"),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    uniqueIndex("cms_pages_operation_slug_idx").on(table.operationId, table.slug),
    uniqueIndex("cms_pages_public_path_idx").on(table.publicPath),
    index("cms_pages_operation_status_idx").on(table.operationId, table.status, table.deletedAt),
  ],
);

export const cmsPageVersions = sqliteTable(
  "cms_page_versions",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id").notNull().references(() => cmsPages.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    shortTitle: text("short_title"),
    description: text("description"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    changeReason: text("change_reason"),
    contentFingerprint: text("content_fingerprint").notNull(),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("cms_page_versions_number_idx").on(table.pageId, table.versionNumber),
    index("cms_page_versions_created_idx").on(table.pageId, table.createdAt),
  ],
);

export const cmsPageSections = sqliteTable(
  "cms_page_sections",
  {
    id: text("id").primaryKey(),
    pageVersionId: text("page_version_id").notNull().references(() => cmsPageVersions.id, { onDelete: "restrict" }),
    stableKey: text("stable_key").notNull(),
    title: text("title"),
    displayOrder: integer("display_order").notNull().default(0),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    settingsJson: text("settings_json").notNull().default("{}"),
  },
  (table) => [
    uniqueIndex("cms_page_sections_key_idx").on(table.pageVersionId, table.stableKey),
    index("cms_page_sections_order_idx").on(table.pageVersionId, table.displayOrder),
  ],
);

export const cmsComponentTypes = sqliteTable(
  "cms_component_types",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    configSchemaJson: text("config_schema_json").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("cms_component_types_code_idx").on(table.code)],
);

export const cmsComponents = sqliteTable(
  "cms_components",
  {
    id: text("id").primaryKey(),
    stableKey: text("stable_key").notNull(),
    componentTypeId: text("component_type_id").notNull().references(() => cmsComponentTypes.id, { onDelete: "restrict" }),
    currentVersionNumber: integer("current_version_number").notNull().default(1),
    rowVersion: integer("row_version").notNull().default(1),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [uniqueIndex("cms_components_stable_key_idx").on(table.stableKey)],
);

export const cmsComponentVersions = sqliteTable(
  "cms_component_versions",
  {
    id: text("id").primaryKey(),
    componentId: text("component_id").notNull().references(() => cmsComponents.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    configJson: text("config_json").notNull(),
    contentFingerprint: text("content_fingerprint").notNull(),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    changeReason: text("change_reason"),
  },
  (table) => [uniqueIndex("cms_component_versions_number_idx").on(table.componentId, table.versionNumber)],
);

export const cmsSectionComponents = sqliteTable(
  "cms_section_components",
  {
    sectionId: text("section_id").notNull().references(() => cmsPageSections.id, { onDelete: "restrict" }),
    componentVersionId: text("component_version_id").notNull().references(() => cmsComponentVersions.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull().default(0),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    primaryKey({ columns: [table.sectionId, table.componentVersionId] }),
    uniqueIndex("cms_section_components_order_idx").on(table.sectionId, table.displayOrder),
  ],
);

export const cmsDataSources = sqliteTable(
  "cms_data_sources",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sourceKind: text("source_kind").notNull(),
    currentVersionNumber: integer("current_version_number").notNull().default(1),
    publishedVersionNumber: integer("published_version_number"),
    rowVersion: integer("row_version").notNull().default(1),
    status: text("status").notNull().default("BORRADOR"),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    uniqueIndex("cms_data_sources_operation_code_idx").on(table.operationId, table.code),
    index("cms_data_sources_status_idx").on(table.operationId, table.status, table.deletedAt),
  ],
);

export const cmsDataSourceVersions = sqliteTable(
  "cms_data_source_versions",
  {
    id: text("id").primaryKey(),
    dataSourceId: text("data_source_id").notNull().references(() => cmsDataSources.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    fileVersionId: text("file_version_id").references(() => cmsFileVersions.id, { onDelete: "restrict" }),
    adapterCode: text("adapter_code").notNull(),
    locatorJson: text("locator_json").notNull().default("{}"),
    schemaJson: text("schema_json").notNull().default("{}"),
    contentFingerprint: text("content_fingerprint").notNull(),
    validationStatus: text("validation_status").notNull().default("PENDIENTE"),
    validationJson: text("validation_json"),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("cms_data_source_versions_number_idx").on(table.dataSourceId, table.versionNumber)],
);

export const cmsComponentDataSources = sqliteTable(
  "cms_component_data_sources",
  {
    componentVersionId: text("component_version_id").notNull().references(() => cmsComponentVersions.id, { onDelete: "restrict" }),
    dataSourceVersionId: text("data_source_version_id").notNull().references(() => cmsDataSourceVersions.id, { onDelete: "restrict" }),
    alias: text("alias").notNull(),
    dependencyOrder: integer("dependency_order").notNull().default(0),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    primaryKey({ columns: [table.componentVersionId, table.dataSourceVersionId] }),
    uniqueIndex("cms_component_data_sources_alias_idx").on(table.componentVersionId, table.alias),
  ],
);

export const cmsTags = sqliteTable(
  "cms_tags",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("cms_tags_code_idx").on(table.code)],
);

export const cmsEditLocks = sqliteTable(
  "cms_edit_locks",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    lockedBy: text("locked_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    lockTokenHash: text("lock_token_hash").notNull(),
    acquiredAt: text("acquired_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    releasedAt: text("released_at"),
  },
  (table) => [
    uniqueIndex("cms_edit_locks_active_idx").on(table.entityType, table.entityId),
    index("cms_edit_locks_expiry_idx").on(table.expiresAt, table.releasedAt),
  ],
);

export const cmsTrashEntries = sqliteTable(
  "cms_trash_entries",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    operationId: text("operation_id").references(() => cmsOperations.id, { onDelete: "restrict" }),
    deletedBy: text("deleted_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    deletedAt: text("deleted_at").notNull(),
    purgeAfter: text("purge_after"),
    reason: text("reason"),
    dependencySnapshotJson: text("dependency_snapshot_json").notNull().default("{}"),
    restoredBy: text("restored_by").references(() => cmsUsers.id, { onDelete: "restrict" }),
    restoredAt: text("restored_at"),
    purgedAt: text("purged_at"),
  },
  (table) => [
    uniqueIndex("cms_trash_entity_idx").on(table.entityType, table.entityId),
    index("cms_trash_retention_idx").on(table.purgeAfter, table.restoredAt, table.purgedAt),
  ],
);

// Fase 3: workflow transversal. Se mantiene separado del flujo heredado de
// publicaciones hasta que cada tipo de contenido se incorpore gradualmente.
export const cmsWorkflowDefinitions = sqliteTable(
  "cms_workflow_definitions",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    entityType: text("entity_type").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("cms_workflow_definitions_code_idx").on(table.code),
    index("cms_workflow_definitions_entity_idx").on(table.entityType, table.isActive),
  ],
);

export const cmsWorkflowStates = sqliteTable(
  "cms_workflow_states",
  {
    id: text("id").primaryKey(),
    workflowDefinitionId: text("workflow_definition_id").notNull().references(() => cmsWorkflowDefinitions.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isTerminal: integer("is_terminal", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [uniqueIndex("cms_workflow_states_code_idx").on(table.workflowDefinitionId, table.code)],
);

export const cmsWorkflowTransitions = sqliteTable(
  "cms_workflow_transitions",
  {
    id: text("id").primaryKey(),
    workflowDefinitionId: text("workflow_definition_id").notNull().references(() => cmsWorkflowDefinitions.id, { onDelete: "restrict" }),
    fromStateId: text("from_state_id").notNull().references(() => cmsWorkflowStates.id, { onDelete: "restrict" }),
    toStateId: text("to_state_id").notNull().references(() => cmsWorkflowStates.id, { onDelete: "restrict" }),
    actionCode: text("action_code").notNull(),
    requiredPermission: text("required_permission").notNull(),
    requiresComment: integer("requires_comment", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [uniqueIndex("cms_workflow_transitions_action_idx").on(table.workflowDefinitionId, table.fromStateId, table.actionCode)],
);

export const cmsEntityWorkflows = sqliteTable(
  "cms_entity_workflows",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    operationId: text("operation_id").references(() => cmsOperations.id, { onDelete: "restrict" }),
    workflowDefinitionId: text("workflow_definition_id").notNull().references(() => cmsWorkflowDefinitions.id, { onDelete: "restrict" }),
    currentStateId: text("current_state_id").notNull().references(() => cmsWorkflowStates.id, { onDelete: "restrict" }),
    rowVersion: integer("row_version").notNull().default(1),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("cms_entity_workflows_entity_idx").on(table.entityType, table.entityId),
    index("cms_entity_workflows_queue_idx").on(table.operationId, table.currentStateId, table.updatedAt),
  ],
);

export const cmsWorkflowEvents = sqliteTable(
  "cms_workflow_events",
  {
    id: text("id").primaryKey(),
    entityWorkflowId: text("entity_workflow_id").notNull().references(() => cmsEntityWorkflows.id, { onDelete: "restrict" }),
    transitionId: text("transition_id").references(() => cmsWorkflowTransitions.id, { onDelete: "restrict" }),
    fromStateId: text("from_state_id").references(() => cmsWorkflowStates.id, { onDelete: "restrict" }),
    toStateId: text("to_state_id").notNull().references(() => cmsWorkflowStates.id, { onDelete: "restrict" }),
    actorId: text("actor_id").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    comment: text("comment"),
    correlationId: text("correlation_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("cms_workflow_events_history_idx").on(table.entityWorkflowId, table.createdAt)],
);

export const cmsReviewAssignments = sqliteTable(
  "cms_review_assignments",
  {
    id: text("id").primaryKey(),
    entityWorkflowId: text("entity_workflow_id").notNull().references(() => cmsEntityWorkflows.id, { onDelete: "restrict" }),
    reviewerId: text("reviewer_id").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    assignedBy: text("assigned_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    assignedAt: text("assigned_at").notNull(),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    uniqueIndex("cms_review_assignments_reviewer_idx").on(table.entityWorkflowId, table.reviewerId),
    index("cms_review_assignments_queue_idx").on(table.reviewerId, table.resolvedAt, table.assignedAt),
  ],
);

export const cmsReviewComments = sqliteTable(
  "cms_review_comments",
  {
    id: text("id").primaryKey(),
    entityWorkflowId: text("entity_workflow_id").notNull().references(() => cmsEntityWorkflows.id, { onDelete: "restrict" }),
    authorId: text("author_id").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    parentCommentId: text("parent_comment_id"),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
    resolvedBy: text("resolved_by").references(() => cmsUsers.id, { onDelete: "restrict" }),
    resolvedAt: text("resolved_at"),
  },
  (table) => [index("cms_review_comments_entity_idx").on(table.entityWorkflowId, table.createdAt)],
);

// Fase 6: entidad documental común para Publicaciones, Documentación y Bases
// de datos. Reutiliza los catálogos cms_sections/content_types/subtypes actuales.
export const cmsContentItems = sqliteTable(
  "cms_content_items",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    sectionId: text("section_id").notNull(),
    typeId: text("type_id").notNull(),
    subtypeId: text("subtype_id"),
    publicId: text("public_id").notNull(),
    publicSlug: text("public_slug").notNull(),
    currentVersionNumber: integer("current_version_number").notNull().default(1),
    publishedVersionNumber: integer("published_version_number"),
    rowVersion: integer("row_version").notNull().default(1),
    status: text("status").notNull().default("BORRADOR"),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    uniqueIndex("cms_content_items_public_id_idx").on(table.publicId),
    uniqueIndex("cms_content_items_slug_idx").on(table.operationId, table.sectionId, table.publicSlug),
    index("cms_content_items_queue_idx").on(table.operationId, table.sectionId, table.status, table.deletedAt),
  ],
);

export const cmsContentVersions = sqliteTable(
  "cms_content_versions",
  {
    id: text("id").primaryKey(),
    contentItemId: text("content_item_id").notNull().references(() => cmsContentItems.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    publicName: text("public_name").notNull(),
    description: text("description"),
    referencePeriod: text("reference_period"),
    publicationAt: text("publication_at"),
    unpublicationAt: text("unpublication_at"),
    visibility: text("visibility").notNull().default("PUBLICA"),
    externalUrl: text("external_url"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    contentFingerprint: text("content_fingerprint").notNull(),
    changeReason: text("change_reason"),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("cms_content_versions_number_idx").on(table.contentItemId, table.versionNumber),
    index("cms_content_versions_schedule_idx").on(table.publicationAt, table.unpublicationAt),
  ],
);

export const cmsContentVersionFiles = sqliteTable(
  "cms_content_version_files",
  {
    contentVersionId: text("content_version_id").notNull().references(() => cmsContentVersions.id, { onDelete: "restrict" }),
    fileVersionId: text("file_version_id").notNull().references(() => cmsFileVersions.id, { onDelete: "restrict" }),
    fileRole: text("file_role").notNull().default("PRIMARY"),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.contentVersionId, table.fileVersionId] }),
    uniqueIndex("cms_content_version_files_order_idx").on(table.contentVersionId, table.displayOrder),
  ],
);

// Fase 7: catálogo configurable para especializar los elementos del Centro de recursos.
export const cmsResourceTypes = sqliteTable(
  "cms_resource_types",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    requiresEndpoint: integer("requires_endpoint", { mode: "boolean" }).notNull().default(false),
    allowsFiles: integer("allows_files", { mode: "boolean" }).notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("cms_resource_types_code_idx").on(table.code)],
);

// Fase 8: lotes persistentes, resultado por elemento y trazabilidad física de
// reemplazos. Los bytes permanecen en R2; D1 conserva control e idempotencia.
export const cmsBulkBatches = sqliteTable(
  "cms_bulk_batches",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    authorizerId: text("authorizer_id").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("VALIDATING"),
    archiveStorageKey: text("archive_storage_key").notNull(),
    manifestStorageKey: text("manifest_storage_key").notNull(),
    archiveSha256: text("archive_sha256").notNull(),
    manifestSha256: text("manifest_sha256").notNull(),
    validationJson: text("validation_json").notNull().default("{}"),
    totalItems: integer("total_items").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull(),
    confirmedAt: text("confirmed_at"),
    processingStartedAt: text("processing_started_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("cms_bulk_batches_idempotency_idx").on(table.createdBy, table.idempotencyKey),
    index("cms_bulk_batches_operation_status_idx").on(table.operationId, table.status, table.createdAt),
  ],
);

export const cmsBulkBatchItems = sqliteTable(
  "cms_bulk_batch_items",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id").notNull().references(() => cmsBulkBatches.id, { onDelete: "restrict" }),
    rowNumber: integer("row_number").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    contentKind: text("content_kind").notNull(),
    manifestPath: text("manifest_path").notNull(),
    publicName: text("public_name").notNull(),
    status: text("status").notNull().default("PENDING"),
    contentItemId: text("content_item_id"),
    fileAssetId: text("file_asset_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    resultJson: text("result_json").notNull().default("{}"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("cms_bulk_batch_items_row_idx").on(table.batchId, table.rowNumber),
    uniqueIndex("cms_bulk_batch_items_idempotency_idx").on(table.batchId, table.idempotencyKey),
    index("cms_bulk_batch_items_status_idx").on(table.batchId, table.status),
  ],
);

export const cmsFileVersionEvents = sqliteTable(
  "cms_file_version_events",
  {
    id: text("id").primaryKey(),
    fileAssetId: text("file_asset_id").notNull(),
    fromFileVersionId: text("from_file_version_id").references(() => cmsFileVersions.id, { onDelete: "restrict" }),
    toFileVersionId: text("to_file_version_id").notNull().references(() => cmsFileVersions.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    reason: text("reason"),
    actorId: text("actor_id").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [index("cms_file_version_events_asset_idx").on(table.fileAssetId, table.occurredAt)],
);

export const cmsManagedFileAssets = sqliteTable(
  "cms_managed_file_assets",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    ownerType: text("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    publicFileId: text("public_file_id").notNull(),
    publicName: text("public_name").notNull(),
    currentVersionNumber: integer("current_version_number").notNull().default(1),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    uniqueIndex("cms_managed_file_assets_public_idx").on(table.publicFileId),
    index("cms_managed_file_assets_owner_idx").on(table.ownerType, table.ownerId, table.deletedAt),
  ],
);

export const cmsPhysicalPurgeRequests = sqliteTable(
  "cms_physical_purge_requests",
  {
    id: text("id").primaryKey(),
    trashEntryId: text("trash_entry_id").notNull().references(() => cmsTrashEntries.id, { onDelete: "restrict" }),
    requestedBy: text("requested_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    requestedAt: text("requested_at").notNull(),
    approvedBy: text("approved_by").references(() => cmsUsers.id, { onDelete: "restrict" }),
    approvedAt: text("approved_at"),
    status: text("status").notNull().default("PENDING"),
    dependencyCheckJson: text("dependency_check_json").notNull().default("{}"),
    executedAt: text("executed_at"),
  },
  (table) => [uniqueIndex("cms_physical_purge_active_idx").on(table.trashEntryId, table.status)],
);

// Fase 9: agenda editorial durable y generaciones de caché con cambio de
// puntero atómico. Una generación fallida nunca sustituye la anterior.
export const cmsScheduledActions = sqliteTable(
  "cms_scheduled_actions",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    expectedVersionNumber: integer("expected_version_number").notNull(),
    scheduledAt: text("scheduled_at").notNull(),
    timezone: text("timezone").notNull().default("America/Santiago"),
    status: text("status").notNull().default("PENDING"),
    idempotencyKey: text("idempotency_key").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lockedUntil: text("locked_until"),
    lastError: text("last_error"),
    createdBy: text("created_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
    cancelledBy: text("cancelled_by").references(() => cmsUsers.id, { onDelete: "restrict" }),
    cancelledAt: text("cancelled_at"),
  },
  (table) => [
    uniqueIndex("cms_scheduled_actions_idempotency_idx").on(table.idempotencyKey),
    index("cms_scheduled_actions_due_idx").on(table.status, table.scheduledAt, table.lockedUntil),
    index("cms_scheduled_actions_entity_idx").on(table.entityType, table.entityId, table.status),
  ],
);

export const cmsCacheGenerations = sqliteTable(
  "cms_cache_generations",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id").notNull().references(() => cmsPages.id, { onDelete: "restrict" }),
    generationNumber: integer("generation_number").notNull(),
    status: text("status").notNull().default("BUILDING"),
    manifestJson: text("manifest_json").notNull().default("{}"),
    contentHash: text("content_hash"),
    triggerEventId: text("trigger_event_id"),
    createdAt: text("created_at").notNull(),
    readyAt: text("ready_at"),
    failedAt: text("failed_at"),
    errorJson: text("error_json"),
  },
  (table) => [
    uniqueIndex("cms_cache_generations_number_idx").on(table.pageId, table.generationNumber),
    index("cms_cache_generations_status_idx").on(table.pageId, table.status, table.createdAt),
  ],
);

export const cmsCacheGenerationSources = sqliteTable(
  "cms_cache_generation_sources",
  {
    generationId: text("generation_id").notNull().references(() => cmsCacheGenerations.id, { onDelete: "restrict" }),
    dataSourceId: text("data_source_id").notNull().references(() => cmsDataSources.id, { onDelete: "restrict" }),
    dataSourceVersionId: text("data_source_version_id").notNull().references(() => cmsDataSourceVersions.id, { onDelete: "restrict" }),
    alias: text("alias").notNull(),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(true),
    contentFingerprint: text("content_fingerprint").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.generationId, table.dataSourceId, table.alias] }),
    index("cms_cache_generation_sources_reverse_idx").on(table.dataSourceId, table.generationId),
  ],
);

export const cmsPageCachePointers = sqliteTable(
  "cms_page_cache_pointers",
  {
    pageId: text("page_id").primaryKey().references(() => cmsPages.id, { onDelete: "restrict" }),
    generationId: text("generation_id").notNull().references(() => cmsCacheGenerations.id, { onDelete: "restrict" }),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("cms_page_cache_pointers_generation_idx").on(table.generationId)],
);

// Fase 10: migración en sombra y conmutación reversible por operación. El
// estado BASELINE delega en la lectura pública vigente y evita activaciones.
export const cmsOperationReadModes = sqliteTable(
  "cms_operation_read_modes",
  {
    operationId: text("operation_id").primaryKey().references(() => cmsOperations.id, { onDelete: "restrict" }),
    mode: text("mode").notNull().default("BASELINE"),
    rowVersion: integer("row_version").notNull().default(1),
    activatedBy: text("activated_by").references(() => cmsUsers.id, { onDelete: "restrict" }),
    activatedAt: text("activated_at"),
    rollbackReason: text("rollback_reason"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("cms_operation_read_modes_mode_idx").on(table.mode, table.updatedAt)],
);

export const cmsLegacyContentMaps = sqliteTable(
  "cms_legacy_content_maps",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    sourceTable: text("source_table").notNull(),
    sourceId: text("source_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    targetFingerprint: text("target_fingerprint").notNull(),
    status: text("status").notNull().default("MIGRATED"),
    detailsJson: text("details_json").notNull().default("{}"),
    migratedAt: text("migrated_at").notNull(),
  },
  (table) => [
    uniqueIndex("cms_legacy_content_maps_source_idx").on(table.sourceTable, table.sourceId),
    uniqueIndex("cms_legacy_content_maps_target_idx").on(table.targetType, table.targetId),
    index("cms_legacy_content_maps_operation_status_idx").on(table.operationId, table.status),
  ],
);

export const cmsShadowMigrationRuns = sqliteTable(
  "cms_shadow_migration_runs",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("RUNNING"),
    sourceCount: integer("source_count").notNull().default(0),
    migratedCount: integer("migrated_count").notNull().default(0),
    matchedCount: integer("matched_count").notNull().default(0),
    differenceCount: integer("difference_count").notNull().default(0),
    sourceFingerprint: text("source_fingerprint"),
    targetFingerprint: text("target_fingerprint"),
    reportJson: text("report_json").notNull().default("{}"),
    startedBy: text("started_by").notNull().references(() => cmsUsers.id, { onDelete: "restrict" }),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [index("cms_shadow_migration_runs_operation_idx").on(table.operationId, table.startedAt, table.status)],
);

export const cmsShadowComparisons = sqliteTable(
  "cms_shadow_comparisons",
  {
    id: text("id").primaryKey(),
    operationId: text("operation_id").notNull().references(() => cmsOperations.id, { onDelete: "restrict" }),
    familyCode: text("family_code").notNull(),
    baselineCount: integer("baseline_count").notNull(),
    shadowCount: integer("shadow_count").notNull(),
    baselineFingerprint: text("baseline_fingerprint").notNull(),
    shadowFingerprint: text("shadow_fingerprint").notNull(),
    status: text("status").notNull(),
    differencesJson: text("differences_json").notNull().default("[]"),
    comparedAt: text("compared_at").notNull(),
  },
  (table) => [index("cms_shadow_comparisons_operation_idx").on(table.operationId, table.comparedAt, table.status)],
);

// Pasos 12–14: metadatos estadísticos con identidad estable e historial inmutable.
export const cmsVariables=sqliteTable("cms_variables",{id:text("id").primaryKey(),operationId:text("operation_id").notNull().references(()=>cmsOperations.id,{onDelete:"restrict"}),dataSourceId:text("data_source_id").references(()=>cmsDataSources.id,{onDelete:"restrict"}),code:text("code").notNull(),currentVersionNumber:integer("current_version_number").notNull().default(1),rowVersion:integer("row_version").notNull().default(1),status:text("status").notNull().default("ACTIVA"),createdBy:text("created_by").notNull().references(()=>cmsUsers.id,{onDelete:"restrict"}),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),deletedAt:text("deleted_at")},table=>[uniqueIndex("cms_variables_operation_code_idx").on(table.operationId,table.code)]);
export const cmsVariableVersions=sqliteTable("cms_variable_versions",{id:text("id").primaryKey(),variableId:text("variable_id").notNull().references(()=>cmsVariables.id,{onDelete:"restrict"}),versionNumber:integer("version_number").notNull(),label:text("label").notNull(),definition:text("definition"),dataType:text("data_type").notNull(),semanticRole:text("semantic_role").notNull(),unit:text("unit"),decimalPlaces:integer("decimal_places"),universe:text("universe"),validRangeJson:text("valid_range_json").notNull(),missingValuesJson:text("missing_values_json").notNull(),categoriesJson:text("categories_json").notNull(),notes:text("notes"),contentFingerprint:text("content_fingerprint").notNull(),changeReason:text("change_reason"),createdBy:text("created_by").notNull().references(()=>cmsUsers.id,{onDelete:"restrict"}),createdAt:text("created_at").notNull()},table=>[uniqueIndex("cms_variable_versions_number_idx").on(table.variableId,table.versionNumber)]);
export const cmsTimeSchemes=sqliteTable("cms_time_schemes",{id:text("id").primaryKey(),operationId:text("operation_id").notNull().references(()=>cmsOperations.id,{onDelete:"restrict"}),dataSourceId:text("data_source_id").references(()=>cmsDataSources.id,{onDelete:"restrict"}),code:text("code").notNull(),currentVersionNumber:integer("current_version_number").notNull().default(1),rowVersion:integer("row_version").notNull().default(1),status:text("status").notNull(),createdBy:text("created_by").notNull().references(()=>cmsUsers.id,{onDelete:"restrict"}),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),deletedAt:text("deleted_at")},table=>[uniqueIndex("cms_time_schemes_operation_code_idx").on(table.operationId,table.code)]);
export const cmsTimeSchemeVersions=sqliteTable("cms_time_scheme_versions",{id:text("id").primaryKey(),timeSchemeId:text("time_scheme_id").notNull().references(()=>cmsTimeSchemes.id,{onDelete:"restrict"}),versionNumber:integer("version_number").notNull(),name:text("name").notNull(),frequency:text("frequency").notNull(),representation:text("representation").notNull(),componentsJson:text("components_json").notNull(),inputFormat:text("input_format"),displayFormat:text("display_format").notNull(),locale:text("locale").notNull(),timezone:text("timezone").notNull(),anchor:text("anchor").notNull(),fiscalYearStartMonth:integer("fiscal_year_start_month").notNull(),windowSize:integer("window_size"),sortDirection:text("sort_direction").notNull(),notes:text("notes"),contentFingerprint:text("content_fingerprint").notNull(),changeReason:text("change_reason"),createdBy:text("created_by").notNull().references(()=>cmsUsers.id,{onDelete:"restrict"}),createdAt:text("created_at").notNull()},table=>[uniqueIndex("cms_time_scheme_versions_number_idx").on(table.timeSchemeId,table.versionNumber)]);
export const cmsDerivedVariables=sqliteTable("cms_derived_variables",{id:text("id").primaryKey(),operationId:text("operation_id").notNull().references(()=>cmsOperations.id,{onDelete:"restrict"}),code:text("code").notNull(),currentVersionNumber:integer("current_version_number").notNull().default(1),rowVersion:integer("row_version").notNull().default(1),status:text("status").notNull(),createdBy:text("created_by").notNull().references(()=>cmsUsers.id,{onDelete:"restrict"}),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),deletedAt:text("deleted_at")},table=>[uniqueIndex("cms_derived_variables_operation_code_idx").on(table.operationId,table.code)]);
export const cmsDerivedVariableVersions=sqliteTable("cms_derived_variable_versions",{id:text("id").primaryKey(),derivedVariableId:text("derived_variable_id").notNull().references(()=>cmsDerivedVariables.id,{onDelete:"restrict"}),versionNumber:integer("version_number").notNull(),label:text("label").notNull(),definition:text("definition"),formula:text("formula").notNull(),dependenciesJson:text("dependencies_json").notNull(),resultType:text("result_type").notNull(),unit:text("unit"),decimalPlaces:integer("decimal_places"),zeroDivisionPolicy:text("zero_division_policy").notNull(),missingPolicy:text("missing_policy").notNull(),notes:text("notes"),contentFingerprint:text("content_fingerprint").notNull(),changeReason:text("change_reason"),createdBy:text("created_by").notNull().references(()=>cmsUsers.id,{onDelete:"restrict"}),createdAt:text("created_at").notNull()},table=>[uniqueIndex("cms_derived_variable_versions_number_idx").on(table.derivedVariableId,table.versionNumber)]);
