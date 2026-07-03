export interface Cursor {
  publishedAt: string // ISO 8601
  id: string
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCursor(encoded: string): Cursor | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8')
    const parsed: unknown = JSON.parse(json)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'publishedAt' in parsed &&
      'id' in parsed &&
      typeof (parsed as Cursor).publishedAt === 'string' &&
      typeof (parsed as Cursor).id === 'string' &&
      !Number.isNaN(Date.parse((parsed as Cursor).publishedAt))
    ) {
      return parsed as Cursor
    }
    return null
  } catch {
    return null
  }
}
