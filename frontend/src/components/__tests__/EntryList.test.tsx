import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryList from '../EntryList';
import { Entry } from '../../types';
import * as api from '../../api';
import * as socketService from '../../socket';

// モックの設定
jest.mock('../../api');
jest.mock('../../socket');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedSocketService = socketService as jest.Mocked<typeof socketService>;

describe('EntryList', () => {
  const mockEntries: Entry[] = [
    {
      id: 1,
      text: 'だいたいロマ子のテスト投稿1',
      count: 2,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
      userId: 'user-1',
      userName: 'ユーザー1'
    },
    {
      id: 2,
      text: 'だいたいロマ子のテスト投稿2',
      count: 1,
      createdAt: '2024-01-01T06:00:00Z',
      updatedAt: '2024-01-01T06:00:00Z',
      userId: 'user-2',
      userName: 'ユーザー2'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Socket serviceのモック設定
    mockedSocketService.socketService = {
      connect: jest.fn(),
      onEntryCreated: jest.fn(),
      offEntryCreated: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      isConnected: jest.fn()
    };
  });

  test('should render loading state initially', () => {
    mockedApi.entryAPI.getAll.mockImplementation(() => 
      new Promise(() => {}) // 永続的なpending状態
    );

    render(<EntryList />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  test('should render entries after loading', async () => {
    mockedApi.entryAPI.getAll.mockResolvedValue(mockEntries);

    render(<EntryList />);

    await waitFor(() => {
      expect(screen.getByText('投稿一覧')).toBeInTheDocument();
      expect(screen.getByText('だいたいロマ子のテスト投稿1')).toBeInTheDocument();
      expect(screen.getByText('だいたいロマ子のテスト投稿2')).toBeInTheDocument();
    });
  });

  test('should display entry details correctly', async () => {
    mockedApi.entryAPI.getAll.mockResolvedValue(mockEntries);

    render(<EntryList />);

    await waitFor(() => {
      // カウント情報
      expect(screen.getByText('カウント: 2')).toBeInTheDocument();
      expect(screen.getByText('カウント: 1')).toBeInTheDocument();
      
      // ユーザー情報
      expect(screen.getByText('投稿者: ユーザー1')).toBeInTheDocument();
      expect(screen.getByText('投稿者: ユーザー2')).toBeInTheDocument();
      
      // 日時情報
      expect(screen.getByText(/投稿日時:/)).toBeInTheDocument();
    });
  });

  test('should show "no entries" message when list is empty', async () => {
    mockedApi.entryAPI.getAll.mockResolvedValue([]);

    render(<EntryList />);

    await waitFor(() => {
      expect(screen.getByText('まだ投稿がありません')).toBeInTheDocument();
    });
  });

  test('should show error message and retry button on API failure', async () => {
    mockedApi.entryAPI.getAll.mockRejectedValue(new Error('API Error'));

    render(<EntryList />);

    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });
  });

  test('should retry loading when retry button is clicked', async () => {
    mockedApi.entryAPI.getAll
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockEntries);

    const user = userEvent.setup();
    render(<EntryList />);

    // 最初はエラー状態
    await waitFor(() => {
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    // 再試行ボタンをクリック
    const retryButton = screen.getByText('再試行');
    await user.click(retryButton);

    // 成功時の表示
    await waitFor(() => {
      expect(screen.getByText('だいたいロマ子のテスト投稿1')).toBeInTheDocument();
    });

    expect(mockedApi.entryAPI.getAll).toHaveBeenCalledTimes(2);
  });

  test('should setup WebSocket connection and listeners', () => {
    mockedApi.entryAPI.getAll.mockResolvedValue(mockEntries);

    render(<EntryList />);

    expect(mockedSocketService.socketService.connect).toHaveBeenCalled();
    expect(mockedSocketService.socketService.onEntryCreated).toHaveBeenCalled();
  });

  test('should cleanup WebSocket listeners on unmount', () => {
    mockedApi.entryAPI.getAll.mockResolvedValue(mockEntries);

    const { unmount } = render(<EntryList />);
    unmount();

    expect(mockedSocketService.socketService.offEntryCreated).toHaveBeenCalled();
  });

  test('should format dates correctly', async () => {
    mockedApi.entryAPI.getAll.mockResolvedValue(mockEntries);

    render(<EntryList />);

    await waitFor(() => {
      // 日本語の日時形式で表示されることを確認
      expect(screen.getByText(/2024\/01\/01/)).toBeInTheDocument();
    });
  });

  test('should show updated time when different from created time', async () => {
    const entriesWithUpdate: Entry[] = [
      {
        ...mockEntries[0],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z'
      }
    ];

    mockedApi.entryAPI.getAll.mockResolvedValue(entriesWithUpdate);

    render(<EntryList />);

    await waitFor(() => {
      expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
    });
  });

  test('should not show updated time when same as created time', async () => {
    const entriesWithoutUpdate: Entry[] = [
      {
        ...mockEntries[1],
        createdAt: '2024-01-01T06:00:00Z',
        updatedAt: '2024-01-01T06:00:00Z'
      }
    ];

    mockedApi.entryAPI.getAll.mockResolvedValue(entriesWithoutUpdate);

    render(<EntryList />);

    await waitFor(() => {
      expect(screen.queryByText(/最終更新:/)).not.toBeInTheDocument();
    });
  });
});