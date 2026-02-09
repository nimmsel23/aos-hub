/**
 * door/api/health.js - Get door health status
 * Used by Index Node: GET /api/door/health
 */

const { spawn } = require('child_process');
const path = require('path');

const LIB_DIR = path.join(__dirname, '..', 'lib');

/**
 * Get health status for all doors
 * @returns {Promise<Array>} Array of door health objects
 */
async function getDoorHealth() {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [
      '-c',
      `
        source ${LIB_DIR}/door_data.sh
        source ${LIB_DIR}/door_health.sh

        doors=$(get_doors)
        echo "$doors" | jq -r '.[] | @json' | while IFS= read -r door; do
          name=$(echo "$door" | jq -r '.name')
          modified=$(echo "$door" | jq -r '.modified')
          health=$(get_health_status "$modified")
          activity=$(time_ago "$modified")
          days=$(days_since_activity "$modified")

          jq -n \\
            --arg name "$name" \\
            --arg health "$health" \\
            --arg activity "$activity" \\
            --arg days "$days" \\
            '{name: $name, health: $health, activity: $activity, days: ($days | tonumber)}'
        done | jq -s '.'
      `,
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
        return reject(new Error(`Health fetch failed: ${stderr}`));
      }

      try {
        const health = JSON.parse(stdout || '[]');
        resolve(health);
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
    const health = await getDoorHealth();
    res.json(health);
  } catch (err) {
    console.error('[door/api/health] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getDoorHealth, handler };
