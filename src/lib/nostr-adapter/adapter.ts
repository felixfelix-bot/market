import { type NDKFilter, type NDKEvent } from '@nostr-dev-kit/ndk'
import { EventStore } from 'applesauce-core'
import { RelayPool } from 'applesauce-relay'
import { last, map } from 'rxjs'

/**
 * Configuration for the Nostr adapter
 */
export interface NostrAdapterConfig {
  backend: 'ndk' | 'applesauce'
  relays?: string[]
  timeoutMs?: number
}

/**
 * Common interface for both NDK and Applesauce backends
 */
export interface INostrAdapter {
  /**
   * Fetch events matching the given filters
   */
  fetchEvents(filters: NDKFilter | NDKFilter[]): Promise<Set<NDKEvent>>

  /**
   * Get the underlying event store (for Applesauce) or NDK instance
   */
  getStore(): any

  /**
   * Check if the adapter is ready
   */
  isReady(): boolean
}

/**
 * NDK Backend Implementation
 */
class NDKBackend implements INostrAdapter {
  private ndk: any

  constructor(ndk: any) {
    this.ndk = ndk
  }

  async fetchEvents(filters: NDKFilter | NDKFilter[]): Promise<Set<NDKEvent>> {
    if (!this.ndk) {
      throw new Error('NDK not initialized')
    }

    // Use the existing ndkActions.fetchEventsWithTimeout if available
    if (this.ndk.fetchEventsWithTimeout) {
      return this.ndk.fetchEventsWithTimeout(filters, { timeoutMs: 10000 })
    }

    // Fallback to direct NDK fetchEvents
    const filterArray = Array.isArray(filters) ? filters : [filters]
    const results = new Set<NDKEvent>()

    for (const filter of filterArray) {
      const events = await this.ndk.fetchEvents(filter)
      events.forEach(event => results.add(event))
    }

    return results
  }

  getStore(): any {
    return this.ndk
  }

  isReady(): boolean {
    return !!this.ndk
  }
}

/**
 * Applesauce Backend Implementation
 */
class ApplesauceBackend implements INostrAdapter {
  private eventStore: EventStore
  private relayPool: RelayPool
  private relays: string[]
  private timeoutMs: number
  private isConnected: boolean = false

  constructor(relays: string[] = [], timeoutMs: number = 10000) {
    this.eventStore = new EventStore()
    this.relayPool = new RelayPool()
    this.relays = relays
    this.timeoutMs = timeoutMs

    // Connect to relays
    this.connectToRelays().catch(console.error)
  }

  private async connectToRelays(): Promise<void> {
    if (this.relays.length === 0) {
      console.warn('No relays configured for Applesauce backend')
      return
    }

    try {
      // Add relays to the pool
      for (const relayUrl of this.relays) {
        this.relayPool.relay(relayUrl)
      }

      // Wait a bit for connections to establish
      await new Promise(resolve => setTimeout(resolve, 1000))
      this.isConnected = true
      console.log(`🍎 Connected to ${this.relays.length} relays via Applesauce`)
    } catch (error) {
      console.error('Failed to connect to relays:', error)
      this.isConnected = false
    }
  }

  async fetchEvents(filters: NDKFilter | NDKFilter[]): Promise<Set<NDKEvent>> {
    if (!this.isConnected) {
      await this.connectToRelays()
    }

    const filterArray = Array.isArray(filters) ? filters : [filters]
    const results = new Set<NDKEvent>()

    for (const filter of filterArray) {
      try {
        // Create subscription for each filter
        const subscription = this.relayPool
          .relay(this.relays[0]) // Use first relay for now
          .subscription({ ...filter, limit: 100 })

        const events = await new Promise<NDKEvent[]>((resolve, reject) => {
          const timeout = setTimeout(() => {
            subscription.unsubscribe()
            resolve([])
          }, this.timeoutMs)

          const eventHandler = (event: any) => {
            if (event && typeof event === 'object') {
              // Convert Applesauce event to NDKEvent format if needed
              const ndkEvent: NDKEvent = {
                ...event,
                kind: event.kind,
                pubkey: event.pubkey,
                created_at: event.created_at,
                content: event.content,
                tags: event.tags || [],
                id: event.id,
                sig: event.sig,
              }
              results.add(ndkEvent)
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
              resolve(Array.from(results))
            },
          })
        })

        // Add events to store
        events.forEach(event => {
          this.eventStore.add(event)
        })

      } catch (error) {
        console.warn('Failed to fetch events with filter:', filter, error)
        // Continue with other filters
      }
    }

    return results
  }

  getStore(): any {
    return this.eventStore
  }

  isReady(): boolean {
    return this.isConnected && !!this.eventStore
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.eventStore.dispose()
    // Clear all relay connections
    this.relayPool.relays.forEach((relay: any) => {
      relay.status = 'closed'
    })
  }
}

/**
 * Nostr Adapter Factory
 * Creates the appropriate backend based on configuration
 */
export function createNostrAdapter(config: NostrAdapterConfig): INostrAdapter {
  const backend = config.backend || process.env.NOSTR_BACKEND || 'ndk'

  switch (backend) {
    case 'applesauce':
      console.log('🍎 Using Applesauce backend for Nostr operations')
      return new ApplesauceBackend(config.relays || [], config.timeoutMs || 10000)
    
    case 'ndk':
    default:
      console.log('🔧 Using NDK backend for Nostr operations')
      // Get NDK instance from ndkActions
      const ndk = require('@/lib/stores/ndk').ndkActions.getNDK()
      return new NDKBackend(ndk)
  }
}

/**
 * Global adapter instance
 */
let globalAdapter: INostrAdapter | null = null

/**
 * Get or create the global Nostr adapter instance
 */
export function getNostrAdapter(config?: NostrAdapterConfig): INostrAdapter {
  if (!globalAdapter) {
    const defaultConfig: NostrAdapterConfig = {
      backend: process.env.NOSTR_BACKEND as 'ndk' | 'applesauce' || 'ndk',
      relays: [
        'wss://relay.damus.io',
        'wss://relay.snort.social',
        'wss://nos.lol',
        'wss://relay.primal.net',
      ],
      timeoutMs: 10000,
      ...config,
    }
    globalAdapter = createNostrAdapter(defaultConfig)
  }
  return globalAdapter
}

/**
 * Reset the global adapter instance (useful for testing or reconfiguration)
 */
export function resetNostrAdapter(): void {
  if (globalAdapter && 'dispose' in globalAdapter) {
    (globalAdapter as ApplesauceBackend).dispose()
  }
  globalAdapter = null
}