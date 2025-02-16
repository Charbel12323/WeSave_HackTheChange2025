"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
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
import {
  TrendingUp,
  Heart,
  CreditCard,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

const spendingData = [
  { name: "Housing", value: 1500 },
  { name: "Food", value: 500 },
  { name: "Transportation", value: 300 },
  { name: "Utilities", value: 200 },
  { name: "Entertainment", value: 150 },
];

const expensesData = [
  { month: "Jan", amount: 2000 },
  { month: "Feb", amount: 2200 },
  { month: "Mar", amount: 1800 },
  { month: "Apr", amount: 2400 },
  { month: "May", amount: 2100 },
  { month: "Jun", amount: 2300 },
];

const totalSpent = spendingData.reduce((sum, item) => sum + item.value, 0);
const highestExpenditure = Math.max(...spendingData.map((item) => item.value));
const charityAmount = totalSpent * 0.01;

/**
 * Convert lines of text to a check-marked list.
 */
function renderCheckList(text: string) {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  return (
    <ul className="space-y-3">
      {lines.map((line, idx) => (
        <li key={idx} className="flex items-start">
          <CheckCircle2 className="text-teal-400 w-6 h-6 mr-3 mt-1" />
          <span className="leading-relaxed">{line.trim()}</span>
        </li>
      ))}
    </ul>
  );
}

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

  // When the modal opens, fetch the next low-income user
  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
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

  // AI tips states
  const [creditTips, setCreditTips] = useState("");
  const [tipsLoading, setTipsLoading] = useState(true);
  const [tipsError, setTipsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Donation modal state
  const [isDonateModalOpen, setDonateModalOpen] = useState(false);

  // Low-income queue check
  const [lowIncomeUser, setLowIncomeUser] = useState<any>(null);

  const fetchLowIncomeUser = async () => {
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
  };

  useEffect(() => {
    // Each time the modal is closed or retried, re-check the queue
    fetchLowIncomeUser();
  }, [isDonateModalOpen, retryCount]);

  const fetchCreditTips = async () => {
    setTipsLoading(true);
    setTipsError("");

    try {
      const response = await fetch("http://localhost:5000/credit-tips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt:
            "Provide 5 specific, actionable tips for improving credit score. Format each tip as a separate line.",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCreditTips(data.tips);
      } else {
        throw new Error(data.error || "Failed to fetch tips");
      }
    } catch (error: any) {
      setTipsError(error.message || "Failed to fetch credit tips");
    } finally {
      setTipsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  useEffect(() => {
    fetchCreditTips();
  }, [retryCount]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-teal-700 px-4 py-12">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <motion.div
            variants={fadeIn}
            transition={{ delay: 0.2 }}
            className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-6"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              Spending Overview
            </h2>
            <SpendingPieChart data={spendingData} totalAmount={totalSpent} />
          </motion.div>
          <motion.div
            variants={fadeIn}
            transition={{ delay: 0.3 }}
            className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-6"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              Expenses Trend
            </h2>
            <ExpensesLineChart data={expensesData} />
          </motion.div>
        </div>

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

        {/* AI Tips Card */}
        <motion.div
          variants={fadeIn}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Card className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-white">
                  AI Credit Score Improvement Tips
                </CardTitle>
                <CardDescription className="text-lg text-white">
                  Actionable insights based on AI analysis:
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
                    className="ml-4"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="text-white space-y-4">
                  {creditTips.includes("-") || creditTips.includes("*") ? (
                    <ReactMarkdown className="prose prose-invert">
                      {creditTips}
                    </ReactMarkdown>
                  ) : (
                    renderCheckList(creditTips)
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
