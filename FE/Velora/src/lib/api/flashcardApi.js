import client from './client';

const flashcardApi = {
    // SỬA THÀNH: Thêm /v1 vào trước đường dẫn API
    generate: (noteId) => client.post(`/v1/flashcards/generate/${noteId}`),

    // SỬA THÀNH: Thêm /v1 tại đây tương tự
    getByNote: (noteId) => client.get(`/v1/flashcards/note/${noteId}`),
};

export default flashcardApi;