import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createDocument } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, CheckCircle, Send, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';

export const Contact: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !message) return;

    setLoading(true);
    try {
      await createDocument('enquiries', {
        propertyId: null,
        propertyName: 'General Enquiry',
        name,
        email,
        phone,
        message,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (error) {
      console.error("Failed to submit contact enquiry:", error);
    } finally {
      setLoading(false);
    }
  };

  const contactCards = [
    {
      title: t('contact.emailTitle'),
      description: t('contact.emailDesc'),
      detail: 'contact@astitvarealestate.com',
      icon: <Mail className="w-6 h-6" />,
      colorClass: 'from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-500/20',
      badgeClass: 'bg-blue-500/10 text-blue-600',
      actionUrl: 'mailto:contact@astitvarealestate.com'
    },
    {
      title: t('contact.phoneTitle'),
      description: t('contact.phoneDesc'),
      detail: '8328-712-712, 778899-3-712',
      icon: <Phone className="w-6 h-6" />,
      colorClass: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-500/20',
      badgeClass: 'bg-emerald-500/10 text-emerald-600',
      actionUrl: 'tel:+918328712712'
    },
    {
      title: t('contact.officeTitle'),
      description: t('contact.officeDesc'),
      detail: t('contact.officeDetail'),
      icon: <MapPin className="w-6 h-6" />,
      colorClass: 'from-orange-500/10 to-amber-500/10 text-orange-600 border-orange-500/20',
      badgeClass: 'bg-orange-500/10 text-orange-600',
      actionUrl: 'https://maps.google.com/?q=जे. पी. प्लाझा, शहा पेट्रोल पंप जवळ, कोल्हापूर रोड, जयसिंगपूर'
    }
  ];

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50/50 pt-36 sm:pt-44 pb-20 px-4 sm:px-6 md:px-12 relative overflow-hidden text-left font-sans">
      {/* Background Decorative Gradient Blurs */}
      <div className="absolute top-0 right-0 w-[45%] h-[45%] bg-gradient-to-b from-orange-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-t from-slate-900/5 to-transparent rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col gap-12 relative z-10">

        {/* Go Back Button - Absolute Top */}
        <div className="absolute -top-16 sm:-top-24 left-0">
          <button
            onClick={() => navigate(-1)}
            className="px-3 sm:px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#ea580c] hover:border-[#ea580c]/30 hover:bg-orange-50 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 group cursor-pointer font-bold text-xs sm:text-sm"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span>{t('details.goBack', 'Go Back')}</span>
          </button>
        </div>

        {/* Page Header with Accent badge */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-[#ea580c] px-3.5 py-1 rounded-full text-xs font-bold shadow-sm mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
            {t('contact.reachUs')}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t('contact.getInTouch')}
          </h1>
        </div>

        {/* Contact info + form grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Info cards - Left Column */}
          <div className="flex flex-col gap-5 lg:col-span-4 w-full min-w-0">
            {contactCards.map((card, idx) => (
              <a
                href={card.actionUrl}
                key={idx}
                target={idx === 2 ? "_blank" : undefined}
                rel={idx === 2 ? "noopener noreferrer" : undefined}
                className="group block w-full min-w-0 transition-transform duration-300 hover:-translate-y-1"
              >
                <Card className="p-5 bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 flex gap-4 items-start rounded-2xl relative overflow-hidden w-full min-w-0" >
                  {/* Subtle hover accent light */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                  
                  {/* Styled Icon Container with dynamic gradient background */}
                  <div className={`p-3 rounded-xl border shrink-0 flex items-center justify-center bg-gradient-to-br ${card.colorClass} transition-colors duration-300`}>
                    {card.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-1.5 flex-wrap">
                      {card.title}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-slate-400" />
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{card.description}</p>
                    <p className="text-sm font-bold text-slate-900 mt-2 break-all sm:break-words whitespace-normal leading-relaxed group-hover:text-[#ea580c] transition-colors duration-200">{card.detail}</p>
                  </div>
                </Card>
              </a>
            ))}
          </div>

          {/* Form - Right Column */}
          <div className="lg:col-span-8 w-full">
            <Card className="p-6 sm:p-8 md:p-10 bg-white border border-slate-200/80 shadow-2xl shadow-slate-100 rounded-3xl" >
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl text-slate-900 font-extrabold tracking-tight">{t('contact.sendMessage')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">{t('contact.formDesc')}</p>
              </div>

              {success ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <p className="font-extrabold text-lg text-slate-900 mb-1">{t('contact.successTitle')}</p>
                  <p className="text-sm text-slate-600 font-medium">{t('contact.successDesc')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input
                      label={t('details.fullName')}
                      placeholder={t('details.enterName')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-slate-900 text-sm font-semibold h-[44px]"
                    />
                    <Input
                      type="tel"
                      label={t('details.phoneNumber')}
                      placeholder={t('details.enterPhone')}
                      value={phone}
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                      className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-slate-900 text-sm font-semibold h-[44px]"
                    />
                  </div>
                  <Input
                    type="email"
                    label={t('details.emailAddress')}
                    placeholder={t('details.enterEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-slate-900 text-sm font-semibold h-[44px]"
                  />
                  <Textarea
                    label={t('details.messageLabel')}
                    placeholder={t('contact.assistancePlaceholder')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-slate-900 text-sm font-semibold p-3"
                  />
                  <Button 
                    type="submit" 
                    variant="primary" 
                    isLoading={loading} 
                    className="w-full md:w-48 h-[46px] rounded-xl font-extrabold text-xs uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-950/10 flex items-center justify-center gap-2 transition-all duration-300 hover:translate-y-[-1px] cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t('contact.sendButton')}
                  </Button>
                </form>
              )}
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
};
