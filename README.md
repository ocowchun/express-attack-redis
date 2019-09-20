# express-attack-redis
> Redis store for [express-attack](https://github.com/ocowchun/express-attack)

## Usage
```js
const express = require('express')
const expressAttack = require('express-attack')
const redisStore = require('express-attack-redis')

const app = express()
app.use(
  expressAttack({
    store: redisStore({ redisUrl: 'redis://0.0.0.0:6379' })
  })
)
```

MIT
