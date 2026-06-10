const db = require('../db');

exports.logTestResults = async (req, res) => {
  const { taskId } = req.params;
  const { results } = req.body;

  try {
    await db.query('BEGIN');
    
    let allPassed = true;

    for (const result of results) {
      await db.query(
        'INSERT INTO test_results (task_id, test_case, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
        [taskId, result.name, result.startTime, result.endTime, result.status]
      );
      if (result.status === 'Failed') {
        allPassed = false;
      }
    }

    if (!allPassed) {
      // Automatic reverse flow logic
      await db.query('UPDATE tasks SET status = ?, work_status = ? WHERE id = ?', ['Backlog', 'Pending', taskId]);
      await db.query(
        'INSERT INTO task_history (task_id, event_type, details) VALUES (?, ?, ?)',
        [taskId, 'TEST_FAILED', 'Task failed testing and was automatically moved back to Backlog.']
      );
      res.status(201).json({ message: 'Tests failed. Task automatically moved to Backlog.' });
    } else {
      res.status(201).json({ message: 'All tests passed. Task is ready for Deployment.' });
    }

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Server error while logging test results' });
  }
};