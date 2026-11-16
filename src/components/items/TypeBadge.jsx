export default function TypeBadge({ type, size = "md" }) {
  const normalizedType = type?.toLowerCase() === "found" ? "found" : "lost";
  const isLost = normalizedType === "lost";

  const sizeClasses = size === "sm" 
    ? "px-2.5 py-0.5 text-[11px]" 
    : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full tracking-wide uppercase transition-colors ${sizeClasses} ${
        isLost
          ? "bg-[#FDF2F2] text-[#B84743] border border-[#F8C8C6]"
          : "bg-[#F0F7F3] text-[#3A7253] border border-[#C3DFCE]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isLost ? "bg-[#E56B67]" : "bg-[#5C9B78]"
        }`}
      />
      {normalizedType}
    </span>
  );
}
