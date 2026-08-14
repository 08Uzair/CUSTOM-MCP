/**
 * Normalized API envelope. Success responses always look like:
 *   { success: true, data, message }
 */
export function ok(res, data, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function created(res, data, message = 'Created') {
  return ok(res, data, message, 201);
}

export function accepted(res, data, message = 'Accepted') {
  return ok(res, data, message, 202);
}