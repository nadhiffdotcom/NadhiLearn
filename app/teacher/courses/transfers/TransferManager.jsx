
"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusLabel(status) {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "accepted":
      return "Diterima";
    case "rejected":
      return "Ditolak";
    default:
      return status;
  }
}

function getStatusClass(status) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "accepted":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

async function getResponseData(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || data.error || "Terjadi kesalahan pada server."
    );
  }

  return data;
}

export default function TransferManager() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedCourses, setSelectedCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [transferResponse, courseResponse] = await Promise.all([
        authFetch("/api/teacher/transfers"),
        authFetch("/api/courses?page=1&limit=100"),
      ]);

      const transferData = await getResponseData(transferResponse);
      const courseData = await getResponseData(courseResponse);

      setTeachers(transferData.teachers || []);
      setSentRequests(transferData.sentRequests || []);
      setReceivedRequests(transferData.receivedRequests || []);

      const courseList = Array.isArray(courseData)
        ? courseData
        : courseData.courses ||
          courseData.data ||
          courseData.items ||
          [];

      setCourses(courseList);
    } catch (err) {
      setError(err.message || "Gagal mengambil data transfer kursus.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCourse = (courseId) => {
    setSelectedCourses((previous) =>
      previous.includes(String(courseId))
        ? previous.filter((id) => id !== String(courseId))
        : [...previous, String(courseId)]
    );
  };

  const toggleAllCourses = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(courses.map((course) => String(course.id)));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedTeacher) {
      setError("Silakan pilih Teacher penerima.");
      return;
    }

    if (selectedCourses.length === 0) {
      setError("Silakan pilih minimal satu kursus.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await authFetch("/api/teacher/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toTeacherId: selectedTeacher,
          courseIds: selectedCourses,
        }),
      });

      const data = await getResponseData(response);

      setMessage(data.message || "Permintaan transfer berhasil dikirim.");
      setSelectedTeacher("");
      setSelectedCourses([]);

      await loadData();
    } catch (err) {
      setError(err.message || "Gagal mengirim permintaan transfer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponse = async (requestId, action) => {
    const confirmation =
      action === "accept"
        ? "Apakah Anda yakin ingin menerima transfer kursus ini?"
        : "Apakah Anda yakin ingin menolak transfer kursus ini?";

    if (!window.confirm(confirmation)) return;

    setMessage("");
    setError("");
    setProcessingId(requestId);

    try {
      const response = await authFetch(
        `/api/teacher/transfers/${requestId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const data = await getResponseData(response);

      setMessage(
        data.message ||
          (action === "accept"
            ? "Transfer kursus berhasil diterima."
            : "Permintaan transfer berhasil ditolak.")
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Gagal memproses permintaan transfer.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fc] p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#101b36]">
            Transfer Kursus
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Pindahkan kepemilikan kursus kepada Teacher lain melalui
            permintaan transfer.
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-[#dce3ef] bg-white p-10 text-center text-gray-500">
            Memuat data transfer kursus...
          </div>
        ) : (
          <div className="space-y-5">

            {/* FORM TRANSFER */}
            <section className="rounded-xl border border-[#dce3ef] bg-white p-5 md:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[#101b36]">
                  Kirim Permintaan Transfer
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Pilih kursus dan Teacher yang akan menerima kepemilikannya.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* TEACHER */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#101b36]">
                    Teacher Penerima
                  </label>

                  <select
                    value={selectedTeacher}
                    onChange={(event) =>
                      setSelectedTeacher(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#c2cce0]"
                  >
                    <option value="">Pilih Teacher penerima</option>

                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.username} ({teacher.email})
                      </option>
                    ))}
                  </select>

                  {teachers.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Belum ada Teacher lain yang memenuhi syarat sebagai
                      penerima transfer.
                    </p>
                  )}
                </div>

                {/* COURSE SELECTION */}
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-[#101b36]">
                      Pilih Kursus
                    </label>

                    {courses.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllCourses}
                        className="text-sm font-semibold text-[#101b36] hover:underline"
                      >
                        {selectedCourses.length === courses.length
                          ? "Batalkan Semua"
                          : "Pilih Semua Kursus"}
                      </button>
                    )}
                  </div>

                  {courses.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                      Anda belum memiliki kursus yang dapat ditransfer.
                    </div>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-[#dce3ef] p-3">
                      {courses.map((course) => (
                        <label
                          key={course.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition hover:bg-[#f4f7fc]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCourses.includes(
                              String(course.id)
                            )}
                            onChange={() => toggleCourse(course.id)}
                            className="h-4 w-4 accent-[#0a1f4a]"
                          />

                          <span className="text-sm font-medium text-[#101b36]">
                            {course.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    {selectedCourses.length} dari {courses.length} kursus
                    dipilih.
                  </p>
                </div>

                {/* SUBMIT */}
                <div className="flex justify-end border-t border-gray-100 pt-5">
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      courses.length === 0 ||
                      teachers.length === 0
                    }
                    className="rounded-lg bg-[#0a1f4a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1b3a7a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Mengirim Permintaan..."
                      : "Kirim Permintaan Transfer"}
                  </button>
                </div>
              </form>
            </section>

            {/* PERMINTAAN MASUK */}
            <section className="overflow-hidden rounded-xl border border-[#dce3ef] bg-white">
              <div className="border-b border-[#dce3ef] px-5 py-5 md:px-6">
                <h2 className="text-lg font-bold text-[#101b36]">
                  Permintaan Transfer Masuk
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Permintaan dari Teacher lain yang perlu Anda tanggapi.
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {receivedRequests.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-gray-500">
                    Belum ada permintaan transfer masuk.
                  </p>
                ) : (
                  receivedRequests.map((request) => (
                    <div key={request.id} className="p-5 md:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#101b36]">
                            Dari: {request.from_teacher_username}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(request.requested_at)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold text-gray-700">
                          Kursus yang ditransfer:
                        </p>

                        <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                          {(request.courses || []).map((course, index) => (
                            <li key={course.id || index}>
                              {course.course_title}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {request.status === "pending" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={processingId === request.id}
                            onClick={() =>
                              handleResponse(request.id, "accept")
                            }
                            className="rounded-md bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            Terima
                          </button>

                          <button
                            type="button"
                            disabled={processingId === request.id}
                            onClick={() =>
                              handleResponse(request.id, "reject")
                            }
                            className="rounded-md bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* RIWAYAT PERMINTAAN */}
            <section className="overflow-hidden rounded-xl border border-[#dce3ef] bg-white">
              <div className="border-b border-[#dce3ef] px-5 py-5 md:px-6">
                <h2 className="text-lg font-bold text-[#101b36]">
                  Riwayat Permintaan Transfer
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Pantau status permintaan transfer yang telah Anda kirim.
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {sentRequests.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-gray-500">
                    Anda belum pernah mengirim permintaan transfer.
                  </p>
                ) : (
                  sentRequests.map((request) => (
                    <div key={request.id} className="p-5 md:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#101b36]">
                            Kepada: {request.to_teacher_username}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Dikirim: {formatDate(request.requested_at)}
                          </p>

                          {request.responded_at && (
                            <p className="mt-1 text-xs text-gray-500">
                              Direspons: {formatDate(request.responded_at)}
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="mb-2 text-sm font-semibold text-gray-700">
                          Kursus:
                        </p>

                        <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                          {(request.courses || []).map((course, index) => (
                            <li key={course.id || index}>
                              {course.course_title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
