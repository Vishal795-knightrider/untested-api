const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

const createTask = (overrides = {}) => taskService.create({ title: 'Test task', ...overrides });

describe('taskService', () => {
  test('creates a task with defaults and timestamps', () => {
    const task = createTask();
    expect(task).toMatchObject({ title: 'Test task', description: '', status: 'todo', priority: 'medium', dueDate: null, completedAt: null });
    expect(task.id).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
  });

  test('returns a copy of the task list', () => {
    createTask();
    const all = taskService.getAll();
    all.pop();
    expect(taskService.getAll()).toHaveLength(1);
  });

  test('finds a task by id and returns undefined for an unknown id', () => {
    const task = createTask();
    expect(taskService.findById(task.id)).toEqual(task);
    expect(taskService.findById('missing')).toBeUndefined();
  });

  test('filters by exact status', () => {
    createTask({ status: 'todo' });
    createTask({ status: 'in_progress' });
    expect(taskService.getByStatus('todo')).toHaveLength(1);
    expect(taskService.getByStatus('in')).toHaveLength(0);
  });

  test('returns the first page of results (regression for off-by-one bug)', () => {
    const first = createTask({ title: 'First' });
    createTask({ title: 'Second' });
    createTask({ title: 'Third' });
    expect(taskService.getPaginated(1, 2).map((task) => task.id)).toEqual([first.id, taskService.getAll()[1].id]);
  });

  test('returns an empty page when the requested page is beyond the list', () => {
    createTask();
    expect(taskService.getPaginated(9, 10)).toEqual([]);
  });

  test('returns an empty array when pagination offset is negative or limit is non-positive', () => {
    createTask();
    expect(taskService.getPaginated(-1, 10)).toEqual([]);
    expect(taskService.getPaginated(1, 0)).toEqual([]);
    expect(taskService.getPaginated(1, -2)).toEqual([]);
  });


  test('counts statuses and overdue unfinished tasks', () => {
    createTask({ status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    createTask({ status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
    createTask({ status: 'in_progress' });
    expect(taskService.getStats()).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('updates an existing task and returns null for an unknown id', () => {
    const task = createTask();
    expect(taskService.update(task.id, { title: 'Changed' }).title).toBe('Changed');
    expect(taskService.update('missing', { title: 'Changed' })).toBeNull();
  });

  test('does not allow mutating immutable fields (id, createdAt) via update', () => {
    const task = createTask();
    const originalId = task.id;
    const originalCreatedAt = task.createdAt;

    const updated = taskService.update(originalId, {
      id: 'malicious-id',
      createdAt: '1999-12-31T23:59:59.999Z',
      title: 'Permitted Change',
      unknownField: 'should-be-ignored',
    });

    expect(updated.id).toBe(originalId);
    expect(updated.createdAt).toBe(originalCreatedAt);
    expect(updated.title).toBe('Permitted Change');
    expect(updated.unknownField).toBeUndefined();
    expect(taskService.findById(originalId)).toBeDefined();
    expect(taskService.findById('malicious-id')).toBeUndefined();
  });


  test('removes an existing task and reports missing ids', () => {
    const task = createTask();
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.remove(task.id)).toBe(false);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('completes a task without changing its priority', () => {
    const task = createTask({ priority: 'high' });
    const completed = taskService.completeTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.priority).toBe('high');
    expect(Number.isNaN(Date.parse(completed.completedAt))).toBe(false);
  });

  test('assigns and reassigns a task', () => {
    const task = createTask();
    expect(taskService.assignTask(task.id, 'Asha').assignee).toBe('Asha');
    expect(taskService.assignTask(task.id, 'Ravi').assignee).toBe('Ravi');
    expect(taskService.assignTask('missing', 'Asha')).toBeNull();
  });
});
