/**
 * PocketBase Client for Hooks
 * Uses native fetch for speed (no external dependencies)
 */

const POCKETBASE_URL = process.env.POCKETBASE_URL;
const POCKETBASE_EMAIL = process.env.POCKETBASE_EMAIL;
const POCKETBASE_PASSWORD = process.env.POCKETBASE_PASSWORD;

let authToken = null;

/**
 * Authenticate with PocketBase admin
 */
async function authenticate() {
  if (authToken) return authToken;

  const response = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: POCKETBASE_EMAIL,
      password: POCKETBASE_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  authToken = data.token;
  return authToken;
}

/**
 * Create a record in a collection
 */
async function createRecord(collection, data) {
  const token = await authenticate();

  const response = await fetch(`${POCKETBASE_URL}/api/collections/${collection}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Create failed: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Update a record in a collection
 */
async function updateRecord(collection, id, data) {
  const token = await authenticate();

  const response = await fetch(`${POCKETBASE_URL}/api/collections/${collection}/records/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Update failed: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get records from a collection with optional filter
 */
async function getRecords(collection, options = {}) {
  const token = await authenticate();

  const params = new URLSearchParams();
  if (options.filter) params.set('filter', options.filter);
  if (options.sort) params.set('sort', options.sort);
  if (options.perPage) params.set('perPage', options.perPage.toString());

  const url = `${POCKETBASE_URL}/api/collections/${collection}/records?${params}`;

  const response = await fetch(url, {
    headers: { 'Authorization': token },
  });

  if (!response.ok) {
    throw new Error(`Get failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get a single record by ID
 */
async function getRecord(collection, id) {
  const token = await authenticate();

  const response = await fetch(`${POCKETBASE_URL}/api/collections/${collection}/records/${id}`, {
    headers: { 'Authorization': token },
  });

  if (!response.ok) {
    throw new Error(`Get record failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Read stdin as JSON
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        resolve({});
      }
    });
    process.stdin.on('error', reject);

    // Timeout after 5 seconds
    setTimeout(() => resolve({}), 5000);
  });
}

/**
 * Log to stderr (doesn't affect hook output)
 */
function log(...args) {
  console.error('[pocket-mcp]', ...args);
}

/**
 * Get project name from cwd
 */
function getProjectName(cwd) {
  if (!cwd) return 'unknown';
  const parts = cwd.split('/');
  return parts[parts.length - 1] || 'unknown';
}

module.exports = {
  authenticate,
  createRecord,
  updateRecord,
  getRecords,
  getRecord,
  readStdin,
  log,
  getProjectName,
  POCKETBASE_URL,
};
