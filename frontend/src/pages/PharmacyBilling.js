import React from 'react';
import Billing from './Billing';

const PharmacyBilling = ({ user }) => {
    return <Billing user={user} mode="pharmacy" />;
};

export default PharmacyBilling;
