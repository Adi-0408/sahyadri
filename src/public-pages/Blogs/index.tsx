import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchCollection } from '../../services/firebase';
import { Calendar, User, Tag, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';

export const Blogs: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<any>(null);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const list = await fetchCollection('blogs');
        setBlogs(list);
      } catch (error) {
        console.error("Failed to load blogs:", error);
      } finally {
        setLoading(false);
      }
    };
    loadBlogs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen text-slate-900 bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 pt-28 pb-16 px-6 md:px-12 relative overflow-hidden text-left">
      {/* Background Blurs */}
      <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/3 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto flex flex-col gap-10">

        {/* Go Back Button */}
        <div className="w-full flex justify-start mb-2 sm:mb-4">
          <button
            onClick={() => navigate(-1)}
            className="px-3 sm:px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 group cursor-pointer font-bold text-xs sm:text-sm"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span>{t('details.goBack', 'Go Back')}</span>
          </button>
        </div>

        {/* Page Title */}
        <div>
          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary font-serif">Insights & Intel</span>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mt-1">Sahyadri Lands Journal</h1>
          <p className="text-slate-600 max-w-xl text-sm font-sans mt-2">
            Explore editorial deep dives into architectural mastery, capital luxury, and design trends.
          </p>
        </div>

        {/* Blogs Grid */}
        {blogs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <span className="text-slate-600 text-sm">No articles published in the journal yet.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogs.map((post) => (
              <Card
                key={post.id}
                onClick={() => setSelectedBlog(post)}
                className="group flex flex-col sm:flex-row overflow-hidden bg-white border-slate-200 cursor-pointer hover:border-primary/20 transition-all duration-300"
              >
                <div className="w-full sm:w-2/5 h-48 sm:h-auto min-h-[220px] overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-primary" />
                      <span className="text-[10px] uppercase font-bold text-primary tracking-widest">
                        {post.tags?.[0] || 'Real Estate'}
                      </span>
                    </div>

                    <h3 className="text-xl font-serif font-semibold text-slate-900 leading-snug line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed mt-1">
                      {post.content}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-500 mt-6 pt-4 border-t border-slate-200">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> By {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>

      {/* Blog Article Reader Modal */}
      <Dialog
        isOpen={!!selectedBlog}
        onClose={() => setSelectedBlog(null)}
        title={selectedBlog?.title}
      >
        {selectedBlog && (
          <div className="flex flex-col gap-6 text-slate-600 font-sans text-left">
            <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-slate-200">
              <img src={selectedBlog.image} alt="" className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-200 pb-4">
              <span>Author: <strong className="text-slate-600">{selectedBlog.author}</strong></span>
              <span>Published: {new Date(selectedBlog.createdAt).toLocaleDateString()}</span>
            </div>

            <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line font-sans">
              {selectedBlog.content}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {selectedBlog.tags?.map((tag: string) => (
                <span key={tag} className="text-[10px] uppercase tracking-wider font-bold bg-white/5 px-3 py-1 rounded-full text-slate-600 border border-slate-200">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
};
