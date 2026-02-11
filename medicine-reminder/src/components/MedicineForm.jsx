import { useState } from 'react';
import useMedicineStore from '../store/useMedicineStore';
import useMessageStore from '../store/useMessageStore';

function MedicineForm() {
  const [name, setName] = useState('');
  const [times, setTimes] = useState(''); // comma separated times
  const [posology, setPosology] = useState('');
  const [duration, setDuration] = useState('');

  const addMedicine = useMedicineStore((state) => state.addMedicine);
  const setMessage = useMessageStore((state) => state.setMessage);

  const validateTime = (time) => {
    // Matches HH:MM 24-hour format
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !times || !posology || !duration) {
      setMessage('Please fill all fields', 'error');
      return;
    }

    const timeArray = times.split(',').map((t) => t.trim());

    // Validate each time
    for (let t of timeArray) {
      if (!validateTime(t)) {
        setMessage(`Invalid time format: ${t}. Use HH:MM (24-hour).`, 'error');
        return;
      }
    }

    addMedicine({
      id: Date.now(),
      name,
      times: timeArray,
      posology,
      duration: Number(duration),
    });

    setMessage(`Medicine ${name} added!`, 'success');

    setName('');
    setTimes('');
    setPosology('');
    setDuration('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md p-4 bg-gray-100 rounded mb-4">
      <input
        type="text"
        placeholder="Medicine Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2"
      />
      <input
        type="text"
        placeholder="Times (comma separated, e.g., 07:00,12:00,18:00)"
        value={times}
        onChange={(e) => setTimes(e.target.value)}
        className="border p-2"
      />
      <input
        type="text"
        placeholder="Posology (e.g., 2 tablets after meal)"
        value={posology}
        onChange={(e) => setPosology(e.target.value)}
        className="border p-2"
      />
      <input
        type="number"
        placeholder="Duration (days)"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="border p-2"
        min="1"
      />
      <button type="submit" className="bg-blue-600 text-white p-2 rounded">
        Add
      </button>
    </form>
  );
}

export default MedicineForm;
