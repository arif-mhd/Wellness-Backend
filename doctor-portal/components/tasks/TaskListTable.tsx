"use client";

import React, { useState } from "react";
import Image from "next/image";
import checkIcon from "@/assets/images/check_icon.png";
import { TaskItem } from "./TaskDetailsCard";

interface TaskListTableProps {
  tasks: TaskItem[];
  selectedTaskId: number | null;
  onSelectTask: (task: TaskItem) => void;
  onToggleComplete: (taskId: number) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onHoverTask?: (task: TaskItem | null) => void;
}

export default function TaskListTable({
  tasks,
  selectedTaskId,
  onSelectTask,
  onToggleComplete,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  onHoverTask,
}: TaskListTableProps) {
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Filter & Search Logic
  const filteredTasks = tasks.filter((task) => {
    // 1. Filter by tab status
    if (activeFilter === "Pending" && task.status !== "Pending") return false;
    if (activeFilter === "Completed" && task.status !== "Completed") return false;
    if (activeFilter === "Missed" && task.status !== "Missed") return false;

    // 2. Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      return (
        task.type.toLowerCase().includes(query) ||
        task.summary.toLowerCase().includes(query) ||
        task.patientName.toLowerCase().includes(query) ||
        task.email.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const filters = ["ALL", "Pending", "Completed", "Missed"];

  return (
    <div className="flex flex-col bg-white border border-[#EBEEF5] rounded-[24px] p-6 shadow-sm min-h-[580px] justify-between select-none">
      <div className="flex flex-col gap-6">
        {/* Filter Tabs & Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setCurrentPage(1); // Reset to page 1 on filter change
                  }}
                  className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-[-0.24px] border transition-all duration-200 ${
                    isActive
                      ? "bg-[#24292E] text-white border-transparent shadow-sm"
                      : "bg-white text-[#676E76] border-[#EBEEF5] hover:bg-gray-50 hover:text-[#24292E]"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {filter === "ALL" ? "ALL" : filter}
                </button>
              );
            })}

            {/* Interactive Search toggle */}
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                className={`p-2.5 rounded-full border transition-all ${
                  showSearchInput || searchQuery
                    ? "bg-[#F5F6FA] border-[#EBEEF5] text-[#24292E]"
                    : "bg-white border-[#EBEEF5] text-[#676E76] hover:bg-gray-50"
                }`}
                title="Search tasks"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12.2504 12.2504L9.71289 9.71289"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {showSearchInput && (
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-[#F5F6FA] border border-[#EBEEF5] text-[#24292E] placeholder-[#9EA5AD] text-xs rounded-full px-4 py-2 outline-none w-40 focus:w-48 transition-all"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Right Action Menu Icon */}
          <button className="self-end sm:self-center p-2.5 rounded-full border border-[#EBEEF5] text-[#676E76] hover:bg-gray-50 hover:text-[#24292E] transition-all">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.667 4h10.666M4.667 8h6.666M6.667 12h2.666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Task List Table Header */}
        <div className="hidden md:grid grid-cols-[1.5fr_2fr_0.8fr_1.5fr] gap-4 pl-4 pr-4 py-2 text-[#9EA5AD] text-[12px] font-semibold uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
          <span>Task</span>
          <span>Summary</span>
          <span>Time</span>
          <span className="text-right"></span>
        </div>

        {/* Tasks List Items */}
        <div className="flex flex-col gap-2 min-h-[350px]">
          {currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5EB" strokeWidth="2" className="mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-[#676E76] text-sm">No tasks matching filters.</span>
            </div>
          ) : (
            currentItems.map((task) => {
              const isSelected = selectedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  onMouseEnter={() => onHoverTask?.(task)}
                  onMouseLeave={() => onHoverTask?.(null)}
                  className="group grid grid-cols-1 md:grid-cols-[1.5fr_2fr_0.8fr_1.5fr] gap-4 items-center p-3 rounded-2xl cursor-pointer border border-transparent bg-white hover:bg-[#ECEFFE]/80 transition-all duration-300"
                >
                  {/* Task Info with Checkbox Icon */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(task.id);
                      }}
                      className="shrink-0 transition-all duration-150 hover:scale-105"
                      title={task.status === "Completed" ? "Mark Pending" : "Mark Completed"}
                    >
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(88,121,252,0.2)] transition-all duration-200 ${
                        task.status === "Completed" ? "opacity-100" : "opacity-75 group-hover:opacity-100"
                      }`}>
                        <Image
                          src={checkIcon}
                          alt="Check Icon"
                          className="w-5 h-5 object-contain"
                        />
                      </div>
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[#24292E] font-medium text-[13px] tracking-[-0.26px] truncate ${task.status === "Completed" ? "line-through opacity-50" : ""}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                        {task.type}
                      </span>
                      <span className="text-[#9EA5AD] text-xs truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {task.email}
                      </span>
                    </div>
                  </div>

                  {/* Summary Text and badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    {task.priority === "High" && (
                      <span
                        className="bg-[#F25252] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 select-none"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        High Priority
                      </span>
                    )}
                    <span className={`text-[#676E76] text-xs truncate ${task.status === "Completed" ? "opacity-50" : ""}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                      {task.summary}
                    </span>
                  </div>

                  {/* Time info */}
                  <div className={`text-[#676E76] text-xs ${task.status === "Completed" ? "opacity-50" : ""}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                    {task.time}
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center justify-end gap-3 mt-2 md:mt-0">
                    {/* Messaging Chat Trigger */}
                    <button className="w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#3D4B5A] hover:bg-[#F5F6FA] hover:text-[#5879FC] transition-colors shadow-sm">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.25 6.417a4.667 4.667 0 01-4.958 4.666 4.9 4.9 0 01-2.217-.408L1.75 12.25l1.108-3.325a4.667 4.667 0 119.392-2.508z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(task.id);
                      }}
                      className={`whitespace-nowrap shrink-0 h-[32px] px-3.5 rounded-xl text-xs font-semibold tracking-[-0.24px] transition-all duration-300 ${
                        task.status === "Completed"
                          ? "bg-[#E2F8EB] text-[#179353] border border-transparent"
                          : "bg-white text-[#24292E] border border-gray-200 group-hover:bg-gradient-to-b group-hover:from-[#8AA0FF] group-hover:to-[#5476FC] group-hover:text-white group-hover:border-transparent group-hover:shadow-[0_4px_12px_rgba(88,121,252,0.25)] hover:from-[#758FFF] hover:to-[#4065FB]"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {task.status === "Completed" ? "Completed" : "Complete Task"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-[#EBEEF5] w-full">
        {/* Prev Arrow */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className={`w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] transition-colors ${
            currentPage === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-[#ECEFFE] hover:text-[#5879FC]"
          }`}
        >
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 9L1 5L5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Page numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isPageActive = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                isPageActive
                  ? "bg-[#5879FC] text-white shadow-[0_4px_10px_rgba(88,121,252,0.25)]"
                  : "bg-white text-[#676E76] border border-[#EBEEF5] hover:bg-gray-50 hover:text-[#24292E]"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {page}
            </button>
          );
        })}

        {/* Next Arrow */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] transition-colors ${
            currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-[#ECEFFE] hover:text-[#5879FC]"
          }`}
        >
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
