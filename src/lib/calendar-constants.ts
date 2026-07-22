/** 日历分类标签和颜色（纯常量，不引 db，client 可用） */

export const CALENDAR_CATEGORY_LABELS: Record<string, string> = {
  competition: "竞赛",
  research: "科研",
  internship: "实习招聘",
  exam: "考试认证",
  graduate: "升学保研",
};

export const CALENDAR_CATEGORY_COLORS: Record<string, string> = {
  competition: "bg-blue-100 text-blue-700",
  research: "bg-green-100 text-green-700",
  internship: "bg-amber-100 text-amber-700",
  exam: "bg-red-100 text-red-700",
  graduate: "bg-purple-100 text-purple-700",
};
