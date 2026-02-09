/**
 * door/api/list.js - Get all doors
 * Used by Index Node: GET /api/door/list
 */

const { spawn } = require('child_process');
const path = require('path');

const LIB_DIR = path.join(__dirname, '..', 'lib');

/**
 * Get all doors from Taskwarrior
 * @returns {Promise<Array>} Array of door objects
 */
async function getDoors() {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [
      '-c',
      `source ${LIB_DIR}/door_data.sh && get_doors`,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Door fetch failed: ${stderr}`));
      }

      try {
        const doors = JSON.parse(stdout || '[]');
        resolve(doors);
      } catch (err) {
        reject(new Error(`JSON parse failed: ${err.message}`));
      }
    });
  });
}

/**
 * Express route handler
 */
async function handler(req, res) {
  try {
    const doors = await getDoors();
    res.json(doors);
  } catch (err) {
    console.error('[door/api/list] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getDoors, handler };
