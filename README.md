# handy-ms-broker-nats

`handy-ms-broker-nats` registers all `async` function of a class and can be callable by the other microserice.

## How it works?

Lets say you have a `SampleController` class from one of your microservice, and you want it to be callable on the other `node.js` microservice.

```
// sample_ctl.js

class SampleController {
  async foo (params) {
    return Promise.resolve({ action: 'foo', params })
  }

  async bar (params) {
    return Promise.resolve({ action: 'bar', params })
  }

  async sampleerr () {
    return Promise.reject(new Error('Sample Err'))
  }
}

```

All you have to do is connect to your NATS, pass it to `handy-ms-broker-nats` instance, then register your `SampleController`

```
// ms-app-1/index.js (aka subscriber)

const nats = NATS.connect()
const Broker = require('handy-ms-broker-nats')
const subscriber = new Broker(nats)

subscriber.register('resource', new SampleController())
```

Then, it is now callable by the other end.
```
// ms-app-2/index.js (aka publisher)

const nats = NATS.connect()
const Broker = require('handy-ms-broker-nats')
const publisher = new Broker(nats)

publisher.call('resource.foo', { hey: 'ho!' })
  .then(ret => {
    console.log(ret) // { action: 'foo', params: { hey: 'ho!' } }
  })
  .catch(err => {
    if (/Sample Err$/.test(err.message)) {
      // catching our defined err
    } else {
      throw err // if isn't ours
    }
  })
```