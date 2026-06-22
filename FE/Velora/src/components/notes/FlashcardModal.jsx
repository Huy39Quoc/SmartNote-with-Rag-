import React, { useState } from 'react';
// ĐỔI TỪ lucide-react SANG @tabler/icons-react
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export default function FlashcardModal({ isOpen, onClose, flashcards }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (!isOpen || !flashcards || flashcards.length === 0) return null;

    const currentCard = flashcards[currentIndex];

    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % flashcards.length);
        }, 250);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
        }, 250);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden p-6 relative border border-gray-100 dark:border-gray-800 transition-colors">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        Học thông minh với Flashcard AI ({currentIndex + 1}/{flashcards.length})
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                        {/* THAY THẾ: X -> IconX */}
                        <IconX size={20} />
                    </button>
                </div>

                {/* Khung Lật hiệu ứng 3D CSS */}
                <div
                    className="w-full h-64 cursor-pointer relative"
                    style={{ perspective: '1000px' }}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <div
                        className="w-full h-full duration-500 ease-in-out select-none rounded-xl border relative shadow-sm"
                        style={{
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                    >
                        {/* Mặt Trước (Mặt Câu Hỏi) */}
                        <div
                            className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200"
                            style={{ backfaceVisibility: 'hidden' }}
                        >
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Câu Hỏi</span>
                            <p className="text-base text-center font-medium px-4">{currentCard.question}</p>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-6 italic">(Bấm để lật xem đáp án)</span>
                        </div>

                        {/* Mặt Sau (Mặt Đáp Án) */}
                        <div
                            className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-850 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-400 font-semibold"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Đáp Án</span>
                            <p className="text-base text-center px-4 font-medium">{currentCard.answer}</p>
                        </div>
                    </div>
                </div>

                {/* Thanh Điều Hướng Dưới */}
                <div className="flex justify-between items-center mt-6">
                    <button
                        onClick={handlePrev}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        {/* THAY THẾ: ChevronLeft -> IconChevronLeft */}
                        <IconChevronLeft size={16} /> Câu trước
                    </button>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-colors"
                    >
                        {/* THAY THẾ: ChevronRight -> IconChevronRight */}
                        Câu tiếp <IconChevronRight size={16} />
                    </button>
                </div>

            </div>
        </div>
    );
}