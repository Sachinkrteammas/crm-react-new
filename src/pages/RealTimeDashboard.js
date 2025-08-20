import { useEffect, useState } from "react";

function RealTimeDashboard() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({
    loggedIn: 0,
    inCalls: 0,
    waiting: 0,
    paused: 0,
  });
  const [refresh, setRefresh] = useState(10);

  useEffect(() => {
    fetchData();

    const timer = setInterval(() => {
      setRefresh((r) => (r > 0 ? r - 1 : 10));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (refresh === 0) fetchData();
  }, [refresh]);

  const fetchData = async () => {
    try {
//      const res = await fetch("/api/realtime/agents"); // your FastAPI endpoint
//      const data = await res.json();
//      setAgents(data.agents);
//      setStats(data.stats);
      setRefresh(10);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen flex">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12" style={{display: "flex"}}>
        {[
          { value: stats.loggedIn, label: "Agents Logged In", color: "bg-green-600" },
          { value: stats.inCalls, label: "Agents In Calls / Dialers", color: "bg-green-500" },
          { value: stats.waiting, label: "Agents Waiting", color: "bg-blue-600" },
          { value: stats.paused, label: "Paused Agents", color: "bg-red-500" },
        ].map((card, idx) => (
          <div
            key={idx}
            className={`${card.color} rounded-2xl p-6 shadow-lg flex flex-col justify-center items-center`}
          >
            <h2 className="text-3xl font-extrabold">{card.value}</h2>
            <p className="text-sm mt-2">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Refresh Indicator */}
      <div className="text-right text-sm text-gray-600">
        Refresh in: {refresh}s
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-gray-800 p-4 rounded-xl shadow-md flex flex-col items-center text-white"
          >
            {/* Agent Status Icon */}
            <div className="text-3xl mb-2">
              {agent.status === "paused" && "⏸"}
              {agent.status === "inCall" && "📞"}
              {agent.status === "waiting" && "🎧"}
            </div>

            {/* Agent Name */}
            <h3 className="font-bold text-lg">{agent.name}</h3>
            <p className="text-xs text-gray-300">{agent.agentId}</p>

            {/* Skills */}
            <p className="text-sm mt-1">Skills 🎯 {agent.skills}</p>

            {/* Calls Info */}
            <div className="text-xs mt-2 space-y-1 text-center text-gray-300">
              <p>📊 Calls: {agent.calls}</p>
              <p>⏱ Duration: {agent.duration}</p>
              <p>{agent.desk}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

  );
};

export default RealTimeDashboard;
