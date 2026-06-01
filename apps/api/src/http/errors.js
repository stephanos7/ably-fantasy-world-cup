export function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function requireRow(row, message) {
  if (!row) {
    throw createHttpError(404, message);
  }

  return row;
}

export function requireDatabase(db) {
  if (!db) {
    throw createHttpError(503, "Database is not configured");
  }

  return db;
}
