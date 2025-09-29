import React, { useState } from 'react';
import { User } from '../types';
import { userAPI } from '../api';

interface UserLoginProps {
  onUserLogin: (user: User) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const UserLogin: React.FC<UserLoginProps> = ({ onUserLogin, currentUser, onLogout }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await userAPI.create(name.trim());
      if (response.success && response.user) {
        onUserLogin(response.user);
        setName('');
      } else {
        setError(response.message || 'ユーザー作成に失敗しました');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError('ユーザー作成中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-800 text-sm sm:text-base">ログイン中</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{currentUser.name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-2 sm:px-4 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors w-full sm:w-auto"
          >
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">ユーザー登録</h2>
      <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
        投稿するには名前を入力してください
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="あなたの名前を入力"
            className="w-full px-3 py-2 sm:px-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>
        
        {error && (
          <div className="text-red-600 text-xs sm:text-sm">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="w-full px-3 py-2 sm:px-4 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '登録中...' : '登録して開始'}
        </button>
      </form>
    </div>
  );
};

export default UserLogin;