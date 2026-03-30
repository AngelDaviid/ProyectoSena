import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger',
}) => {
    if (!isOpen) return null;

    const getButtonStyles = () => {
        const styleMap = {
            danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
            warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
            info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        };
        return styleMap[type] || styleMap.info;
    };

    const getIconColor = () => {
        const colorMap = {
            danger: 'text-red-600',
            warning: 'text-yellow-600',
            info: 'text-blue-600',
        };
        return colorMap[type] || colorMap.info;
    };

    const getBgColor = () => {
        const bgMap = {
            danger: 'bg-red-100',
            warning: 'bg-yellow-100',
            info: 'bg-blue-100',
        };
        return bgMap[type] || bgMap.info;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
                <div className="flex items-start justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getBgColor()}`}>
                            <AlertTriangle className={`w-6 h-6 ${getIconColor()}`} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-gray-700">{message}</p>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition">
                        {cancelText}
                    </button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 transition ${getButtonStyles()}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;