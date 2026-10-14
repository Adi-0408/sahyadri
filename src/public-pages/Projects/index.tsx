import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { fetchCollection, getCachedCollection } from '../../services/firebase';
import { MapPin, IndianRupee, CalendarDays, MessageSquare, ArrowLeft } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';

export const Projects: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>(() => {
    const cached = getCachedCollection('projects');
    return Array.isArray(cached) ? cached.filter((p: any) => p.isVisible !== false) : [];
  });
  const [loading, setLoading] = useState(() => projects.length === 0);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const list = await fetchCollection('projects');
        const activeProjs = list.filter((p: any) => p.isVisible !== false);
        setProjects(activeProjs);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 pt-24 sm:pt-28 pb-16 px-4 sm:px-8 relative overflow-hidden text-left">
      {/* Background blur */}
      <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col gap-8">

        {/* Go Back Button */}
        <div className="w-full flex justify-start mb-2 sm:mb-4">
          <button
            onClick={() => navigate(-1)}
            className="px-3 sm:px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 group cursor-pointer font-bold text-xs sm:text-sm"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span>{isMr ? 'मागे जा' : 'Go Back'}</span>
          </button>
        </div>

        {/* Page Title */}
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-primary">
            {t('home.newProjects')}
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-1">
            {t('home.newProjects')}
          </h1>
          <p className="text-slate-500 max-w-xl text-sm mt-2">
            {t('projects.subtitle')}
          </p>
        </div>

        {/* Projects Grid — 4 per row */}
        {projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <span className="text-slate-500 text-sm">{t('projects.emptyState')}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => navigate(`/project/${proj.id}`)}
                className="group bg-white border border-slate-200 hover:border-primary/30 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
              >
                {/* Image */}
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <img
                    src={optimizeCloudinaryUrl(proj.images?.[0] || '', 600)}
                    alt={proj.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                  {/* Status badge */}
                  <div className="absolute top-2.5 right-2.5 bg-primary text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {proj.status === 'Ready to Move' ? t('readyToMove') : proj.status}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                      {isMr ? proj.titleMr || proj.title : proj.title}
                    </h3>
                    <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="line-clamp-1">{isMr ? proj.locationMr || proj.location : proj.location}</span>
                    </div>
                  </div>

                  {(isMr ? proj.descriptionMr || proj.description : proj.description) && (
                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                      {isMr ? proj.descriptionMr || proj.description : proj.description}
                    </p>
                  )}

                  {/* Footer info */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3 h-3 text-primary" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{t('projects.pricingLabel')}</p>
                        <p className="text-xs font-semibold text-slate-800">
                          {proj.priceRange === 'Contact for Price' ? t('contactForPrice') : proj.priceRange || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-primary" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{t('projects.deliveryLabel')}</p>
                        <p className="text-xs font-semibold text-slate-800">{proj.targetYear || '2027'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProject && (
        <Dialog
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          title={isMr ? selectedProject.titleMr || selectedProject.title : selectedProject.title}
        >
          <div className="flex flex-col gap-6 text-left">
            {/* Image Gallery */}
            {selectedProject.images && selectedProject.images.length > 0 && (
              <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm">
                <img src={optimizeCloudinaryUrl(selectedProject.images[0], 800)} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-emerald-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-md">
                  {selectedProject.status}
                </div>
              </div>
            )}

            {/* Project Specifications */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isMr ? 'किंमत श्रेणी' : 'Price Range'}</span>
                <span className="font-extrabold text-slate-800 mt-0.5">{selectedProject.priceRange}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isMr ? 'लक्ष्य वर्ष' : 'Target Year'}</span>
                <span className="font-extrabold text-slate-800 mt-0.5">{selectedProject.targetYear || '2027'}</span>
              </div>
              <div className="flex flex-col col-span-2 border-t border-slate-200/60 pt-2.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isMr ? 'स्थान' : 'Location'}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
                  <span className="font-bold text-slate-800">
                    {isMr ? selectedProject.locationMr || selectedProject.location : selectedProject.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Developer Details */}
            <div className="p-4 rounded-2xl border border-slate-100 bg-white flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-700 flex items-center justify-center font-extrabold text-sm tracking-wider shrink-0 border border-orange-500/10">
                {selectedProject.developerName ? selectedProject.developerName.slice(0, 2).toUpperCase() : 'DV'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedProject.developerName || (isMr ? 'थेट डेव्हलपर' : 'Direct Developer')}</h4>
                <p className="text-[10px] text-slate-505 font-semibold uppercase tracking-wider">{isMr ? 'अधिकृत रिअल इस्टेट डेव्हलपर' : 'Authorized Real Estate Developer'}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">{isMr ? 'प्रकल्प विहंगावलोकन' : 'Project Overview'}</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                {isMr ? selectedProject.descriptionMr || selectedProject.description : selectedProject.description}
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="glass" onClick={() => setSelectedProject(null)} className="py-2.5 px-4 rounded-xl text-xs border-slate-200">
                {isMr ? 'बंद करा' : 'Close'}
              </Button>
              <a href={`https://wa.me/918328712712?text=${encodeURIComponent(`I would like to inquire about the project: ${selectedProject.title}`)}`} target="_blank" rel="noreferrer">
                <Button variant="primary" className="py-2.5 px-5 rounded-xl text-xs text-white font-bold bg-emerald-700 hover:bg-emerald-800 border-none flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-white" /> {isMr ? 'व्हॉट्सॲपवर चौकशी करा' : 'Inquire via WhatsApp'}
                </Button>
              </a>
            </div>
          </div>
        </Dialog>
      )}

    </div>
  );
};
