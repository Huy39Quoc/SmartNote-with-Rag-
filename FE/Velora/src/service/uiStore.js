import { create } from 'zustand'

const useUiStore = create((set) => ({
  modal: null,
  openModal: (name, data) => set({ modal: { name, data } }),
  closeModal: () => set({ modal: null }),
}))

export default useUiStore
