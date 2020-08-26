const { promisify } = require('util')
const redis = require('redis')
const TOTAL_RETRY_TIME = 10 * 1000

function createRedisClient(url) {
  const options = {
    url: url,
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
      return Math.min(options.attempt * 100, 3000)
    },
  }

  return redis.createClient(options)
}

function createRedisStore({ prefix = 'express-attack', redisUrl = null }) {
  if (redisUrl === null) {
    redisUrl = process.env.REDIS_URL
  }
  const redisClient = createRedisClient(redisUrl)
  const getAsync = promisify(redisClient.get).bind(redisClient)
  const setAsync = promisify(redisClient.set).bind(redisClient)

  const get = async (key, timestamp, period) => {
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

  const set = async (key, timestamp, period) => {
    try {
      const redisKey = `${prefix}-${key}`
      await setAsync(redisKey, timestamp, 'px', period)
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
