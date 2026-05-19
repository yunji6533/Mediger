import { getPatients } from "@/src/lib/api";
import PatientTable from "@/src/components/patients/PatientTable";

export default async function PatientsPage() {
  const patients = await getPatients();

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">환자 목록</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          전체 {patients.length}명의 환자를 관리합니다.
        </p>
      </div>
      <PatientTable patients={patients} />
    </div>
  );
}
