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

// N.B Date Time Formatting without moment.js 🎉
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

// N.B Sketching out some object shapes in JSDoc for future reference. Would usually do this in TypeScript.
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

const variantExpressionMap = {
  2: /(?<product>\w+\s(?<type>[\w-]+))\s(?<variant>\w+)/,
  3: /(?<product>\w+\s\w+)\s(?<variant>\w+)/
};
function computeDescriptors(title, variantTitle) {
  if (!Boolean(variantTitle) || !parseInt(variantTitle))
    return { product: title, variant: variantTitle };

  const matches = title.match(variantExpressionMap[variantTitle]);

  return {
    product: matches.groups.product,
    variant: `${matches.groups.type ? `${matches.groups.type} ` : ''}${
      matches.groups.variant
    }`
  };
}

// N.B This is where it gets a little crazy.
//  Group line items via sku prefix, convert the object to an array and map the values back for a second reducer pass.
//  Build OrderItems DTO by reducing aggregated items to compute titles, variants, quantities and total price.
//  This is a potential candidate for optimisation, although my preference would be to start at the source and modify the API to return a sanitised data object,
//  the server being a more predictable and controllable environment for heavy data manipulation. Perhaps WebAssembly could help here if server-side sanitisation
//  isn't possible?
function aggregateLineItems(lineItems) {
  const _lineItems = Object.entries(
    lineItems.reduce((rv, item) => {
      const sku = item['sku'].split('-')[0];
      (rv[sku] = rv[sku] || []).push(item);
      return rv;
    }, {})
  ).map(x => x[1]);

  const orderItems = _lineItems.reduce((rv, lineItem) => {
    const { id, image } = lineItem[0];
    const dto = {
      id: id,
      thumbnailUrl: image
    };

    const variants = lineItem.map(item => {
      const { title, variant_title, quantity } = item;
      const descriptors = computeDescriptors(title, variant_title);

      return {
        product: descriptors.product,
        variant: `${quantity}x ${
          Boolean(descriptors.variant)
            ? descriptors.variant
            : descriptors.product
        }`
      };
    });

    dto.name = variants[0].product;
    dto.descriptor = variants.map(x => x.variant).join(', ');
    dto.price = lineItem
      .reduce(
        (rv, item) => rv + parseFloat(item.price) * parseInt(item.quantity),
        0
      )
      .toFixed(2);

    return [...rv, dto];
  }, []);

  return orderItems;
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
