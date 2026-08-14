import { describe, expect, test } from 'bun:test'
import { parseCoordsFromLink } from '../utils/mapLinks'

describe('parseCoordsFromLink — OpenStreetMap #map=zoom/lat/lon', () => {
	test('parses decimal coordinates', () => {
		expect(parseCoordsFromLink('https://www.openstreetmap.org/#map=17/51.5074/-0.1278')).toEqual({ lat: 51.5074, lon: -0.1278 })
	})

	test('parses integer coordinates', () => {
		expect(parseCoordsFromLink('https://www.openstreetmap.org/#map=5/10/20')).toEqual({ lat: 10, lon: 20 })
	})

	test('accepts boundary latitude 90 and longitude 180', () => {
		expect(parseCoordsFromLink('https://www.openstreetmap.org/#map=3/90/180')).toEqual({ lat: 90, lon: 180 })
	})

	test('rejects latitude beyond 90', () => {
		expect(parseCoordsFromLink('https://www.openstreetmap.org/#map=17/95.5/-0.1278')).toBeNull()
	})

	test('rejects longitude beyond 180', () => {
		expect(parseCoordsFromLink('https://www.openstreetmap.org/#map=17/51.5/190.5')).toBeNull()
	})
})

describe('parseCoordsFromLink — BTC Map hash links', () => {
	test('parses btcmap.org/map#zoom/lat/lon', () => {
		expect(parseCoordsFromLink('https://btcmap.org/map#9/41.0082/28.9784')).toEqual({ lat: 41.0082, lon: 28.9784 })
	})

	test('parses a two-segment #lat/lon hash at the end of the URL', () => {
		expect(parseCoordsFromLink('https://btcmap.org/map#41.0082/28.9784')).toEqual({ lat: 41.0082, lon: 28.9784 })
	})

	test('returns null when the hash has trailing segments', () => {
		expect(parseCoordsFromLink('https://example.com/#41.0082/28.9784/extra')).toBeNull()
	})
})

describe('parseCoordsFromLink — Google Maps links', () => {
	test('parses @lat,lon viewport links', () => {
		expect(parseCoordsFromLink('https://www.google.com/maps/@51.5074,-0.1278,15z')).toEqual({ lat: 51.5074, lon: -0.1278 })
	})

	test('parses @lat,lon inside place links', () => {
		expect(parseCoordsFromLink('https://www.google.com/maps/place/London/@51.5074,-0.1278,17z')).toEqual({ lat: 51.5074, lon: -0.1278 })
	})

	test('parses ?q=lat,lon query links', () => {
		expect(parseCoordsFromLink('https://maps.google.com/?q=51.5074,-0.1278')).toEqual({ lat: 51.5074, lon: -0.1278 })
	})

	test('parses &q=lat,lon with additional query params', () => {
		expect(parseCoordsFromLink('https://www.google.com/maps/search?api=1&q=-33.8688,151.2093&zoom=15')).toEqual({
			lat: -33.8688,
			lon: 151.2093,
		})
	})

	test('parses western longitudes with @lat,lon', () => {
		expect(parseCoordsFromLink('https://www.google.com/maps/@37.7749,-122.4194,15z')).toEqual({ lat: 37.7749, lon: -122.4194 })
	})

	test('rejects non-numeric q values', () => {
		expect(parseCoordsFromLink('https://maps.google.com/?q=London')).toBeNull()
	})
})

describe('parseCoordsFromLink — invalid input', () => {
	test('returns null for an empty string', () => {
		expect(parseCoordsFromLink('')).toBeNull()
	})

	test('returns null for plain text that is not a URL', () => {
		expect(parseCoordsFromLink('meet me at the shop')).toBeNull()
	})

	test('returns null for a URL without coordinates', () => {
		expect(parseCoordsFromLink('https://example.com/shop')).toBeNull()
	})

	test('returns null for nullish input instead of throwing', () => {
		expect(parseCoordsFromLink(null as unknown as string)).toBeNull()
		expect(parseCoordsFromLink(undefined as unknown as string)).toBeNull()
	})

	test('returns null for an incomplete #map= hash', () => {
		expect(parseCoordsFromLink('https://www.openstreetmap.org/#map=17/51.5074')).toBeNull()
	})
})
