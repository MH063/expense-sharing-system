const crypto = require('crypto');

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const table = Object.fromEntries([...alphabet].map((c, i) => [c, i]));
  let bits = 0;
  let value = 0;
  const output = [];
  const clean = str.toUpperCase().replace(/=+$/, '');
  for (let i = 0; i < clean.length; i++) {
    const idx = table[clean[i]];
    if (idx === undefined) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateSecret(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  return base32Encode(buf);
}

function leftPad(num, size) {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

function totpGenerate(secretBase32, { period = 30, digits = 6, algorithm = 'sha1' } = {}) {
  const counter = Math.floor(Date.now() / 1000 / period);
  return hotp(secretBase32, counter, { digits, algorithm });
}

function hotp(secretBase32, counter, { digits = 6, algorithm = 'sha1' } = {}) {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buf[i] = counter & 0xff;
    counter = counter >>> 8;
  }
  const hmac = crypto.createHmac(algorithm, key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
  const otp = code % (10 ** digits);
  return leftPad(otp, digits);
}

function totpVerify(token, secretBase32, { period = 30, digits = 6, algorithm = 'sha1', window = 1 } = {}) {
  const time = Math.floor(Date.now() / 1000);
  for (let w = -window; w <= window; w++) {
    const counter = Math.floor(time / period) + w;
    const expected = hotp(secretBase32, counter, { digits, algorithm });
    if (expected === token) return true;
  }
  return false;
}

function buildOtpAuthURL({ secret, label, issuer, algorithm = 'SHA1', digits = 6, period = 30 }) {
  const params = new URLSearchParams({ secret, issuer, algorithm, digits: String(digits), period: String(period) });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params.toString()}`;
}

module.exports = { generateSecret, totpGenerate, totpVerify, buildOtpAuthURL };
