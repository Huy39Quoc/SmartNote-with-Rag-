import client from './client'

const flashcardApi = {
    generate: (noteId) =>
        client.post(`/v1/flashcards/generate/${noteId}`),

    getByNote: (noteId) =>
        client.get(`/v1/flashcards/note/${noteId}`),

    generateFromDocument: (documentId) =>
        client.post(`/v1/flashcards/generate-from-document/${documentId}`),
}

export default flashcardApi
