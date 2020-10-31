import {
  NetworkFailureError,
  InternalServerError,
  ClientRequestError,
  ERROR_MESSAGES,
  ERROR_REGISTER
} from './errors/errors.module';

export async function fetchOrderHistory() {
  const response = await request();
  const json = await response.json();
  console.log(json);
  return transform(json);
}

async function request() {
  try {
    const response = await fetch(
      'https://reactasty.apps.huel.io/api/customer/orders'
    );

    if (response.ok) {
      return response;
    } else {
      // N.B. Crude error handling logic to account for any issues api may present in future.
      handleFailure(response.status);
    }
  } catch (error) {
    // TODO: Log error with application monitoring service i.e. Sentry, Raygun, New Relic
    // N.B. Return custom error object for cleaner decision making in ui component.
    if (isCustomErrorHandler(error)) {
      throw error;
    } else {
      throw new NetworkFailureError(ERROR_MESSAGES.NETWORK_FAILURE);
    }
  }
}

function getOrdinal(numeral) {
  if (numeral > 3 && numeral < 21) return 'th';
  switch (numeral % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

const formattedDateTimeExpression = /([A-Za-z]+)\s(\d+),\s(\d{4,})/;

function formatDateTime(dateTime) {
  const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let date = dateTimeFormat.format(new Date(dateTime));
  const matches = date.match(formattedDateTimeExpression);
  const ordinal = getOrdinal(parseInt(matches[2]));

  return date.replace(formattedDateTimeExpression, `$1 $2${ordinal} $3`);
}

/**
 * OrderItem
 * @typedef {Object} OrderItem
 * @property {string} thumbnailUrl - The url of the image thumbnail
 * @property {string} name - The aggregate name of the item
 * @property {string} descriptor - The variants and quantities of the item
 * @property {string} price - The aggregate item total
 *
 */

/**
 * Order
 * @typedef {Object} Order
 * @property {string} orderNumber - The order number
 * @property {string} orderType - "One-time" | "Subscription"
 * @property {number} totalPrice - The lineItems total inc. discounts and vat
 * @property {string} [dispatchDate] - The date of dispatch
 * @property {OrderItem[]} orderItems - The items purchased
 * @property {string} deliveryAddress
 */

function aggregateLineItems(lineItems) {
  return [];
}

/**
 * Transform an API Response into an Order DTO.
 *
 * @param {string} json - JSON API response body.
 * @return {Order[]} An array of customer orders.
 */
function transform(json) {
  if (!Array.isArray(json) || json.length <= 0 || !json[0].success)
    throw new ClientRequestError(ERROR_MESSAGES.CLIENT_REQUEST, 406);

  const root = json[0].orders;
  const orders = [];

  for (const idx in root) {
    const order = root[idx];
    const {
      id,
      name,
      shipping_address,
      fulfillments,
      total_price_usd,
      processed_at,
      line_items
    } = order;

    const dto = {
      id: id,
      orderNumber: name,
      // N.B. Assumption that a 'fulfillment' is a purchase order with a repeatable deliverable, i.e. subscription
      orderType:
        Array.isArray(fulfillments) && fulfillments.length > 0
          ? 'Subscription'
          : 'One-time',
      totalPrice: total_price_usd,
      dispatchDate: processed_at ? formatDateTime(processed_at) : null,
      orderItems: aggregateLineItems(line_items),
      deliveryAddress: `${shipping_address.address1}, ${shipping_address.city}, ${shipping_address.zip}`
    };

    orders.push(dto);
  }

  return orders;
}

// N.B. instanceof may not function as expected depending on transpiler and/or transpiler version.
function isCustomErrorHandler(error) {
  return (
    error.name &&
    [
      ERROR_REGISTER.NETWORK_FAILURE,
      ERROR_REGISTER.CLIENT_REQUEST,
      ERROR_REGISTER.INTERNAL_SERVER
    ].includes(error.name)
  );
}

function handleFailure(status) {
  switch (true) {
    case status >= 400 && status < 500:
      // N.B. Custom errors should be extended, basic implementation for decision making in ui component.
      throw new ClientRequestError(ERROR_MESSAGES.CLIENT_REQUEST, status);
    case status >= 500:
      throw new InternalServerError(ERROR_MESSAGES.INTERNAL_SERVER);
    default:
      throw new NetworkFailureError(ERROR_MESSAGES.NETWORK_FAILURE);
  }
}
