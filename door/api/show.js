/**
 * door/api/show.js - Get door detail
 * Used by Index Node: GET /api/door/show/:name
 */

const { spawn } = require('child_process');
const path = require('path');

const LIB_DIR = path.join(__dirname, '..', 'lib');

/**
 * Get door tasks and metadata
 * @param {string} doorName - Door name
 * @returns {Promise<Object>} Door detail object
 */
async function getDoorDetail(doorName) {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [
      '-c',
      `
        source ${LIB_DIR}/door_data.sh
        source ${LIB_DIR}/door_phase.sh
        source ${LIB_DIR}/door_health.sh

        tasks=$(get_door_tasks "${doorName}")
        if [[ "$tasks" == "[]" || -z "$tasks" ]]; then
          echo '{"error": "Door not found"}'
          exit 1
        fi

        meta=$(get_door_metadata "${doorName}")
        tags=$(echo "$meta" | jq -r '.tags')
        phase=$(get_door_phase "$tags")
        modified=$(echo "$meta" | jq -r '.modified')
        health=$(get_health_status "$modified")

        jq -n \\
          --argjson tasks "$tasks" \\
          --argjson meta "$meta" \\
          --arg phase "$phase" \\
          --arg health "$health" \\
          '{
            name: $meta.name,
            phase: $phase,
            health: $health,
            metadata: $meta,
            tasks: $tasks
          }'
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
        return reject(new Error(`Door fetch failed: ${stderr}`));
      }

      try {
        const detail = JSON.parse(stdout);
        if (detail.error) {
          return reject(new Error(detail.error));
        }
        resolve(detail);
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
  const { name } = req.params;

  if (!name) {
    return res.status(400).json({ error: 'Door name required' });
  }

  try {
    const detail = await getDoorDetail(name);
    res.json(detail);
  } catch (err) {
    console.error(`[door/api/show] Error for ${name}:`, err.message);
    res.status(404).json({ error: err.message });
  }
}

module.exports = { getDoorDetail, handler };
