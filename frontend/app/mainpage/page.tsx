"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SpendingPieChart } from "../components/spendingpiechart";
import { ExpensesLineChart } from "@/app/components/ExpensesLineChart";
import { DashboardCard } from "@/app/components/DashboardCard";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  TrendingUp,
  Heart,
  CreditCard,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import Sidebar from "../components/ui/Sidebar";

/**
 * Convert lines of text into a bullet list with large check marks.
 * Also remove any leading asterisks/dashes/brackets, etc.
 */
function renderCheckList(text: string) {
  // Split into lines, removing any empty lines
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  return (
    <ul className="space-y-4">
      {lines.map((line, idx) => {
        // Remove leading dashes, asterisks, or brackets with a quick regex
        const cleanedLine = line.replace(/^[-*()\[\]]+\s*/, "").trim();
        return (
          <li key={idx} className="flex items-start">
            <CheckCircle2 className="text-teal-400 w-8 h-8 mr-3 mt-1" />
            <span className="leading-relaxed text-white">{cleanedLine}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Donation Modal
 */
function DonateModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [amount, setAmount] = useState(50);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
      // Get next user in queue
      fetch("http://localhost:5000/get-next-low-income-user")
        .then((res) => res.json())
        .then((data) => {
          if (data.email) {
            setRecipientEmail(data.email);
          } else {
            setError("No low income user available at the moment.");
          }
        })
        .catch(() => {
          setError("Failed to fetch low income user.");
        });
    }
  }, [isOpen]);

  const handleDonate = async () => {
    setError("");
    setSuccess("");

    if (!recipientEmail || !donorEmail || amount <= 0) {
      setError("Please fill in all fields properly.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorEmail,
          recipientEmail,
          amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Donation failed.");
        return;
      }
      setSuccess("Donation successful!");
    } catch (err: any) {
      setError(err.message || "Network error.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-md rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Donate to Low-Income User</h2>
        {success ? (
          <p className="text-green-500 mb-4">{success}</p>
        ) : (
          <>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="mb-4">
              <label className="block font-medium">Donor Email:</label>
              <input
                type="email"
                className="border rounded w-full px-2 py-1"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                placeholder="donor@example.com"
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium">Recipient Email:</label>
              <input
                type="email"
                className="border rounded w-full px-2 py-1"
                value={recipientEmail}
                readOnly
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium">Amount:</label>
              <input
                type="number"
                className="border rounded w-full px-2 py-1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={1}
              />
            </div>
          </>
        )}

        <div className="flex justify-end space-x-2 mt-4">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          {!success && (
            <Button
              onClick={handleDonate}
              className="bg-teal-500 text-white hover:bg-teal-400"
            >
              Donate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // --- Spending summary from /saltedge/get-spending-summary
  const [spendingData, setSpendingData] = useState<{ name: string; value: number }[]>([]);
  const [loadingSpending, setLoadingSpending] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [highestExpenditure, setHighestExpenditure] = useState(0);

  // --- Donation modal
  const [isDonateModalOpen, setDonateModalOpen] = useState(false);
  const [lowIncomeUser, setLowIncomeUser] = useState<any>(null);

  // --- AI tips
  const [creditTips, setCreditTips] = useState("");
  const [tipsTitle, setTipsTitle] = useState("");
  const [tipsLoading, setTipsLoading] = useState(true);
  const [tipsError, setTipsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // --- Forecast data for line chart
  const [forecastData, setForecastData] = useState<{ day: string; amount: number }[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(true);

  // Derived charity = 1% of totalSpent
  const charityAmount = totalSpent * 0.01;

  // 1) Fetch spending summary
  useEffect(() => {
    async function fetchSpendingSummary() {
      try {
        setLoadingSpending(true);
        const firebaseUid = localStorage.getItem("firebaseUid");
        if (!firebaseUid) {
          console.warn("No firebaseUid found in localStorage.");
          setSpendingData([]);
          return;
        }
        const res = await fetch(
          `http://localhost:5000/saltedge/get-spending-summary?firebase_uid=${firebaseUid}`
        );
        if (!res.ok) throw new Error("Failed to fetch spending summary.");
        const data = await res.json();
        setSpendingData(data.pie_chart_data || []);
        setTotalSpent(data.summary?.total_spent || 0);
        setHighestExpenditure(data.summary?.highest_expenditure || 0);
      } catch (err) {
        console.error(err);
        setSpendingData([]);
      } finally {
        setLoadingSpending(false);
      }
    }
    fetchSpendingSummary();
  }, []);

  // 2) Fetch next low-income user
  useEffect(() => {
    async function fetchLowIncomeUser() {
      try {
        const res = await fetch("http://localhost:5000/get-next-low-income-user");
        if (res.ok) {
          const data = await res.json();
          setLowIncomeUser(data);
        } else {
          setLowIncomeUser(null);
        }
      } catch {
        setLowIncomeUser(null);
      }
    }
    fetchLowIncomeUser();
  }, []);

  // 3) AI tips
  const fetchCreditTips = async () => {
    setTipsLoading(true);
    setTipsError("");
    try {
      const response = await fetch("http://localhost:5000/credit-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        setTipsTitle(data.title || "AI Financial Tips");
        setCreditTips(data.tips || "");
      } else {
        throw new Error(data.error || "Failed to fetch tips");
      }
    } catch (error: any) {
      setTipsError(error.message || "Failed to fetch credit tips");
    } finally {
      setTipsLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditTips();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  // 4) Fetch forecast data for the line chart (7 daily points)
  useEffect(() => {
    async function fetchForecast() {
      try {
        setLoadingForecast(true);

        // Example transaction data
        const sampleTransactions = [
          { date: "2024-11-20", expense: 50 },
          { date: "2024-11-21", expense: 60 },
          { date: "2024-11-22", expense: 75 },
          { date: "2024-11-23", expense: 80 },
          { date: "2024-11-24", expense: 120 },
          { date: "2024-11-25", expense: 40 },
          { date: "2024-11-26", expense: 95 },
          { date: "2024-11-27", expense: 110 },
          { date: "2024-11-28", expense: 100 },
          { date: "2024-11-29", expense: 90 },
          { date: "2024-11-30", expense: 130 },
          { date: "2024-12-01", expense: 85 },
        ];

        const firebaseUid = localStorage.getItem("firebaseUid");
        if (!firebaseUid) {
          console.error("Firebase UID not found");
          return;
        }
        const res = await fetch("http://localhost:5000/forecast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firebase_uid: firebaseUid }),
        });
        if (!res.ok) throw new Error("Forecast fetch failed.");
        const data = await res.json();

        // Convert historical
        const histPoints = (data.historical || []).map(
          (item: { ds: string; y_original: number }) => {
            const dateObj = new Date(item.ds);
            return {
              day: dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              amount: item.y_original,
            };
          }
        );

        // Convert forecast
        const forecastPoints = (data.forecast || []).map(
          (item: { ds: string; yhat: number }) => {
            const dateObj = new Date(item.ds);
            return {
              day: dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              amount: item.yhat,
            };
          }
        );

        // Merge them into a single array
        const combined = [...histPoints, ...forecastPoints];

        // Sort by date to ensure a continuous line
        combined.sort((a, b) => {
          const da = new Date(a.day);
          const db = new Date(b.day);
          return da.getTime() - db.getTime();
        });

        setForecastData(combined);
      } catch (err) {
        console.error(err);
        setForecastData([]);
      } finally {
        setLoadingForecast(false);
      }
    }
    fetchForecast();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-teal-700 px-4 py-12">
      {/* Sidebar (if you're using it) */}
      <Sidebar />

      {/* Donation Modal */}
      <DonateModal
        isOpen={isDonateModalOpen}
        onClose={() => setDonateModalOpen(false)}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.5 }}
        className="container mx-auto"
      >
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Financial Dashboard
        </h1>

        {/* Row: Spending + Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <motion.div
            variants={fadeIn}
            transition={{ delay: 0.2 }}
            className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-6"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              Spending Overview
            </h2>
            {loadingSpending ? (
              <div className="text-white">Loading spending data...</div>
            ) : spendingData.length === 0 ? (
              <div className="text-white">No spending data found.</div>
            ) : (
              <SpendingPieChart data={spendingData} totalAmount={totalSpent} />
            )}
          </motion.div>

          <motion.div
            variants={fadeIn}
            transition={{ delay: 0.3 }}
            className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-6"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              7-Day Forecast
            </h2>
            {loadingForecast ? (
              <div className="text-white">Loading forecast data...</div>
            ) : forecastData.length < 2 ? (
              <div className="text-white">
                Not enough data to display a line chart.
              </div>
            ) : (
              <ExpensesLineChart
                data={forecastData.map((item) => ({
                  month: item.day, // reuse the 'month' key in the chart
                  amount: item.amount,
                }))}
              />
            )}
          </motion.div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div variants={fadeIn} transition={{ delay: 0.4 }}>
            <DashboardCard
              title="Highest Expenditure"
              value={`$${highestExpenditure.toLocaleString()}`}
              icon={<TrendingUp className="w-8 h-8 text-teal-300" />}
            />
          </motion.div>

          <motion.div variants={fadeIn} transition={{ delay: 0.5 }}>
            <DashboardCard
              title="Charity Contribution"
              value={`$${charityAmount.toLocaleString()}`}
              icon={<Heart className="w-8 h-8 text-teal-300" />}
            />
            {lowIncomeUser ? (
              <Button
                className="mt-4 w-full bg-pink-500 hover:bg-pink-400"
                onClick={() => setDonateModalOpen(true)}
              >
                Donate
              </Button>
            ) : (
              <p className="mt-4 text-white text-center">
                No low income user in queue.
              </p>
            )}
          </motion.div>

          <motion.div variants={fadeIn} transition={{ delay: 0.6 }}>
            <DashboardCard
              title="Total Expenses"
              value={`$${totalSpent.toLocaleString()}`}
              icon={<CreditCard className="w-8 h-8 text-teal-300" />}
            />
          </motion.div>
        </div>

        {/* AI Tips */}
        <motion.div
          variants={fadeIn}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Card className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-white">
                  {tipsTitle || "AI Financial Tips"}
                </CardTitle>
                <CardDescription className="text-lg text-white">
                  Actionable insights from AI:
                </CardDescription>
              </div>
              <Button
                onClick={handleRetry}
                variant="outline"
                className="text-white"
                disabled={tipsLoading}
              >
                <RefreshCcw
                  className={`h-4 w-4 ${tipsLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </CardHeader>
            <CardContent>
              {tipsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : tipsError ? (
                <div className="bg-red-600 text-white rounded-lg p-4 flex items-center justify-between">
                  <span>{tipsError}</span>
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    size="sm"
                    className="ml-4 text-white"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                // Always render as checklist
                renderCheckList(creditTips)
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
