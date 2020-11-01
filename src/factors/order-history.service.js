import {
  NetworkFailureError,
  InternalServerError,
  ClientRequestError,
  ERROR_MESSAGES,
  isCustomErrorHandler
} from './errors/errors.module';

function getCalendarOrdinal(numeral) {
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

// N.B Date Time Formatting without moment.js 🎉
const formattedDateTimeExpression = /([A-Za-z]+)\s(\d+),\s(\d{4,})/;
function formatDateTime(dateTime) {
  const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let date = dateTimeFormat.format(new Date(dateTime));
  const matches = date.match(formattedDateTimeExpression);
  const ordinal = getCalendarOrdinal(parseInt(matches[2]));

  return date.replace(formattedDateTimeExpression, `$1 $2${ordinal} $3`);
}

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
// Group line items via sku prefix, convert the object to an array and map the values back for a second reducer pass.
// Build OrderItems DTO by reducing aggregated items to compute titles, variants, quantities and total price.
// This is a potential candidate for optimisation, although my preference would be to start at the source and modify the API to return a sanitised data object,
// the server being a more predictable and controllable environment for heavy data manipulation. Perhaps WebAssembly could help here if server-side sanitisation
// isn't possible?

/**
 * @function
 * @name lineItemsToAggregate
 * @description Transform `line_items` into an OrderItem[] DTO.
 *
 * @param {Object} lineItems - JSON API `line_items` object.
 *
 * @return { import("./order-history.ontology").OrderItem[] } An array of purchase items.
 */
function lineItemsToAggregate(lineItems) {
  const model = Object.values(
    lineItems.reduce((rv, item) => {
      const sku = item['sku'].split('-')[0];
      (rv[sku] = rv[sku] || []).push(item);
      return rv;
    }, {})
  );

  return model.reduce((rv, lineItem) => {
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
}

/**
 * @function
 * @name transform
 * @description Transform an API Response into an Order DTO.
 *
 * @param {string} json - JSON API response body.
 *
 * @return { import("./order-history.ontology").Order[] } An array of customer orders.
 * @throws {ClientRequestError} `json` must contain a successful api response of order-history items.
 */
function transform(json) {
  if (!Array.isArray(json) || json.length <= 0 || !json[0].success)
    throw new ClientRequestError(ERROR_MESSAGES.CLIENT_REQUEST, 406);

  const model = json[0].orders;
  const orders = model.map(order => {
    const {
      id,
      name,
      shipping_address,
      fulfillments,
      total_price_usd,
      processed_at,
      line_items
    } = order;

    const orderType =
      Array.isArray(fulfillments) && fulfillments.length > 0
        ? 'Subscription'
        : 'One-time';
    const orderItems = lineItemsToAggregate(line_items);
    const deliveryAddress = `${shipping_address.address1}, ${shipping_address.city}, ${shipping_address.zip}`;

    return {
      id: id,
      orderNumber: name,
      // N.B. Assumption that a 'fulfillment' is a purchase order with a repeatable deliverable, i.e. subscription
      orderType,
      totalPrice: total_price_usd,
      dispatchDate: processed_at ? formatDateTime(processed_at) : null,
      orderItems,
      deliveryAddress
    };
  });

  return orders;
}

function handleException(status) {
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

/**
 * @function
 * @name get
 * @description Fetch an order history for a given customer.
 *
 * @return { import("./order-history.ontology").Order[] } An array of customer orders.
 * @throws Will throw an error if the network request fails for any reason.
 */
export async function get() {
  let response;

  try {
    response = await fetch(
      'https://reactasty.apps.huel.io/api/customer/orders'
    );
    if (!response.ok) {
      // N.B. Crude error handling logic to account for any issues api may present in future.
      handleException(response.status);
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

  const json = await response.json();
  return transform(json);
}

export default {
  get
};
