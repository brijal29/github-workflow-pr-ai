type ClassNameArg = string | false | undefined | null

export function classNames(...values: ClassNameArg[]): string {
  return values.filter(Boolean).join(' ')
}

export function isExternalUrl(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function isDisabled(item: { disabled?: boolean }): boolean {
  return item.disabled === true
}

export async function getResponseErrorMessage(response: Response, fallback = 'Request failed'): Promise<string> {
  const body = (await response.json().catch(() => null)) as unknown
  if (typeof body === 'object' && body && 'error' in body) {
    return String((body as { error: unknown }).error)
  }
  return fallback
}
