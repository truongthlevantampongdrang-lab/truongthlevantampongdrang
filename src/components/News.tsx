import { useState, FormEvent, MouseEvent } from "react";
import { NewsItem } from "../types";
import { Calendar, User, Search, Eye, X, BookOpen, AlertCircle, Sparkles, Edit, Trash2, Plus, Save } from "lucide-react";

interface NewsProps {
  isAdminMode: boolean;
  newsList: NewsItem[];
  updateNewsList: (items: NewsItem[]) => void;
}

export default function News({ isAdminMode, newsList, updateNewsList }: NewsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  // Form states for adding/editing news
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [newsForm, setNewsForm] = useState<Partial<NewsItem>>({
    title: "",
    category: "Tin tức",
    excerpt: "",
    content: "",
    image: "",
    author: ""
  });

  const categories = ["Tất cả", "Thông báo", "Tin tức", "Hoạt động"];

  const filteredNews = newsList.filter((item) => {
    const matchesCategory = selectedCategory === "Tất cả" || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // CMS Handlers
  const handleOpenAdd = () => {
    setEditingArticleId(null);
    setNewsForm({
      title: "",
      category: "Tin tức",
      excerpt: "",
      content: "",
      image: "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&fm=webp&q=75&w=800",
      author: "Văn phòng nhà trường"
    });
    setShowEditForm(true);
  };

  const handleOpenEdit = (article: NewsItem, e: MouseEvent) => {
    e.stopPropagation();
    setEditingArticleId(article.id);
    setNewsForm({ ...article });
    setShowEditForm(true);
  };

  const handleDelete = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      const updated = newsList.filter(item => item.id !== id);
      updateNewsList(updated);
    }
  };

  const handleSaveSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.content) {
      alert("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    if (editingArticleId) {
      // Edit mode
      const updated = newsList.map(item => {
        if (item.id === editingArticleId) {
          return {
            ...item,
            ...newsForm,
            date: item.date || todayStr
          } as NewsItem;
        }
        return item;
      });
      updateNewsList(updated);
    } else {
      // Add mode
      const newArticle: NewsItem = {
        id: "news-" + Date.now(),
        title: newsForm.title,
        category: newsForm.category || "Tin tức",
        date: todayStr,
        excerpt: newsForm.excerpt || newsForm.content.slice(0, 150) + "...",
        content: newsForm.content,
        image: newsForm.image || "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&fm=webp&q=75&w=800",
        author: newsForm.author || "Ban Biên Tập"
      };
      updateNewsList([newArticle, ...newsList]);
    }

    setShowEditForm(false);
  };

  return (
    <div className="space-y-10 py-6 font-sans relative">
      
      {/* Page Header */}
      <section className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          Cập Nhật Tin Tức
        </span>
        <h2 className="text-3xl font-extrabold text-emerald-950">
          Tin Tức & Hoạt Động Giáo Dục
        </h2>
        <p className="text-sm text-emerald-900/70">
          Nơi cập nhật nhanh nhất các thông báo quan trọng, hoạt động trải nghiệm bổ ích và thành tích nổi bật của học sinh Trường Tiểu học Lê Văn Tám.
        </p>
      </section>

      {/* Filter, Search, and CMS Add Button */}
      <section className="bg-white rounded-2xl p-4 border border-emerald-50 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        
        {/* Categories Tab selector */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50/50 text-emerald-900/70 hover:bg-emerald-50 hover:text-emerald-950"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input & CMS Add button */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-emerald-900/40" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-emerald-100 bg-emerald-50/20 py-2 pl-9 pr-4 text-xs font-medium placeholder-emerald-900/40 text-emerald-950 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {isAdminMode && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Đăng tin tức mới</span>
            </button>
          )}
        </div>
      </section>

      {/* News Grid */}
      {filteredNews.length > 0 ? (
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredNews.map((news) => (
            <article
              key={news.id}
              className="group flex flex-col overflow-hidden rounded-3xl bg-white border border-emerald-50 shadow-sm hover:shadow-xl hover:border-emerald-100/70 transition-all duration-300 relative cursor-pointer"
              onClick={() => setSelectedArticle(news)}
            >
              {/* Image box */}
              <div className="relative aspect-[16/10] overflow-hidden bg-emerald-50">
                <img
                  src={news.image}
                  alt={news.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Category tag */}
                <span className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md ${
                  news.category === "Thông báo"
                    ? "bg-amber-600"
                    : news.category === "Tin tức"
                    ? "bg-blue-600"
                    : "bg-emerald-600"
                }`}>
                  {news.category}
                </span>

                {/* Admin quick buttons */}
                {isAdminMode && (
                  <div className="absolute top-4 right-4 flex items-center space-x-1.5 opacity-90 hover:opacity-100" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenEdit(news, e)}
                      className="p-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 rounded-lg shadow-md transition-all active:scale-95"
                      title="Sửa tin bài"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(news.id, e)}
                      className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md transition-all active:scale-95"
                      title="Xóa tin bài"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Text info */}
              <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 text-[10px] font-bold text-emerald-900/50">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{news.date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <User className="h-3.5 w-3.5" />
                      <span>{news.author}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-emerald-950 group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {news.title}
                  </h3>

                  <p className="text-xs text-emerald-900/60 leading-relaxed line-clamp-3">
                    {news.excerpt}
                  </p>
                </div>

                <span
                  className="inline-flex items-center space-x-1.5 self-start text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  <span>Đọc tiếp bài viết</span>
                  <Eye className="h-4 w-4" />
                </span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="text-center py-16 bg-white rounded-3xl border border-emerald-50 space-y-3">
          <AlertCircle className="h-10 w-10 text-emerald-900/30 mx-auto" />
          <h3 className="text-base font-bold text-emerald-950">Không tìm thấy bài viết</h3>
          <p className="text-xs text-emerald-900/60">Quý độc giả vui lòng thử lại với từ khóa hoặc danh mục khác.</p>
        </section>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-fade-in">
          <div 
            className="relative w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300"
          >
            {/* Header image area */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden shrink-0 bg-emerald-100">
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/20 to-transparent"></div>
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 rounded-full bg-black/40 hover:bg-black/60 p-2 text-white transition-all backdrop-blur-sm"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title overlay */}
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white ${
                  selectedArticle.category === "Thông báo"
                    ? "bg-amber-500"
                    : selectedArticle.category === "Tin tức"
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                }`}>
                  {selectedArticle.category}
                </span>
                <h3 className="text-lg sm:text-2xl font-extrabold leading-snug">
                  {selectedArticle.title}
                </h3>
              </div>
            </div>

            {/* Content area scrollable */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
              <div className="flex flex-wrap gap-4 items-center text-xs font-bold text-emerald-900/50 border-b border-emerald-50 pb-4">
                <span className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Ngày đăng: {selectedArticle.date}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Tác giả: {selectedArticle.author}</span>
                </span>
              </div>

              <div className="text-sm text-emerald-950/90 leading-relaxed font-sans space-y-4 whitespace-pre-line">
                <p className="font-semibold text-emerald-900 border-l-4 border-emerald-600 pl-4 bg-emerald-50/40 py-2 rounded-r-lg">
                  {selectedArticle.excerpt}
                </p>
                <p>
                  {selectedArticle.content}
                </p>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="border-t border-emerald-50 p-4 bg-emerald-50/20 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedArticle(null)}
                className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
              >
                Đóng bài viết
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add/Edit News Article Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
              <h3 className="font-sans text-base font-bold text-slate-900">
                {editingArticleId ? "✏️ Chỉnh Sửa Tin Bài" : "➕ Đăng Tin Bài / Hoạt Động Mới"}
              </h3>
              <button
                onClick={() => setShowEditForm(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tiêu Đề Tin Bài
                </label>
                <input
                  type="text"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  placeholder="Nhập tiêu đề tin tức nổi bật..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chuyên mục
                  </label>
                  <select
                    value={newsForm.category}
                    onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  >
                    <option value="Tin tức">Tin tức</option>
                    <option value="Thông báo">Thông báo</option>
                    <option value="Hoạt động">Hoạt động</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tác giả đăng
                  </label>
                  <input
                    type="text"
                    value={newsForm.author}
                    onChange={(e) => setNewsForm({ ...newsForm, author: e.target.value })}
                    placeholder="VD: Cô Nguyễn Thị Xuân"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  URL Ảnh đại diện bài viết
                </label>
                <input
                  type="text"
                  value={newsForm.image}
                  onChange={(e) => setNewsForm({ ...newsForm, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Đoạn Tóm tắt ngắn (Excerpt)
                </label>
                <input
                  type="text"
                  value={newsForm.excerpt}
                  onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })}
                  placeholder="Tóm tắt ngắn gọn hiển thị trên thẻ bài viết..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung chi tiết bài viết
                </label>
                <textarea
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  placeholder="Viết nội dung bài viết chi tiết..."
                  rows={8}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md flex items-center space-x-1"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingArticleId ? "Cập nhật bài viết" : "Đăng bài viết mới"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
