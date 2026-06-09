export const calculateAge = (birthDateString: string) => {
  if (!birthDateString) return 0;
  
  // "YYYY년생" 형식인 경우
  if (birthDateString.includes("년생")) {
    const year = parseInt(birthDateString.replace("년생", ""), 10);
    if (isNaN(year)) return 0;
    return new Date().getFullYear() - year;
  }
  
  // "YYYY.MM.DD" 형식인 경우
  const today = new Date();
  const birthDate = new Date(birthDateString.replace(/\./g, "-"));
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};
