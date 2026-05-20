export class ExtensionContextInvalidatedError extends Error {
  constructor(message = 'Extension context invalidated') {
    super(message);
    this.name = 'ExtensionContextInvalidatedError';
  }
}

export function isExtensionContextValid(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  if (error instanceof ExtensionContextInvalidatedError) return true;
  if (error instanceof Error && error.message.includes('Extension context invalidated')) {
    return true;
  }
  return false;
}

export function toExtensionError(error: unknown): Error {
  if (error instanceof Error) {
    return isExtensionContextInvalidatedError(error)
      ? new ExtensionContextInvalidatedError()
      : error;
  }
  return new Error(String(error));
}
