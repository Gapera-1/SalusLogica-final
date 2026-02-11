
import { create } from 'zustand';

const useMessageStore = create((set) => ({
  message: '',
  messageType: 'success',

  setMessage: (msg, type = 'success') => set({ message: msg, messageType: type }),
}));

export default useMessageStore;
