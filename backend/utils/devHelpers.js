/**
 * Development helper utilities
 */

/**
 * Adds an artificial delay in development mode to simulate network latency
 * Useful for testing loading states and spinners
 * @param {number} ms - Milliseconds to delay (default: 1000ms)
 */
export const devDelay = async (ms = 1000) => {
  if (process.env.NODE_ENV === 'development') {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
};
