import React from 'react';

const Dashboard = () => {
  return (
    <div className="columns">
      <div className="column is-12">
        <div className="box content">
          <h1>
            Hello <span>👋</span>
          </h1>
          <p>Here are some instructions to get you going :-)</p>
          <p>
            The problem that this test contains is an actual challenge that we
            faced during the development of our custom account area.
          </p>
          <p>
            The main focus is on data manipulation and presenting order history
            information to a customer by bundling the products from an API call
            in a structured and more readable way. In the Order History view
            there is a component with some hardcoded HTML that needs to be
            transformed into a React component that is fetching the data the API
            endpoint.
          </p>
          <p>
            The goal is to make the component look as close as possible to the
            hardcoded version of it.
          </p>
          <ul>
            <li>
              Here is the endpoint to pull the information from:{' '}
              <a
                href="https://reactasty.apps.huel.io/api/customer/orders"
                rel="noopener noreferrer"
                target="_blank"
              >
                https://reactasty.apps.huel.io/api/customer/orders
              </a>
            </li>
            <li>You can install any npm package</li>
            <li>
              Psst! Items can be bundled as variant or product groups{' '}
              <span>😊</span>
            </li>
          </ul>
          <p>If you have any questions just drop us a message.</p>
          <p>Good luck!</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
