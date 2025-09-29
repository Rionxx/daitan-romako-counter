import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryForm from '../EntryForm';
import { User } from '../../types';
import * as api from '../../api';

// APIモックの設定
jest.mock('../../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('EntryForm', () => {
  const mockOnEntryCreated = jest.fn();
  const currentUser: User = {
    id: 'test-user-id',
    name: 'テストユーザー',
    createdAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is logged in', () => {
    test('should render form with textarea and submit button', () => {
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={currentUser}
        />
      );

      expect(screen.getByText('テキスト投稿')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('「ロマ子のあるある挨拶」を含むテキストを入力してください')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
    });

    test('should submit form with valid text', async () => {
      const validText = 'だいたいロマ子のテスト投稿';
      
      mockedApi.entryAPI.create.mockResolvedValue({
        success: true,
        message: 'Entry saved successfully',
        entry: {
          id: 1,
          text: validText,
          count: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          userId: currentUser.id,
          userName: currentUser.name
        }
      });

      const user = userEvent.setup();
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={currentUser}
        />
      );

      const textarea = screen.getByPlaceholderText('「ロマ子のあるある挨拶」を含むテキストを入力してください');
      const submitButton = screen.getByText('保存');

      await user.type(textarea, validText);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedApi.entryAPI.create).toHaveBeenCalledWith({
          text: validText,
          userId: currentUser.id,
          userName: currentUser.name
        });
        expect(mockOnEntryCreated).toHaveBeenCalled();
      });
    });

    test('should show success message after successful submission', async () => {
      const validText = 'だいたいロマ子のテスト投稿';
      
      mockedApi.entryAPI.create.mockResolvedValue({
        success: true,
        message: 'Entry saved successfully'
      });

      const user = userEvent.setup();
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={currentUser}
        />
      );

      const textarea = screen.getByPlaceholderText('「ロマ子のあるある挨拶」を含むテキストを入力してください');
      const submitButton = screen.getByText('保存');

      await user.type(textarea, validText);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('保存されました！')).toBeInTheDocument();
      });
    });

    test('should show error message when API call fails', async () => {
      const validText = 'だいたいロマ子のテスト投稿';
      
      mockedApi.entryAPI.create.mockResolvedValue({
        success: false,
        message: 'Server error'
      });

      const user = userEvent.setup();
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={currentUser}
        />
      );

      const textarea = screen.getByPlaceholderText('「ロマ子のあるある挨拶」を含むテキストを入力してください');
      const submitButton = screen.getByText('保存');

      await user.type(textarea, validText);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    test('should clear textarea after successful submission', async () => {
      const validText = 'だいたいロマ子のテスト投稿';
      
      mockedApi.entryAPI.create.mockResolvedValue({
        success: true,
        message: 'Entry saved successfully'
      });

      const user = userEvent.setup();
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={currentUser}
        />
      );

      const textarea = screen.getByPlaceholderText('「ロマ子のあるある挨拶」を含むテキストを入力してください') as HTMLTextAreaElement;
      const submitButton = screen.getByText('保存');

      await user.type(textarea, validText);
      await user.click(submitButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    test('should disable submit button when textarea is empty', () => {
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={currentUser}
        />
      );

      const submitButton = screen.getByText('保存');
      expect(submitButton).toBeDisabled();
    });

    test('should enable submit button when textarea has content', async () => {
      const user = userEvent.setup();
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={currentUser}
        />
      );

      const textarea = screen.getByPlaceholderText('「ロマ子のあるある挨拶」を含むテキストを入力してください');
      const submitButton = screen.getByText('保存');

      await user.type(textarea, 'だいたいロマ子のテスト');

      expect(submitButton).toBeEnabled();
    });

    test('should show loading state during submission', async () => {
      mockedApi.entryAPI.create.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          message: 'Entry saved successfully'
        }), 1000))
      );

      const user = userEvent.setup();
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={currentUser}
        />
      );

      const textarea = screen.getByPlaceholderText('「ロマ子のあるある挨拶」を含むテキストを入力してください');
      const submitButton = screen.getByText('保存');

      await user.type(textarea, 'だいたいロマ子のテスト');
      await user.click(submitButton);

      expect(screen.getByText('保存中...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('when user is not logged in', () => {
    test('should show login required message', () => {
      render(
        <EntryForm
          onEntryCreated={mockOnEntryCreated}
          currentUser={null}
        />
      );

      expect(screen.getByText('投稿するには上でユーザー登録を行ってください')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('「ロマ子のあるある挨拶」を含むテキストを入力してください')).not.toBeInTheDocument();
    });
  });
});