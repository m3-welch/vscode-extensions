export interface EditChange {
  from: number;
  to: number;
  insert: string;
}

export interface WebviewEditMessage {
  type: 'edit';
  baseVersion: number;
  transactionId: string;
  changes: EditChange[];
}

export type LinkTarget = { kind: 'external'; url: string } | { kind: 'file'; path: string };

const MAX_LINK_LENGTH = 2048;
const EXTERNAL_SCHEMES = new Set(['http', 'https', 'mailto']);

export function classifyLink(href: unknown): LinkTarget | undefined {
  if (typeof href !== 'string' || href.length === 0 || href.length > MAX_LINK_LENGTH) {
    return undefined;
  }

  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(href);
  if (scheme) {
    return EXTERNAL_SCHEMES.has(scheme[1].toLowerCase()) ? { kind: 'external', url: href } : undefined;
  }
  if (href.startsWith('#') || href.startsWith('/') || href.startsWith('\\')) {
    return undefined;
  }

  const path = href.split(/[?#]/)[0];
  if (!path) {
    return undefined;
  }
  try {
    return { kind: 'file', path: decodeURIComponent(path) };
  } catch {
    return undefined;
  }
}

const MAX_CHANGES = 1000;
const MAX_INSERT_LENGTH = 1_000_000;

export function isWebviewEditMessage(
  value: unknown,
  expectedVersion: number,
  documentLength: number
): value is WebviewEditMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as Partial<WebviewEditMessage>;
  if (
    message.type !== 'edit' ||
    message.baseVersion !== expectedVersion ||
    !Number.isSafeInteger(message.baseVersion) ||
    typeof message.transactionId !== 'string' ||
    message.transactionId.length === 0 ||
    message.transactionId.length > 128 ||
    !Array.isArray(message.changes) ||
    message.changes.length === 0 ||
    message.changes.length > MAX_CHANGES
  ) {
    return false;
  }

  let insertedLength = 0;
  let previousFrom = -1;
  let previousTo = -1;
  for (const change of message.changes) {
    if (
      !change ||
      !Number.isSafeInteger(change.from) ||
      !Number.isSafeInteger(change.to) ||
      change.from < 0 ||
      change.to < change.from ||
      change.to > documentLength ||
      change.from < previousTo ||
      (change.from === previousFrom && change.from === change.to && previousTo === previousFrom) ||
      typeof change.insert !== 'string'
    ) {
      return false;
    }

    insertedLength += change.insert.length;
    if (insertedLength > MAX_INSERT_LENGTH) {
      return false;
    }
    previousFrom = change.from;
    previousTo = change.to;
  }

  return true;
}
