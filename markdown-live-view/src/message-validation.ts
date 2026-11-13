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
      typeof change.insert !== 'string'
    ) {
      return false;
    }

    insertedLength += change.insert.length;
    if (insertedLength > MAX_INSERT_LENGTH) {
      return false;
    }
    previousTo = change.to;
  }

  return true;
}
