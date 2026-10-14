import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../../../services/firebase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Dialog } from '../../../components/ui/Dialog';
import {
  Check,
  X,
  Trash2,
  Edit,
  Plus,
  Eye,
  Phone,
  User,
  Pause,
  HelpCircle
} from 'lucide-react';

export const PropertiesManager: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [properties, setProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Open state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Active/Editing Property
  const [editingProp, setEditingProp] = useState<any>(null);
  const [activeProp, setActiveProp] = useState<any>(null);
  const [actionProp, setActionProp] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'hold' | 'request_info' | null>(null);
  const [remarks, setRemarks] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [locationField, setLocationField] = useState('');
  const [beds, setBeds] = useState('3');
  const [baths, setBaths] = useState('2');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState('Villa');
  const [gutNumber, setGutNumber] = useState('');
  const [type, setType] = useState('sale');
  const [imageLink, setImageLink] = useState('');
  const [ownerName, setOwnerName] = useState('Concierge');
  const [ownerEmail, setOwnerEmail] = useState('contact@astitvarealestate.com');
  const [ownerPhone, setOwnerPhone] = useState('+91 83287 12712');
  const [status, setStatus] = useState('pending');
  const [isAdminNegotiable, setIsAdminNegotiable] = useState<string>('true');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToCollection('properties', (list) => {
      setProperties(list);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Filter properties based on URL route path and search query
  useEffect(() => {
    const path = location.pathname;
    let list = [...properties];
    if (path.includes('/pending')) {
      list = list.filter((p) => p.status === 'pending');
    } else if (path.includes('/approved')) {
      list = list.filter((p) => p.status === 'approved' || p.status === 'active');
    } else if (path.includes('/rejected')) {
      list = list.filter((p) => p.status === 'rejected');
    } else if (path.includes('/onhold')) {
      list = list.filter((p) => p.status === 'onhold');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => 
        (p.title || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.gutNumber || '').toLowerCase().includes(q)
      );
    }

    setFilteredProperties(list);
  }, [properties, location.pathname, searchQuery]);

  const handleOpenAdd = () => {
    setEditingProp(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setLocationField('');
    setBeds('3');
    setBaths('2');
    setArea('');
    setCategory('Villa');
    setGutNumber('');
    setType('sale');
    setImageLink('');
    setOwnerName('Concierge');
    setOwnerEmail('contact@astitvarealestate.com');
    setOwnerPhone('+91 83287 12712');
    setStatus('approved'); // Admins submit approved listings directly
    setIsAdminNegotiable('true');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prop: any) => {
    setEditingProp(prop);
    setTitle(prop.title);
    setDescription(prop.description);
    setPrice(prop.price.toString());
    setLocationField(prop.location);
    setBeds(prop.beds?.toString() || '0');
    setBaths(prop.baths?.toString() || '0');
    setArea(prop.area?.toString() || '');
    setCategory(prop.category);
    setGutNumber(prop.gutNumber || '');
    setType(prop.type);
    setImageLink(prop.images?.[0] || '');
    setOwnerName(prop.ownerName || '');
    setOwnerEmail(prop.ownerEmail || '');
    setOwnerPhone(prop.ownerPhone || '');
    setStatus(prop.status);
    setIsAdminNegotiable(prop.isNegotiable !== undefined ? String(prop.isNegotiable) : 'true');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !price || !locationField) return;

    const payload = {
      title,
      description,
      price: parseFloat(price),
      location: locationField,
      beds: category === 'Land' ? 0 : parseInt(beds),
      baths: category === 'Land' ? 0 : parseFloat(baths),
      area: parseInt(area) || 2000,
      type,
      category,
      gutNumber: category === 'Land' ? gutNumber : '',
      images: [imageLink || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
      ownerName,
      ownerEmail,
      ownerPhone,
      status,
      isNegotiable: type === 'sale' ? (isAdminNegotiable === 'true') : false
    };

    try {
      if (editingProp) {
        await updateDocument('properties', editingProp.id, payload);
      } else {
        await createDocument('properties', {
          ...payload,
          isFeatured: false,
          createdAt: new Date().toISOString(),
          userId: 'admin'
        });
      }
      setIsFormOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePerformAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionType || !actionProp) return;

    if (actionType !== 'approve' && !remarks.trim()) {
      alert("Please enter a reason or remarks.");
      return;
    }

    let newStatus = 'pending';

    if (actionType === 'approve') {
      newStatus = 'approved';
    } else if (actionType === 'reject') {
      newStatus = 'rejected';
    } else if (actionType === 'hold' || actionType === 'request_info') {
      newStatus = 'onhold';
    }

    try {
      const updatePayload: any = { status: newStatus };

      // Set adminApproved and isActive flags for cross-platform compatibility (Android/Mobile)
      if (actionType === 'approve') {
        updatePayload.adminApproved = true;
        updatePayload.isActive = true;
      } else if (actionType === 'reject') {
        updatePayload.adminApproved = false;
        updatePayload.isActive = false;
      } else if (actionType === 'hold' || actionType === 'request_info') {
        updatePayload.isActive = false;
      }

      if (actionType === 'reject') {
        updatePayload.rejectionReason = remarks;
      } else if (actionType === 'hold' || actionType === 'request_info') {
        updatePayload.holdRemarks = remarks;
        if (actionType === 'request_info') {
          updatePayload.infoRequested = true;
        }
      }

      const currentActionProp = actionProp;
      const currentActionType = actionType;
      const currentRemarks = remarks;

      // Optimistically close modal immediately for snappy UI
      setIsActionModalOpen(false);
      setRemarks('');
      setActionProp(null);
      setActionType(null);

      await updateDocument('properties', currentActionProp.id, updatePayload);

      await createDocument('admin_logs', {
        adminId: user?.uid || 'admin-123',
        adminName: user?.displayName || 'Super Admin',
        actionType: currentActionType,
        propertyId: currentActionProp.id,
        propertyName: currentActionProp.title || currentActionProp.propertyName || 'Property',
        timestamp: new Date().toISOString(),
        remarks: currentRemarks || 'Approved without remarks'
      });
    } catch (err) {
      console.error("Failed to perform admin action:", err);
    }
  };


  const handleDelete = async (propId: string) => {
    if (!window.confirm("Are you sure you want to delete this listing permanently?")) return;
    try {
      await deleteDocument('properties', propId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">Property Inventory</h1>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold text-white cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
          <Plus className="w-4 h-4" /> Add Property
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search by Title, Location, or Gut Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <UICard className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden" >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider">
                <tr>
                  <th className="px-6 py-4">Preview</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-semibold">
                      No listings matching your current panel filter path.
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((prop) => (
                    <tr 
                      key={prop.id} 
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onDoubleClick={() => {
                        setActiveProp(prop);
                        setIsDetailOpen(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        <img src={prop.images?.[0]} alt="" className="w-12 h-9 rounded-lg object-cover border border-slate-200" />
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 max-w-[150px] truncate">{prop.title}</td>
                      <td className="px-6 py-4 max-w-[150px] truncate text-slate-500">{prop.location}</td>
                      <td className="px-6 py-4">
                        <div className="font-serif font-bold text-primary ">Rs {prop.price.toLocaleString()}</div>
                        {prop.type === 'sale' && prop.isNegotiable !== undefined && (
                          <div className="mt-1 flex">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                              prop.isNegotiable 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              <span>{prop.isNegotiable ? '🟢' : '🔴'}</span>
                              {prop.isNegotiable ? 'Negotiable' : 'Fixed'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold border ${
                          prop.status === 'approved' || prop.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          prop.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse' :
                          prop.status === 'onhold' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5 px-2.5 mt-1.5">
                        {/* Status Management buttons */}
                        {prop.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setActionProp(prop);
                                setActionType('approve');
                                setRemarks('');
                                setIsActionModalOpen(true);
                              }}
                              className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors"
                              title="Approve Listing"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setActionProp(prop);
                                setActionType('reject');
                                setRemarks('');
                                setIsActionModalOpen(true);
                              }}
                              className="p-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                              title="Reject Listing"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setActionProp(prop);
                                setActionType('hold');
                                setRemarks('');
                                setIsActionModalOpen(true);
                              }}
                              className="p-1.5 bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors"
                              title="Put On Hold"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setActionProp(prop);
                                setActionType('request_info');
                                setRemarks('');
                                setIsActionModalOpen(true);
                              }}
                              className="p-1.5 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                              title="Request Additional Info"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setActiveProp(prop);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                          title="View Contact Specs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(prop)}
                          className="p-1.5 text-slate-500 hover:text-primary rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                          title="Edit Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(prop.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer hover:bg-rose-50 transition-colors"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </UICard>
      )}

      {/* Add / Edit Form Modal */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProp ? 'Edit Property details' : 'Publish New Estate'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <Input label="Listing Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Narrative (Description)" value={description} onChange={(e) => setDescription(e.target.value)} required />

          <div className="grid grid-cols-2 gap-4">
            <Input type="number" label="Price (Rs)" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <Input type="number" label="Area Size (sqft)" value={area} onChange={(e) => setArea(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Transaction Type"
              options={[{ value: 'sale', label: 'For Sale' }, { value: 'rent', label: 'For Rent' }]}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <Select
              label="Category"
              options={[
                { value: 'Villa', label: 'Villa' },
                { value: 'Apartment', label: 'Apartment' },
                { value: 'Penthouse', label: 'Penthouse' },
                { value: 'Commercial', label: 'Commercial' },
                { value: 'Land', label: 'Land' }
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          {type === 'sale' && (
            <Select
              label="Price Negotiable"
              options={[{ value: 'true', label: 'Yes (Negotiable)' }, { value: 'false', label: 'No (Fixed Price)' }]}
              value={isAdminNegotiable}
              onChange={(e) => setIsAdminNegotiable(e.target.value)}
            />
          )}

          <Input label="Showcase Image URL" value={imageLink} onChange={(e) => setImageLink(e.target.value)} />

          <div className="border-t border-slate-200 pt-4 mt-2">
            <h4 className="text-xs uppercase tracking-widest text-slate-600 font-bold mb-3">Owner Contact Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
              <Input label="Phone" type="tel" maxLength={10} value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required />
            </div>
            <Input type="email" label="Email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required className="mt-3" />
          </div>

          <Select
            label="Listing Board Status"
            options={[
              { value: 'pending', label: 'Pending Review' },
              { value: 'approved', label: 'Approved & Active' },
              { value: 'rejected', label: 'Rejected' }
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2"
          />

          <div className="flex gap-3 justify-end mt-4">
            <Button type="button" variant="glass" onClick={() => setIsFormOpen(false)} className="py-2 px-4 rounded-xl text-xs border-slate-200">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="py-2 px-5 rounded-xl text-xs text-slate-900 font-bold">
              Save Estate
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Details Preview Modal */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={activeProp?.title}
      >
        {activeProp && (
          <div className="flex flex-col gap-6 text-slate-600 text-left">
            <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-slate-200">
              <img src={activeProp.images?.[0]} alt="" className="w-full h-full object-cover" />
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 text-center border-y border-slate-200 text-slate-600">
              <div className="text-xs">
                <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Budget</p>
                Rs {activeProp.price.toLocaleString()}
                {activeProp.type === 'sale' && activeProp.isNegotiable !== undefined && (
                  <div className="mt-1 flex justify-center">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                      activeProp.isNegotiable 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      <span>{activeProp.isNegotiable ? '🟢' : '🔴'}</span>
                      {activeProp.isNegotiable ? 'Negotiable' : 'Fixed'}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs"><p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Location</p>{activeProp.location}</div>
              <div className="text-xs"><p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Sizing</p>{activeProp.area} sqft</div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold">Narrative Description</h4>
              <p className="text-xs leading-relaxed text-slate-600 font-sans">{activeProp.description}</p>
            </div>

            {activeProp.status === 'rejected' && activeProp.rejectionReason && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                <strong>Rejection Reason:</strong> {activeProp.rejectionReason}
              </div>
            )}
            
            {activeProp.status === 'onhold' && activeProp.holdRemarks && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs">
                <strong>Hold Remarks:</strong> {activeProp.holdRemarks}
                {activeProp.infoRequested && <span className="block mt-1 text-[10px] uppercase font-bold text-blue-400">Additional Information Requested</span>}
              </div>
            )}

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-primary font-bold">Owner Lead Information</h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-600" /> {activeProp.ownerName} ({activeProp.ownerEmail})</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-600" /> {activeProp.ownerPhone}</div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex flex-wrap gap-2 justify-between items-center mt-4">
              {activeProp.status !== 'approved' && activeProp.status !== 'active' ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionProp(activeProp);
                      setActionType('approve');
                      setRemarks('');
                      setIsActionModalOpen(true);
                      setIsDetailOpen(false);
                    }}
                    className="py-1.5 px-3 bg-green-500 text-slate-900 text-[10px] uppercase tracking-wider font-extrabold rounded-lg hover:bg-green-600 cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionProp(activeProp);
                      setActionType('reject');
                      setRemarks('');
                      setIsActionModalOpen(true);
                      setIsDetailOpen(false);
                    }}
                    className="py-1.5 px-3 bg-red-550 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-lg hover:bg-red-600 cursor-pointer border border-red-500/20"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionProp(activeProp);
                      setActionType('hold');
                      setRemarks('');
                      setIsActionModalOpen(true);
                      setIsDetailOpen(false);
                    }}
                    className="py-1.5 px-3 bg-amber-500 text-slate-900 text-[10px] uppercase tracking-wider font-extrabold rounded-lg hover:bg-amber-600 cursor-pointer"
                  >
                    On Hold
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionProp(activeProp);
                      setActionType('request_info');
                      setRemarks('');
                      setIsActionModalOpen(true);
                      setIsDetailOpen(false);
                    }}
                    className="py-1.5 px-3 bg-blue-500 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-lg hover:bg-blue-600 cursor-pointer"
                  >
                    Request Info
                  </button>
                </div>
              ) : (
                <div className="text-xs text-green-500 font-bold">🟢 Listing is Live</div>
              )}
              <Button onClick={() => setIsDetailOpen(false)} variant="glass" className="py-1.5 px-4 rounded-xl text-xs border-slate-200">
                Close Board
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Admin Action Modal (Approve, Reject, Hold, Request Info) */}
      <Dialog
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setRemarks('');
          setActionProp(null);
          setActionType(null);
        }}
        title={
          actionType === 'approve' ? 'Approve Property Listing' :
          actionType === 'reject' ? 'Reject Property Listing' :
          actionType === 'hold' ? 'Put Property On Hold' :
          'Request Additional Information'
        }
      >
        <form onSubmit={handlePerformAction} className="flex flex-col gap-4 text-left">
          {actionType === 'approve' ? (
            <p className="text-sm text-slate-600">
              Are you sure you want to verify and approve this property? It will become publicly visible on the live platform immediately.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                {actionType === 'reject' ? 'Rejection Reason' :
                 actionType === 'hold' ? 'Holding Remarks / Actions Required' :
                 'Additional Information Details Requested'} *
              </label>
              <Textarea
                placeholder={
                  actionType === 'reject' ? 'Provide clear feedback on why this property is being rejected...' :
                  actionType === 'hold' ? 'Explain what documents or verification checks are failing...' :
                  'Specify the exact details, files, or clarifications needed from the user...'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                required
                className="w-full text-slate-900 border border-slate-200"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setIsActionModalOpen(false);
                setRemarks('');
                setActionProp(null);
                setActionType(null);
              }}
              className="py-2 px-4 rounded-xl text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`py-2 px-5 rounded-xl text-xs font-bold ${
                actionType === 'approve' ? 'bg-green-500 text-slate-900 hover:bg-green-600' :
                actionType === 'reject' ? 'bg-red-500 text-white hover:bg-red-600' :
                actionType === 'hold' ? 'bg-amber-500 text-slate-900 hover:bg-amber-600' :
                'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {actionType === 'approve' ? 'Approve & Publish' :
               actionType === 'reject' ? 'Reject Listing' :
               actionType === 'hold' ? 'Put On Hold' :
               'Request Information'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
export default PropertiesManager;
