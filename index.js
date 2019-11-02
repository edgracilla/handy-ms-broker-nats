'use strict'

const os = require('os')
const NATS = require('nats')

const deserialize = require('fast-json-parse')
const serialize = require('fast-safe-stringify')

class HandyBroker {
  constructor (nats, options = {}) {
    this.version = options.version || 'v1'
    this.timeout = options.timeout || 1000 * 10
    this.namespace = options.namespace || 'default'
  
    this.subjEvent = `${this.namespace}.event.${this.version}`
    this.subjAction = `${this.namespace}.action.${this.version}`

    this.host = os.hostname()
    this.nats = nats
  }

  // -- actions handler

  register (resource, service) {
    let proto = Object.getPrototypeOf(service)
    let functions = Object.getOwnPropertyNames(proto)
    let subject = `${this.subjAction}.${resource}`

    const AsyncFunction = (async function () {}).constructor
    functions = functions.filter(fn => service[fn].constructor === AsyncFunction)

    this.nats.subscribe(subject, { queue: 'job.workers' }, (payload, repTo) => {
      let content = deserialize(payload)

      if (content.err) {
        return this.nats.publish(repTo, serialize({
          error: 1, message: `[${this.host}] Parse Error: Invalid json data received.`
        }))
      }

      let { action, data: params } = content.value

      if (!~functions.indexOf(action)) {
        return this.nats.publish(repTo, serialize({
          error: 1, message: `[${this.host}] Service action '${resource}.${action}' is not registered.`
        }))
      }

      service[action](params)
        .then(ret => this.nats.publish(repTo, serialize({ error: 0, data: ret })))
        .catch(err => {
          err.error = 1
          err.message = `[${this.host}] ${err.message}`
          this.nats.publish(repTo, serialize(err, Object.getOwnPropertyNames(err)))
        })
    })
  }

  call (subject, params = {}) {
    return new Promise((resolve, reject) => {
      let chunks = subject.split('.')
      let [version, resource, action] = chunks
      
      switch (chunks.length) {
        case 2: action = resource; resource = version; subject = `${this.subjAction}.${resource}`; break
        case 3: subject = `${this.namespace}.action.${version}.${resource}`; break
        default: return reject(new Error(`[${this.host}] ${subject} - Invalid subject format.`))
      }
  
      this.nats.requestOne(subject, serialize({ action, data: params }), this.timeout, (resp) => {
        if(resp instanceof NATS.NatsError && resp.code === NATS.REQ_TIMEOUT) {
          return reject(new Error(`[${this.host}] ${subject} - Microservice request timeout!`))
        }
  
        let data = deserialize(resp)

        if (data.err) return reject(data.err)

        if (data.value.error) {
          let err = new Error(data.value.message)
          err.stack = data.value.stack
          return reject(err)
        }

        return resolve(data.value.data)
      })
    })
  }

  // -- events handler

  listen (resource, events) {
    let proto = Object.getPrototypeOf(events)
    let functions = Object.getOwnPropertyNames(proto)
    let subject = `${this.subjEvent}.${resource}`

    functions.shift() // rmv constructor

    this.nats.subscribe(subject, { queue: 'job.workers' }, (payload) => {
      let content = deserialize(payload)

      if (content.err) { // TODO: to handle assertion
        return console.log(`[WARN] Parse Error: Invalid json data received.`)
      }

      let { event, caller, data: params } = content.value

      if (!~functions.indexOf(event)) { // TODO: to handle assertion
        return console.log(`[WARN] Service action '${resource}.${event}' is not registered. (caller: ${caller})`)
      }

      events[event](params) // err handling should be inside the event fn
    })
  }

  emit (subject, params = {}) {
    return new Promise((resolve, reject) => {
      let chunks = subject.split('.')
      let [version, resource, event] = chunks
      
      switch (chunks.length) {
        case 2: event = resource; resource = version; subject = `${this.subjEvent}.${resource}`; break
        case 3: subject = `${this.namespace}.event.${version}.${resource}`; break
        default: return reject(new Error(`[${this.host}] ${subject} - Invalid subject format.`))
      }

      this.nats.publish(subject, serialize({ event, caller: this.host, data: params })) // fire and forget
    })
  }
}

module.exports = HandyBroker
