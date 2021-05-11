const { promisify } = require('util')
const redis = require('redis')
const TOTAL_RETRY_TIME = 10 * 1000
const DEFAULT_CONNECT_TIMEOUT = 3000

function createRedisClient(options) {
  const defaultOptions = {
    retry_strategy: function(opts) {
      if (opts.error && opts.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error and flush all commands with
        // a individual error
        return new Error('The server refused the connection')
      }
      if (opts.total_retry_time > TOTAL_RETRY_TIME) {
        // End reconnecting after a specific timeout and flush all commands
        // with a individual error
        return new Error('Retry time exhausted')
      }
      if (opts.attempt > 3) {
        // End reconnecting with built in error
        return undefined
      }
      // reconnect after
      return Math.min(options.attempt * 100, DEFAULT_CONNECT_TIMEOUT)
    },
    connect_timeout: DEFAULT_CONNECT_TIMEOUT
  }

  return redis.createClient(Object.assign(defaultOptions, options))
}

function createRedisStore({ redisOptions, prefix = 'express-attack'}) {
  const redisClient = createRedisClient(redisOptions)
  const getAsync = promisify(redisClient.get).bind(redisClient)
  const setAsync = promisify(redisClient.set).bind(redisClient)

  const get = async (key) => {
    try {
      const redisKey = `${prefix}-${key}`
      const result = await getAsync(redisKey)
      if (result === null) {
        return undefined
      }
      return Number.parseInt(result, 10)
    } catch (_err) {
      return undefined
    }
  }

  const set = async (key, timestampMs, expiredMs) => {
    try {
      const redisKey = `${prefix}-${key}`
      await setAsync(redisKey, timestampMs, 'px', expiredMs)
      return null
    } catch (err) {
      return err
    }
  }

  const store = {
    get,
    set,
  }
  return store
}

module.exports = createRedisStore
