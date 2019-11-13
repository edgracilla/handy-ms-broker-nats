# handy-ms-broker-nats

`handy-ms-broker-nats` registers all `async` function of a class and then be callable by the other microservice.

## How it works?

Lets say you have a `SampleController` class from one of your microservice, and you want it to be callable on the other `node.js` microservice.

```javascript
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

```javascript
// ms-app-1/index.js (aka subscriber)

const NATS = require('nats')
const Broker = require('handy-ms-broker-nats')

const nats = NATS.connect()
const broker = new Broker(nats)

broker.register('resource', new SampleController())
```

Then, it is now callable by the other end.
```javascript
// ms-app-2/index.js (aka publisher)

const NATS = require('nats')
const Broker = require('handy-ms-broker-nats')

const nats = NATS.connect()
const broker = new Broker(nats)

broker.call('resource.foo', { hey: 'ho!' })
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

## In Constructor Registration
```javascript
class Foo {
  constructor (broker) {
    this.broker = broker

    this.broker.register('myService', this)
  }

  async foo (params) {
    return Promise.resolve({ action: 'foo', params })
  }

  async sampleCall (params) {
    return this.broker.call('otherService', params)
  }
}

const NATS = require('nats')
const Broker = require('handy-ms-broker-nats')

const nats = NATS.connect()
const broker = new Broker(nats)

const foo = new Foo(broker)

foo.sampleCall(params)
  .then(ret => console.log(ret))
  .catch(err => console.log(err))

```
