import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchDocument, createDocument } from '../../services/firebase';
import { MapPin, Ruler, Heart, MessageSquare, ArrowLeft, CheckCircle, Compass, Building, Phone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useTranslation } from 'react-i18next';
import { isMobileDevice } from '../../utils/device';

export const ProjectDetails: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [isMobileDeviceActive, setIsMobileDeviceActive] = useState(false);

  useEffect(() => {
    setIsMobileDeviceActive(isMobileDevice());
  }, []);
  const [activeImage, setActiveImage] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('I would like to inquire about this project.');
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);

  // Lightbox
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const doc = await fetchDocument('projects', id);
        if (doc && doc.isVisible !== false) {
          setProject(doc);
          if (doc.images && doc.images.length > 0) {
            setActiveImage(doc.images[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load project details:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const updateSaved = () => {
      const saved = localStorage.getItem('luminous_saved_projects');
      if (saved) {
        try {
          const arr = JSON.parse(saved);
          setIsSaved(arr.includes(id));
        } catch {
          setIsSaved(false);
        }
      } else {
        setIsSaved(false);
      }
    };
    updateSaved();
    window.addEventListener('saved_projects_changed', updateSaved);
    window.addEventListener('storage', updateSaved);
    return () => {
      window.removeEventListener('saved_projects_changed', updateSaved);
      window.removeEventListener('storage', updateSaved);
    };
  }, [id]);

  useEffect(() => {
    if (project?.images) {
      const idx = project.images.indexOf(activeImage);
      if (idx !== -1) {
        setLightboxIndex(idx);
      }
    }
  }, [activeImage, project]);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  const handlePrevImage = () => {
    if (!project?.images) return;
    const newIdx = (lightboxIndex - 1 + project.images.length) % project.images.length;
    setLightboxIndex(newIdx);
    setActiveImage(project.images[newIdx]);
  };

  const handleNextImage = () => {
    if (!project?.images) return;
    const newIdx = (lightboxIndex + 1) % project.images.length;
    setLightboxIndex(newIdx);
    setActiveImage(project.images[newIdx]);
  };

  if (loading) {
    return (
      <div className="min-h-screen text-slate-900 bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen text-slate-900 bg-slate-50 pt-32 px-6 flex flex-col items-center gap-6">
        <h2 className="text-3xl font-serif">Project Not Found</h2>
        <p className="text-slate-600">The project you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate('/projects')} variant="primary">
          Back to Projects
        </Button>
      </div>
    );
  }

  const handleSaveToggle = () => {
    if (!id) return;
    const saved = localStorage.getItem('luminous_saved_projects');
    let arr = [];
    if (saved) {
      try {
        arr = JSON.parse(saved);
      } catch {
        arr = [];
      }
    }

    if (arr.includes(id)) {
      arr = arr.filter((x: string) => x !== id);
      setIsSaved(false);
    } else {
      arr.push(id);
      setIsSaved(true);
    }
    localStorage.setItem('luminous_saved_projects', JSON.stringify(arr));
    window.dispatchEvent(new Event('saved_projects_changed'));
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName || !inquiryEmail || !inquiryPhone) return;

    try {
      await createDocument('enquiries', {
        projectId: project.id,
        projectName: project.title,
        name: inquiryName,
        email: inquiryEmail,
        phone: inquiryPhone,
        message: inquiryMsg,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setInquirySuccess(true);
      setInquiryName('');
      setInquiryEmail('');
      setInquiryPhone('');
    } catch (error) {
      console.error("Failed to submit inquiry:", error);
    }
  };

  const whatsappLink = `https://wa.me/918328712712?text=${encodeURIComponent(
    `I am inquiring about the development project: ${project.title}`
  )}`;

  // Construct specs dynamically
  const specs = [
    { label: isMr ? 'डेव्हलपर' : 'Developer', value: project.developerName || (isMr ? 'थेट डेव्हलपर' : 'Direct Developer'), icon: Building },
    { label: isMr ? 'क्षेत्र श्रेणी' : 'Area Range', value: project.areaRange || '1050 - 2400 sqft', icon: Ruler },
    { label: isMr ? 'पूर्णत्व' : 'Completion', value: project.targetYear || '2027', icon: Compass },
    { label: isMr ? 'स्थिती' : 'Status', value: project.status === 'Ready to Move' ? (isMr ? 'ताब्यात मिळण्यासाठी तयार' : 'Ready to Move') : (project.status || (isMr ? 'बांधकाम सुरू' : 'Under Construction')), icon: Compass }
  ];

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 pt-20 sm:pt-28 pb-24 sm:pb-16 px-4 sm:px-6 md:px-12 relative overflow-hidden text-left">
      <div className="max-w-7xl mx-auto">

        {/* ================= MOBILE VIEW ================= */}
        <div className={`${isMobileDeviceActive ? 'block' : 'block md:hidden'} flex flex-col gap-4`}>
          <div className="flex justify-between items-center py-2">
            <button onClick={() => navigate(-1)} className="p-1 cursor-pointer">
              <ArrowLeft className="w-6 h-6 text-slate-800" />
            </button>
            <button onClick={handleSaveToggle} className="p-1 cursor-pointer">
              <Heart className={`w-6 h-6 ${isSaved ? 'fill-red-500 text-red-500' : 'text-slate-800'}`} />
            </button>
          </div>

          {activeImage && (
            <div onClick={() => setIsLightboxOpen(true)} className="aspect-[16/10] w-full rounded-2xl overflow-hidden border border-slate-200 relative mb-2 shadow-sm cursor-pointer group">
              <img src={activeImage} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-4 left-4 bg-emerald-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-md">
                {t('properties.reraApproved', 'RERA Approved')}
              </div>
              {project.images && project.images.length > 0 && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl">
                  {project.images.indexOf(activeImage) + 1} / {project.images.length}
                </div>
              )}
            </div>
          )}

          <h1 className="text-xl font-bold text-slate-900 leading-snug">
            {isMr ? project.titleMr || project.title : project.title}
          </h1>

          <div className="flex items-center gap-1 text-slate-500 text-sm">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
            <span>{isMr ? project.locationMr || project.location : project.location}</span>
          </div>

          <hr className="border-slate-200/60 my-1" />

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-2xl font-extrabold text-slate-900">
                {project.priceRange}
              </div>
            </div>
            <div className="bg-[#fef2f2] border border-[#fee2e2] text-[#b91c1c] text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
              {isMr ? 'नवीन प्रकल्प' : 'NEW PROJECT'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {specs.map((spec, idx) => {
              const SpecIcon = spec.icon;
              return (
                <div key={idx} className="flex flex-col items-start p-3 rounded-2xl border border-slate-100 bg-[#f8fafc]">
                  <SpecIcon className="w-5 h-5 text-slate-550 mb-2" />
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{spec.label}</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 truncate w-full">{spec.value}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <h2 className="text-xl font-bold text-slate-900">{isMr ? 'प्रकल्प विहंगावलोकन' : 'Project Overview'}</h2>
            <p className="text-sm text-slate-755 leading-relaxed mt-2 whitespace-pre-line">
              {isMr ? project.descriptionMr || project.description : project.description}
            </p>
          </div>

          {/* Developer Card */}
          <div className="mt-4 p-4 rounded-2xl border border-slate-100 bg-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#111c2e] text-white flex items-center justify-center font-bold text-sm tracking-wider shrink-0">
                {project.developerName ? project.developerName.slice(0, 2).toUpperCase() : 'DV'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{project.developerName || (isMr ? 'प्रकल्प डेव्हलपर' : 'Project Developer')}</h4>
                <p className="text-xs text-slate-500 font-semibold">{isMr ? 'अधिकृत डेव्हलपर' : 'Authorized Developer'}</p>
              </div>
            </div>
            <button onClick={() => setIsInquiryOpen(true)} className="bg-[#111c2e] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-800 cursor-pointer border-none shadow-sm">
              {isMr ? 'चौकशी करा' : 'Inquire'}
            </button>
          </div>

          {/* Sticky Bottom Bar */}
          <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex gap-3 z-40 ${isMobileDeviceActive ? '' : 'md:hidden'} shadow-[0_-4px_12px_rgba(0,0,0,0.03)]`}>
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex-1">
              <button className="w-full border border-[#15803d] text-[#15803d] hover:bg-green-50 text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white">
                <MessageSquare className="w-4 h-4 fill-current text-emerald-650" /> WhatsApp
              </button>
            </a>
            <button onClick={() => window.open('tel:918328712712')} className="flex-1 bg-[#111c2e] hover:bg-slate-800 text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border-none shadow-sm">
              <Phone className="w-4 h-4 fill-current text-white" /> {isMr ? 'डेव्हलपरला कॉल करा' : 'Call Developer'}
            </button>
          </div>
        </div>

        {/* ================= DESKTOP VIEW ================= */}
        {!isMobileDeviceActive && (
          <div className="hidden md:flex flex-col gap-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> {isMr ? 'यादीवर परत जा' : 'Back to listings'}
            </button>
            <button
              onClick={handleSaveToggle}
              className="flex items-center justify-center p-2 rounded-full border border-slate-200 hover:text-red-500 transition-colors cursor-pointer w-9 h-9 shrink-0"
              title={isSaved ? 'Saved Project' : 'Save Project'}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-slate-600'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="md:col-span-2 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div onClick={() => setIsLightboxOpen(true)} className="aspect-[16/10] w-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm cursor-pointer group">
                  <img src={activeImage} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-4 left-4 bg-emerald-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-md">
                    {t('properties.reraApproved', 'RERA Approved')}
                  </div>
                  {project.images && project.images.length > 0 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                      {project.images.indexOf(activeImage) + 1} / {project.images.length}
                    </div>
                  )}
                </div>

                {project.images && project.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {project.images.map((img: string, idx: number) => (
                      <button key={idx} onClick={() => setActiveImage(img)} className={`w-28 aspect-[16/10] rounded-lg overflow-hidden border shrink-0 cursor-pointer ${activeImage === img ? 'border-primary' : 'border-slate-200 opacity-70 hover:opacity-100'}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Card className="p-8 bg-white border-slate-200">
                <h3 className="text-xl font-serif text-slate-900 font-bold mb-4">{isMr ? 'प्रकल्प विहंगावलोकन' : 'Project Overview'}</h3>
                <p className="text-sm md:text-base leading-relaxed text-slate-600 font-sans whitespace-pre-line">
                  {isMr ? project.descriptionMr || project.description : project.description}
                </p>
              </Card>
            </div>

            <div className="flex flex-col gap-6">
              <Card className="p-8 bg-white border-slate-200 flex flex-col gap-6 shadow-sm">
                <div>
                  <span className="text-xs uppercase tracking-widest text-primary font-bold">{isMr ? 'नवीन प्रकल्प' : 'New Project'}</span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-1 leading-snug">
                    {isMr ? project.titleMr || project.title : project.title}
                  </h1>
                  <div className="flex items-center gap-1.5 text-slate-655 text-sm mt-3">
                    <MapPin className="w-4 h-4 text-slate-505" />
                    <span>{isMr ? project.locationMr || project.location : project.location}</span>
                  </div>
                </div>

                <div className="border-y border-slate-200 py-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-3xl font-serif text-primary font-bold">
                      {project.priceRange}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-2">
                  {specs.map((spec, idx) => {
                    const SpecIcon = spec.icon;
                    return (
                      <div key={idx} className="flex flex-col items-start p-3 rounded-2xl border border-slate-100 bg-[#f8fafc]">
                        <SpecIcon className="w-5 h-5 text-slate-550 mb-2" />
                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{spec.label}</span>
                        <span className="text-xs font-bold text-slate-900 mt-0.5 truncate w-full">{spec.value}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <Button onClick={() => setIsInquiryOpen(true)} variant="primary" className="w-full py-3.5 flex items-center justify-center gap-2 rounded-xl text-white font-bold bg-[#111c2e] hover:bg-slate-800 border-none shadow-sm">
                    <MessageSquare className="w-4 h-4 fill-current text-white" /> Inquire
                  </Button>
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="w-full">
                    <Button variant="glass" className="w-full py-3.5 flex items-center justify-center gap-2 rounded-xl text-slate-700 border-slate-200 hover:border-primary/40 hover:bg-slate-50 hover:text-slate-900 font-bold">
                      <MessageSquare className="w-4 h-4 text-green-500 fill-green-500/10" /> {t('details.inquiryWhatsapp')}
                    </Button>
                  </a>
                </div>
              </Card>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Inquiry Modal */}
      <Dialog isOpen={isInquiryOpen} onClose={() => setIsInquiryOpen(false)} title="Inquire About Project">
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center gap-3 mb-6 shadow-sm text-left">
          <div className="w-12 h-12 rounded-full bg-[#111c2e] text-white flex items-center justify-center font-bold text-sm tracking-wider shrink-0">
            {project.developerName ? project.developerName.slice(0, 2).toUpperCase() : 'DV'}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{project.developerName || 'Project Developer'}</h4>
            <p className="text-xs text-slate-500 font-semibold">Authorized Developer</p>
          </div>
        </div>

        {inquirySuccess ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center text-sm text-green-400">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
            Inquiry submitted successfully!
          </div>
        ) : (
          <form onSubmit={handleInquirySubmit} className="flex flex-col gap-4 text-left">
            <Input label={isMr ? "पूर्ण नाव" : "Full Name"} placeholder={isMr ? "नाव टाका" : "Enter name"} value={inquiryName} onChange={(e) => setInquiryName(e.target.value)} required />
            <Input type="email" label={isMr ? "ईमेल पत्ता" : "Email Address"} placeholder={isMr ? "ईमेल टाका" : "Enter email"} value={inquiryEmail} onChange={(e) => setInquiryEmail(e.target.value)} required />
            <Input type="tel" maxLength={10} label={isMr ? "फोन नंबर" : "Phone Number"} placeholder={isMr ? "१० अंकी फोन नंबर टाका" : "Enter 10-digit phone"} value={inquiryPhone} onChange={(e) => setInquiryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required />
            <Textarea label={isMr ? "संदेश" : "Message"} value={inquiryMsg} onChange={(e) => setInquiryMsg(e.target.value)} required />
            <div className="flex gap-3 justify-end mt-4">
              <Button type="button" variant="glass" onClick={() => setIsInquiryOpen(false)} className="py-2.5 px-4 rounded-xl text-xs border-slate-200">{isMr ? 'रद्द करा' : 'Cancel'}</Button>
              <Button type="submit" variant="primary" className="py-2.5 px-5 rounded-xl text-xs text-white font-bold bg-[#111c2e] hover:bg-slate-800 border-none">{isMr ? 'चौकशी पाठवा' : 'Submit Inquiry'}</Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Lightbox / Full Image View Modal */}
      {isLightboxOpen && project.images && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between items-center p-4 md:p-8 backdrop-blur-md select-none animate-in fade-in duration-200">
          <div className="w-full max-w-7xl flex justify-between items-center text-white pb-4 border-b border-white/10">
            <div>
              <h4 className="font-serif text-lg md:text-xl font-bold truncate max-w-md">
                {isMr ? project.titleMr || project.title : project.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>{isMr ? project.locationMr || project.location : project.location}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold bg-white/10 px-3 py-1.5 rounded-lg">
                {lightboxIndex + 1} / {project.images.length}
              </span>
              <button onClick={() => setIsLightboxOpen(false)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer text-xs md:text-sm border border-white/15">
                {isMr ? '✕ बंद करा' : '✕ Close'}
              </button>
            </div>
          </div>

          <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center py-6">
            {project.images.length > 1 && (
              <button onClick={handlePrevImage} className="absolute left-2 md:left-4 z-10 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer border border-white/10">←</button>
            )}
            <img src={project.images[lightboxIndex]} alt="" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl transition-all duration-300" />
            {project.images.length > 1 && (
              <button onClick={handleNextImage} className="absolute right-2 md:right-4 z-10 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer border border-white/10">→</button>
            )}
          </div>

          {project.images.length > 1 && (
            <div className="w-full max-w-4xl overflow-x-auto no-scrollbar flex justify-center gap-3 py-4">
              {project.images.map((img: string, idx: number) => (
                <button key={idx} onClick={() => { setLightboxIndex(idx); setActiveImage(img); }} className={`w-20 md:w-24 aspect-[16/10] rounded-lg overflow-hidden border shrink-0 cursor-pointer transition-all ${lightboxIndex === idx ? 'border-primary ring-2 ring-primary scale-105' : 'border-white/20 opacity-50 hover:opacity-100'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
