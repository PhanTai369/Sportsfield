import React from "react";
import ServicePlanManagement from "./ServicePlanManagement";

const ServicePlanManagementPage: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1">
        <ServicePlanManagement />
      </div>
    </div>
  );
};

export default ServicePlanManagementPage;
