# Database entity-relationship diagram

The diagram reflects the Drizzle schema. Record payloads have typed columns
for common filters and a JSONB `extra` object for additional generated fields.
The search vector is generated from selected typed record columns.

```mermaid
erDiagram
  ROLES {
    uuid id PK
    varchar name UK
    varchar slug UK
    text description
  }
  USERS {
    uuid id PK
    uuid role_id FK
    varchar email UK
    varchar name
    text password_hash
  }
  DATASETS {
    uuid id PK
    uuid created_by FK
    varchar name
    varchar slug UK
    varchar category
    varchar data_source
    bigint record_count
  }
  DATASET_FIELDS {
    uuid id PK
    uuid dataset_id FK
    varchar name
    varchar data_type
    boolean is_filterable
    boolean is_sortable
  }
  DATASET_RECORDS {
    uuid id PK
    uuid dataset_id FK
    varchar status
    varchar country
    varchar category
    numeric revenue
    timestamptz created_at
    varchar name
    varchar email
    jsonb extra
    tsvector search_vector
  }
  RECORD_RELATIONSHIPS {
    uuid id PK
    uuid source_record_id FK
    uuid target_record_id FK
    varchar relationship_type
    jsonb metadata
  }
  RECORD_HISTORY {
    uuid id PK
    uuid record_id FK
    uuid changed_by FK
    varchar operation
    jsonb changes
    timestamptz created_at
  }
  SAVED_VIEWS {
    uuid id PK
    uuid user_id FK
    uuid dataset_id FK
    varchar name
    jsonb configuration
    boolean is_shared
  }
  SEARCH_HISTORY {
    uuid id PK
    uuid user_id FK
    uuid dataset_id FK
    jsonb query
    bigint result_count
    integer duration_ms
    timestamptz executed_at
  }
  USER_PREFERENCES {
    uuid id PK
    uuid user_id FK
    jsonb preferences
    timestamptz updated_at
  }
  ACCESS_PERMISSIONS {
    uuid id PK
    uuid dataset_id FK
    uuid user_id FK
    uuid role_id FK
    enum permission
  }
  QUERY_LOGS {
    uuid id PK
    uuid user_id FK
    uuid dataset_id FK
    varchar query_type
    integer duration_ms
    boolean succeeded
    timestamptz created_at
  }

  ROLES ||--o{ USERS : assigns
  USERS o|--o{ DATASETS : creates
  DATASETS ||--o{ DATASET_FIELDS : defines
  DATASETS ||--o{ DATASET_RECORDS : contains
  DATASET_RECORDS ||--o{ RECORD_RELATIONSHIPS : source
  DATASET_RECORDS ||--o{ RECORD_RELATIONSHIPS : target
  DATASET_RECORDS ||--o{ RECORD_HISTORY : changes
  USERS o|--o{ RECORD_HISTORY : authors
  USERS ||--o{ SAVED_VIEWS : owns
  DATASETS ||--o{ SAVED_VIEWS : scopes
  USERS o|--o{ SEARCH_HISTORY : executes
  DATASETS o|--o{ SEARCH_HISTORY : scopes
  USERS ||--o| USER_PREFERENCES : configures
  DATASETS ||--o{ ACCESS_PERMISSIONS : protects
  USERS o|--o{ ACCESS_PERMISSIONS : user_grant
  ROLES o|--o{ ACCESS_PERMISSIONS : role_grant
  USERS o|--o{ QUERY_LOGS : runs
  DATASETS o|--o{ QUERY_LOGS : monitors
```

`ACCESS_PERMISSIONS` has a database check requiring exactly one grantee
(`user_id` or `role_id`). `RECORD_RELATIONSHIPS` rejects self-links and uses a
unique constraint over source, target, and relationship type.
