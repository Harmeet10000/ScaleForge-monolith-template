import { redisClient } from '../../connections/connectRedis.js';
import { logger } from '../../utils/logger.js';

const serialize = (value) => (typeof value === 'object' ? JSON.stringify(value) : value);

const serializeHash = (data) => {
  const serialized = {};
  for (const [k, v] of Object.entries(data)) {
    serialized[k] = serialize(v);
  }
  return serialized;
};

const addOperation = (pipeline, operations, command, key, extra = '') => {
  operations.push(`${command} ${key}${extra}`);
  return { pipeline, operations };
};

export const pipelineSet = (key, value, expireSeconds) => (state) => {
  state.pipeline.set(key, serialize(value));
  if (expireSeconds) {
    state.pipeline.expire(key, expireSeconds);
  }
  return addOperation(state.pipeline, state.operations, 'SET', key);
};

export const pipelineGet = (key) => (state) => {
  state.pipeline.get(key);
  return addOperation(state.pipeline, state.operations, 'GET', key);
};

export const pipelineHset = (key, data, expireSeconds) => (state) => {
  state.pipeline.hset(key, serializeHash(data));
  if (expireSeconds) {
    state.pipeline.expire(key, expireSeconds);
  }
  return addOperation(state.pipeline, state.operations, 'HSET', key);
};

export const pipelineHget = (key, field) => (state) => {
  state.pipeline.hget(key, field);
  return addOperation(state.pipeline, state.operations, 'HGET', key, ` ${field}`);
};

export const pipelineHgetall = (key) => (state) => {
  state.pipeline.hgetall(key);
  return addOperation(state.pipeline, state.operations, 'HGETALL', key);
};

export const pipelineDel =
  (...keys) =>
  (state) => {
    state.pipeline.del(...keys);
    return addOperation(state.pipeline, state.operations, 'DEL', keys.join(', '));
  };

export const executePipeline = async (operations) => {
  const state = {
    pipeline: redisClient.pipeline(),
    operations: []
  };

  const finalState = operations.reduce((acc, op) => op(acc), state);

  const results = await finalState.pipeline.exec();
  logger.info(`Pipeline executed: ${finalState.operations.length} operations`, {
    meta: { operations: finalState.operations }
  });

  return results.map(([err, result]) => {
    if (err) {
      throw err;
    }
    return result;
  });
};

export const createPipeline = (...operations) => executePipeline(operations);
