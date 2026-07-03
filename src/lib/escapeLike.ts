/**
 * LIKE / ILIKE パターン内で特別な意味を持つ文字 (% _ \) をエスケープする。
 * ユーザー入力をそのまま `%${q}%` に埋め込むと「100%」等の検索が意図しないマッチになるため。
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`)
}
