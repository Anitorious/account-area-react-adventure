export class ClientRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ClientRequestError';
    this.status = status;
  }
}
