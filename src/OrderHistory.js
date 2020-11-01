import React, { useEffect, useState } from 'react';
import PageHeader from './PageHeader';
import OrderHistoryItem from './OrderHistoryItem';
import { ERROR_REGISTRY } from './factors/errors/errors.module';
import OrderHistoryService from './factors/order-history.service';

const ERROR_CODES = {
  NETWORK_FAILURE: 0,
  REQUEST_FAILURE: 1
};

const OrderHistory = () => {
  const [orders, setOrders] = useState(null);
  const [errorCode, setErrorCode] = useState(-1);

  useEffect(() => {
    (async () => {
      try {
        const response = await OrderHistoryService.get();
        setOrders(response);
      } catch (error) {
        console.log(error);
        switch (error.name) {
          case ERROR_REGISTRY.NETWORK_FAILURE:
            setErrorCode(ERROR_CODES.NETWORK_FAILURE);
            break;
          default:
            setErrorCode(ERROR_CODES.REQUEST_FAILURE);
            break;
        }
      }
    })();
  }, []);

  return (
    <div className="columns is-multiline">
      <PageHeader title="Order History" />
      <div>
        {errorCode === ERROR_CODES.NETWORK_FAILURE && (
          <div className="column is-12">
            <div className="box orders-history-block has-shadow-hover">
              <div className="order-information">
                <h1 className="title">Ground Control to Major Tom</h1>
                <p>
                  It appears your connection to Ground Control has been
                  interrupted by a Space Oddity.
                </p>
              </div>
            </div>
          </div>
        )}
        {errorCode === ERROR_CODES.REQUEST_FAILURE && (
          <div className="column is-12">
            <div className="box orders-history-block has-shadow-hover">
              <div className="order-information">
                <h1 className="title">Domo Arigato Misuta Robotto</h1>
                <p>
                  We're having issues locating your order history. If this issue
                  persists, <a href="#">contact our team</a>.
                </p>
              </div>
            </div>
          </div>
        )}
        {Boolean(orders) &&
          orders.map(order => (
            <OrderHistoryItem key={order.id} order={order} />
          ))}
      </div>
    </div>
  );
};

export default OrderHistory;
