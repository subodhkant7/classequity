export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'INVALID_REQUEST',
  ) {
    super(message);
  }
}
export function requireValue<T>(value: T | null | undefined, message = 'Record not found'): T {
  if (value == null) throw new AppError(message, 404, 'NOT_FOUND');
  return value;
}
