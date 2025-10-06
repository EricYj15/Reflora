// FILE: src/pages/CheckoutPage.js

import React from 'react';
import Checkout from '../components/Checkout/Checkout';
import ContactFooter from '../components/ContactFooter/ContactFooter';

const CheckoutPage = ({ items, onOrderComplete, onOpenPolicy }) => {
  return (
    <>
      <Checkout items={items} onOrderComplete={onOrderComplete} onOpenPolicy={onOpenPolicy} />
      <ContactFooter />
    </>
  );
};

export default CheckoutPage;
