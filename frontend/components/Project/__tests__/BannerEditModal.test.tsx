import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BannerEditModal from '../BannerEditModal';
import { getCsrfToken } from '../../../utils/csrfService';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, fallback: string) => fallback }),
}));

jest.mock('../../../utils/bannersService', () => ({
    getPresetBanners: () => [],
}));

jest.mock('../../../utils/csrfService', () => ({
    getCsrfToken: jest.fn(),
}));

describe('BannerEditModal upload', () => {
    const mockFetch = jest.fn();
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        (global as any).fetch = mockFetch;
        (getCsrfToken as jest.Mock).mockResolvedValue('csrf-token-value');
        consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('sends CSRF token when uploading a project banner', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ imageUrl: '/uploads/test-banner.jpg' }),
        });

        const onSave = jest.fn().mockResolvedValue(undefined);
        render(
            <BannerEditModal
                isOpen={true}
                onClose={jest.fn()}
                onSave={onSave}
                currentImageUrl=""
            />
        );

        const fileInput = document.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        const file = new File(['image-content'], 'banner.jpg', {
            type: 'image/jpeg',
        });

        fireEvent.change(fileInput, { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith('/uploads/test-banner.jpg')
        );

        expect(mockFetch).toHaveBeenCalledWith(
            '/api/upload/project-image',
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
                headers: { 'x-csrf-token': 'csrf-token-value' },
                body: expect.any(FormData),
            })
        );
    });

    it('shows backend upload error when server returns one', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Invalid CSRF token' }),
        });

        const onSave = jest.fn();
        render(
            <BannerEditModal
                isOpen={true}
                onClose={jest.fn()}
                onSave={onSave}
                currentImageUrl=""
            />
        );

        const fileInput = document.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        const file = new File(['image-content'], 'banner.jpg', {
            type: 'image/jpeg',
        });

        fireEvent.change(fileInput, { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(screen.getByText('Invalid CSRF token')).toBeInTheDocument();
        });
        expect(onSave).not.toHaveBeenCalled();
    });
});
