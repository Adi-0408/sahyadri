import React from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyManagerBase } from '../PropertyManagerBase';

export const PropertyForSell: React.FC = () => {
  const { t } = useTranslation();
  return (
    <PropertyManagerBase
      filterType="sale"
      title={t('admin.sidebar.propertyForSell')}
      subtitle={t('admin.propertyManager.sellSubtitle')}
    />
  );
};

export default PropertyForSell;
