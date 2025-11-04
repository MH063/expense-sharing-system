const http = require('http');
const { totpGenerate } = require('../utils/totp');

const HOST = 'localhost';
const PORT = 4000;
const SECRET = process.env.API_SIGNING_SECRET || 'dev_sgn_2a9b5c6e1d8f7a0b4c3e2f9a1d6c3f0d';

function sign({ method, path, query = '', bodyObj = {} }) {
  const ts = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(bodyObj);
  const payload = `${method.toUpperCase()}\n${path}\n${query}\n${body}\n${ts}`;
  const crypto = require('crypto');
  const hex = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return { ts, sig: `v1=${hex}`, body };
}

function request({ method, path, query = '', bodyObj = {}, token }) {
  return new Promise((resolve, reject) => {
    const { ts, sig, body } = sign({ method, path, query, bodyObj });
    const options = {
      hostname: HOST,
      port: PORT,
      path: query ? `${path}?${query}` : path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Timestamp': ts,
        'X-Signature': sig,
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ statusCode: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const username = 'test_user_security';
  const email = 'test_user_security@example.com';
  const password = 'Aa1!aaaa';

  console.log('1) GET /health');
  console.log(await request({ method: 'GET', path: '/health', bodyObj: {} }));

  console.log('2) GET /metrics');
  console.log(await request({ method: 'GET', path: '/metrics', bodyObj: {} }));

  console.log('3) POST /api/auth/register');
  let r = await request({ method: 'POST', path: '/api/auth/register', bodyObj: { username, password, email } });
  if (r.statusCode === 409) console.log('User exists, continue.'); else console.log(r);

  console.log('4) POST /api/auth/login (wrong password)');
  for (let i = 0; i < 3; i++) {
    const wrong = await request({ method: 'POST', path: '/api/auth/login', bodyObj: { username, password: 'Wrong1!' } });
    console.log(`Attempt ${i+1}`, wrong.statusCode);
  }

  console.log('5) POST /api/auth/login (correct)');
  r = await request({ method: 'POST', path: '/api/auth/login', bodyObj: { username, password } });
  console.log(r.statusCode);
  if (r.statusCode !== 200) { console.error('Login failed'); process.exit(1); }
  const token = r.body.data.token;

  console.log('6) POST /api/mfa/setup');
  const setup = await request({ method: 'POST', path: '/api/mfa/setup', bodyObj: {}, token });
  console.log(setup.statusCode);
  if (setup.statusCode !== 200) { console.error('MFA setup failed'); process.exit(1); }
  const secret = setup.body.data.secret;

  const code = totpGenerate(secret);
  console.log('7) POST /api/mfa/verify');
  const verify = await request({ method: 'POST', path: '/api/mfa/verify', bodyObj: { code }, token });
  console.log(verify.statusCode);

  console.log('8) POST /api/auth/login with mfa_code');
  const login2 = await request({ method: 'POST', path: '/api/auth/login', bodyObj: { username, password, mfa_code: totpGenerate(secret) } });
  console.log(login2.statusCode);

  console.log('9) GET /metrics (after actions)');
  console.log(await request({ method: 'GET', path: '/metrics', bodyObj: {} }));

  console.log('All done.');
})().catch(err => { console.error(err); process.exit(1); });
