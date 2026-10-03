# Submission Notes

If I had more time, I would focus on improving a few areas of the project. First, I would replace the in-memory storage with a database like PostgreSQL or SQLite so that tasks are not lost when the server restarts. I would also improve pagination by returning useful information such as the total number of tasks and pages. Apart from that, I would add a validation library like Zod and write more tests for malformed JSON and situations where multiple requests update data at the same time.

One thing I found interesting while working on this assignment was how small mistakes could lead to unexpected bugs. For example, the pagination calculation was incorrect, completing a task changed its priority to medium, and the PUT endpoint allowed changes to fields like the task ID that should have remained unchanged. I also found an issue where an empty `dueDate` string passed validation because JavaScript treats empty strings as falsy values. These cases showed me why testing edge cases is just as important as testing normal functionality.

Before using this API in production, I would want to clarify a few things:

1. **Database and concurrency:** Should we move to a proper database with transactions to prevent data loss and handle multiple updates safely?

2. **Pagination:** Should the API return additional pagination details, such as total tasks and total pages? Should we also set a maximum page limit?

3. **Task assignment:** Should users be allowed to unassign tasks? Should assignments be linked to actual user IDs? Can completed tasks be reassigned?

4. **Date and timezone handling:** How should overdue tasks be calculated when users are in different timezones? Should we use UTC or the user's local date and time?