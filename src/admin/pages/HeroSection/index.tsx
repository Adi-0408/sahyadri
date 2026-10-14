import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HeroContentTab } from './components/HeroContentTab';
import { DistrictManagementTab } from './components/DistrictManagementTab';
import { TalukaManagementTab } from './components/TalukaManagementTab';
import { PropertyTypeTab } from './components/PropertyTypeTab';
import { Image, MapPin, Map, Layers } from 'lucide-react';

export const HeroSectionManager: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'content' | 'districts' | 'talukas' | 'types'>('content');

  const tabs = [
    {
      id: 'content',
      label: t('admin.heroSection.tabs.content'),
      icon: <Image className="w-4 h-4" />,
      component: <HeroContentTab />
    },
    {
      id: 'districts',
      label: t('admin.heroSection.tabs.districts'),
      icon: <MapPin className="w-4 h-4" />,
      component: <DistrictManagementTab />
    },
    {
      id: 'talukas',
      label: t('admin.heroSection.tabs.talukas'),
      icon: <Map className="w-4 h-4" />,
      component: <TalukaManagementTab />
    },
    {
      id: 'types',
      label: t('admin.heroSection.tabs.types'),
      icon: <Layers className="w-4 h-4" />,
      component: <PropertyTypeTab />
    }
  ];

  return (
    <div className="space-y-8 text-left font-sans select-none">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">{t('admin.heroSection.title')}</h1>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'border-primary text-primary font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Body */}
      <div className="animate-fade-in py-1">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};

export default HeroSectionManager;
