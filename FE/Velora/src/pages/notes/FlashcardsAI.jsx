import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconChevronRight, IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import flashcardApi from '../../lib/api/flashcardApi';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import useAuthStore from '../../service/authStore'
import { hasFeature } from '../../utils/packageFeatures'

export default function FlashcardsAI() {
    const { user } = useAuthStore()

    const duocDungFlashcard = hasFeature(user, 'AI_FLASHCARD')
    const { id } = useParams();
    const navigate = useNavigate();

    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        flashcardApi.getByNote(id)
            .then(res => {
                const list = res.data?.data || res.data;
                setFlashcards(list || []);
            })
            .catch(() => toast.error("Không thể tải bộ Flashcard."))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (flashcards.length === 0) return;

        const handleKeyDown = (e) => {

            if (e.code === 'Space') {
                e.preventDefault();
                setIsFlipped((prev) => !prev);
            }

            if (e.code === 'ArrowRight') {
                handleNext();
            }

            if (e.code === 'ArrowLeft') {
                handlePrev();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [flashcards, currentIndex]);

    if (!duocDungFlashcard) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
                <p className="text-gray-600 dark:text-gray-400 font-medium mb-4">
                    Tính năng Flashcard AI chỉ dành cho gói Pro hoặc Plus.
                </p>

                <button
                    onClick={() => navigate('/service-packages')}
                    className="btn-primary flex items-center gap-2"
                >
                    Nâng cấp gói
                </button>

                <button
                    onClick={() => navigate(`/notes/${id}`)}
                    className="btn-ghost flex items-center gap-2 mt-3"
                >
                    <IconArrowLeft size={16} /> Quay lại ghi chú
                </button>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <Spinner />
                <p className="mt-4 text-sm text-gray-500">Đang tải bộ câu hỏi AI...</p>
            </div>
        );
    }

    if (!flashcards || flashcards.length === 0) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
                <p className="text-gray-600 dark:text-gray-400 font-medium mb-4">Ghi chú này chưa được tạo bộ câu hỏi trắc nghiệm.</p>
                <button onClick={() => navigate(`/notes/${id}`)} className="btn-primary flex items-center gap-2">
                    <IconArrowLeft size={16} /> Quay lại ghi chú
                </button>
            </div>
        );
    }

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
        <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50 transition-colors dark:bg-gray-950">

            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center shadow-sm">
                <button
                    onClick={() => navigate(`/notes/${id}`)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <IconArrowLeft size={16} /> Quay lại trình soạn thảo
                </button>
            </header>

            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-start px-6 py-8">

                <div className="w-full mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-indigo-500 font-semibold text-sm uppercase tracking-wider">
                                Flashcard AI Study Mode
                            </p>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Không gian ôn tập thông minh
                            </h1>
                        </div>

                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                Thẻ {currentIndex + 1} / {flashcards.length}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Nhấn SPACE để lật thẻ • Phím mũi tên để chuyển câu
                            </p>
                        </div>
                    </div>

                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                            style={{
                                width: `${((currentIndex + 1) / flashcards.length) * 100}%`
                            }}
                        />
                    </div>
                </div>

                <div
                    className="relative h-[clamp(300px,52vh,450px)] w-full cursor-pointer"
                    style={{ perspective: "2000px" }}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <div
                        className="relative w-full h-full transition-transform duration-700"
                        style={{
                            transformStyle: "preserve-3d",
                            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                        }}
                    >

                        <div
                            className="absolute inset-0 rounded-3xl shadow-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col justify-center items-center p-12 select-none"
                            style={{ backfaceVisibility: "hidden" }}
                        >
                            <span className="px-4 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-6 tracking-wide">
                                CÂU HỎI
                            </span>

                            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white leading-relaxed px-4">
                                {currentCard.question}
                            </h2>

                            <div className="mt-10 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                <IconRefresh size={14} /> Bấm vào thẻ hoặc nhấn Space để lật xem đáp án
                            </div>
                        </div>

                        <div
                            className="absolute inset-0 rounded-3xl shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex flex-col justify-center items-center p-12 text-white select-none"
                            style={{
                                backfaceVisibility: "hidden",
                                transform: "rotateY(180deg)"
                            }}
                        >
                            <span className="px-4 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-6 tracking-wide">
                                ĐÁP ÁN
                            </span>

                            <h2 className="text-2xl md:text-3xl font-bold text-center leading-relaxed px-4">
                                {currentCard.answer}
                            </h2>

                            <div className="mt-10 text-xs text-white/70">
                                Đã nhớ câu này chưa? Hãy chọn mức độ bên dưới
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-8 flex-wrap justify-center">
                    <button className="px-5 py-2.5 rounded-2xl bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold hover:scale-105 transition-all text-sm active:scale-95">
                        😕 Chưa nhớ
                    </button>

                    <button className="px-5 py-2.5 rounded-2xl bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 font-semibold hover:scale-105 transition-all text-sm active:scale-95">
                        🙂 Tạm ổn
                    </button>

                    <button className="px-5 py-2.5 rounded-2xl bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-semibold hover:scale-105 transition-all text-sm active:scale-95">
                        😎 Đã thuộc
                    </button>
                </div>

                <div className="w-full flex justify-between mt-10">
                    <button
                        onClick={handlePrev}
                        className="px-6 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:scale-105 text-gray-700 dark:text-gray-300 font-medium transition-all flex items-center gap-1 active:scale-95"
                    >
                        ← Câu trước
                    </button>

                    <button
                        onClick={handleNext}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105 font-medium transition-all flex items-center gap-1 active:scale-95"
                    >
                        Câu tiếp →
                    </button>
                </div>

            </main>
        </div>
    );
}
