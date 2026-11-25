import { useState } from 'react';
import { CheckCircle2, MapPin, Search } from 'lucide-react';
import type { LostFoundPost } from '../shared/types.ts';

interface LostFoundBoardProps {
  posts: LostFoundPost[];
  onCreated: (post: LostFoundPost) => void;
  onToggled: (post: LostFoundPost) => void;
}

export function LostFoundBoard({ posts, onCreated, onToggled }: LostFoundBoardProps) {
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [postType, setPostType] = useState<'lost' | 'found'>('found');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [posterName, setPosterName] = useState('PixelPanda');
  const [contactNote, setContactNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/lost-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_type: postType,
          title,
          location,
          description,
          poster_name: posterName,
          contact_note: contactNote,
        }),
      });
      const data = await res.json();
      if (res.ok && data.post) {
        onCreated(data.post);
        setTitle('');
        setLocation('');
        setDescription('');
        setContactNote('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    const res = await fetch(`/api/lost-found/${id}`, { method: 'PATCH' });
    const data = await res.json();
    if (res.ok && data.post) {
      onToggled(data.post);
    }
  };

  const visible = posts.filter((p) => (filter === 'all' ? true : p.post_type === filter));

  return (
    <div className="space-y-6">
      <div className="flex items-center border-2 border-[#161816] rounded-xl bg-white shadow-[2px_2px_0px_#161816] w-fit overflow-hidden">
        {(['all', 'found', 'lost'] as const).map((tab, idx) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 text-xs font-extrabold capitalize transition-colors ${
              idx > 0 ? 'border-l-2 border-[#161816]' : ''
            } ${filter === tab ? 'bg-[#FFE047] text-[#161816]' : 'bg-white text-[#464B46]'}`}
          >
            {tab === 'all' ? `All (${posts.length})` : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 bg-white nb-card rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#184D38]" />
            <h2 className="font-display text-lg font-extrabold text-[#161816]">
              Report Lost or Found
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPostType('found')}
              className={`nb-btn-sm py-2 text-xs font-extrabold ${
                postType === 'found' ? 'bg-[#5EEAD4] text-[#161816]' : 'bg-white text-[#464B46]'
              }`}
            >
              I Found Something
            </button>
            <button
              type="button"
              onClick={() => setPostType('lost')}
              className={`nb-btn-sm py-2 text-xs font-extrabold ${
                postType === 'lost' ? 'bg-[#FCA5A5] text-[#161816]' : 'bg-white text-[#464B46]'
              }`}
            >
              I Lost Something
            </button>
          </div>

          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Item name (e.g., Casio fx-82MS)"
            className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-sm font-medium"
          />

          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Campus location (e.g., Library / LT-3)"
            className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-sm font-medium"
          />

          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Identifying detail..."
            className="w-full rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={posterName}
              onChange={(e) => setPosterName(e.target.value)}
              placeholder="Pseudonym"
              className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-bold"
            />
            <input
              type="text"
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
              placeholder="Collect at..."
              className="rounded-xl border-2 border-[#161816] bg-[#FFFBF0] px-3 py-2 text-xs font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="nb-btn w-full bg-[#184D38] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post to Lost & Found'}
          </button>
        </form>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((post) => (
            <article
              key={post.id}
              className={`bg-white nb-card rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                post.status === 'reunited' ? 'opacity-80' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`rounded border border-[#161816] px-2 py-0.5 font-extrabold uppercase ${
                      post.post_type === 'found' ? 'bg-[#5EEAD4] text-[#161816]' : 'bg-[#FCA5A5] text-[#161816]'
                    }`}
                  >
                    {post.post_type === 'found' ? 'Found Safe' : 'Lost Item'}
                  </span>
                  <span className="font-mono text-[#5B605B]">{post.created_at}</span>
                </div>
                <h3 className="mt-2 font-display text-base font-extrabold text-[#161816]">
                  {post.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#2F342F] flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#184D38]" />
                  <span>{post.location}</span>
                </p>
                <p className="mt-2 text-xs text-[#2F342F]">{post.description}</p>
              </div>

              <div className="pt-3 border-t-2 border-[#161816]/15 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-semibold text-[#5B605B]">
                  {post.poster_name} · {post.contact_note}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle(post.id)}
                  className={`nb-btn-sm inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-extrabold shrink-0 ${
                    post.status === 'reunited' ? 'bg-[#D1FAE5] text-[#144230]' : 'bg-[#FFFBF0] text-[#161816]'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{post.status === 'reunited' ? 'Reunited' : 'Mark Reunited'}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
