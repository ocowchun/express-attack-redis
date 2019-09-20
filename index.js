const redis = require('redis')
const bluebird = require('bluebird')
const TOTAL_RETRY_TIME = 10 * 1000

bluebird.promisifyAll(redis)

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
    }
  }

  return redis.createClient(options)
}

function createRedisStore({ prefix = 'node-attack', redisUrl = null }) {
  if (redisUrl === null) {
    redisUrl = process.env.REDIS_URL
  }
  const redisClient = createRedisClient(redisUrl)

  const increment = async (key, expire = 300) => {
    try {
      const multi = redisClient.multi()
      const redisKey = `${prefix}-${key}`
      multi.incr(redisKey)
      multi.expire(redisKey, expire)
      const res = await multi.execAsync()
      return res[0]
    } catch (_err) {
      return 0
    }
  }

  const cache = {
    increment: increment
  }
  return cache
}

module.exports = createRedisStore
