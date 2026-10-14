import React from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyManagerBase } from '../PropertyManagerBase';

export const PropertyForRent: React.FC = () => {
  const { t } = useTranslation();
  return (
    <PropertyManagerBase
      filterType="rent"
      title={t('admin.sidebar.propertyForRent')}
      subtitle={t('admin.propertyManager.rentSubtitle')}
    />
  );
};

export default PropertyForRent;
