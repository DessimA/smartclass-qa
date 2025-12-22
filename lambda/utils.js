function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/[<>]/g, '').substring(0, 1000);
}

module.exports = { isValidEmail, sanitizeText };
