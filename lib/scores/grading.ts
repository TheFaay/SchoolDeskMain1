export const CA_MAX = 40;
export const EXAM_MAX = 60;
export const TOTAL_MAX = CA_MAX + EXAM_MAX;

export type Grade = "A" | "B" | "C" | "D" | "E" | "F";
export type GradeInfo = { grade: Grade; remark: string; colour: string };

export function getGrade(total: number): Grade {
  return total >= 70 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 45 ? "D" : total >= 40 ? "E" : "F";
}

export function gradeForTotal(total: number): GradeInfo {
  const grade = getGrade(total);
  const details: Record<Grade, Omit<GradeInfo, "grade">> = {
    A: { remark: "Excellent", colour: "#1d5c0f" }, B: { remark: "Very Good", colour: "#2d6a2f" },
    C: { remark: "Good", colour: "#1e5a8a" }, D: { remark: "Fair", colour: "#8a6d1e" },
    E: { remark: "Pass", colour: "#92611f" }, F: { remark: "Fail", colour: "#8f1d1d" },
  };
  return { grade, ...details[grade] };
}

export const GRADING_KEY: Array<{ grade: Grade; band: string; remark: string }> = [
  { grade: "A", band: "70 - 100", remark: "Excellent" }, { grade: "B", band: "60 - 69", remark: "Very Good" },
  { grade: "C", band: "50 - 59", remark: "Good" }, { grade: "D", band: "45 - 49", remark: "Fair" },
  { grade: "E", band: "40 - 44", remark: "Pass" }, { grade: "F", band: "0 - 39", remark: "Fail" },
];

export function calculateScore(caScore: number, examScore: number) {
  const total = caScore + examScore;
  return { total, grade: getGrade(total) };
}
