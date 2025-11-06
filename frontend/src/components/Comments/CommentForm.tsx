import React, { useState } from 'react';

type Props = {
  onSubmit: (content: string) => Promise<void>;
};

const CommentForm: React.FC<Props> = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      setLoading(true);
      await onSubmit(content.trim());
      setContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 border border-gray-200 rounded-xl px-3 py-2"
        placeholder="Escribe un comentario..."
      />
      <button className="bg-blue-600 text-white rounded-xl px-4 py-2" disabled={loading}>
        {loading ? 'Enviando...' : 'Comentar'}
      </button>
    </form>
  );
};

export default CommentForm;