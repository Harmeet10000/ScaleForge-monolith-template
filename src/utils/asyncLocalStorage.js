import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Runs a function within a new asynchronous context.
 * @param {object} context - The context to set.
 * @param {function} fn - The function to run.
 * @returns {*} - The result of the function.
 */
export const runWithContext = (context, fn) => {
  asyncLocalStorage.run(context, fn);
};

/**
 * Returns the current asynchronous context.
 * @returns {object} - The current context.
 */
export const getContext = () => {
  asyncLocalStorage.getStore();
};

/**
 * Returns the correlation ID from the current context.
 * @returns {string|undefined} - The correlation ID.
 */
export const getCorrelationId = () => {
  const context = getContext();
  return context?.correlationId;
};

/**
 * Returns the user object from the current context.
 * @returns {object|undefined} - The user object.
 */
export const getUser = () => {
  const context = getContext();
  return context?.user;
};
