import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonth, getYear } from "date-fns";

const range = (start, end) => {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const FormDatePicker = ({ selected, onChange, placeholderText, className, darkMode = true }) => {
  const years = range(1950, getYear(new Date()));
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="relative w-full">
      <DatePicker
        showPopperArrow={false}
        selected={selected ? new Date(selected) : null}
        onChange={(date) => onChange(date)}
        placeholderText={placeholderText}
        className={className}
        dateFormat="yyyy-MM-dd"
        maxDate={new Date()}
        fixedHeight
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="px-3 py-2 flex flex-col gap-2">
             {/* Top Row: Navigation and Title */}
             <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'}`}
                >
                    <ChevronLeft size={20} />
                </button>
                
                <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {months[getMonth(date)]} {getYear(date)}
                </span>

                <button
                    type="button"
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'}`}
                >
                    <ChevronRight size={20} />
                </button>
             </div>

             {/* Bottom Row: Selection Dropdowns */}
             <div className="flex gap-2">
                <select
                    value={months[getMonth(date)]}
                    onChange={({ target: { value } }) => changeMonth(months.indexOf(value))}
                    className={`flex-1 px-2 py-1 rounded-lg text-sm font-medium outline-none border transition-all
                        ${darkMode 
                            ? 'bg-[#1e293b] border-white/10 text-white focus:border-emerald-500/50' 
                            : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500'}`}
                >
                    {months.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>

                <select
                    value={getYear(date)}
                    onChange={({ target: { value } }) => changeYear(value)}
                    className={`flex-1 px-2 py-1 rounded-lg text-sm font-medium outline-none border transition-all
                        ${darkMode 
                            ? 'bg-[#1e293b] border-white/10 text-white focus:border-emerald-500/50' 
                            : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500'}`}
                >
                    {years.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
             </div>
          </div>
        )}
      />
    </div>
  );
};

export default FormDatePicker;
