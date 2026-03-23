import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/errors.js';

import auth from './routes/auth.js';
import tasks from './routes/tasks.js';
import projects from './routes/projects.js';
import goals from './routes/goals.js';
import journal from './routes/journal.js';
import dayPlans from './routes/day-plans.js';
import weeklyPlans from './routes/weekly-plans.js';
import ideas from './routes/ideas.js';
import thoughts from './routes/thoughts.js';
import wins from './routes/wins.js';
import resources from './routes/resources.js';
import reviews from './routes/reviews.js';
import reminders from './routes/reminders.js';
import finance from './routes/finance.js';
import search from './routes/search.js';
import mutations from './routes/mutations.js';
import triggers from './routes/triggers.js';

const app = new Hono();

// Global middleware
app.use('*', cors());
app.onError(errorHandler);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes under /api/v1
app.route('/api/v1/auth', auth);
app.route('/api/v1/tasks', tasks);
app.route('/api/v1/projects', projects);
app.route('/api/v1/goals', goals);
app.route('/api/v1/journal', journal);
app.route('/api/v1/day-plans', dayPlans);
app.route('/api/v1/weekly-plans', weeklyPlans);
app.route('/api/v1/ideas', ideas);
app.route('/api/v1/thoughts', thoughts);
app.route('/api/v1/wins', wins);
app.route('/api/v1/resources', resources);
app.route('/api/v1/reviews', reviews);
app.route('/api/v1/reminders', reminders);
app.route('/api/v1/finance', finance);
app.route('/api/v1/search', search);
app.route('/api/v1/mutations', mutations);
app.route('/api/v1/triggers', triggers);

export default app;
