import { create } from 'zustand'

const useUiStore = create((set) => ({
  modal: null,
  moModal: (ten, data) => set({ modal: { ten, data } }),
  dongModal: () => set({ modal: null }),
}))

export default useUiStore
