import { useEffect, useState } from "react";

export default function HealthScore() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/health")
      .then(res => res.json())
      .then(data => setData(data));
  }, []);

  if (!data) return <p>Loading...</p>;

  const getColor = (score) => {
    if (score > 80) return "green";
    if (score > 60) return "orange";
    return "red";
  };

  return (
    <div style={{
      border: "1px solid #ccc",
      padding: "20px",
      borderRadius: "10px",
      width: "300px"
    }}>
      <h2>Health Score</h2>

      <h1 style={{ color: getColor(data.score) }}>
        {data.score}
      </h1>

      <p>Status: {data.status}</p>

      <ul>
        {data.insights.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}