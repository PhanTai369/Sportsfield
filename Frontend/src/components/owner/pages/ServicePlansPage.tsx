import React from "react";
import ServicePlans from "./ServicePlans";

const ServicePlansPage: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1">
        <ServicePlans />
      </div>
    </div>
  );
};

export default ServicePlansPage;
