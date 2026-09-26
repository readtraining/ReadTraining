"use client";
import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";

export default function MonthlyCalender() {
  const [showCalender, setShowCalender] = useState(false);
  const [value, onChange] = useState([
    new Date(),
    new Date(2023, 6, 16), // Set initial selected dates here
    new Date(2023, 7, 20),
    new Date(2023, 8, 25),
  ]);
  useEffect(() => {
    setShowCalender(true);
  }, []);

  return (
    <div style={{ width: "100%" }}>
      {showCalender && <Calendar onChange={onChange} value={value} />}
    </div>
  );
}
