import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card as UICard } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Search, MapPin, ArrowLeft, Send, CheckSquare, Square, X } from 'lucide-react';
import { fetchCollection } from '../../../services/firebase';

interface Client {
  id: string;
  name: string;
  email: string;
  role?: string;
  interest?: string;
  createdAt?: string;
}

interface Property {
  id: string;
  title: string;
  propertyCode: string;
  category: string;
  type: string;
  price: number;
  expectedPrice?: number;
  images?: string[];
  district?: string;
  taluka?: string;
  isSoldOut?: boolean;
}

export const SendProperty: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const passedUser = location.state?.user as Client;

  // States for Data
  const [allUsers, setAllUsers] = useState<Client[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  
  // State for Selection
  const [selectedClient, setSelectedClient] = useState<Client | null>(passedUser || null);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  
  // State for Search & Filter
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [propSearchQuery, setPropSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTaluka, setSelectedTaluka] = useState('');


  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const usersData = await fetchCollection('users');
        setAllUsers(usersData);
        
        const propsData = await fetchCollection('properties');
        setAllProperties(propsData);

        const districtsData = await fetchCollection('districts');
        setDistricts(districtsData.sort((a: any, b: any) => (a.label || '').localeCompare(b.label || '')));

        const talukasData = await fetchCollection('talukas');
        setTalukas(talukasData.sort((a: any, b: any) => (a.label || '').localeCompare(b.label || '')));
      } catch (error) {
        console.error("Error loading data", error);
      }
    };
    loadData();
  }, []);

  const getDisplayMobile = (u: any) => {
    if (u?.mobile) return String(u.mobile);
    if (u?.mobileNumber) return String(u.mobileNumber);
    if (u?.phone) return String(u.phone);
    if (u?.phoneNumber) return String(u.phoneNumber);
    if (!u?.email) return '-';
    if (u.email.endsWith('@astitvarealestate.com') || u.email.endsWith('@propertyastitv.com') || u.email.endsWith('@propertyvishva.com')) {
      const num = u.email.split('@')[0];
      if (num.length === 10 && /^\d+$/.test(num)) return num;
    }
    return u.email;
  };

  const filteredClients = allUsers.filter(u => {
    if (!clientSearchQuery) return false;
    const q = clientSearchQuery.toLowerCase();
    const mobile = getDisplayMobile(u).toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || mobile.includes(q);
  });

  const filteredProperties = allProperties.filter(p => {
    let match = true;
    
    if (propSearchQuery) {
      const q = propSearchQuery.toLowerCase();
      const textMatch = p.title?.toLowerCase().includes(q) || 
             p.propertyCode?.toLowerCase().includes(q) ||
             p.district?.toLowerCase().includes(q) ||
             p.taluka?.toLowerCase().includes(q);
      if (!textMatch) match = false;
    }

    if (selectedDistrict && p.district !== selectedDistrict) {
      match = false;
    }

    if (selectedTaluka && p.taluka !== selectedTaluka) {
      match = false;
    }

    if (selectedType && p.type !== selectedType) {
      match = false;
    }

    return match;
  });

  const togglePropertySelection = (prop: Property) => {
    if (selectedProperties.find(p => p.id === prop.id)) {
      setSelectedProperties(prev => prev.filter(p => p.id !== prop.id));
    } else {
      setSelectedProperties(prev => [...prev, prop]);
    }
  };

  const selectAllFiltered = () => {
    const allSelected = filteredProperties.every(p => selectedProperties.find(sp => sp.id === p.id));
    if (allSelected) {
      setSelectedProperties(prev => prev.filter(sp => !filteredProperties.find(fp => fp.id === sp.id)));
    } else {
      const newSelections = filteredProperties.filter(p => !selectedProperties.find(sp => sp.id === p.id));
      setSelectedProperties(prev => [...prev, ...newSelections]);
    }
  };

  // getDisplayMobile moved up for filtering

  const generateMessage = () => {
    return selectedProperties.map(p => p.propertyCode).join(', ');
  };

  const handleSend = async () => {
    if (selectedProperties.length === 0) return;
    setLoading(true);
    
    const message = generateMessage();
    const encodedMessage = encodeURIComponent(message);
    let mobile = '-';
    
    if (selectedClient) {
      mobile = getDisplayMobile(selectedClient);
    }

    if (mobile !== '-') {
      window.open(`https://wa.me/91${mobile}?text=${encodedMessage}`, '_blank');
      setSuccessMessage(`${selectedProperties.length} Property Code(s) sent to WhatsApp!`);
    } else {
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
      setSuccessMessage(`${selectedProperties.length} Property Code(s) sent to WhatsApp!`);
    }
    
    setLoading(false);
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <div className="space-y-6 text-left pb-20 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-6 h-6 text-[#0b0f19]" />
            Send Property to Client
          </h1>
          <p className="text-sm text-slate-500 font-medium">Search matching properties and send their codes via WhatsApp.</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl font-medium shadow-sm flex items-center gap-3">
          <CheckSquare className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section 1: Client Information */}
          <UICard className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                Client Information
              </h2>
            </div>
            
            {!selectedClient ? (
              <div className="space-y-4">
                <Input
                  icon={Search}
                  placeholder="Search Client by Name or Mobile Number..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                />
                
                {filteredClients.length > 0 && clientSearchQuery && (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto bg-slate-50">
                    {filteredClients.map(client => (
                      <div 
                        key={client.id}
                        className="p-3 hover:bg-white cursor-pointer transition-colors flex justify-between items-center"
                        onClick={() => {
                          setSelectedClient(client);
                          setClientSearchQuery('');
                        }}
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{client.name}</p>
                          <p className="text-xs text-slate-500">{getDisplayMobile(client)}</p>
                        </div>
                        <span className="text-[10px] uppercase font-bold bg-slate-200 px-2 py-1 rounded text-slate-600">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl relative">
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="absolute top-4 right-4 p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500"
                  title="Change Client"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedClient.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{getDisplayMobile(selectedClient)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Role / Type</label>
                    <p className="font-semibold text-slate-900 mt-0.5 uppercase text-sm">
                      {selectedClient.role || 'USER'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property Requirement / Interest</label>
                    <p className="font-semibold text-slate-900 mt-0.5 text-sm">
                      {selectedClient.interest || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </UICard>

          {/* Section 2: Property Search */}
          <UICard className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                Search Properties
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-3">
                <Input
                  icon={Search}
                  placeholder="Search by Property Code, Title, Area..."
                  value={propSearchQuery}
                  onChange={(e) => setPropSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                options={[
                  { value: '', label: 'All Properties' },
                  { value: 'sale', label: 'Sell' },
                  { value: 'rent', label: 'Rent' }
                ]}
                className="py-3 text-sm font-medium"
              />
              <Select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedTaluka(''); // Reset taluka when district changes
                }}
                options={[
                  { value: '', label: 'All Districts' },
                  ...districts.map(d => ({ value: d.label, label: d.label }))
                ]}
                className="py-3 text-sm font-medium"
              />
              <Select
                value={selectedTaluka}
                onChange={(e) => setSelectedTaluka(e.target.value)}
                options={[
                  { value: '', label: 'All Talukas' },
                  ...talukas
                    .filter(t => !selectedDistrict || t.districtId === districts.find(d => d.label === selectedDistrict)?.id)
                    .map(t => ({ value: t.label, label: t.label }))
                ]}
                className="py-3 text-sm font-medium"
              />
            </div>
          </UICard>

          {/* Section 3: Available Properties */}
          <UICard className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</span>
                Available Properties
              </h2>
              <span className="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-full">
                {filteredProperties.length} Found
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider">
                  <tr>
                    <th className="px-4 py-4 w-12 text-center">
                      <button onClick={selectAllFiltered} className="text-white hover:text-blue-300">
                        {filteredProperties.length > 0 && filteredProperties.every(p => selectedProperties.find(sp => sp.id === p.id)) ? (
                          <CheckSquare className="w-4 h-4 mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 mx-auto" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-4">Property</th>
                    <th className="px-4 py-4">Code</th>
                    <th className="px-4 py-4">Location</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {filteredProperties.slice(0, 50).map(prop => {
                    const isSelected = !!selectedProperties.find(p => p.id === prop.id);
                    return (
                      <tr key={prop.id} className={`hover:bg-blue-50/50 transition-colors ${isSelected ? 'bg-blue-50/80' : 'bg-white'}`}>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => togglePropertySelection(prop)} className={isSelected ? 'text-blue-600' : 'text-slate-400'}>
                            {isSelected ? <CheckSquare className="w-5 h-5 mx-auto" /> : <Square className="w-5 h-5 mx-auto" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                              <img src={(prop.images && prop.images[0]) || '/hero-background.jpg'} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-slate-900 line-clamp-2 max-w-[200px]">{prop.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{prop.propertyCode}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[120px]">{prop.taluka || prop.district || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          ₹{(prop.price || prop.expectedPrice || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${prop.isSoldOut ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            {prop.isSoldOut ? 'Sold Out' : 'Available'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProperties.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                        No properties found matching your search.
                      </td>
                    </tr>
                  )}
                  {filteredProperties.length > 50 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-slate-400 text-[10px] uppercase tracking-wider font-bold bg-slate-50">
                        Showing first 50 results. Please refine your search to see more.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </UICard>

        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            
            {/* Section 4 & Action Buttons: Selected Properties */}
            <UICard className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col h-[calc(100vh-120px)] max-h-[800px]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4 shrink-0">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                  Selected ({selectedProperties.length})
                </h2>
                {selectedProperties.length > 0 && (
                  <button 
                    onClick={() => setSelectedProperties([])}
                    className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-4">
                {selectedProperties.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 flex flex-col items-center">
                    <Square className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs uppercase font-bold tracking-wider">No Properties Selected</p>
                  </div>
                ) : (
                  <>
                    {selectedProperties.map(prop => (
                      <div key={prop.id} className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl relative group">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={(prop.images && prop.images[0]) || '/hero-background.jpg'} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 pr-6">
                          <p className="font-bold text-xs text-slate-900 line-clamp-1">{prop.title}</p>
                          <p className="font-mono text-[10px] font-bold text-blue-600 mt-0.5">{prop.propertyCode}</p>
                          <p className="text-xs font-bold text-slate-700 mt-1">₹{(prop.price || prop.expectedPrice || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <button 
                          onClick={() => togglePropertySelection(prop)}
                          className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100 shrink-0">
                <Button 
                  variant="primary" 
                  className="w-full justify-center py-3.5 text-sm rounded-xl font-bold bg-[#0b0f19] hover:bg-slate-800 transition-all shadow-md" 
                  onClick={handleSend}
                  isLoading={loading}
                  disabled={selectedProperties.length === 0 || loading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send {selectedProperties.length} Properties
                </Button>
              </div>
            </UICard>

          </div>
        </div>
      </div>
    </div>
  );
};
