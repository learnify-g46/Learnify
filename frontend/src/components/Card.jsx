import React from "react";
import { FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const CourseCard = ({ thumbnail, title, category, price, id, reviews }) => {
  const navigate = useNavigate()

  const calculateAverageRating = (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  const avgRating = calculateAverageRating(reviews);

  return (
    <div
      className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/viewcourse/${id}`)}
    >
      {/* Thumbnail */}
      <img
        src={thumbnail}
        alt={title}
        className="w-full h-48 object-cover"
      />

      {/* Content */}
      <div className="p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-1">{title}</h2>

        <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400 capitalize">
          {category}
        </span>

        <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100 dark:border-gray-800">
          <span className="font-semibold text-slate-900 dark:text-white">₹{price}</span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-gray-300">
            <FaStar className="text-amber-400" /> {avgRating}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
