import React, { useState, useEffect } from 'react';
import { fetchCollection, createDocument, updateDocument, deleteDocument } from '../../../services/firebase';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Dialog } from '../../../components/ui/Dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const BlogsManager: React.FC = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [image, setImage] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const list = await fetchCollection('blogs');
      setBlogs(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handleOpenAdd = () => {
    setEditingBlog(null);
    setTitle('');
    setContent('');
    setAuthor('Elena Rossi');
    setImage('');
    setTagsInput('Architecture, Luxury');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (blog: any) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setContent(blog.content);
    setAuthor(blog.author);
    setImage(blog.image);
    setTagsInput(blog.tags?.join(', ') || '');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !author) return;

    const parsedTags = tagsInput.split(',').map((t) => t.trim()).filter((t) => t !== '');
    const payload = {
      title,
      content,
      author,
      image: image || 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
      tags: parsedTags,
      createdAt: editingBlog ? editingBlog.createdAt : new Date().toISOString()
    };

    try {
      if (editingBlog) {
        await updateDocument('blogs', editingBlog.id, payload);
      } else {
        await createDocument('blogs', payload);
      }
      setIsFormOpen(false);
      loadBlogs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (blogId: string) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    try {
      await deleteDocument('blogs', blogId);
      loadBlogs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">Journal & Insights</h1>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold text-white">
          <Plus className="w-4 h-4" /> Add Post
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <UICard className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden" >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Author</th>
                  <th className="px-6 py-4">Published Date</th>
                  <th className="px-6 py-4">Tags</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                {blogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-semibold">No blog posts found.</td>
                  </tr>
                ) : (
                  blogs.map((blog) => (
                    <tr key={blog.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-slate-900 max-w-xs truncate">{blog.title}</td>
                      <td className="px-6 py-4 text-slate-650">{blog.author}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(blog.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {blog.tags?.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[8px] uppercase tracking-wider font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(blog)}
                            className="p-1.5 text-slate-500 hover:text-primary rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(blog.id)}
                            className="p-1.5 text-slate-500 hover:text-red-500 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </UICard>
      )}

      {/* Form Modal */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBlog ? 'Edit Journal Entry' : 'Compose Journal Entry'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left font-sans">
          <Input label="Article Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Article Content" rows={8} value={content} onChange={(e) => setContent(e.target.value)} required />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Author" value={author} onChange={(e) => setAuthor(e.target.value)} required />
            <Input label="Tags (comma separated)" placeholder="e.g. Design, Architecture" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>

          <Input label="Cover Image URL" value={image} onChange={(e) => setImage(e.target.value)} />

          <div className="flex gap-3 justify-end mt-4">
            <Button type="button" variant="glass" onClick={() => setIsFormOpen(false)} className="py-2 px-4 rounded-xl text-xs border-slate-200">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="py-2 px-5 rounded-xl text-xs text-white font-bold">
              Publish Post
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
export default BlogsManager;
