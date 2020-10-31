export * from './client-request.error';
export * from './internal-server.error';
export * from './network-failure.error';

// Enumeration to store static strings.
export const ERROR_MESSAGES = {
  CLIENT_REQUEST:
    'Client Request Exception: Client request may contain bad data.',
  NETWORK_FAILURE:
    'Network Failure Exception: Client unable to connect to server.',
  INTERNAL_SERVER:
    'Internal Server Exception: An issue occurred while processing this request.'
};

export const ERROR_REGISTER = {
  NETWORK_FAILURE: 'NetworkFailureError',
  CLIENT_REQUEST: 'ClientRequestError',
  INTERNAL_SERVER: 'InternalServerError'
};
