import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToDocument } from '../../../services/firebase';
import { HouseListingForm } from '../../../public-pages/Properties/HouseListingForm';
import { FlatListingForm } from '../../../public-pages/Properties/FlatListingForm';
import { BungalowListingForm } from '../../../public-pages/Properties/BungalowListingForm';
import { LandListingForm } from '../../../public-pages/Properties/LandListingForm';
import { PlotListingForm } from '../../../public-pages/Properties/PlotListingForm';

export const PropertyEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsubscribe = subscribeToDocument('properties', id, (doc) => {
      setProperty(doc);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSuccess = () => {
    // Navigate back to properties list or show success message
    navigate('/admin/properties');
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">Property Not Found</h2>
        <button onClick={handleBack} className="mt-4 px-4 py-2 bg-slate-200 rounded">Go Back</button>
      </div>
    );
  }

  // Determine which form to render based on category
  const category = (property.category || '').toLowerCase();
  
  let FormComponent;
  if (category === 'flat') {
    FormComponent = FlatListingForm;
  } else if (category === 'bungalow' || category === 'banglow') {
    FormComponent = BungalowListingForm;
  } else if (category === 'plot') {
    FormComponent = PlotListingForm;
  } else if (category === 'land') {
    FormComponent = LandListingForm;
  } else {
    FormComponent = HouseListingForm;
  }

  return (
    <div className="p-6 pb-20 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={handleBack} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          &larr; Back
        </button>
        <h1 className="text-2xl font-black text-slate-800">
          Edit Property: {property.title || property.propertyName || property.id}
        </h1>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-4xl mx-auto">
        <FormComponent 
          isEditMode={true} 
          initialData={property} 
          onBack={handleBack} 
          onSuccess={handleSuccess} 
        />
      </div>
    </div>
  );
};
