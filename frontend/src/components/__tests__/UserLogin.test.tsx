import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserLogin from '../UserLogin';
import { User } from '../../types';
import * as api from '../../api';

// APIモックの設定
jest.mock('../../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('UserLogin', () => {
  const mockOnUserLogin = jest.fn();
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is not logged in', () => {
    test('should render registration form', () => {
      render(
        <UserLogin
          onUserLogin={mockOnUserLogin}
          currentUser={null}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('ユーザー登録')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('あなたの名前を入力')).toBeInTheDocument();
      expect(screen.getByText('登録して開始')).toBeInTheDocument();
    });

    test('should call onUserLogin when form is submitted with valid name', async () => {
      const mockUser: User = {
        id: 'test-user-id',
        name: 'テストユーザー',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockedApi.userAPI.create.mockResolvedValue({
        success: true,
        message: 'User created successfully',
        user: mockUser
      });

      const user = userEvent.setup();
      render(
        <UserLogin
          onUserLogin={mockOnUserLogin}
          currentUser={null}
          onLogout={mockOnLogout}
        />
      );

      const nameInput = screen.getByPlaceholderText('あなたの名前を入力');
      const submitButton = screen.getByText('登録して開始');

      await user.type(nameInput, 'テストユーザー');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedApi.userAPI.create).toHaveBeenCalledWith('テストユーザー');
        expect(mockOnUserLogin).toHaveBeenCalledWith(mockUser);
      });
    });

    test('should show error message when API call fails', async () => {
      mockedApi.userAPI.create.mockResolvedValue({
        success: false,
        message: 'User creation failed'
      });

      const user = userEvent.setup();
      render(
        <UserLogin
          onUserLogin={mockOnUserLogin}
          currentUser={null}
          onLogout={mockOnLogout}
        />
      );

      const nameInput = screen.getByPlaceholderText('あなたの名前を入力');
      const submitButton = screen.getByText('登録して開始');

      await user.type(nameInput, 'テストユーザー');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('User creation failed')).toBeInTheDocument();
      });
    });

    test('should not submit form with empty name', async () => {
      const user = userEvent.setup();
      render(
        <UserLogin
          onUserLogin={mockOnUserLogin}
          currentUser={null}
          onLogout={mockOnLogout}
        />
      );

      const submitButton = screen.getByText('登録して開始');
      expect(submitButton).toBeDisabled();

      await user.click(submitButton);
      expect(mockedApi.userAPI.create).not.toHaveBeenCalled();
    });

    test('should disable submit button while loading', async () => {
      mockedApi.userAPI.create.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          message: 'User created successfully',
          user: {
            id: 'test-user-id',
            name: 'テストユーザー',
            createdAt: '2024-01-01T00:00:00Z'
          }
        }), 1000))
      );

      const user = userEvent.setup();
      render(
        <UserLogin
          onUserLogin={mockOnUserLogin}
          currentUser={null}
          onLogout={mockOnLogout}
        />
      );

      const nameInput = screen.getByPlaceholderText('あなたの名前を入力');
      const submitButton = screen.getByText('登録して開始');

      await user.type(nameInput, 'テストユーザー');
      await user.click(submitButton);

      expect(screen.getByText('登録中...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('when user is logged in', () => {
    const currentUser: User = {
      id: 'test-user-id',
      name: 'ログイン済みユーザー',
      createdAt: '2024-01-01T00:00:00Z'
    };

    test('should render user info and logout button', () => {
      render(
        <UserLogin
          onUserLogin={mockOnUserLogin}
          currentUser={currentUser}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('ログイン中')).toBeInTheDocument();
      expect(screen.getByText('ログイン済みユーザー')).toBeInTheDocument();
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    test('should call onLogout when logout button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserLogin
          onUserLogin={mockOnUserLogin}
          currentUser={currentUser}
          onLogout={mockOnLogout}
        />
      );

      const logoutButton = screen.getByText('ログアウト');
      await user.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalled();
    });

    test('should not render registration form', () => {
      render(
        <UserLogin
          onUserLogin={mockOnUserLogin}
          currentUser={currentUser}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.queryByText('ユーザー登録')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('あなたの名前を入力')).not.toBeInTheDocument();
    });
  });
});