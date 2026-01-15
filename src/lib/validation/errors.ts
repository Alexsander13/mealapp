export function validationError(message: string, details: any = {}) {
  return { ok: false, code: 'VALIDATION_ERROR', message, details }
}

export function notFound(message = 'Not found') {
  return { ok: false, code: 'NOT_FOUND', message }
}

export function internalError(message = 'Internal error') {
  return { ok: false, code: 'INTERNAL', message }
}
