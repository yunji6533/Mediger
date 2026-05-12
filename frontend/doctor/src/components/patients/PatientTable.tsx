"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { PatientSummary, RiskLevel } from "@/src/types";
import RiskBadge from "@/src/components/ui/RiskBadge";

type SortKey =
  | "patientId"
  | "name"
  | "gender"
  | "age"
  | "heightCm"
  | "weightKg"
  | "lastVisitDate"
  | "riskLevel";
type SortDir = "asc" | "desc";

const RISK_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
const PAGE_SIZE = 10;

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (sortKey !== col)
    return <ChevronsUpDown size={13} className="text-gray-400" />;
  return sortDir === "asc" ? (
    <ChevronUp size={13} />
  ) : (
    <ChevronDown size={13} />
  );
}

const columns: [SortKey, string][] = [
  ["patientId", "ID"],
  ["name", "이름"],
  ["gender", "성별"],
  ["age", "나이"],
  ["heightCm", "키 (cm)"],
  ["weightKg", "몸무게 (kg)"],
  ["lastVisitDate", "최근 진료 날짜"],
  ["riskLevel", "위험도"],
];

export default function PatientTable({
  patients,
}: {
  patients: PatientSummary[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "">("");
  const [sortKey, setSortKey] = useState<SortKey>("riskLevel");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = patients;
    if (search) {
      result = result.filter(
        (p) => p.name.includes(search) || p.patientId.includes(search)
      );
    }
    if (riskFilter) result = result.filter((p) => p.riskLevel === riskFilter);
    return result;
  }, [patients, search, riskFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === "riskLevel") {
        av = RISK_ORDER[a.riskLevel];
        bv = RISK_ORDER[b.riskLevel];
      } else if (
        sortKey === "name" ||
        sortKey === "patientId" ||
        sortKey === "gender" ||
        sortKey === "lastVisitDate"
      ) {
        av = (a[sortKey] as string | undefined) ?? "";
        bv = (b[sortKey] as string | undefined) ?? "";
      } else {
        av = (a[sortKey] as number | undefined) ?? -1;
        bv = (b[sortKey] as number | undefined) ?? -1;
      }
      if (typeof av === "string")
        return sortDir === "asc"
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av);
      return sortDir === "asc"
        ? av - (bv as number)
        : (bv as number) - av;
    });
  }, [filtered, sortKey, sortDir]);

  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="이름 또는 ID"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value as RiskLevel | "");
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">위험도 전체</option>
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">
          {filtered.length}명
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 whitespace-nowrap select-none"
                >
                  <span className="flex items-center gap-1">
                    {label}
                    <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              paged.map((p) => (
                <tr
                  key={p.patientId}
                  onClick={() => router.push(`/patients/${p.patientId}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">
                    #{p.patientId}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-700">
                    {p.gender === "M" ? "남" : p.gender === "F" ? "여" : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-700">
                    {p.age}세
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-700">
                    {p.heightCm != null ? p.heightCm : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-700">
                    {p.weightKg != null ? p.weightKg : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-700">
                    {p.lastVisitDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={p.riskLevel} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, sorted.length)} / {sorted.length}명
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={clsx(
                    "w-7 h-7 text-xs rounded",
                    page === i + 1
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
