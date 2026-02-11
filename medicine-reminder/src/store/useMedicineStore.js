import { create } from 'zustand';

const useMedicineStore = create((set, get) => ({
  medicines: JSON.parse(localStorage.getItem('medicines')) || [],

  addMedicine: (medicine) => {
    set((state) => {
      const newMeds = [
        ...state.medicines,
        {
          ...medicine,
          id: Date.now(),                // ensure unique ID
          startDate: new Date().toDateString(),  // needed for duration
          lastNotified: {},
          takenTimes: {},
        },
      ];

      localStorage.setItem('medicines', JSON.stringify(newMeds));
      return { medicines: newMeds };
    });
  },

  removeMedicine: (id) => {
    set((state) => {
      const newMeds = state.medicines.filter((m) => m.id !== id);
      localStorage.setItem('medicines', JSON.stringify(newMeds));
      return { medicines: newMeds };
    });
  },

  markTaken: (id, time) => {
    set((state) => {
      const newMeds = state.medicines.map((m) =>
        m.id === id
          ? { ...m, takenTimes: { ...m.takenTimes, [time]: true } }
          : m
      );

      localStorage.setItem('medicines', JSON.stringify(newMeds));
      return { medicines: newMeds };
    });

    window.speechSynthesis.cancel();
  },
}));

export default useMedicineStore;
