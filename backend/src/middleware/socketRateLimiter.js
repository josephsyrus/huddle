// Fixed-window in-memory limiter for realtime socket events, keyed per socket.
const createSocketRateLimiter = ({ points = 30, durationMs = 10000 } = {}) => {
  return (socket) => {
    const now = Date.now();
    const bucket = socket.data.rateBucket;

    if (!bucket || now > bucket.resetAt) {
      socket.data.rateBucket = { count: 1, resetAt: now + durationMs };
      return true;
    }

    bucket.count += 1;
    return bucket.count <= points;
  };
};

module.exports = { createSocketRateLimiter };
