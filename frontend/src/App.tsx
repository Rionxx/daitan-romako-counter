import React, { useState, useEffect } from 'react';
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import Ranking from './components/Ranking';
import UserLogin from './components/UserLogin';
import { User } from './types';
import { socketService } from './socket';

type Tab = 'input' | 'list' | 'ranking';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('input');
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleEntryCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // WebSocket接続でユーザー情報を送信
    socketService.connect();
    socketService.join({ userId: user.id, userName: user.name });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    socketService.disconnect();
  };

  // アプリ起動時にローカルストレージからユーザー情報を復元
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        
        // WebSocket接続
        socketService.connect();
        socketService.join({ userId: user.id, userName: user.name });
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const TabButton: React.FC<{ tab: Tab; label: string; isActive: boolean; onClick: () => void }> = 
    ({ tab, label, isActive, onClick }) => (
      <button
        onClick={onClick}
        className={`px-4 py-2 font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {label}
      </button>
    );

  const renderContent = () => {
    switch (activeTab) {
      case 'input':
        return <EntryForm onEntryCreated={handleEntryCreated} currentUser={currentUser} />;
      case 'list':
        return <EntryList key={`list-${refreshKey}`} />;
      case 'ranking':
        return <Ranking key={`ranking-${refreshKey}`} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            ロマ子のあるある挨拶カウンター
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            「ロマ子のあるある挨拶」を投稿してカウントしよう！
          </p>
        </header>

        <nav className="flex justify-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-2 bg-white p-2 rounded-lg shadow-md">
            <TabButton
              tab="input"
              label="投稿"
              isActive={activeTab === 'input'}
              onClick={() => setActiveTab('input')}
            />
            <TabButton
              tab="list"
              label="一覧"
              isActive={activeTab === 'list'}
              onClick={() => setActiveTab('list')}
            />
            <TabButton
              tab="ranking"
              label="ランキング"
              isActive={activeTab === 'ranking'}
              onClick={() => setActiveTab('ranking')}
            />
          </div>
        </nav>

        <main className="max-w-4xl mx-auto">
          <UserLogin 
            onUserLogin={handleUserLogin}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
          {renderContent()}
        </main>

        <footer className="text-center mt-8 sm:mt-12 text-gray-500 text-xs sm:text-sm px-4">
          <p>© 2024 ロマ子あるある挨拶カウンター</p>
        </footer>
      </div>
    </div>
  );
};

export default App;