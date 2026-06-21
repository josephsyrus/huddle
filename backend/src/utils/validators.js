const isValidString = (value, min, max) => {
  if (typeof value !== "string") return false;
  const length = value.trim().length;
  return length >= min && length <= max;
};

const isValidEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const LIMITS = {
  username: { min: 3, max: 30 },
  password: { min: 6, max: 128 },
  workspaceName: { min: 1, max: 50 },
  channelName: { min: 1, max: 50 },
  message: { min: 1, max: 2000 },
};

module.exports = { isValidString, isValidEmail, LIMITS };
