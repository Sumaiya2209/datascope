# DataScope API

The application exposes same-origin JSON REST endpoints through Next.js route
handlers. Protected requests use the Auth.js/NextAuth session cookie. API
authorization is performed on the server and is not inferred from client Redux
state.

## Conventions

- IDs in path parameters are UUIDs unless otherwise stated.
- JSON request bodies use `Content-Type: application/json`.
- Search request values, filters, sorts, preferences, and saved-view
  configurations are validated with Zod.
- Common error shape:

  ```json
  {
    "error": "A human-readable message.",
    "code": "FORBIDDEN"
  }
  ```

  Some validation errors also include `details` or `fields`. Typical status
  codes are `400` for malformed/invalid input, `401` for no valid session,
  `403` for insufficient permission, `404` for a missing or inaccessible
  resource, `409` for conflicts, and `500` for unexpected server errors.

- Admin routes require the `admin` role. Dataset routes require an authenticated
  user and the applicable dataset grant; admins bypass dataset grants.

## Route catalog

| Method   | Path                                                         | Purpose                                        | Access                                      |
| -------- | ------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------- |
| `GET`    | `/api/auth/[...nextauth]`                                    | Auth.js session/auth handler                   | Auth.js                                     |
| `POST`   | `/api/auth/[...nextauth]`                                    | Credentials sign-in and Auth.js actions        | Auth.js                                     |
| `POST`   | `/api/register`                                              | Register a Viewer account                      | Public; new users receive Viewer role       |
| `GET`    | `/api/datasets`                                              | List datasets visible to the current user      | Signed in                                   |
| `GET`    | `/api/datasets/{datasetId}`                                  | Dataset metadata and ordered field definitions | Dataset `view`                              |
| `GET`    | `/api/datasets/{datasetId}/records`                          | Search records using query parameters          | Dataset `view`                              |
| `POST`   | `/api/datasets/{datasetId}/records`                          | Search records using a JSON body               | Dataset `view`                              |
| `GET`    | `/api/datasets/{datasetId}/records/{recordId}`               | Fetch one record                               | Dataset `view`                              |
| `GET`    | `/api/datasets/{datasetId}/records/{recordId}/relationships` | Fetch incoming/outgoing related records        | Dataset `view`                              |
| `GET`    | `/api/datasets/{datasetId}/records/{recordId}/history`       | Fetch a page of record change history          | Dataset `view`                              |
| `GET`    | `/api/datasets/{datasetId}/saved-views`                      | List owned and shared views                    | Dataset `view`                              |
| `POST`   | `/api/datasets/{datasetId}/saved-views`                      | Create a saved view                            | Dataset `edit`                              |
| `PATCH`  | `/api/datasets/{datasetId}/saved-views/{viewId}`             | Edit a view                                    | Owner with dataset edit, or dataset manager |
| `DELETE` | `/api/datasets/{datasetId}/saved-views/{viewId}`             | Delete a view                                  | Owner with dataset edit, or dataset manager |
| `GET`    | `/api/search-history`                                        | Read current user's recent history             | Signed in; accessible datasets only         |
| `GET`    | `/api/datasets/{datasetId}/analytics`                        | Return dataset aggregates                      | Dataset `view`                              |
| `GET`    | `/api/user/preferences`                                      | Read current user's preferences                | Signed in                                   |
| `PUT`    | `/api/user/preferences`                                      | Replace current user's preferences             | Signed in                                   |
| `GET`    | `/api/admin/datasets`                                        | List datasets and role grants                  | Admin                                       |
| `POST`   | `/api/admin/datasets`                                        | Create dataset metadata and grants             | Admin                                       |
| `PATCH`  | `/api/admin/datasets/{datasetId}`                            | Update dataset metadata and/or grants          | Admin                                       |
| `DELETE` | `/api/admin/datasets/{datasetId}`                            | Delete a dataset                               | Admin                                       |
| `GET`    | `/api/admin/users`                                           | List users                                     | Admin                                       |
| `PATCH`  | `/api/admin/users/{userId}`                                  | Change a user's role                           | Admin                                       |

Auth.js handles sign-in and sign-out actions, including session/provider/CSRF
endpoints under `/api/auth/*`. The UI uses the Auth.js client helper rather
than hand-constructing session tokens:

```ts
await signIn("credentials", {
  email,
  password,
  redirect: false,
  redirectTo: "/overview",
});
```

## Record search

`GET` accepts `search`, `conditions`, `sort`, `page`, and `pageSize` query
parameters. For GET requests, `conditions` and `sort` are JSON-encoded strings.
`POST` accepts the same values as a JSON object:

```json
{
  "search": "Taylor Reed",
  "conditions": [
    { "field": "status", "operator": "eq", "value": "Active" },
    { "field": "country", "operator": "eq", "value": "Germany" },
    { "field": "revenue", "operator": "gt", "value": 10000 },
    {
      "field": "created_at",
      "operator": "gte",
      "value": "2026-01-01T00:00:00.000Z"
    }
  ],
  "sort": [
    { "field": "revenue", "direction": "desc" },
    { "field": "created_at", "direction": "asc" }
  ],
  "page": 1,
  "pageSize": 25
}
```

### Search constraints

- `search`: optional string, trimmed, maximum 256 characters.
- `conditions`: maximum 25 conditions.
- `field`: one of `status`, `country`, `category`, `revenue`, `created_at`,
  `name`, or `email`.
- `operator`: `eq`, `contains`, `gt`, `gte`, `lt`, `lte`, `between`, or `in`.
  `contains` is text-only; range operators are numeric/date-only; `between`
  requires exactly two values; `in` requires an array.
- `sort`: maximum five unique fields, each with `asc` or `desc` direction.
- `page`: 1-based positive integer, default `1`.
- `pageSize`: positive integer from `1` to `100`, default `25`.
- Numeric comparisons use `revenue`; date comparisons use `created_at`.
  Date values must be ISO dates or offset-bearing ISO datetimes.
- Unknown keys, fields, operators, duplicate sort fields, and incompatible
  value types are rejected.

Conditions are combined with `AND`. SQL values are parameterized. If both
`search` and `conditions` are empty, the API returns an empty result without
scanning the dataset.

Successful non-empty searches return a page and save a search-history entry:

```json
{
  "records": [
    {
      "id": "record-uuid",
      "status": "Active",
      "country": "Germany",
      "category": "Technology",
      "revenue": "15000.00",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "name": "Taylor Reed",
      "email": "taylor.reed@example.test",
      "extra": {}
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 1,
  "hasMore": false
}
```

`total` is the filtered result count. `hasMore` is determined by fetching one
additional row beyond the requested page size. Invalid UUIDs or search
configurations return `400`; authorization failures return `401`/`403`, and
missing datasets return `404`.

## Saved views and history

Create a view with `POST /api/datasets/{datasetId}/saved-views`:

```json
{
  "name": "Active German accounts",
  "description": "Active accounts above the revenue threshold",
  "configuration": {
    "search": "",
    "conditions": [
      { "field": "status", "operator": "eq", "value": "Active" },
      { "field": "country", "operator": "eq", "value": "Germany" }
    ],
    "sort": [{ "field": "revenue", "direction": "desc" }],
    "page": 1,
    "pageSize": 50,
    "visibleColumns": ["status", "country", "revenue", "name"]
  },
  "isShared": true
}
```

The configuration also supports `pageSize`, `page`, and up to 100 unique
`visibleColumns`. `PATCH` accepts any non-empty subset of `name`, `description`,
`configuration`, and `isShared`. Duplicate owner/dataset view names return
`409`. Shared views are visible to users who can view the dataset; the owner
or a dataset manager controls edits and deletion.

`GET /api/search-history?limit=50` returns the signed-in user's most recent
searches for accessible datasets. `limit` must be between 1 and 50; it defaults
to 50. Search-history writes are performed by successful non-empty record
searches.

## Other request shapes

### Registration

`POST /api/register`

```json
{
  "name": "Sam Example",
  "email": "sam@example.test",
  "password": "at-least-12-characters"
}
```

The name must be 2–200 characters. Email is normalized to lowercase. Password
must be at least 12 characters and no more than 72 UTF-8 bytes. Success returns
`201` with `{ "user": { "id", "email", "name", "role": "viewer" } }`.
Duplicate email returns `409`.

### Admin dataset creation/update

`POST /api/admin/datasets` accepts `name` (required), optional `description`,
`category`, `dataSource`, and optional role grants:

```json
{
  "name": "Customer accounts",
  "description": "Managed customer records",
  "category": "Customers",
  "dataSource": "CRM",
  "permissions": {
    "analyst": "edit",
    "viewer": "view"
  }
}
```

Analyst grants may be `view`, `edit`, or `null`; Viewer grants may be `view` or
`null`. `PATCH /api/admin/datasets/{datasetId}` accepts a non-empty subset of
the same properties. Deleting a dataset cascades to its dependent fields and
records.

### User role update

`PATCH /api/admin/users/{userId}` accepts `{ "role": "admin" | "analyst" | "viewer" }`.
An administrator cannot demote their own account, and the last administrator
cannot be demoted; both cases return `409`.

### User preferences

`PUT /api/user/preferences` accepts:

```json
{
  "theme": "system",
  "defaultPageSize": 50,
  "defaultColumns": ["status", "country", "revenue", "name"]
}
```

Themes are `light`, `dark`, or `system`; page sizes are `25`, `50`, or `100`;
default columns must be unique identifiers.

## Detail and analytics responses

- `GET /api/datasets/{datasetId}/records/{recordId}` returns
  `{ "record": { ... } }`.
- `GET .../{recordId}/relationships` returns
  `{ "relationships": [{ "id", "relationshipType", "record", "direction" }] }`;
  direction is `incoming` or `outgoing`.
- `GET .../{recordId}/history?page=1` returns `{ "history", "page", "pageSize",
"hasMore" }`. History pages contain 50 items.
- `GET /api/datasets/{datasetId}/analytics` returns
  `recordCount`, `revenueTotal`, `categoryBreakdown`, `statusBreakdown`,
  `countryBreakdown`, `monthlyGrowth`, `searchActivity`, and `mostUsedFilters`.
  Analytics use database aggregations and are cached for 60 seconds on the
  server.

Record detail, related records, history, and analytics routes all verify
dataset access. The current record detail routes are read-only.
