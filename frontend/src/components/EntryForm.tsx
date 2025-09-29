import React, { useState } from 'react';
import { entryAPI } from '../api';
import { User } from '../types';

interface EntryFormProps {
  onEntryCreated: () => void;
  currentUser: User | null;
}

const EntryForm: React.FC<EntryFormProps> = ({ onEntryCreated, currentUser }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setMessage('ログインが必要です');
      setMessageType('error');
      return;
    }
    
    if (!text.trim()) {
      setMessage('テキストを入力してください');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await entryAPI.create({ 
        text: text.trim(),
        userId: currentUser.id,
        userName: currentUser.name
      });
      
      if (response.success) {
        setMessage('保存されました！');
        setMessageType('success');
        setText('');
        onEntryCreated();
      } else {
        setMessage(response.message);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      setMessage('エラーが発生しました');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">テキスト投稿</h2>
        <div className="text-center py-6 sm:py-8 text-gray-500">
          <p className="text-sm sm:text-base">投稿するには上でユーザー登録を行ってください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">テキスト投稿</h2>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="「ロマ子のあるある挨拶」を含むテキストを入力してください"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical text-sm sm:text-base"
            rows={3}
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full bg-blue-500 text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
      </form>

      {message && (
        <div className={`mt-3 sm:mt-4 p-3 rounded-lg text-sm sm:text-base ${
          messageType === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-red-100 text-red-700 border border-red-300'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default EntryForm;