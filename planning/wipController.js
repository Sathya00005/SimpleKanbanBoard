const db = require('../db'); 

exports.logTime = async (req, res) => {
  const { taskId } = req.params;
  const { date, hours, description } = req.body;

  try {
    if (hours < 0) {
      return res.status(400).json({ error: 'Time cannot be negative' });
    }

    // Begin transaction to ensure data integrity
    await db.query('BEGIN');

    await db.query(
      'INSERT INTO time_logs (task_id, log_date, hours_spent, description) VALUES (?, ?, ?, ?)',
      [taskId, date, hours, description]
    );

    await db.query(
      'INSERT INTO task_history (task_id, event_type, details) VALUES (?, ?, ?)',
      [taskId, 'TIME_LOGGED', `Logged ${hours} hours on ${date}. Notes: ${description}`]
    );

    await db.query('COMMIT');
    res.status(201).json({ message: 'Time logged successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Server error while logging time' });
  }
};

exports.updateStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  try {
    await db.query('BEGIN');
    await db.query('UPDATE tasks SET work_status = ? WHERE task_id = ?', [status, taskId]);
    await db.query(
      'INSERT INTO task_history (task_id, event_type, details) VALUES (?, ?, ?)',
      [taskId, 'STATUS_UPDATED', `Work status changed to ${status}`]
    );
    await db.query('COMMIT');
    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Server error while updating status' });
  }
};