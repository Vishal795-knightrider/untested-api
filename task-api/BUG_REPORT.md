# Bug Report — Task Manager API

## 1. Pagination skips the first page
- **Expected:** `page=1&limit=10` should return the first ten tasks (index 0 to 9).
- **Actual:** The service originally calculated the offset as `page * limit`, causing page 1 to start at index 10 and skipping the first page of tasks.
- **Discovery:** Test created 3 tasks and requested `?page=1&limit=2`; the initial implementation returned only the 3rd task.
- **Fix:** Calculated the zero-based offset with `(page - 1) * limit`.
- **Status:** Fixed.
- **Test Evidence:** `tests/taskRoutes.test.js` (`GET /tasks supports page-one pagination`).

## 2. Status filtering uses partial matching
- **Expected:** A status filter query should match the requested status exactly.
- **Actual:** The service originally used `status.includes(query)`, matching substring values such as `in` matching `in_progress`.
- **Discovery:** Test created a task with status `in_progress` and queried `?status=in`; the query returned the task.
- **Fix:** Enforced strict equality (`t.status === status`).
- **Status:** Fixed.
- **Test Evidence:** `tests/taskService.test.js` (`filters by exact status`).

## 3. Completing a task unexpectedly overwrites priority
- **Expected:** Completing a task (`PATCH /tasks/:id/complete`) should update `status` to `done` and record `completedAt` while preserving all existing task properties.
- **Actual:** `completeTask()` originally overwrote `priority` with `'medium'`.
- **Discovery:** Test completed a `high` priority task and found its priority mutated to `medium`.
- **Fix:** Preserved existing properties with object spread (`...task, status: 'done', completedAt: ...`).
- **Status:** Fixed.
- **Test Evidence:** `tests/taskService.test.js` (`completes a task without changing its priority`).

## 4. Unvalidated pagination queries & non-composable filtering
- **Expected:** 
  1. `page` and `limit` should be strictly positive integers (`>= 1`). Non-numeric, zero, or negative values must be rejected with HTTP 400 Bad Request.
  2. Status filtering and pagination should compose (e.g. `GET /tasks?status=todo&page=2&limit=2` returns the 2nd page of `todo` tasks).
- **Actual:** 
  1. The route originally used `parseInt(x) || default`. Negative values like `page=-1` or `limit=-2` caused negative array slicing in `Array.prototype.slice`, returning arbitrary slices from the end of the list. Zero values (`page=0`, `limit=0`) silently fell back to defaults with HTTP 200.
  2. An early `if (status) return res.json(...)` return completely ignored `page` and `limit` when status was supplied.
- **Discovery:** Integration tests sending `page=0`, `page=-1`, `limit=0`, `limit=-5`, and combined `status=todo&page=2&limit=2` failed with HTTP 200 and unpaginated arrays.
- **Fix:** 
  - Added strict integer validation in `src/routes/tasks.js` using `Number.isInteger()` and `num >= 1`, rejecting invalid inputs with HTTP 400.
  - Composed filtering and pagination: filter by status first, then slice via `taskService.getPaginated(pageNum, limitNum, filteredTasks)`.
  - Added boundary guard in `taskService.getPaginated` returning `[]` if `offset < 0` or `limit <= 0`.
- **Status:** Fixed.
- **Test Evidence:** `tests/taskRoutes.test.js` (`rejects page=0`, `rejects page=-1`, `rejects limit=0`, `rejects limit=-5`, `rejects non-numeric`, `supports combined status filtering and pagination`).

## 5. Mass assignment & mutation of immutable fields in `PUT /tasks/:id`
- **Expected:** A task's primary key (`id`) and creation timestamp (`createdAt`) must be immutable. Clients should not be able to alter them or inject arbitrary unknown properties.
- **Actual:** `taskService.update(id, fields)` blindly spread `fields` into the stored task object (`{ ...tasks[index], ...fields }`). A PUT request sending `{ id: 'new-id', createdAt: '...', injected: true }` permanently mutated the stored entity's ID and timestamps.
- **Discovery:** Integration test attempted to mutate `id` and `createdAt` via `PUT`; the stored task adopted the new ID, breaking subsequent route lookups.
- **Fix:** Implemented an explicit field whitelist in `taskService.update()` allowing only `title`, `description`, `status`, `priority`, and `dueDate`.
- **Status:** Fixed.
- **Test Evidence:** `tests/taskRoutes.test.js` (`PUT /tasks/:id cannot modify immutable fields (id, createdAt)`) and `tests/taskService.test.js` (`does not allow mutating immutable fields`).

## 6. Empty-string `dueDate: ""` bypassed validation
- **Expected:** If `dueDate` is provided, it must be `null` or a valid ISO date string. An empty string `""` or whitespace must be rejected with HTTP 400.
- **Actual:** `validators.js` used truthiness checks `if (body.dueDate && isNaN(Date.parse(body.dueDate)))`. Because `""` is falsy, empty strings bypassed validation, saving tasks with `dueDate: ""` and causing `Invalid Date` calculations in `getStats()`.
- **Discovery:** Integration test submitting `dueDate: ""` returned HTTP 201 on creation and HTTP 200 on update.
- **Fix:** Updated `validateCreateTask` and `validateUpdateTask` to verify that if `dueDate !== undefined && dueDate !== null`, it must be a non-empty string that successfully parses via `Date.parse()`.
- **Status:** Fixed.
- **Test Evidence:** `tests/taskRoutes.test.js` (`POST /tasks rejects empty-string dueDate` and `PUT /tasks/:id rejects empty-string dueDate`).
