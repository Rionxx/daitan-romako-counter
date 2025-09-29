import React, { useState, useEffect } from 'react';
import { Entry } from '../types';
import { entryAPI } from '../api';
import { socketService } from '../socket';

const EntryList: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const data = await entryAPI.getAll();
      setEntries(data);
      setError('');
    } catch (error) {
      console.error('Error fetching entries:', error);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    
    // WebSocket接続
    socketService.connect();
    
    // リアルタイム更新のリスナー設定
    socketService.onEntryCreated((newEntry: Entry) => {
      setEntries(prevEntries => {
        // 既存のエントリを更新するか、新しいエントリを追加
        const existingIndex = prevEntries.findIndex(entry => entry.text === newEntry.text);
        if (existingIndex >= 0) {
          const updatedEntries = [...prevEntries];
          updatedEntries[existingIndex] = newEntry;
          // 更新日時順で並び替え
          return updatedEntries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          return [newEntry, ...prevEntries];
        }
      });
    });
    
    return () => {
      socketService.offEntryCreated();
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="text-center py-6 sm:py-8">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm sm:text-base">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="text-center py-6 sm:py-8">
          <p className="text-red-600 text-sm sm:text-base">{error}</p>
          <button 
            onClick={fetchEntries}
            className="mt-2 px-3 py-2 sm:px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">投稿一覧</h2>
      
      {entries.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-gray-500">
          <p className="text-sm sm:text-base">まだ投稿がありません</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 break-words text-sm sm:text-base">{entry.text}</p>
                  {entry.userName && (
                    <div className="mt-1 sm:mt-2 flex items-center gap-2">
                      <div className="bg-green-100 p-1 rounded-full">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600">投稿者: {entry.userName}</span>
                    </div>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs sm:text-sm px-2 py-1 rounded-full">
                    カウント: {entry.count}
                  </span>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span>投稿日時: {formatDate(entry.createdAt)}</span>
                  {entry.createdAt !== entry.updatedAt && (
                    <span>最終更新: {formatDate(entry.updatedAt)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntryList;