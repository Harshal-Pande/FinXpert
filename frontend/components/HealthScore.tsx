"use client";

import { useEffect, useState } from "react";
import { getBackendOrigin } from "@/lib/api/client";

export default function HealthScore() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${getBackendOrigin()}/health`)
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => console.error(err));
  }, []);

  if (!data) return <p>Loading...</p>;

  const getColor = (score: number) => {
    if (score > 80) return "text-green-500";
    if (score > 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="p-6 rounded-2xl shadow-lg bg-white w-96">
      <h2 className="text-xl font-bold mb-4">Portfolio Health Score</h2>

      <h1 className={`text-5xl font-bold ${getColor(data.score)}`}>
        {data.score}
      </h1>

      <p className="mt-2 font-medium">Status: {data.status}</p>

      <ul className="mt-4 list-disc pl-5 text-sm">
        {data.insights.map((item: string, index: number) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}