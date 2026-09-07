import React from "react";
import { FaStar } from "react-icons/fa6";
import { FaRegStar } from "react-icons/fa";

const ReviewCard = ({ text, name, image, rating, role }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 max-w-sm w-full">
      <div className="flex items-center mb-3 text-amber-400 text-sm">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <span key={i}>
              {i < rating ? <FaStar /> : <FaRegStar />}
            </span>
          ))}
      </div>

      <p className="text-slate-600 dark:text-gray-300 text-sm mb-5">{text}</p>

      <div className="flex items-center gap-3">
        <img
          src={image}
          alt={name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{name}</h4>
          <p className="text-xs text-slate-500 dark:text-gray-400">{role}</p>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;
