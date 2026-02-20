import React from 'react';
import Billing from './Billing';

const TreatmentBilling = ({ user }) => {
    return <Billing user={user} mode="treatment" />;
};

export default TreatmentBilling;
