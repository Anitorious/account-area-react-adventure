export class NetworkFailureError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkFailureError';
  }
}
