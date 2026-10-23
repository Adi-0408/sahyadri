import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HouseListingForm } from './HouseListingForm';
import { FlatListingForm } from './FlatListingForm';
import { BungalowListingForm } from './BungalowListingForm';
import { PlotListingForm } from './PlotListingForm';
import { LandListingForm } from './LandListingForm';
import {
  CheckCircle, Home, Building, LayoutGrid, Building2, Store, MonitorPlay,
  Map, Layout, Users, Hammer, ArrowLeft, Key, Briefcase, ChevronRight,
  Tractor, Mountain, Warehouse
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isMobileDevice } from '../../utils/device';
import { useAuth } from '../../app/providers/AuthProvider';

// Define a map for string icon names to actual Lucide components
const IconMap: { [key: string]: any } = {
  Building, Home, LayoutGrid, Building2, Store, MonitorPlay,
  Map, Layout, Users, Hammer, Key, Briefcase, ChevronRight,
  Tractor, Mountain, Warehouse
};

export const PostProperty: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [isMobileDeviceActive, setIsMobileDeviceActive] = useState(false);

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/post-property', { replace: true });
    }
  }, [user, authLoading, navigate]);

  React.useEffect(() => {
    setIsMobileDeviceActive(isMobileDevice());
  }, []);

  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [submittedCode, setSubmittedCode] = useState('');
  const [propertyTypesList, setPropertyTypesList] = useState<any[]>([]);
  const [category, setCategory] = useState('Flat');
  const [transactionType, setTransactionType] = useState<'sale' | 'rent'>('sale');

  // Auto-select category if provided via query param (e.g. from Seller Dashboard)
  React.useEffect(() => {
    const catParam = searchParams.get('category');
    if (catParam) {
      const validCategories = ['House', 'Flat', 'Bungalow', 'Plot', 'Land'];
      const matched = validCategories.find(c => c.toLowerCase() === catParam.toLowerCase());
      if (matched) {
        setCategory(matched);
        setStep(1);
      }
    }
  }, [searchParams]);

  // Automatically scroll to top of window whenever the active step or success state changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step, success]);

  React.useEffect(() => {
    const types = [
      { 
        id: 'house', 
        label: 'House', 
        iconName: 'Home',
        bgClass: 'bg-blue-50',
        colorClass: 'text-blue-500',
        descKey: 'houseDesc',
        group: 'RESIDENTIAL'
      },
      { 
        id: 'flat', 
        label: 'Flat', 
        iconName: 'Building',
        bgClass: 'bg-purple-50',
        colorClass: 'text-purple-500',
        descKey: 'flatDesc',
        group: 'RESIDENTIAL'
      },
      { 
        id: 'bungalow', 
        label: 'Bungalow', 
        iconName: 'Warehouse',
        bgClass: 'bg-amber-50',
        colorClass: 'text-amber-500',
        descKey: 'bungalowDesc',
        group: 'RESIDENTIAL'
      },
      { 
        id: 'plot', 
        label: 'Plot', 
        iconName: 'Mountain',
        bgClass: 'bg-emerald-50',
        colorClass: 'text-emerald-500',
        descKey: 'plotDesc',
        group: 'PLOT & LAND'
      },
      { 
        id: 'land', 
        label: 'Land', 
        iconName: 'Tractor',
        bgClass: 'bg-orange-50',
        colorClass: 'text-orange-500',
        descKey: 'landDesc',
        group: 'PLOT & LAND'
      }
    ];
    setPropertyTypesList(types);
  }, []);

  const groupedPropertyTypes = React.useMemo(() => {
    return propertyTypesList.reduce((acc: any[], pt: any) => {
      const group = acc.find(g => g.group === pt.group);
      if (group) {
        group.options.push(pt);
      } else {
        acc.push({ group: pt.group, options: [pt] });
      }
      return acc;
    }, []);
  }, [propertyTypesList]);

  const renderListingForm = () => {
    const formProps = {
      onBack: () => setStep(0),
      onSuccess: (code: string) => {
        setSubmittedCode(code);
        setSuccess(true);
      },
      onTransactionTypeChange: setTransactionType
    };

    switch (category) {
      case "House":
        return <HouseListingForm {...formProps} />;
      case "Flat":
        return <FlatListingForm {...formProps} />;
      case "Bungalow":
        return <BungalowListingForm {...formProps} />;
      case "Plot":
        return <PlotListingForm {...formProps} />;
      case "Land":
        return <LandListingForm {...formProps} />;
      default:
        return <HouseListingForm {...formProps} />;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-24 pb-16">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold">{t('auth.redirectingToLogin', 'लॉगिन पृष्ठावर पुनर्निर्देशित करत आहे...')}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen text-slate-900 bg-slate-50 pt-24 sm:pt-28 pb-16 px-4 sm:px-6 md:px-12 relative overflow-hidden text-left">
        {/* Background Colorful Blurs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-orange-400/30 rounded-full blur-[140px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/25 rounded-full blur-[140px]"></div>
        </div>
        <div className="max-w-3xl mx-auto flex flex-col gap-8 relative z-10">
          <Card className="p-10 bg-white/90 backdrop-blur-md border border-green-500/20 shadow-2xl shadow-green-500/10 text-center flex flex-col items-center gap-6" >
            <CheckCircle className="w-16 h-16 text-green-450 animate-bounce" />
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">{t('forms.submissionSuccessful')}</h2>
              <p className="text-slate-600 text-sm max-w-md leading-relaxed">
                {t('forms.submissionSuccessDesc')}
              </p>
            </div>
            
            {submittedCode && (
              <div className="bg-[#111c2e] text-white p-6 rounded-2xl w-full max-w-sm flex flex-col items-center justify-center shadow-lg border border-white/5 my-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                  Your Property Code
                </span>
                <span className="text-2xl font-mono font-black tracking-widest text-white">
                  {submittedCode}
                </span>
                <span className="text-[9px] text-slate-400 mt-2 font-semibold">
                  Save this code for future reference
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full justify-center">
              {user?.role === 'seller' && (
                <Button
                  onClick={() => navigate('/seller/dashboard')}
                  variant="primary"
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-md"
                >
                  🏠 {i18n.language?.startsWith('mr') ? 'माझ्या विक्रेता डॅशबोर्डवर जा' : 'Go to Seller Dashboard'}
                </Button>
              )}
              <Button
                onClick={() => navigate('/properties')}
                variant={user?.role === 'seller' ? 'outline' : 'primary'}
                className="px-8 rounded-xl font-bold"
              >
                {t('forms.returnToListings')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 pt-24 sm:pt-28 pb-16 px-4 sm:px-6 md:px-12 relative overflow-hidden text-left">
      {/* Background Colorful Blurs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-orange-400/30 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/25 rounded-full blur-[140px]"></div>
        <div className="absolute top-[35%] left-[15%] w-[40%] h-[40%] bg-amber-400/30 rounded-full blur-[140px]"></div>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col gap-8 relative z-10">

        {/* Top Header/Logo and Title Area */}
        <div className="flex flex-col gap-6">
          {step === 0 ? (
            <div className="flex flex-col items-center text-center relative w-full">
              {/* Back Button positioned absolute left */}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-0 top-1 p-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary/30 hover:shadow-md transition-all text-slate-600"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              {/* Logo */}
              <img src="/sahyadri-logo.png" alt="Sahyadri Lands" className="h-16 object-contain mb-2" />

              {/* Title & Underline layout */}
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-2">
                {t('forms.whatKindOfProperty')}
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-3"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center relative w-full">
              {/* Back Button positioned absolute left */}
              <button
                type="button"
                onClick={() => setStep(0)}
                className="absolute left-0 top-1 p-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary/30 hover:shadow-md transition-all text-slate-600"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              {/* Logo */}
              <img src="/sahyadri-logo.png" alt="Sahyadri Lands" className="h-16 object-contain mb-2" />

              {/* Title & Underline layout */}
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-2">
                {transactionType === 'sale' 
                  ? t('forms.sellCategory', { category: t(`categories.${category.toLowerCase()}`, category) }) 
                  : t('forms.rentCategory', { category: t(`categories.${category.toLowerCase()}`, category) })}
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-3"></div>
            </div>
          )}
        </div>

        {/* Onboarding Seller Inquiry Banner for Guest/User */}
        {user?.role === 'user' && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>✨</span>
                <span>घर किंवा फ्लॅट विकण्यासाठी विक्रेता म्हणून नोंदणी करा</span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                पहिली मालमत्ता नोंदवून ॲडमिन मंजुरी मिळवा आणि आपले स्वतंत्र विक्रेता डॅशबोर्ड मिळवा.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/role-inquiry?role=seller')}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow transition-all cursor-pointer"
            >
              विक्रेता चौकशी फॉर्म भरा →
            </button>
          </div>
        )}

        <Card key={step} className="p-4 sm:p-6 md:p-8 bg-white/95 backdrop-blur-xl border-slate-200/60 shadow-2xl shadow-primary/5 tab-transition" >

          {step === 0 ? (
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">

              {/* STEP 0: Property Type Selection */}
              
              {/* Mobile View Layout (Vertical Full Width Cards) */}
              <div className={`${isMobileDeviceActive ? 'flex flex-col' : 'flex flex-col gap-4 md:hidden'} gap-4`}>
                {propertyTypesList.map((opt: any) => {
                  const IconComp = IconMap[opt.iconName] || Home;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setCategory(opt.label);
                        setStep(1); // Move to the advanced form
                      }}
                      className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 gap-4 text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${opt.bgClass} ${opt.colorClass} transition-transform duration-300 group-hover:scale-110`}>
                          <IconComp className="w-6 h-6" strokeWidth={1.8} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-slate-800 transition-colors group-hover:text-slate-900">
                            {t(`categories.${opt.id}`, opt.label) as string}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5">
                            {t(`forms.${opt.descKey}`) as string}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  );
                })}
              </div>

              {/* Desktop/Web View Layout (Original Grouped Grid Cards) */}
              {!isMobileDeviceActive && (
                <div className="hidden md:flex flex-col gap-6">
                {groupedPropertyTypes.map((group) => {
                  const groupKey = group.group === 'PLOT & LAND' ? 'plot_land' : 'residential';
                  return (
                    <div key={group.group} className="flex flex-col gap-4 mb-2 last:mb-0">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-serif">
                          {t(`categories.${groupKey}`, group.group) as string}
                        </h3>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {group.options.map((opt: any) => {
                          const IconComp = IconMap[opt.iconName] || Home;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setCategory(opt.label);
                                setStep(1); // Move to the advanced form
                              }}
                              className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ease-out gap-3 hover:-translate-y-1 relative overflow-hidden text-center"
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className={`p-4 rounded-2xl ${opt.bgClass} ${opt.colorClass} transition-transform duration-300 group-hover:scale-110 z-10`}>
                                <IconComp className="w-8 h-8" strokeWidth={1.8} />
                              </div>
                              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 z-10 transition-colors">
                                {t(`categories.${opt.id}`, opt.label) as string}
                              </span>
                              <span className="text-[11px] text-slate-500 z-10 mt-1 leading-relaxed max-w-[80%]">
                                {t(`forms.${opt.descKey}`) as string}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

            </form>
          ) : (
            renderListingForm()
          )}
        </Card>

      </div>
    </div>
  );
};
