/**
 * Generates a deterministic chat ID for a one-on-one chat between two users.
 * Sorts user IDs to ensure the same ID is generated regardless of who initiates.
 * @param {string} userId1 
 * @param {string} userId2 
 * @returns {string}
 */
const getDeterministicChatId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

module.exports = { getDeterministicChatId };
