import { EventStore } from 'applesauce-core'
import { RelayPool } from 'applesauce-relay'
import { Store } from '@tanstack/store'
import { configStore } from './stores/config'
import type { QueryClient } from '@tanstack/react-query'

export interface ApplesauceConfig {
  enabled: boolean
  relays: string[]
  timeoutMs: number
  connectOnBoot: boolean
}

export interface ApplesauceState {
  eventStore: EventStore | null
  relayPool: RelayPool | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  config: ApplesauceConfig | null
}

const initialState: ApplesauceState = {
  eventStore: null,
  relayPool: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  config: null,
}

export const applesauceStore = new Store<ApplesauceState>(initialState)

let connectPromise: Promise<void> | null = null

export class ApplesauceService {
  private static instance: ApplesauceService
  private config: ApplesauceConfig
  private eventStore: EventStore | null = null
  private relayPool: RelayPool | null = null

  constructor(config: ApplesauceConfig) {
    this.config = config
  }

  static getInstance(config?: ApplesauceConfig): ApplesauceService {
    if (!ApplesauceService.instance) {
      if (!config) {
        throw new Error('ApplesauceService instance not created and no config provided')
      }
      ApplesauceService.instance = new ApplesauceService(config)
    }
    return ApplesauceService.instance
  }

  async initialize(): Promise<void> {
    if (this.eventStore) {
      return // Already initialized
    }

    try {
      console.log('🍎 Initializing Applesauce...')

      // Create EventStore
      this.eventStore = new EventStore()

      // Create RelayPool
      this.relayPool = new RelayPool()

      // Add relays to pool
      for (const relayUrl of this.config.relays) {
        this.relayPool.relay(relayUrl)
      }

      applesauceStore.setState({
        eventStore: this.eventStore,
        relayPool: this.relayPool,
        config: this.config,
        error: null,
      })

      console.log('🍎 Applesauce initialized successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Applesauce'
      console.error('🍎 Applesauce initialization failed:', error)
      
      applesauceStore.setState({
        error: errorMessage,
      })
      throw error
    }
  }

  async connect(): Promise<void> {
    if (connectPromise) {
      return connectPromise
    }

    connectPromise = (async () => {
      try {
        applesauceStore.setState({ isConnecting: true, error: null })

        if (!this.relayPool) {
          throw new Error('Applesauce not initialized')
        }

        // Wait for connections to establish
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const connectedRelays = this.relayPool.relays.filter(relay => 
          relay.status === 'connected' || relay.status === 'connecting'
        )

        if (connectedRelays.length === 0) {
          throw new Error('No relays connected')
        }

        applesauceStore.setState({
          isConnected: true,
          isConnecting: false,
        })

        console.log(`🍎 Connected to ${connectedRelays.length} relay(s) via Applesauce`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed'
        console.error('🍎 Applesauce connection failed:', error)
        
        applesauceStore.setState({
          isConnected: false,
          isConnecting: false,
          error: errorMessage,
        })
        throw error
      }
    })()

    return connectPromise
  }

  getEventStore(): EventStore | null {
    return this.eventStore
  }

  getRelayPool(): RelayPool | null {
    return this.relayPool
  }

  async fetchEvents(filters: any[]): Promise<any[]> {
    if (!this.relayPool) {
      throw new Error('Applesauce not initialized')
    }

    const results = []

    for (const filter of filters) {
      try {
        const subscription = this.relayPool
          .relay(this.config.relays[0])
          .subscription({ ...filter, limit: 100 })

        const events = await new Promise<any[]>((resolve, reject) => {
          const timeout = setTimeout(() => {
            subscription.unsubscribe()
            resolve([])
          }, this.config.timeoutMs)

          const eventHandler = (event: any) => {
            if (event && typeof event === 'object') {
              results.push(event)
              if (this.eventStore) {
                this.eventStore.add(event)
              }
            }
          }

          subscription.subscribe({
            next: eventHandler,
            error: (error) => {
              clearTimeout(timeout)
              reject(error)
            },
            complete: () => {
              clearTimeout(timeout)
              resolve(results)
            },
          })
        })

        events.forEach(event => {
          if (this.eventStore) {
            this.eventStore.add(event)
          }
        })

      } catch (error) {
        console.warn('Failed to fetch events with filter:', filter, error)
      }
    }

    return results
  }

  dispose(): void {
    if (this.eventStore) {
      this.eventStore.dispose()
    }

    if (this.relayPool) {
      this.relayPool.relays.forEach((relay: any) => {
        relay.status = 'closed'
      })
    }

    applesauceStore.setState(initialState)
    connectPromise = null
  }
}

/**
 * Initialize Applesauce service during app boot
 */
export async function initializeApplesauce(queryClient: QueryClient): Promise<void> {
  // Check if Applesauce is enabled
  const applesauceEnabled = process.env.NOSTR_BACKEND === 'applesauce'
  
  if (!applesauceEnabled) {
    console.log('🍎 Applesauce disabled, using NDK')
    return
  }

  const config: ApplesauceConfig = {
    enabled: true,
    relays: [
      'wss://relay.damus.io',
      'wss://relay.snort.social',
      'wss://nos.lol',
      'wss://relay.primal.net',
    ],
    timeoutMs: 10000,
    connectOnBoot: true,
  }

  try {
    // Override with config from server if available
    const serverConfig = await queryClient.fetchQuery({
      queryKey: ['applesauce-config'],
      queryFn: async () => {
        const response = await fetch('/api/applesauce-config')
        if (!response.ok) {
          throw new Error('Failed to fetch Applesauce config')
        }
        return response.json()
      },
    })

    if (serverConfig.relays) {
      config.relays = serverConfig.relays
    }

    const service = ApplesauceService.getInstance(config)
    await service.initialize()

    if (config.connectOnBoot) {
      await service.connect()
    }

    console.log('🍎 Applesauce service initialized successfully')
  } catch (error) {
    console.error('🍎 Failed to initialize Applesauce service:', error)
    // Don't throw - allow the app to continue with NDK as fallback
  }
}