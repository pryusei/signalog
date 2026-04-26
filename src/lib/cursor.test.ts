import { describe, expect, it } from 'vitest'
import { decodeCursor, encodeCursor } from './cursor'

describe('encodeCursor / decodeCursor', () => {
  it('ラウンドトリップで同じ値に戻る', () => {
    const cursor = { publishedAt: '2024-01-15T12:00:00.000Z', id: 'abc-123' }
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor)
  })

  it('不正な文字列は null を返す', () => {
    expect(decodeCursor('!!!invalid!!!')).toBeNull()
  })

  it('フィールドが欠けている JSON は null を返す', () => {
    const bad = Buffer.from(JSON.stringify({ publishedAt: '2024-01-01' })).toString('base64url')
    expect(decodeCursor(bad)).toBeNull()
  })

  it('空文字は null を返す', () => {
    expect(decodeCursor('')).toBeNull()
  })
})
