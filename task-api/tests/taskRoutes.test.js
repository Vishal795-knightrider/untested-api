const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

const create = (body = { title: 'Test task' }) => request(app).post('/tasks').send(body);

describe('Task API routes', () => {
  test('GET /tasks returns all tasks', async () => {
    await create();
    const response = await request(app).get('/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  test('GET /tasks?status=todo filters tasks', async () => {
    await create({ title: 'Todo' });
    await create({ title: 'Done', status: 'done' });
    const response = await request(app).get('/tasks?status=todo');
    expect(response.status).toBe(200);
    expect(response.body.map((task) => task.title)).toEqual(['Todo']);
  });

  test('GET /tasks supports page-one pagination', async () => {
    await create({ title: 'One' });
    await create({ title: 'Two' });
    await create({ title: 'Three' });
    const response = await request(app).get('/tasks?page=1&limit=2');
    expect(response.status).toBe(200);
    expect(response.body.map((task) => task.title)).toEqual(['One', 'Two']);
  });

  test('GET /tasks supports page-two pagination', async () => {
    await create({ title: 'One' });
    await create({ title: 'Two' });
    await create({ title: 'Three' });
    const response = await request(app).get('/tasks?page=2&limit=2');
    expect(response.status).toBe(200);
    expect(response.body.map((task) => task.title)).toEqual(['Three']);
  });

  test('GET /tasks rejects page=0 with 400', async () => {
    const response = await request(app).get('/tasks?page=0');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /tasks rejects page=-1 with 400', async () => {
    const response = await request(app).get('/tasks?page=-1');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /tasks rejects limit=0 with 400', async () => {
    const response = await request(app).get('/tasks?limit=0');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /tasks rejects limit=-5 with 400', async () => {
    const response = await request(app).get('/tasks?limit=-5');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /tasks rejects non-numeric page and limit with 400', async () => {
    const resPage = await request(app).get('/tasks?page=abc');
    expect(resPage.status).toBe(400);
    expect(resPage.body).toHaveProperty('error');

    const resLimit = await request(app).get('/tasks?limit=xyz');
    expect(resLimit.status).toBe(400);
    expect(resLimit.body).toHaveProperty('error');
  });

  test('GET /tasks supports combined status filtering and pagination', async () => {
    await create({ title: 'Todo 1', status: 'todo' });
    await create({ title: 'Done 1', status: 'done' });
    await create({ title: 'Todo 2', status: 'todo' });
    await create({ title: 'Todo 3', status: 'todo' });
    const response = await request(app).get('/tasks?status=todo&page=2&limit=2');
    expect(response.status).toBe(200);
    expect(response.body.map((task) => task.title)).toEqual(['Todo 3']);
  });


  test('POST /tasks creates a task', async () => {
    const response = await create({ title: 'New task', priority: 'high' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ title: 'New task', priority: 'high', status: 'todo' });
  });

  test('POST /tasks rejects a missing or blank title', async () => {
    expect((await create({})).status).toBe(400);
    expect((await create({ title: '   ' })).status).toBe(400);
  });

  test('POST /tasks rejects invalid status', async () => {
    const response = await create({ title: 'Invalid Status Task', status: 'pending' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('status must be one of: todo, in_progress, done');
  });

  test('POST /tasks rejects invalid priority', async () => {
    const response = await create({ title: 'Invalid Priority Task', priority: 'urgent' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('priority must be one of: low, medium, high');
  });

  test('POST /tasks rejects invalid dueDate format', async () => {
    const response = await create({ title: 'Invalid Date Task', dueDate: 'not-a-real-date' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('dueDate must be a valid ISO date string');
  });

  test('POST /tasks rejects empty-string dueDate', async () => {
    const response = await create({ title: 'Empty Date Task', dueDate: '' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('dueDate must be a valid ISO date string');
  });

  test('PUT /tasks/:id updates a task', async () => {
    const task = (await create()).body;
    const response = await request(app).put(`/tasks/${task.id}`).send({ title: 'Updated' });
    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated');
  });

  test('PUT /tasks/:id rejects a blank title', async () => {
    const task = (await create()).body;
    const response = await request(app).put(`/tasks/${task.id}`).send({ title: '   ' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('title must be a non-empty string');
  });

  test('PUT /tasks/:id rejects invalid status', async () => {
    const task = (await create()).body;
    const response = await request(app).put(`/tasks/${task.id}`).send({ status: 'completed' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('status must be one of: todo, in_progress, done');
  });

  test('PUT /tasks/:id rejects invalid priority', async () => {
    const task = (await create()).body;
    const response = await request(app).put(`/tasks/${task.id}`).send({ priority: 'critical' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('priority must be one of: low, medium, high');
  });

  test('PUT /tasks/:id rejects invalid dueDate format', async () => {
    const task = (await create()).body;
    const response = await request(app).put(`/tasks/${task.id}`).send({ dueDate: 'yesterday' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('dueDate must be a valid ISO date string');
  });

  test('PUT /tasks/:id rejects empty-string dueDate', async () => {
    const task = (await create()).body;
    const response = await request(app).put(`/tasks/${task.id}`).send({ dueDate: '' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('dueDate must be a valid ISO date string');
  });

  test('PUT /tasks/:id updates permitted fields (description, status, priority, dueDate)', async () => {
    const task = (await create()).body;
    const updatePayload = {
      title: 'Valid Update',
      description: 'New Description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    };
    const response = await request(app).put(`/tasks/${task.id}`).send(updatePayload);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(updatePayload);
  });

  test('PUT /tasks/:id cannot modify immutable fields (id, createdAt)', async () => {
    const task = (await create()).body;
    const originalId = task.id;
    const originalCreatedAt = task.createdAt;

    const response = await request(app).put(`/tasks/${originalId}`).send({
      id: 'hacked-id-1234',
      createdAt: '2000-01-01T00:00:00.000Z',
      title: 'Attempted ID Mutation',
    });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(originalId);
    expect(response.body.createdAt).toBe(originalCreatedAt);
    expect(response.body.title).toBe('Attempted ID Mutation');

    const checkOriginal = await request(app).put(`/tasks/${originalId}`).send({ title: 'Still Accessible' });
    expect(checkOriginal.status).toBe(200);
    const checkHacked = await request(app).put('/tasks/hacked-id-1234').send({ title: 'Should Not Exist' });
    expect(checkHacked.status).toBe(404);
  });

  test('PUT /tasks/:id returns 404 for a missing task', async () => {
    expect((await request(app).put('/tasks/missing').send({ title: 'Updated' })).status).toBe(404);
  });

  test('DELETE /tasks/:id deletes a task', async () => {
    const task = (await create()).body;
    expect((await request(app).delete(`/tasks/${task.id}`)).status).toBe(204);
    expect((await request(app).get('/tasks')).body).toHaveLength(0);
  });

  test('DELETE /tasks/:id returns 404 for a missing task', async () => {
    expect((await request(app).delete('/tasks/missing')).status).toBe(404);
  });

  test('PATCH /tasks/:id/complete marks a task done', async () => {
    const task = (await create()).body;
    const response = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('done');
    expect(response.body.completedAt).toEqual(expect.any(String));
  });

  test('PATCH /tasks/:id/complete returns 404 for a missing task', async () => {
    expect((await request(app).patch('/tasks/missing/complete')).status).toBe(404);
  });

  test('GET /tasks/stats returns status and overdue counts', async () => {
    await create({ title: 'Overdue', dueDate: '2000-01-01T00:00:00.000Z' });
    const response = await request(app).get('/tasks/stats');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ todo: 1, in_progress: 0, done: 0, overdue: 1 });
  });

  test('PATCH /tasks/:id/assign assigns a task and supports reassignment', async () => {
    const task = (await create()).body;
    const assigned = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: ' Asha ' });
    expect(assigned.status).toBe(200);
    expect(assigned.body.assignee).toBe('Asha');
    const reassigned = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Ravi' });
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.assignee).toBe('Ravi');
  });

  test('PATCH /tasks/:id/assign rejects blank or non-string assignees', async () => {
    const task = (await create()).body;
    expect((await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '' })).status).toBe(400);
    expect((await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 42 })).status).toBe(400);
    expect((await request(app).patch(`/tasks/${task.id}/assign`).send({})).status).toBe(400);
  });

  test('PATCH /tasks/:id/assign returns 404 for a missing task', async () => {
    expect((await request(app).patch('/tasks/missing/assign').send({ assignee: 'Asha' })).status).toBe(404);
  });
});
