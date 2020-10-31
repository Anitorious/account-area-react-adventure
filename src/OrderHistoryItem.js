import React from 'react';

const OrderHistoryItem = ({ order }) => {
  return (
    <div className="column is-12">
      <div className="box orders-history-block has-shadow-hover">
        <div className="is-flex orders-block-header">
          <div className="item">
            <div>Order Number</div>
            <div>{order.orderNumber}</div>
          </div>
          <div className="item">
            <div>Order Type</div>
            <div>
              <p
                className={
                  order.orderType === 'One-time' ? 'is-onetime' : undefined
                }
              >
                {order.orderType}
              </p>
            </div>
          </div>
          <div className="item">
            <div>Price</div>
            <div>${order.totalPrice}</div>
          </div>
          <div className="item">
            <div>Dispatch Date</div>
            <div>{order.dispatchDate || 'Not yet dispatched'}</div>
          </div>
        </div>
        <hr />
        <div className="order-information">
          {Boolean(order.dispatchDate) && (
            <p className="title is-6 is-marginless">
              It&apos;s been dispatched!
            </p>
          )}
          <div>
            <div className="order-information-expanded">
              <div className="product-list-boxes columns is-multiline">
                {order.orderItems.map(item => (
                  <div className="column is-6">
                    <div className="media">
                      <div className="media-left">
                        <img
                          alt="Product bars"
                          className="image"
                          src="https://cdn.shopify.com/s/files/1/0578/1097/products/HUEL_SHAKER_FROSTER_FR_1200.jpg?v=1515319444"
                        />
                      </div>
                      <div className="media-content">
                        <div>
                          <p className="product-title">{item.name}</p>
                          <p className="product-variants">{item.descriptor}</p>
                        </div>
                      </div>
                      <div className="media-right">
                        <p className="product-price">${item.price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <hr />
              <div className="is-flex order-footer-information">
                <div className="left-info">
                  <div>Delivery Address</div>
                  <div>{order.deliveryAddress}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryItem;
