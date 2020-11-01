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
