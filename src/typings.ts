import { ChangeStreamInsertDocument, ClientSession, Db, MongoClient, ObjectId, ResumeToken } from 'mongodb'

type OutboxMessageModel<Event> = {
  _id: ObjectId
  occurredAt: Date
  // type: string
  data: Event
  partitionKey: string
}

type OutboxConsumerModel = {
  _id: ObjectId
  lastProcessedId: ObjectId | null
  resumeToken: ResumeToken
  partitionKey: string
  lastUpdatedAt: Date | null
  createdAt: Date
}

/**
 * Function that runs an `OutboxConsumer` instance.
 *
 * @returns A function to `stop` the `OutboxConsumer` instance.
 * @example
 * const stop = await outbox.start()
 * // later...
 * // but remember it will happen automatically when `shouldDisposeOnSigterm` is set to `true`.
 * await stop()
 */
type Start = () => Promise<Stop>

/**
 * Function that stops the `OutboxConsumer` instance.
 * @returns An empty promise.
 * @example
 * const stop = await outbox.start()
 * // later...
 * // but remember it will happen automatically when `shouldDisposeOnSigterm` is set to `true`.
 * await stop()
 */
type Stop = () => Promise<void>

/**
 * Function to publish an event or events.
 *
 * @param event -               An event or events to be sent.
 * @param sessionOrCallback -   An existing `session` with which the event(s) should be saved
 *                              <br />or {SaveWithEventCallback} to persist additional data within the callback's session instead.
 *                              <br />If not provided, then the event(s) will be persisted with a new session.
 * @returns An empty promise.
 * @example
 *  await outbox.publish(event, async (session, db) => {
 *   await db.collection('test').insertOne(
 *      {
 *         param: 1,
 *      },
 *      { session },
 *     )
 *  })
 */
type Publish<Event> = (
  event: Event | Event[],
  /**
   * @defaultValue undefined
   */
  sessionOrCallback?: ClientSession | SaveWithEventCallback | undefined,
) => Promise<void>

/**
 * A callback fired with a new `session` where additional persistance can be done along with the event(s).
 *
 * @param session -   A passed (new) session.
 * @param db -        The database passed during the {OutboxConsumer} creation.
 * @param client -    The database passed during the {OutboxConsumer} creation.
 * @returns An empty promise.
 * @example
 *  await outbox.publish(event, async (session, db) => {
 *   await db.collection('test').insertOne(
 *      {
 *         param: 1,
 *      },
 *      { session },
 *     )
 *  })
 */
type SaveWithEventCallback = (session: ClientSession, db: Db, client: MongoClient) => Promise<void>

/**
 * Describes how the `OutboxConsumer` object looks like.
 *
 * @param start -   Starts the `OutboxConsumer` instance. It returns back when it starts listen to events.
 * @param publish - Function to publish an event or events. Use it to ensure your events sending reliability.
 *
 * @template Event - Events handled by the `OutboxConsumer`. The type can be limited with a discrimitation union.
 */
type OutboxConsumerType<Event> = {
  start: Start
  publish: Publish<Event>
}

/**
 * A callback handling an error.
 * @param error - An error.
 */
type ErrorCallback = (error: unknown) => void

/**
 * Creation parameters of `OutboxConsumer`.
 *
 * @param client -                      Instance of the database connection.
 * @param db -                          Instance of the specific database where the `OutboxConsumer` will work on.
 * @param publish -                     A callback implemented on the client that is rensposible to publish an event.
 *                                                                <br />It can utilize an event bus like RabbitMQ, Apache Pulsar or whatever is needed.
 *                                                                <br />It takes an `event` of `Event`.
 *                                                                <br /><b>The most important is to throw an error on a failed publish. Otherwise, the `OutboxConsumer` won't consider the event as published.</b>
 * @param partitionKey -                Name of the partition of the `OutboxConsumer`.
 * @param waitAfterFailedPublishMs -    Time after the `OutboxConsumer` will wait after a failed event publish.
 * @param  shouldDisposeOnSigterm -     Indicates whether the `OutboxConsumer` should register a cleaning callback on `SIGTERM` and `SIGINT`.
 * @param  onFailedPublish -            A callback fired on a failed publish.
 * @param onDbError -                   A callback failed on an error related to the database.
 * @template Event -                    Events handled by the `OutboxConsumer`. The type can be limited with a discrimitation union.
 * @example
 *  const outbox = OutboxConsumer<Event1 | Event2>({
 *    client,
 *    client.db('hospital'),
 *    publish: async (event) => await eventBus.publish(event),
 *  })
 */
type ConsumerCreationParams<Event> = {
  client: MongoClient
  db: Db
  publish: (event: Event) => Promise<void> | never
  /**
   * @defaultValue `default`
   */
  partitionKey?: string
  /**
   * @defaultValue 1000
   */
  waitAfterFailedPublishMs?: number
  /**
   * @defaultValue true
   */
  shouldDisposeOnSigterm?: boolean // default true
  /**
   * @defaultValue `noop`
   */
  onFailedPublish?: ErrorCallback
  /**
   * @defaultValue `noop`
   */
  onDbError?: ErrorCallback
}

type OutboxMessageStream<Event> = ChangeStreamInsertDocument<OutboxMessageModel<Event>>

export {
  ConsumerCreationParams,
  ErrorCallback,
  OutboxConsumerModel,
  OutboxConsumerType,
  OutboxMessageModel,
  OutboxMessageStream,
  Publish,
  SaveWithEventCallback,
  Start,
  Stop,
}
