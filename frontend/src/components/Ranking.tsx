import React, { useState, useEffect } from 'react';
import { Entry } from '../types';
import { entryAPI } from '../api';
import { socketService } from '../socket';

const Ranking: React.FC = () => {
  const [ranking, setRanking] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRanking = async () => {
    try {
      setIsLoading(true);
      const data = await entryAPI.getRanking();
      setRanking(data);
      setError('');
    } catch (error) {
      console.error('Error fetching ranking:', error);
      setError('ランキングの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
    
    // WebSocket接続とリアルタイム更新
    socketService.connect();
    
    socketService.onEntryCreated((newEntry: Entry) => {
      setRanking(prevRanking => {
        const existingIndex = prevRanking.findIndex(entry => entry.text === newEntry.text);
        let updatedRanking;
        
        if (existingIndex >= 0) {
          updatedRanking = [...prevRanking];
          updatedRanking[existingIndex] = newEntry;
        } else {
          updatedRanking = [...prevRanking, newEntry];
        }
        
        // カウント順で並び替え
        return updatedRanking.sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      });
    });
    
    return () => {
      socketService.offEntryCreated();
    };
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}位`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 2:
        return 'bg-gray-100 border-gray-300 text-gray-800';
      case 3:
        return 'bg-orange-100 border-orange-300 text-orange-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="text-center py-6 sm:py-8">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm sm:text-base">ランキング読み込み中...</p>
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
            onClick={fetchRanking}
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
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">ランキング</h2>
      
      {ranking.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-gray-500">
          <p className="text-sm sm:text-base">まだランキングデータがありません</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {ranking.map((entry, index) => {
            const rank = index + 1;
            return (
              <div 
                key={entry.id} 
                className={`border rounded-lg p-3 sm:p-4 ${getRankColor(rank)} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold flex-shrink-0">
                      {getRankIcon(rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 break-words text-sm sm:text-base">{entry.text}</p>
                      {entry.userName && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="bg-green-100 p-1 rounded-full">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600">投稿者: {entry.userName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm sm:text-base md:text-lg font-bold">
                      {entry.count}回
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {rank}位
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Ranking;