'use strict'

const Hemera = require('nats-hemera')
const hemeraJoi = require('hemera-joi')
const nats = require('nats').connect()
const hemeraNatsStreaming = require('./../')

const hemera = new Hemera(nats, {
  logLevel: 'debug',
  childLogger: true
})

hemera.use(hemeraJoi)
hemera.use(hemeraNatsStreaming, {
  clusterId: 'test-cluster',
  clientId: 'test-client',
  options: {} // NATS/STAN options
})

const topic = 'natss'

hemera.ready(() => {
  /**
   * Create nats-streaming-subscription
   */
  hemera.act(
    {
      topic,
      cmd: 'subscribe',
      subject: 'news'
    },
    function(err, resp) {
      if (err) {
        this.log.error(err)
      }
      this.log.info(resp, 'ACK')
      const subId = resp.subId

      /**
       * Publish an event from hemera
       */
      hemera.act(
        {
          topic,
          cmd: 'publish',
          subject: 'news',
          data: {
            a: 1
          }
        },
        function(err, resp) {
          if (err) {
            this.log.error(err)
          }
          this.log.info(resp, 'PUBLISHED')
          hemera.act(
            {
              topic: `${topic}.subs.${subId}`,
              cmd: 'unsubscribe'
            },
            (err, resp) => {
              if (err) {
                this.log.error(err)
              }
              this.log.info(resp, 'UNSUBSCRIBED')
            }
          )
        }
      )
    }
  )

  /**
   * Add listener for nats-streaming events
   */
  hemera.add(
    {
      topic: `${topic}.news`
    },
    function(req, reply) {
      this.log.info(req, 'RECEIVED')
      // ACK Message, if you pass an error the message is redelivered every 10 seconds
      reply()
      // reply(new Error('test'))
    }
  )
})
